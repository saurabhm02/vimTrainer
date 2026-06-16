# ADR-002: Google Cloud Run for Backend Deployment

**Date**: 2026-06-16  
**Status**: Accepted  
**Deciders**: Project leads

---

## Context

The Go API must be deployed as a container. Options considered:

1. **Google Cloud Run** — serverless container execution, scale-to-zero
2. **Fly.io** — container PaaS with persistent VMs
3. **Railway** — container PaaS, simpler DX
4. **Self-hosted Docker** — user-managed VMs or bare metal
5. **Google Kubernetes Engine (GKE)** — full Kubernetes

## Decision

Default deployment target is Google Cloud Run. The architecture must remain cloud-agnostic — any standard Docker container deployment should work without code changes.

## Rationale

**Scale-to-zero for early stage.** VimTrainer starts with zero paying users. Cloud Run charges only for actual request processing time. A hobby-scale deployment costs essentially nothing until real traffic arrives. Fly.io and Railway both charge for always-on VMs even at idle.

**Container-native.** The backend is already a Docker container (required for local dev with Docker Compose). Cloud Run runs that same container image in production with no build system differences.

**No persistent connections required.** The Go API is stateless. All state lives in PostgreSQL (via pgBouncer). Cloud Run's ephemeral, scale-to-zero model works because nothing in the API layer requires persistent connections or local filesystem state between requests.

**pgBouncer mitigates connection limit concerns.** Cloud Run can instantiate multiple API container instances simultaneously. Without connection pooling, each instance would open its own PostgreSQL connections and exhaust Supabase's connection limits. pgBouncer in transaction mode (max 25 server connections, pool size 10 per instance) caps total DB connections regardless of how many API instances are running.

**Cloud-agnostic by design.** The backend reads all configuration from environment variables (12-factor app). Deploying to Railway, Fly.io, or a self-hosted VM requires only setting the same env vars — no code changes, no platform-specific SDKs.

**Frontend on Cloudflare Pages.** The React SPA is a static build deployed to Cloudflare Pages, served from Cloudflare's global CDN. This is completely independent of the backend deployment target. DNS is managed through Cloudflare, with `api.vimtrainer.dev` pointing to Cloud Run via a custom domain.

## Consequences

- **Positive**: Near-zero cost at early stage. No idle VM charges.
- **Positive**: Same Docker container runs in local dev and production.
- **Positive**: Auto-scales under load without configuration.
- **Positive**: Any Docker-capable host can run the backend (Railway, Fly.io, bare metal).
- **Negative**: Cold start latency (~500ms for Go containers on first request after idle). Mitigated by minimum instance count of 1 in production to eliminate cold starts once traffic exists.
- **Negative**: No persistent local filesystem. File uploads (keymap files) must be processed in memory and immediately uploaded to storage or discarded. The StorageService abstraction handles this.
- **Negative**: Request timeout limit of 60 minutes (Cloud Run default). GitHub clone operations are bounded to 30 seconds, well within limits.

## Alternatives Not Chosen

**Fly.io**: Excellent DX, but always-on pricing. Better choice for V2 if persistent WebSocket connections are needed (real-time multiplayer sessions). Architecture does not prevent switching.

**Railway**: Similar to Fly.io. Good for teams wanting simpler deployment, suitable alternative for self-hosters.

**GKE**: Overengineered for a single-service backend at V1 scale.

**Self-hosted Docker**: Valid for advanced self-hosters. The `docker-compose.yml` at the project root is the reference for this deployment model.
