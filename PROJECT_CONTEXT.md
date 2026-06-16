# VimTrainer — Project Context

**Version**: 1.0  
**Date**: 2026-06-16  
**Status**: Planning complete. Ready for implementation.

This document is the canonical implementation reference for VimTrainer. A new engineer should be able to read this document and understand the entire system — product goals, architecture decisions, database schema, API contracts, frontend structure, and build order — without reading any other document.

All supporting detail lives in `docs/`. This document summarizes decisions and explains the *why* behind them. When this document and a `docs/` file conflict, this document wins (it reflects the latest resolved state).

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Personas](#2-user-personas)
3. [MVP and V1 Scope](#3-mvp-and-v1-scope)
4. [Architecture Overview](#4-architecture-overview)
5. [Deployment Architecture](#5-deployment-architecture)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [Authentication Strategy](#8-authentication-strategy)
9. [Backend Architecture](#9-backend-architecture)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Design System](#11-design-system)
12. [Practice Engine Design](#12-practice-engine-design)
13. [Spaced Repetition Design](#13-spaced-repetition-design)
14. [Milestone Roadmap](#14-milestone-roadmap)

---

## 1. Product Vision

### Problem

Vim and Neovim users invest significant time building personal configurations — custom leader mappings, LSP bindings, plugin shortcuts — but the muscle memory never catches up. The config is aspirational; the fingers still default to slow paths. There is no tool that lets you import *your own* config and practice *your own* shortcuts with measurement, spaced repetition, and a daily training queue.

### Solution

VimTrainer is a MonkeyType-inspired training platform for Vim/Neovim users. Users import their keymaps (via file upload or GitHub dotfiles), complete a daily practice queue, and track mastery over time. The core loop: see a command description → type the key sequence → get instant feedback → move to the next challenge.

### Success Metrics

| Metric | Target |
|--------|--------|
| Keymap Import Rate | ≥ 55% of registered users import at least one keymap within first session |
| Session Completion Rate | ≥ 70% of started sessions are completed |
| D7 Retention | ≥ 30% of users who complete a session return within 7 days |
| P50 Challenge Response Time | < 200ms from keypress to feedback display |

### Non-Goals (V1)

- No Stripe, billing, subscriptions, payments, or feature gating of any kind
- No team plans, organizations, or shared keymaps
- No social auth (Google, GitHub OAuth) — email/password and guest mode only
- No AI-generated descriptions or suggestions
- No private GitHub repo imports
- No Neovim plugin installation recommendations
- No mobile app

### Open Source First

VimTrainer is open source, self-hosted first. There is no monetization infrastructure in V1. Future monetization is intentionally out of scope and the architecture must not assume it.

---

## 2. User Personas

Four primary personas drive all product decisions. If a feature doesn't serve at least one of them, it doesn't belong on the V1 roadmap.

### Arjun Sharma — The Config Artisan

Senior Backend Engineer, 31, Bangalore. Expert Neovim user (5+ years), 300+ custom keymaps in a public GitHub dotfiles repo. Uses Neovim 8-10 hours/day. His problem: 300 bindings, but only 60 are truly muscle memory. The other 240 are aspirational infrastructure.

**What he needs from VimTrainer**: Import his full `keymaps.lua`, get category-level mastery scores, drill weak areas by category, drill leader/plugin bindings specifically. Needs deep analytics (per-command history, not just summary). Needs reliable session data — he's building a habit and a single data loss incident ends it.

**What would make him leave**: Parser that fails on LazyVim plugin keymaps; toy-feeling UI; no analytics depth; data loss.

### Sofia Marchetti — The Vim Migrant

Frontend Developer, 26, Milan. VS Code migrant, 3 months into Neovim with LazyVim defaults. No custom keymaps yet. Her problem: knows what she wants to do, can't translate intent to keystrokes without hesitation. No structured curriculum, no measurement of improvement.

**What she needs from VimTrainer**: Structured Motion Trainer tiers (Beginner → Intermediate → Advanced) to work through systematically. Guest mode so she can start without creating an account. No import requirement on first visit. Not condescending — she's a professional.

**What would make her leave**: Requiring config import before she can do anything; forced beginner content when she already knows `hjkl`; app that feels like a children's game.

### Marcus Webb — The Plugin Explorer

Staff Engineer, 35, Austin. Intermediate-to-advanced user (3 years), dangerous ecosystem of plugins installed but not mastered. nvim-dap, gitsigns, diffview — all installed, all underused. His problem: fragmented practice time (5-10 minute gaps between meetings), and no prioritization signal for which plugins are causing the most productivity drag.

**What he needs from VimTrainer**: Short sessions (10 commands, < 5 min). Category-filtered practice (drill nvim-dap specifically). Analytics breakdown by plugin/category so data tells him where to start. Fast load times — he's opening the app in a 5-minute meeting gap.

**What would make him leave**: No category filtering; no short session option; slow initial load.

### Priya Nair — The Daily Driver

Principal Engineer, 38, Amsterdam. 8+ years of Vim, zero mouse usage, pure `init.lua`. Her problem: years of accumulated habits, some suboptimal. Doesn't know her average response time for her 20 most-used commands. Has 200+ keymaps but suspects she uses 50-70 actively.

**What she needs from VimTrainer**: Full mastery audit — every binding's accuracy and response time. Response time breakdown (accuracy alone is insufficient). Long-term trend data (90-day baselines). Evidence of mastery, not just encouragement. Achievement conditions that represent real proficiency (Speed Demon: < 1000ms average; Accuracy King: 100% accuracy).

**What would make her leave**: No response time analytics; tool designed for beginners; non-exportable session data; opaque SRS (can't understand why a command appears).

---

## 3. MVP and V1 Scope

### MVP (End of Milestone 5 — Day 20)

The smallest complete experience that validates the core loop. Everything in this list ships before M6 starts.

**MVP Includes:**
- Guest mode (no signup required, server-side session, JWT-authenticated)
- Email/password registration and login
- Guest-to-registered migration (all session data transfers)
- File upload keymap import (`.lua`, `.vim`, `.vimrc`, `.zip`)
- GitHub public dotfiles import (clone → parse → preview → confirm)
- Built-in Vim motion library (68 seeded keymaps: Beginner / Intermediate / Advanced tiers)
- Main Practice Mode (SRS-prioritized daily queue, 10/20/30 challenges)
- Motion Trainer mode (built-in motions, tier filtering)
- Leader Key Trainer mode (leader-prefixed keymaps only)
- Flashcard Mode (review due cards, SRS-ordered)
- Spaced repetition engine (SM-2 variant, server-side)
- Daily queue generation (10 weakest + 5 unpracticed + 5 random = 20 commands)
- User settings (session length preference, theme toggle, practice sound)
- Basic user profile (streak, total sessions, accuracy)

**MVP Excludes (deferred to V1 or V2):**
- Analytics dashboard (M6)
- Achievements and badges (M7)
- Keymap source management UI (delete/rename sources)
- Response time percentile breakdowns
- Data export

### V1 (After MVP — Milestones 6–8)

- Analytics dashboard: accuracy trend, response time trend, category breakdown, mastery gauge, most-missed table
- Achievements system: 12 defined achievements across 4 categories (Practice, Mastery, Streak, Import)
- Streak tracking with freeze mechanic
- Polish pass: empty states, loading skeletons, error recovery
- Production deployment to Google Cloud Run + Cloudflare Pages

### V2 (Future — Not in scope)

- Social auth (GitHub OAuth, Google OAuth)
- Private dotfiles repo import (requires OAuth scope)
- Multiplayer / competitive sessions
- Public leaderboards
- Data export (CSV/JSON)
- Neovim plugin integration (practice keymaps from within Neovim)
- Mobile app

**V2 triggers**: When V1 achieves D7 retention ≥ 30% and Keymap Import Rate ≥ 55%.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│   React + TypeScript + Vite                                      │
│   Custom CSS (BEM-lite, no Tailwind/MUI/Bootstrap)               │
│   Hosted: Cloudflare Pages                                       │
│   DNS: Cloudflare                                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS REST API
                           │ Authorization: Bearer <jwt>
┌──────────────────────────▼──────────────────────────────────────┐
│                        BACKEND                                   │
│   Go 1.22 + Gin + GORM                                          │
│   Hosted: Google Cloud Run (containerized, auto-scale)           │
│   JWT auth: HS256, access (15min) + refresh (30d httpOnly cookie)│
└──────────────────────────┬──────────────────────────────────────┘
                           │ TCP (PostgreSQL wire protocol)
                           │ via pgBouncer (transaction mode)
┌──────────────────────────▼──────────────────────────────────────┐
│                        DATABASE                                  │
│   Supabase PostgreSQL (managed)                                  │
│   NOT using Supabase Auth — all auth is in Go                    │
│   pgBouncer: max 25 server conns, pool size 10 per Go instance   │
│   golang-migrate: numbered SQL files, run on startup             │
└─────────────────────────────────────────────────────────────────┘
```

### Local Development

```
docker compose up
├── postgres:16-alpine  →  localhost:5432
├── go-api              →  localhost:8080
│     reads: .env (DATABASE_URL, JWT_SECRET, etc.)
└── (frontend runs separately: npm run dev → localhost:5173)
```

Frontend proxies `/api/*` to `localhost:8080` via Vite dev server config. No CORS issues in local dev.

### Key Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| CSS framework | Custom CSS only | Vim/terminal aesthetic; no utility class noise in DOM |
| Auth provider | JWT in Go | No Supabase Auth dependency; portable across hosting providers |
| DB connection | pgBouncer | Cloud Run instances are ephemeral; direct PostgreSQL connections would exhaust limits |
| File storage | Local filesystem + StorageService interface | Can swap to Cloudflare R2 without changing business logic |
| Data fetching | TanStack Query v5 | Caching, background refetch, cursor pagination support |
| State management | Zustand | Minimal boilerplate, no context drilling, TypeScript-first |

---

## 5. Deployment Architecture

### Production Topology

```
                            ┌─────────────────────────────┐
User Browser ──HTTPS──▶ Cloudflare DNS + CDN
                            │
                            ├── vimtrainer.dev (Pages)
                            │   React SPA, static assets,
                            │   global CDN edge delivery
                            │
                            └── api.vimtrainer.dev (Cloud Run)
                                Go API container
                                Auto-scaled 0-N instances
                                    │
                                    ├── Supabase PostgreSQL
                                    │   (via pgBouncer, SSL)
                                    │
                                    └── Local filesystem storage
                                        (or Cloudflare R2 via env flag)
```

### Environment Variables (Backend)

```bash
# Required
DATABASE_URL=postgres://user:pass@host:5432/vimtrainer?sslmode=require
JWT_SECRET=<min 32 bytes, base64url or hex>
CORS_ALLOWED_ORIGINS=https://vimtrainer.dev,http://localhost:5173
PORT=8080
ENVIRONMENT=production  # or "development"

# Optional
STORAGE_PROVIDER=local   # or "r2"
STORAGE_PATH=/tmp/vimtrainer-uploads
LOG_LEVEL=info
```

### Docker Compose (Local Dev)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vimtrainer
      POSTGRES_USER: vimtrainer
      POSTGRES_PASSWORD: vimtrainer
    ports: ["5432:5432"]

  api:
    build: .
    environment:
      DATABASE_URL: postgres://vimtrainer:vimtrainer@postgres:5432/vimtrainer?sslmode=disable
      JWT_SECRET: dev-secret-change-in-production
      CORS_ALLOWED_ORIGINS: http://localhost:5173
      PORT: 8080
      ENVIRONMENT: development
    ports: ["8080:8080"]
    depends_on: [postgres]
```

---

## 6. Database Schema

10 tables. All primary keys are `UUID` (random, not sequential). All timestamps are `TIMESTAMPTZ`.

### Table: users

Dual-identity design: a row is either a registered user (email + password) or a guest (guest_token), enforced by a CHECK constraint.

```sql
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        UNIQUE,
    password_hash TEXT,
    display_name  TEXT        NOT NULL DEFAULT 'vim_user_' || substr(gen_random_uuid()::text, 1, 8),
    is_guest      BOOLEAN     NOT NULL DEFAULT FALSE,
    guest_token   TEXT        UNIQUE,
    current_streak INT        NOT NULL DEFAULT 0,
    longest_streak INT        NOT NULL DEFAULT 0,
    last_active_date DATE,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_user_identity CHECK (
        (is_guest = FALSE AND email IS NOT NULL AND password_hash IS NOT NULL AND guest_token IS NULL)
        OR
        (is_guest = TRUE AND email IS NULL AND password_hash IS NULL AND guest_token IS NOT NULL)
    )
);
```

### Table: keymaps

User's imported keymaps plus built-in motions. `is_builtin = TRUE` rows are shared (no `user_id`); user-imported rows have a `user_id` and `source_id`.

```sql
CREATE TABLE keymaps (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID    REFERENCES users(id) ON DELETE CASCADE,
    source_id      UUID    REFERENCES keymap_sources(id) ON DELETE SET NULL,
    key_sequence   TEXT    NOT NULL,
    mode           CHAR(1) NOT NULL CHECK (mode IN ('n','i','v','x','o','t','c')),
    description    TEXT    NOT NULL,
    category       TEXT    NOT NULL DEFAULT 'other'
                           CHECK (category IN ('motion','leader','lsp','navigation','editing','plugin','other')),
    difficulty     TEXT    NOT NULL DEFAULT 'intermediate'
                           CHECK (difficulty IN ('beginner','intermediate','advanced')),
    is_builtin     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, key_sequence, mode)
);
```

### Table: keymap_sources

Tracks where a batch of keymaps came from (file upload vs. GitHub import).

```sql
CREATE TABLE keymap_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('file_upload','github_import','builtin')),
    source_name TEXT NOT NULL,
    github_url  TEXT,
    parsed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: practice_sessions

One row per session. The `keymap_ids` array captures which keymaps were in the session and their order, fixed at creation.

```sql
CREATE TABLE practice_sessions (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode         TEXT    NOT NULL CHECK (mode IN ('practice','motion','leader','flashcard')),
    status       TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','completed','abandoned')),
    keymap_ids   UUID[]  NOT NULL,
    total_challenges INT NOT NULL DEFAULT 0,
    completed_challenges INT NOT NULL DEFAULT 0,
    correct_count INT    NOT NULL DEFAULT 0,
    avg_response_ms INT,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: practice_attempts

One row per individual keypress attempt within a session.

```sql
CREATE TABLE practice_attempts (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID    NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keymap_id      UUID    NOT NULL REFERENCES keymaps(id) ON DELETE CASCADE,
    typed_sequence TEXT    NOT NULL,
    is_correct     BOOLEAN NOT NULL,
    response_ms    INT     NOT NULL CHECK (response_ms >= 0),
    attempt_number INT     NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: spaced_repetition_records

One row per (user, keymap) pair. The SM-2 state. Created on first attempt; updated after each session.

```sql
CREATE TABLE spaced_repetition_records (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keymap_id       UUID         NOT NULL REFERENCES keymaps(id) ON DELETE CASCADE,
    ease_factor     NUMERIC(4,2) NOT NULL DEFAULT 2.50
                                 CHECK (ease_factor >= 1.30 AND ease_factor <= 2.50),
    interval_days   INT          NOT NULL DEFAULT 1 CHECK (interval_days >= 1),
    repetitions     INT          NOT NULL DEFAULT 0,
    next_review_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    correct_reviews INT          NOT NULL DEFAULT 0,
    total_reviews   INT          NOT NULL DEFAULT 0,
    avg_response_ms INT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_srs_user_keymap UNIQUE (user_id, keymap_id)
);
```

### Table: achievements

Static definitions seeded at startup (12 achievements). Not user-owned rows.

```sql
CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL CHECK (category IN ('practice','mastery','streak','import')),
    condition_type  TEXT NOT NULL,
    condition_value INT  NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: user_achievements

Junction table: which achievements a user has unlocked and when.

```sql
CREATE TABLE user_achievements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);
```

### Table: daily_queues

One row per (user, date). The queue is an ordered array of 20 keymap UUIDs, fixed at generation time. Cached for the entire day.

```sql
CREATE TABLE daily_queues (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    queue_date  DATE    NOT NULL DEFAULT CURRENT_DATE,
    keymap_ids  UUID[]  NOT NULL,
    completed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_queue_user_date UNIQUE (user_id, queue_date)
);
```

### Table: settings

One row per user. Created with defaults on registration.

```sql
CREATE TABLE settings (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme               TEXT    NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
    session_length      INT     NOT NULL DEFAULT 20 CHECK (session_length IN (10, 20, 30)),
    practice_sounds     BOOLEAN NOT NULL DEFAULT TRUE,
    show_key_hints      BOOLEAN NOT NULL DEFAULT TRUE,
    reduced_motion      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Key Indexes

```sql
-- Critical for daily queue generation (find weak keymaps for a user)
CREATE INDEX idx_srs_user_next_review ON spaced_repetition_records (user_id, next_review_at);
CREATE INDEX idx_srs_user_ease ON spaced_repetition_records (user_id, ease_factor ASC);

-- Session history queries
CREATE INDEX idx_sessions_user_created ON practice_sessions (user_id, created_at DESC);
CREATE INDEX idx_attempts_keymap_user ON practice_attempts (keymap_id, user_id);

-- Keymap filtering
CREATE INDEX idx_keymaps_user_category ON keymaps (user_id, category);
CREATE INDEX idx_keymaps_builtin ON keymaps (is_builtin) WHERE is_builtin = TRUE;
```

### Migrations

Three migration files, run with `golang-migrate` on API startup:

- `001_initial_schema.sql` — All 10 tables + indexes
- `002_seed_achievements.sql` — 12 achievement definitions
- `003_seed_builtin_keymaps.sql` — 68 built-in Vim motion keymaps

---

## 7. API Design

**Base URL**: `https://api.vimtrainer.dev/api/v1`  
**Response envelope**:
```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Error shape:
```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable description"
  }
}
```

All dates are ISO 8601. All IDs are UUIDs.

### Endpoint Summary (39 endpoints)

#### Auth (6 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register with email + password. Returns access token + sets refresh cookie. |
| POST | `/auth/login` | None | Login. Returns access token + sets refresh cookie. |
| POST | `/auth/refresh` | Refresh cookie | Exchange refresh cookie for new access token. |
| POST | `/auth/logout` | Registered JWT | Clears refresh cookie. Stateless (no token blocklist in V1). |
| POST | `/auth/guest` | None | Create guest session. Returns guest JWT (24h). Rate limited: 3/IP/hour. |
| POST | `/auth/guest/migrate` | Guest JWT | Migrate guest data to new registered account. Returns new access token. |

Key details:
- Passwords: bcrypt cost 12
- Register rate limit: 10/IP/hour
- Login rate limit: 20/IP/minute with exponential backoff hint on repeated failures
- Guest migration: transactional — re-assigns all sessions and SRS records atomically, then soft-deletes the guest user

#### Users (4 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Registered JWT | Profile + aggregate stats (streaks, total sessions, accuracy, commands mastered) |
| PUT | `/users/me` | Registered JWT | Update display_name |
| PUT | `/users/me/password` | Registered JWT | Change password (requires current password) |
| DELETE | `/users/me` | Registered JWT | Soft-delete account (requires `"confirmation": "delete my account"` in body) |

#### Keymaps (8 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/keymaps` | Registered JWT | List user's keymaps. Filterable by mode, category, source_id, search. Cursor pagination. |
| POST | `/keymaps/upload` | Guest or Registered | Upload file (.lua/.vim/.vimrc/.zip). Returns parse preview + `preview_token`. Does NOT persist. |
| POST | `/keymaps/upload/confirm` | Registered JWT | Persist a previous upload using `preview_token`. |
| POST | `/keymaps/github` | Guest or Registered | Start async GitHub import. Returns `job_id`. |
| GET | `/keymaps/github/status/:job_id` | Guest or Registered | Poll job status. States: pending/cloning/locating/parsing/complete/failed. |
| GET | `/keymaps/sources` | Registered JWT | List all import sources. |
| DELETE | `/keymaps/sources/:id` | Registered JWT | Soft-delete a source and its keymaps (preserves SRS history). |
| GET | `/keymaps/builtin` | Guest or Registered | List built-in Vim motion keymaps. Filterable by category/mode. |

GitHub import flow: File upload is synchronous. GitHub import is async (30-second clone timeout). Frontend polls `/keymaps/github/status/:job_id` with exponential backoff (1s → 2s → 4s → 8s max).

#### Sessions (4 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sessions` | Guest or Registered | Create session. Body: `{mode, length, keymap_ids[]}`. Returns session + ordered challenges. |
| POST | `/sessions/:id/attempts` | Guest or Registered | Record an attempt. Body: `{keymap_id, typed_sequence, response_ms}`. Returns feedback + SRS state. |
| POST | `/sessions/:id/complete` | Guest or Registered | Mark session completed. Returns summary + unlocked achievements. |
| GET | `/sessions/daily-queue` | Registered JWT | Get today's queue. Creates if not exists (20 keymaps: 10 weakest + 5 unpracticed + 5 random). |

Session modes:
- `practice`: draws from user's imported keymaps, SRS-prioritized
- `motion`: draws from built-in Vim motions only  
- `leader`: draws from keymaps with category = 'leader'
- `flashcard`: draws from SRS records where `next_review_at <= NOW()`, ordered by due date

Valid session lengths: 10, 20, 30.

#### Analytics (4 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/summary` | Registered JWT | Dashboard summary: accuracy trend (30d), response time trend, category breakdown, mastery score, most missed commands |
| GET | `/analytics/commands/:id` | Registered JWT | Per-command history: all attempts, accuracy over time, response time percentiles |
| GET | `/analytics/heatmap` | Registered JWT | Practice activity heatmap data (GitHub-style calendar) |
| GET | `/analytics/categories` | Registered JWT | Category-level mastery scores |

#### Achievements (2 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/achievements` | Registered JWT | All 12 achievements with unlock status and progress |
| GET | `/achievements/unlocked` | Registered JWT | Only unlocked achievements, sorted by unlock date |

#### Queue (1 endpoint)

GET `/sessions/daily-queue` (see Sessions above).

#### Settings (2 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | Registered JWT | Get user settings |
| PATCH | `/settings` | Registered JWT | Update settings (partial update — only sent fields are changed) |

---

## 8. Authentication Strategy

### Token Types

**Access Token** — Short-lived, sent in every API request header.
- Algorithm: HS256
- Expiry: 15 minutes
- Transport: `Authorization: Bearer <token>`
- Claims: `{iss, sub (user UUID), type: "access", is_guest: bool, iat, exp}`

**Refresh Token** — Long-lived, httpOnly cookie.
- Algorithm: HS256
- Expiry: 30 days
- Transport: httpOnly cookie named `refresh_token`
- Cookie attributes: `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`
- No token blocklist in V1 (stateless). V2 upgrade: store JTI to enable revocation.

**Guest Token** — Access token with `is_guest: true`.
- Expiry: 24 hours (not 15 minutes — supports longer sessions without refresh)
- No refresh token issued for guests
- Used as `Authorization: Bearer <guest_token>` on practice endpoints

### Auth Middleware Stack (applied in order)

```
Request
  └── CORSMiddleware          — handles preflight, sets Access-Control-* headers
  └── LoggerMiddleware        — logs method, path, status, latency
  └── RecoveryMiddleware      — catches panics → 500 with stack trace in server logs
  └── RateLimiterMiddleware   — token bucket per IP or user ID
  └── JWTAuthMiddleware       — on protected routes: validates Bearer token, sets ctx user
  └── GuestAuthMiddleware     — on guest-ok routes: accepts either JWT or X-Guest-Token
  └── Handler
```

### Guest Migration Transaction

When a guest registers (POST `/auth/guest/migrate`):

1. Validate guest JWT and email availability
2. Begin database transaction
3. Create registered user row (email + bcrypt password hash)
4. `UPDATE practice_sessions SET user_id = $new_id WHERE user_id = $guest_id`
5. `UPDATE spaced_repetition_records SET user_id = $new_id WHERE user_id = $guest_id`
6. Soft-delete guest user row (`deleted_at = NOW()`)
7. Commit transaction
8. Issue new access token + refresh cookie for registered user

All practice history and SRS state transfers atomically. If any step fails, the transaction rolls back and the guest session remains valid.

### Security Properties

- Passwords: bcrypt cost 12 (~300ms hash time — balances security vs. UX)
- CORS: explicit origin whitelist (no wildcard `*`)
- CSRF: mitigated by `SameSite=Strict` on refresh cookie
- XSS: mitigated by `HttpOnly` on refresh cookie (access token never touches localStorage — kept in memory only)
- Rate limits: aggressive on auth endpoints (register: 10/IP/hour, login: 20/IP/minute)

---

## 9. Backend Architecture

### Go Module Structure

```
backend/
├── cmd/server/main.go              # Composition root: DI wiring, router setup, server start
├── internal/
│   ├── apperrors/errors.go         # AppError type, sentinel errors, HTTP status mapping
│   ├── auth/
│   │   ├── jwt.go                  # Token generation, validation, claims parsing
│   │   └── password.go             # bcrypt hash/compare helpers
│   ├── config/config.go            # Config struct, Load() from env with validation
│   ├── database/
│   │   ├── database.go             # GORM setup, connection pool config, ping
│   │   └── migrations.go           # golang-migrate runner (auto in dev, check in prod)
│   ├── handlers/                   # One file per resource group
│   │   ├── auth_handler.go
│   │   ├── user_handler.go
│   │   ├── keymap_handler.go
│   │   ├── session_handler.go
│   │   ├── analytics_handler.go
│   │   ├── achievement_handler.go
│   │   └── settings_handler.go
│   ├── middleware/
│   │   ├── cors.go
│   │   ├── logger.go
│   │   ├── recovery.go
│   │   ├── rate_limiter.go
│   │   ├── jwt_auth.go
│   │   └── guest_auth.go
│   ├── models/                     # GORM model structs (10 files, one per table)
│   ├── repository/
│   │   ├── interfaces.go           # All repository interfaces defined here
│   │   └── *_repository.go        # One implementation file per interface
│   ├── services/
│   │   ├── keymap_parser_service.go    # Pure parser: .lua/.vim → []ParsedKeymap
│   │   ├── github_import_service.go   # clone → locate → parse → cleanup pipeline
│   │   ├── srs_service.go             # SM-2 algorithm, queue generation
│   │   ├── analytics_service.go       # Dashboard aggregations
│   │   ├── achievement_service.go     # Check and unlock achievements
│   │   └── daily_queue_service.go     # Generate and manage daily queues
│   └── storage/
│       ├── storage.go              # StorageService interface
│       ├── local.go                # LocalStorageService (default)
│       └── r2.go                   # R2StorageService (Cloudflare R2, future)
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_seed_achievements.sql
│   └── 003_seed_builtin_keymaps.sql
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── go.mod
└── Makefile
```

### Service Layer

**KeymapParserService** — Pure transformation, no DB dependency.
- `ParseFile(ctx, filePath)` — parse single `.lua` or `.vim` file
- `ParseDirectory(ctx, dir)` — walk dir, parse all `.lua`/`.vim` files
- `ParseZip(ctx, zipPath)` — extract to temp, call ParseDirectory, cleanup

Lua parser strategy: Multi-pass line scanner. Pass 1: `vim.keymap.set` calls (handles multi-line by tracking open/close parens). Pass 2: `vim.api.nvim_set_keymap` calls. Partial failures accumulate into `LinesFailed` — never fatal.

Vimscript parser: Single-pass regex scanner for `nnoremap`, `inoremap`, `vnoremap`, `xnoremap`, `nmap`, `imap`, `vmap`, `xmap`.

**GitHubImportService** — Async pipeline.
1. Validate GitHub URL (must be `https://github.com/user/repo`)
2. `os.MkdirTemp` → `defer os.RemoveAll(tmpDir)` (always cleaned up)
3. `git clone` with 30-second context timeout
4. Locate Neovim config: try `.config/nvim` → `nvim/` → BFS for `init.lua` (max depth 4)
5. Detect framework: lazyvim, astronvim, nvchad, kickstart, unknown
6. Call ParseDirectory
7. Return result via channel for polling

The handler runs this in a goroutine and stores progress + result in a jobs map keyed by `job_id`. Frontend polls status endpoint.

**SpacedRepetitionService** — SM-2 algorithm. See Section 13.

**DailyQueueService** — Generates 20-keymap daily queue:
- 10 keymaps with lowest `ease_factor` (hardest for user)
- 5 keymaps the user has never practiced (`total_reviews = 0`)
- 5 random keymaps from remaining set
- Stores result in `daily_queues` table; returns cached queue if today's row exists

### Dependency Injection

`cmd/server/main.go` is the composition root. No global state, no `init()` functions for DI. All dependencies wired explicitly:

```go
// Wiring order: config → db → storage → repos → services → handlers → router → server
cfg := config.Load()
db := database.Connect(cfg.DatabaseURL)
// ... wire each layer
```

---

## 10. Frontend Architecture

### Tech Stack

- React 18 + TypeScript 5
- Vite 5 (build tool + dev server)
- React Router v6 (`createBrowserRouter`)
- TanStack Query v5 (data fetching, caching)
- Zustand (state management)
- Recharts (analytics charts)
- Axios (HTTP client with interceptors)
- Custom CSS only (BEM-lite naming, no CSS Modules, no CSS-in-JS)

### Directory Structure

```
frontend/src/
├── assets/                    # Fonts, icons, static files
├── components/
│   ├── ui/                    # Stateless primitives (Button, Input, Badge, Card, KeyChip, ...)
│   ├── layout/                # AppShell, Sidebar, TopBar, AuthLayout
│   ├── practice/              # PracticeArena, ChallengeDisplay, KeyInput, ResultFeedback
│   ├── charts/                # AccuracyTrendChart, ResponseTimeTrendChart, etc.
│   └── guards/                # AuthGuard, GuestGuard (route protection)
├── pages/
│   ├── LandingPage.tsx        # Eagerly loaded (always needed)
│   ├── auth/                  # LoginPage, RegisterPage
│   ├── practice/              # PracticePage, MotionsPage, LeaderPage, FlashcardsPage
│   ├── DashboardPage.tsx
│   ├── ImportPage.tsx
│   ├── ProfilePage.tsx
│   ├── SettingsPage.tsx
│   └── NotFoundPage.tsx
├── stores/                    # Zustand stores (5 stores)
├── hooks/                     # Custom hooks (useGlobalShortcuts, useStoreHydration, ...)
├── services/                  # Axios instance + API call functions
├── types/                     # TypeScript types (models.ts, api.ts, stores.ts)
├── styles/                    # CSS files (tokens.css, reset.css, base.css, components/*)
├── router.tsx                 # createBrowserRouter route tree
├── App.tsx
└── main.tsx
```

### Routing

All routes defined in `src/router.tsx`. Three layout contexts:

1. **No layout** — `LandingPage` at `/` (standalone, no sidebar or topbar)
2. **AuthLayout** — wrapped in `GuestGuard` (redirects logged-in users away). Used by `/auth/login` and `/auth/register`.
3. **AppShell** — full sidebar + topbar. Used by all practice, import, profile, settings pages.

All pages except `LandingPage` are lazy-loaded with `React.lazy()` + `<Suspense fallback={<PageSkeleton />}>`. Practice pages load first in the bundle split.

Route guards:
- `GuestGuard`: redirects authenticated users from `/auth/*` to `/practice`
- `AuthGuard`: redirects unauthenticated users from protected routes to `/auth/login`
- Guest users CAN access `/practice`, `/practice/motions`, `/practice/leader`, `/practice/flashcards`
- Guest users CANNOT access `/dashboard`, `/import`, `/profile`, `/settings`

Cloudflare Pages `_redirects` file:
```
/api/*  https://api.vimtrainer.dev/api/:splat  200
/*      /index.html  200
```

### Zustand Stores (5 stores)

**authStore** — User identity and session state.
```typescript
{
  user: User | null;
  guestToken: string | null;
  accessToken: string | null;  // in-memory only, never localStorage
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  // actions: login, logout, setGuestToken, refreshToken, migrateGuest
}
```

**practiceStore** — Active session state.
```typescript
{
  sessionId: string | null;
  mode: PracticeMode | null;
  challenges: Challenge[];
  currentIndex: number;
  currentChallenge: Challenge | null;
  capturedKeys: string[];     // keys captured for multi-key sequences
  isCapturing: boolean;
  lastResult: AttemptResult | null;
  sessionStats: SessionStats;
  // actions: startSession, submitAttempt, nextChallenge, completeSession, resetSession
}
```

**keymapStore** — Keymap library.
```typescript
{
  keymaps: Keymap[];
  sources: KeymapSource[];
  builtinKeymaps: Keymap[];
  filters: KeymapFilters;
  isLoading: boolean;
  // actions: setFilters, invalidateCache
}
```

**settingsStore** — User preferences. Persisted to localStorage via Zustand `persist` middleware.
```typescript
{
  theme: 'dark' | 'light' | 'system';
  sessionLength: 10 | 20 | 30;
  practiceSounds: boolean;
  showKeyHints: boolean;
  reducedMotion: boolean;
  // actions: updateSetting, syncFromServer, resetToDefaults
}
```

**uiStore** — Transient UI state.
```typescript
{
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];
  // actions: toggleSidebar, openModal, closeModal, addToast, removeToast
}
```

### Global Keyboard Shortcuts

`useGlobalShortcuts` hook registers keyboard shortcuts at the document level (not inside practice arena). Shortcuts:
- `Ctrl+K` — open command palette
- `Ctrl+/` — toggle sidebar
- `g p` — navigate to Practice (vim-style navigation shortcut)
- `g d` — navigate to Dashboard
- `g i` — navigate to Import
- Shortcuts are suppressed when focus is inside `<input>`, `<textarea>`, or the active practice arena

### API Client

Axios instance at `src/services/api.ts`. Two interceptors:
1. **Request interceptor**: adds `Authorization: Bearer <accessToken>` from `authStore`
2. **Response interceptor**: on 401, calls `POST /auth/refresh`, updates `accessToken` in `authStore`, retries the original request. If refresh fails (cookie expired), calls `authStore.logout()` and redirects to login.

---

## 11. Design System

Design inspiration: MonkeyType (typography-forward), Linear (precise, keyboard-first), Raycast (dark, beautiful, command-first), Neovim (terminal aesthetics).

Brand personality: **Precise. Terminal-native. Addictive.**

Anti-references (things to explicitly avoid):
- MonkeyType gradient/blur aesthetics
- Generic SaaS dashboard stat cards with colored left borders
- Marketing-site section scaffolding (numbered 01/02/03 eyebrows)
- VS Code dark blue (`#1e1f29` family)
- Linear's blue — VimTrainer uses indigo

### Color Palette (Dark Theme — Default)

```css
/* Background scale */
--bg-base:     #0D0D0D;   /* Page background — near black */
--bg-surface:  #141414;   /* Cards, panels, sidebar */
--bg-elevated: #1C1C1C;   /* Dropdowns, modals, popovers */
--bg-overlay:  #242424;   /* Tooltip backgrounds, hover on elevated */

/* Text scale — all WCAG AA compliant */
--text-primary:   #E8E8E8;  /* Body copy — high contrast */
--text-secondary: #A0A0A0;  /* Subheadings, metadata */
--text-muted:     #858585;  /* Placeholders — 5.52:1 on bg-base ✓ */
--text-disabled:  #404040;  /* Non-interactive text */

/* Brand / Accent */
--accent:       #7C8CF8;  /* Indigo — primary CTA, active nav, focus rings */
--accent-hover: #6B7AF0;
--accent-muted: #2A2D4A;  /* Accent tint background */

/* Semantic */
--success:       #4ADE80;  /* Correct answer */
--success-muted: #0F2A1A;
--error:         #F87171;  /* Incorrect answer */
--error-muted:   #2A0F0F;
--warning:       #FBBF24;
--warning-muted: #2A1F0A;

/* Borders */
--border-subtle:  #1F1F1F;
--border-default: #2A2A2A;
--border-strong:  #3A3A3A;
--border-accent:  #7C8CF8;

/* Focus ring — theme-adaptive */
--input-focus-ring-color: color-mix(in srgb, var(--accent) 20%, transparent);
```

### Light Theme Overrides

```css
html.light {
  --bg-base:     #FAFAFA;
  --bg-surface:  #FFFFFF;
  --bg-elevated: #F0F0F0;
  --text-primary:   #0D0D0D;
  --text-secondary: #3D3D3D;
  --text-muted:     #717171;  /* 4.54:1 on #FAFAFA ✓ */
  --accent:       #4D5EE8;    /* 4.92:1 on #FAFAFA ✓ */
  --accent-hover: #3D4EDA;
}
```

### Typography

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Type scale */
--text-xs:   11px;   /* Metadata, footnotes, badge labels */
--text-sm:   13px;   /* Helper text, table cells */
--text-base: 15px;   /* Body copy, form labels */
--text-md:   16px;   /* Card headings, input values */
--text-lg:   18px;   /* Section headings */
--text-xl:   20px;   /* Page subheadings */
--text-2xl:  24px;   /* Page headings */
--text-3xl:  30px;   /* Analytics section headings */
--text-4xl:  36px;   /* Challenge description (hero text) */
--text-5xl:  48px;   /* Mastery score gauge */
```

### Key Chip — Central Design Motif

The key chip (rendered keybinding) is the most important visual element. It must look like a real physical key.

```css
.key-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--key-bg);      /* #1E1E1E */
  color: var(--key-text);         /* #E8E8E8 */
  border-width: 1px 1px 3px 1px; /* bottom border creates 3D depth illusion */
  border-style: solid;
  border-color: var(--key-border) var(--key-border) var(--key-shadow) var(--key-border);
  white-space: nowrap;
  user-select: none;
}

/* Leader key — distinct indigo color */
.key-chip--leader {
  background: var(--key-leader-bg);      /* #2A2D4A */
  border-color: var(--key-leader-border); /* #4A4F8A */
  color: var(--key-leader-text);          /* #7C8CF8 */
}
```

The `border-width: 1px 1px 3px 1px` bottom border is the design detail that makes keychips feel real — it simulates the physical depth of a physical keycap.

### Motion

```css
--duration-instant: 50ms;
--duration-fast:    100ms;
--duration-normal:  200ms;
--duration-slow:    350ms;

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);  /* Expo out — snappy */
--ease-in:     cubic-bezier(0.7, 0, 0.84, 0);
--ease-spring: cubic-bezier(0.34, 1.1, 0.64, 1); /* Subtle spring, no bounce */

/* Practice arena feedback animations */
@keyframes flash-correct {
  0%   { background-color: var(--success-muted); }
  100% { background-color: transparent; }
}

@keyframes flash-incorrect {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-4px); }
  40%       { transform: translateX(4px); }
  60%       { transform: translateX(-2px); }
  80%       { transform: translateX(2px); }
}
```

All animations respect `@media (prefers-reduced-motion: reduce)` — feedback is instant color change, no shake.

### CSS Naming Convention

BEM-lite: `.component__element--modifier`. No CSS Modules, no CSS-in-JS. Global CSS files organized by component.

```
src/styles/
├── tokens.css          # All CSS custom properties (the above)
├── reset.css           # Minimal reset (box-sizing, margin, padding)
├── base.css            # html, body, typography defaults
├── components/
│   ├── button.css
│   ├── input.css
│   ├── badge.css
│   ├── card.css
│   ├── key-chip.css
│   ├── practice-arena.css
│   ├── sidebar.css
│   └── ...
└── index.css           # Imports everything
```

### Accessibility Requirements (WCAG AA)

- All body text: ≥ 4.5:1 contrast
- All large text / interactive labels: ≥ 3:1
- Full keyboard navigation — no feature requires a mouse
- `prefers-reduced-motion` respected on all animations
- Focus rings visible on all interactive elements
- Focus rings suppressed only inside the **active** practice arena (visual noise during key capture)
- Semantic HTML throughout, ARIA labels on icon-only buttons

---

## 12. Practice Engine Design

### Session Lifecycle

```
POST /sessions → session created, keymap_ids fixed, challenges returned
  ↓ (for each challenge)
POST /sessions/:id/attempts → attempt recorded, SRS updated, feedback returned
  ↓ (after all challenges complete)
POST /sessions/:id/complete → session marked complete, achievements checked, summary returned
```

### Key Capture (Frontend)

The practice arena captures keystrokes via a hidden `<input>` with `autoFocus`. The challenge is active when `practiceStore.isCapturing = true`.

**Multi-key sequence handling**: Leader-prefixed sequences (e.g., `<leader>ff`) require capturing a sequence of keypresses. The arena:
1. Listens for `keydown` events
2. Maps special keys: `<leader>` = `,` or `\` depending on user config, `<CR>` = Enter, `<BS>` = Backspace, etc.
3. Accumulates keys in `capturedKeys[]`
4. Matches against expected sequence on each keypress
5. On match or timeout (2 seconds after last keypress), submits attempt

**Timeout behavior**: 2-second idle timeout submits the partial sequence as incorrect and moves to next challenge.

**Focus ring suppression**: The active practice arena removes focus rings from all inner elements (`.practice-arena--active .key-input:focus-visible`) to eliminate visual noise during key capture. Focus rings are NOT globally suppressed — only inside the active session.

### Practice Modes

| Mode | Source | Selection Strategy |
|------|--------|--------------------|
| `practice` | User's imported keymaps | SRS-prioritized daily queue |
| `motion` | Built-in Vim motions | By difficulty tier (beginner/intermediate/advanced) |
| `leader` | User keymaps where `key_sequence` starts with leader prefix | SRS-prioritized |
| `flashcard` | User keymaps with SRS records | By `next_review_at ASC` (most overdue first) |

### Feedback States

1. **Idle** — challenge displayed, waiting for input
2. **Capturing** — user has started typing, keys are being accumulated
3. **Correct** — green flash (`--success-muted` background, 300ms), advance to next after 800ms
4. **Incorrect** — red shake animation (translateX oscillation, 400ms), show correct answer, advance after 1200ms

### Session Stats Tracked

Per session: `correct_count`, `total_challenges`, `avg_response_ms`, `completed_challenges`.
Per attempt: `is_correct`, `response_ms`, `typed_sequence`, `attempt_number`.

---

## 13. Spaced Repetition Design

### Algorithm: Modified SM-2

Deterministic, server-side, no AI/ML. Runs in `SpacedRepetitionService.UpdateAfterAttempt()`.

**SRS record fields per (user, keymap) pair**:
- `ease_factor`: float, default 2.50, floor 1.30, ceiling 2.50
- `interval_days`: int, default 1, minimum 1
- `repetitions`: int, default 0 (number of consecutive correct reviews)
- `next_review_at`: timestamp, default NOW()

**Quality score mapping**:

| Result | Response Time | Quality (q) |
|--------|---------------|-------------|
| Correct | < 1000ms | 5 (perfect) |
| Correct | 1000-2000ms | 4 (correct) |
| Correct | > 2000ms | 3 (correct but slow) |
| Incorrect | any | 1 (failed) |

**SM-2 update rules**:

```go
func UpdateSRSRecord(record *SRSRecord, quality int) {
    if quality >= 3 {
        // Correct
        switch record.Repetitions {
        case 0:
            record.IntervalDays = 1
        case 1:
            record.IntervalDays = 6
        default:
            record.IntervalDays = int(float64(record.IntervalDays) * record.EaseFactor)
        }
        record.Repetitions++
        // Ease factor update: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
        ef := record.EaseFactor + (0.1 - float64(5-quality)*(0.08+float64(5-quality)*0.02))
        record.EaseFactor = clamp(ef, 1.30, 2.50)
    } else {
        // Incorrect — reset interval, reduce ease
        record.Repetitions = 0
        record.IntervalDays = 1
        record.EaseFactor = math.Max(1.30, record.EaseFactor - 0.20)
    }
    record.NextReviewAt = time.Now().Add(time.Duration(record.IntervalDays) * 24 * time.Hour)
}
```

### Queue Generation

Daily queue = 20 keymaps, generated once per day, cached in `daily_queues` table:

```
10 keymaps with lowest ease_factor WHERE next_review_at <= NOW()
 + 5 keymaps WHERE total_reviews = 0 (never practiced)
 + 5 random keymaps from remaining set
```

If the user has fewer than 20 keymaps total, all available keymaps are included. If no SRS records exist yet (new user), the queue draws from unpracticed keymaps in difficulty order.

### Mastery Definition

A keymap is considered **mastered** when:
- `correct_reviews / total_reviews >= 0.80` AND
- `total_reviews >= 5`

This threshold is used in analytics (commands_mastered count) and achievement conditions.

---

## 14. Milestone Roadmap

**32 working days, 1 senior full-stack engineer, 8 milestones.**

MVP complete at end of M5 (Day 20). M6–M8 are V1 additions that can ship iteratively after the core loop is usable.

### Milestone Summary

| # | Name | Days | Cumulative | Goal |
|---|------|------|-----------|------|
| M1 | Foundation & Infrastructure | 3 | 3 | Docker Compose boots. DB migrates. Health endpoint. Vite shell loads. |
| M2 | Authentication & Guest Mode | 4 | 7 | Register/login/logout. Guest JWT. Token refresh. Guest migration. |
| M3 | Keymap Import & Library | 5 | 12 | File upload + GitHub import. Lua/Vim parser. Built-in motions seeded. Import UI. |
| M4 | Core Practice Engine | 6 | 18 | All 4 practice modes. SRS algorithm. Daily queue. Multi-key capture. Session complete. |
| M5 | Settings & Profile | 3 | 21 | Settings CRUD. Profile page. Theme toggle. Session length preference. |
| M6 | Analytics Dashboard | 4 | 25 | 5 charts. Category breakdown. Mastery gauge. Most-missed table. Heatmap. |
| M7 | Achievements & Streaks | 3 | 28 | 12 achievements. Streak tracking. Achievement unlock on session complete. |
| M8 | Polish, Performance & Deployment | 4 | 32 | Empty states. Loading skeletons. Error boundaries. Production deploy. |

### Critical Path

```
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
```

All milestones are sequential. No meaningful parallelism for a single engineer. **M4 is the longest and highest-risk milestone.**

### Top 3 Risks

1. **Multi-key sequence capture** (M4): Intercepting `<leader>ff` style sequences across browser/OS keydown handling is the most technically uncertain work. Budget +1 day if the first approach fails.

2. **Lua parser correctness** (M3): Real-world Neovim configs have wildly inconsistent keymap call patterns. A naive parser will fail on real dotfiles. Must handle at minimum 5 common patterns — `vim.keymap.set` (inline and table-form), `vim.api.nvim_set_keymap`, `which_key.register` (V2), multi-line calls.

3. **SRS + queue interaction correctness** (M4): The SM-2 algorithm must produce correct ease factor updates and intervals. A subtle off-by-one silently corrupts every user's practice quality. Verify against known SM-2 test vectors before shipping.

### Definition of Done

A feature is done when:
- Unit tests pass for all service-layer logic
- API endpoint returns correct response for happy path AND all documented error cases
- Frontend renders correct UI state for loading, success, and error
- WCAG AA contrast maintained on all new UI elements
- `prefers-reduced-motion` fallback implemented for any new animation
- No TypeScript errors (`tsc --noEmit`)
- No Go vet errors (`go vet ./...`)
- Feature manually tested in Chrome and Firefox

### M1 Acceptance Criteria

- `docker compose up` → both containers healthy within 60 seconds
- `curl localhost:8080/health` → `{"status":"ok","version":"0.1.0"}`
- All migration files run; all 10 tables exist in DB
- `npm run dev` → Vite starts on port 5173, browser shows page, zero console errors
- Navigate to `/foo` → app renders recognizable not-found state (no browser 404)

---

## Appendix: Key Decisions Log

| Decision | Choice | Alternatives Considered | Reason |
|----------|--------|------------------------|--------|
| Auth provider | JWT in Go | Supabase Auth, Auth0, Clerk | No external auth dependency; portable across any hosting provider; simpler for self-hosting |
| CSS approach | Custom CSS + BEM-lite | Tailwind, CSS Modules, styled-components | Terminal aesthetic requires precise control; Tailwind's utility classes are antithetical to the design language; zero runtime overhead |
| DB auth | Row in `users` table | Separate auth DB, Redis sessions | Single system of record; simpler for self-hosting |
| Guest sessions | Server-side JWT | localStorage, sessionStorage | Guest data can migrate to registered account; works across browser tabs; consistent with auth model |
| SRS algorithm | SM-2 variant | SM-4, neural adaptive, random | Deterministic; no AI; well-understood; correct for flashcard-style learning |
| File storage | Local filesystem + interface | Supabase Storage, S3 | V1 simplicity; swap to R2 by changing env var, not code |
| Monetization | None in V1 | Freemium, Pro tier | Validate PMF before monetizing; open source trust |
| Hosting | Cloud Run + Cloudflare Pages | Vercel, Railway, Fly.io | Must be cloud-agnostic; these were chosen as defaults, not lock-ins |

---

*For deep implementation detail, see `docs/` subdirectories. For design audit results and specific WCAG fixes, see `docs/phase4-frontend/design-audit.md`.*
