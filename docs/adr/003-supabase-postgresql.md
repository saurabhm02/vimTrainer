# ADR-003: Supabase PostgreSQL (Auth Not Used)

**Date**: 2026-06-16  
**Status**: Accepted  
**Deciders**: Project leads

---

## Context

VimTrainer requires a production-grade PostgreSQL database. The options evaluated:

1. **Supabase PostgreSQL** — managed PostgreSQL with optional extras (Auth, Realtime, Storage)
2. **PlanetScale** — managed MySQL (not PostgreSQL)
3. **Neon** — serverless PostgreSQL
4. **Google Cloud SQL** — managed PostgreSQL from Google
5. **Self-hosted PostgreSQL** — user-managed

## Decision

Use Supabase as the managed PostgreSQL provider. Use **only the database** — Supabase Auth, Supabase Storage, Supabase Realtime, and all other Supabase services are explicitly excluded from V1.

## Rationale

**Generous free tier for early validation.** Supabase's free tier includes 500MB database storage, 2GB bandwidth, and 50,000 monthly active users — more than sufficient to validate VimTrainer before any paid infrastructure is required.

**PostgreSQL compatibility.** Supabase is genuine PostgreSQL (not a MySQL wrapper, not a proprietary query language). GORM, `golang-migrate`, and all standard PostgreSQL features work without modification. The same migrations run against a local PostgreSQL container and Supabase.

**pgBouncer included.** Supabase provides a PgBouncer connection pooler endpoint at port 6543. This is the primary connection string used in production. Combined with the Go API's GORM connection pool configuration, this keeps total server connections under the Supabase limit.

**Not coupled to Supabase features.** By using only the database, VimTrainer can migrate to any PostgreSQL provider (Neon, Cloud SQL, self-hosted) by changing one environment variable (`DATABASE_URL`). There are no Supabase SDK calls, no Row Level Security policies, no Supabase-specific extensions in the schema (beyond `pgcrypto` for `gen_random_uuid()`, which is standard).

**Auth is handled in Go (see ADR-001).** Supabase Auth was explicitly rejected. Using Supabase Auth would couple user identity to Supabase and make the guest migration transaction require cross-system coordination.

## Consequences

- **Positive**: Free tier sufficient for V1 validation with real users.
- **Positive**: Standard PostgreSQL — portable, no proprietary features.
- **Positive**: pgBouncer built-in at port 6543, eliminates need to self-host pgBouncer.
- **Positive**: Point-in-time recovery, automatic backups, dashboard for manual queries — operational tooling included.
- **Negative**: Supabase has had occasional downtime incidents. Mitigated by the fact that the Go API handles database connection errors gracefully (GORM retry on startup, 500 with retry guidance to clients).
- **Negative**: The `pgcrypto` extension must be enabled in Supabase project settings (it is by default). This is a one-time setup step, documented in the deployment runbook.
- **Negative**: Self-hosters who want to avoid Supabase entirely must run their own PostgreSQL and pgBouncer. The `docker-compose.yml` provides this for local development; the same compose file serves as the self-hosted production reference.

## Schema Portability

The three migration files (`001_initial_schema.sql`, `002_seed_achievements.sql`, `003_seed_builtin_keymaps.sql`) contain only standard PostgreSQL DDL. They run without modification against:
- `postgres:16-alpine` Docker container (local dev)
- Supabase (production default)
- Neon, Cloud SQL, RDS, or any PostgreSQL 14+ instance

## Connection String Configuration

```bash
# Supabase transaction pooler (production — use port 6543)
DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

# Direct connection (migrations only — port 5432)
DATABASE_DIRECT_URL=postgres://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require

# Local dev
DATABASE_URL=postgres://vimtrainer:vimtrainer@localhost:5432/vimtrainer?sslmode=disable
```

`golang-migrate` uses `DATABASE_DIRECT_URL` for migrations (pgBouncer transaction mode does not support the `SET` statements that some migration tools use). The Go API uses `DATABASE_URL` (pooler) for all runtime queries.
