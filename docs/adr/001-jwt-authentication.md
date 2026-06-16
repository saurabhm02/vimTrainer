# ADR-001: JWT Authentication Implemented in Go

**Date**: 2026-06-16  
**Status**: Accepted  
**Deciders**: Project leads

---

## Context

VimTrainer requires authentication for registered users and stateless guest sessions. The choice of auth system has direct implications for portability (self-hosted requirement), operational complexity, and the guest migration flow.

Options evaluated:

1. **Supabase Auth** — managed auth service bundled with Supabase
2. **Auth0 / Clerk** — third-party managed identity providers
3. **JWT implemented in Go** — custom implementation using `golang-jwt/jwt`

## Decision

Implement JWT authentication entirely in Go. No external identity provider in V1.

**Token design:**
- Access token: HS256, 15-minute expiry, `Authorization: Bearer` header
- Refresh token: HS256, 30-day expiry, httpOnly `SameSite=Strict` cookie
- Guest token: access token with `is_guest: true`, 24-hour expiry, no refresh token

## Rationale

**Portability is a hard requirement.** VimTrainer must be self-hostable on any platform — Docker Compose, Fly.io, Railway, Google Cloud Run, bare metal. Supabase Auth and Auth0 introduce an external dependency that breaks offline self-hosting and creates a vendor lock-in incompatible with the open-source-first mandate.

**Guest migration requires owning the user identity.** The guest-to-registered migration flow re-assigns all practice sessions and SRS records from a guest UUID to a new registered user UUID in a single database transaction. This is cleanest when the auth system and the user table live in the same PostgreSQL database. External auth providers manage their own user tables, which would require bidirectional sync and complicate the migration transaction.

**Simplicity at V1 scale.** At 0–10,000 users, the operational overhead of maintaining JWT secrets and bcrypt hashing is minimal. The complexity of a third-party auth integration (webhooks, SDK updates, outage dependencies) exceeds the complexity of the custom implementation.

**No social auth in V1.** GitHub OAuth and Google OAuth are V2 features. There is no benefit to adopting a full-featured provider (Auth0, Clerk) before the social auth requirement exists.

## Consequences

- **Positive**: No external auth dependency. Self-hosting works offline. Full control over token claims and session model. Guest migration is a single SQL transaction.
- **Positive**: JWT secrets rotate by changing one environment variable.
- **Negative**: Stateless refresh tokens cannot be revoked without a blocklist. Accepted risk for V1; a JTI blocklist in Redis is the V2 upgrade path.
- **Negative**: Password reset requires implementing email sending. Deferred to V2; V1 requires contacting admin for password reset (documented limitation).
- **Negative**: No social auth. Users must create an email account. Mitigated by guest mode (no signup required for practice).

## Alternatives Not Chosen

**Supabase Auth**: Would couple auth to Supabase, preventing portability. Supabase Auth also stores its own user records separate from our `users` table, complicating the guest migration transaction and requiring sync logic.

**Auth0 / Clerk**: External dependency, per-MAU pricing incompatible with open-source self-hosting, no offline operation.
