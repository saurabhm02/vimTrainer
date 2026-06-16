# System Design: VimTrainer
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Architecture Team
**Status**: Approved

---

## 1. High-Level Architecture

### 1.1 System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                            │
│                                                                     │
│   Browser (React SPA)              GitHub API (external)           │
│   vimtrainer.dev                   api.github.com                  │
└──────────────┬──────────────────────────────────────────────────────┘
               │ HTTPS (TLS 1.3)
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                      CLOUDFLARE EDGE                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Cloudflare Pages                                           │   │
│  │  - Serves React SPA static assets (HTML/JS/CSS)             │   │
│  │  - Global CDN (300+ PoPs)                                   │   │
│  │  - TLS termination                                          │   │
│  │  - DDoS protection                                          │   │
│  │  - Cache-Control for static assets (immutable hashes)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Cloudflare DNS → proxies /api/* requests to Cloud Run             │
└──────────────┬──────────────────────────────────────────────────────┘
               │ HTTPS → proxied to origin
               │ (Cloudflare ↔ Cloud Run is TLS-encrypted)
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                   GOOGLE CLOUD RUN                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Go API Container (Gin framework)                           │   │
│  │                                                             │   │
│  │  Middleware Stack:                                          │   │
│  │    RequestLogger → Recovery → CORS → RateLimiter           │   │
│  │    → JWTAuth (protected routes)                            │   │
│  │    → GuestAuth (practice routes)                           │   │
│  │                                                             │   │
│  │  Route Groups:                                              │   │
│  │    /api/auth        AuthHandler                             │   │
│  │    /api/users       UserHandler                             │   │
│  │    /api/keymaps     KeymapHandler                           │   │
│  │    /api/sessions    SessionHandler                          │   │
│  │    /api/analytics   AnalyticsHandler                        │   │
│  │    /api/achievements AchievementHandler                     │   │
│  │    /api/settings    SettingsHandler                         │   │
│  │    /api/health      HealthHandler                           │   │
│  │                                                             │   │
│  │  Services:                                                  │   │
│  │    KeymapParserService  SpacedRepetitionService             │   │
│  │    GitHubImportService  AnalyticsService                    │   │
│  │    AchievementService   DailyQueueService                   │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │                                      │
│          ┌───────────────────┼────────────────────┐               │
│          │                   │                    │               │
│          ▼                   ▼                    ▼               │
│  ┌────────────┐    ┌──────────────────┐  ┌──────────────────┐    │
│  │  Storage   │    │  Tmp Filesystem  │  │  GitHub API      │    │
│  │  Interface │    │  (git clone dir) │  │  (HTTP client)   │    │
│  │            │    │  ephemeral per   │  │  git clone via   │    │
│  │  Local:    │    │  request         │  │  os/exec         │    │
│  │  /data/    │    └──────────────────┘  └──────────────────┘    │
│  │  uploads/  │                                                   │
│  │            │                                                   │
│  │  Future:   │                                                   │
│  │  R2 Bucket │                                                   │
│  └────────────┘                                                   │
└──────────────┬──────────────────────────────────────────────────────┘
               │ TCP (pgBouncer connection pool)
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                      SUPABASE                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  pgBouncer (connection pooler)                              │   │
│  │  Transaction mode — max 25 server connections               │   │
│  │  Pool size: 10 per Go instance                              │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐   │
│  │  PostgreSQL 15                                              │   │
│  │                                                             │   │
│  │  Tables:                                                    │   │
│  │    users               keymaps                              │   │
│  │    keymap_sources      practice_sessions                    │   │
│  │    practice_attempts   spaced_repetition_records            │   │
│  │    achievements        user_achievements                    │   │
│  │    daily_queues        settings                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Request Flow: Typical Practice Session

A registered user arrives at `vimtrainer.dev`, loads the app, and starts a practice session. Here is every hop in order.

**Step 1 — SPA Load**
The browser requests `vimtrainer.dev`. Cloudflare Pages serves the pre-built `index.html` from edge cache. The browser then fetches `assets/index.[hash].js` — also served from Cloudflare's CDN with `Cache-Control: public, max-age=31536000, immutable`. The entire SPA loads in one network round-trip (HTML) plus one parallel fetch (JS bundle). No backend is involved.

**Step 2 — Auth Check**
On mount, the React app reads the JWT access token from `localStorage`. If present and not expired (checked client-side against the `exp` claim), the `authStore` marks the user as authenticated. No network call is needed for this check.

**Step 3 — Fetch Daily Queue**
The `DashboardPage` uses a TanStack Query hook: `useQuery({ queryKey: ['dailyQueue', userId], ... })`. This fires `GET /api/sessions/daily-queue`. The request goes browser → Cloudflare (no cache on dynamic API routes) → Cloud Run Go container. The `JWTAuth` middleware validates the token. The `DailyQueueService` checks if a queue already exists for today (UTC) for this user and returns it, or generates and persists a new one.

**Step 4 — Practice Session**
The user starts a session. `GET /api/keymaps/practice?session_id={id}` fetches the ordered list of challenges for the session. The response includes: `id`, `lhs`, `mode`, `description`, `category`. No correct answers are sent to the client — the Go API validates answers server-side.

**Step 5 — Answer Submission**
For each answered command, the frontend fires `POST /api/sessions/{session_id}/attempts` with `{ keymap_id, entered_sequence, response_time_ms, is_correct }`. The `GuestAuth` middleware accepts both JWT and guest tokens. The `SpacedRepetitionService` updates the `spaced_repetition_records` row for this user+keymap. The `AchievementService` checks if any achievement is now unlocked.

**Step 6 — Session End**
On session completion, `POST /api/sessions/{session_id}/complete` fires. The `DailyQueueService` marks the queue as completed if this session was the daily queue. Response includes: final score, unlocked achievements, streak status.

### 1.3 Local Development vs Production Wiring

**Local (Docker Compose)**

```
Browser (localhost:5173)
       │
       │ Vite proxy: /api/* → localhost:8080
       │
Go API (localhost:8080, hot-reload via Air)
       │
PostgreSQL (localhost:5432, Docker container)
       │ Direct connection — no pgBouncer in dev
       │
Storage: ./data/uploads/ (bind-mounted volume)
```

The Vite dev server at port 5173 proxies `/api/*` requests to the Go server at port 8080 via `vite.config.ts` `server.proxy` config. This eliminates CORS issues in local dev. No Cloudflare edge is present locally.

**Production (Cloudflare Pages + Cloud Run)**

```
Browser → Cloudflare DNS → Cloudflare Pages (SPA)
Browser → Cloudflare DNS → Cloudflare Proxy → Cloud Run (API)
                                  │
                                  └── Supabase pgBouncer → PostgreSQL
```

The CORS policy on the Go API allows `https://vimtrainer.dev`. Cloud Run is not directly internet-accessible for the frontend; all traffic routes through Cloudflare's proxy. The Go container is stateless — Cloud Run can scale from 0 to N instances without coordination.

---

## 2. Component Responsibilities

### 2.1 Cloudflare Pages

**Role**: Static asset CDN and global entry point for the SPA.

**Responsibilities**:
- Serve pre-built React SPA from edge nodes globally
- TLS termination with automatic certificate renewal
- DDoS protection and bot filtering at no extra configuration cost
- Cache policy for static assets: `Cache-Control: public, max-age=31536000, immutable` for all hashed assets (Vite adds content hashes to filenames)
- Cache policy for `index.html`: `Cache-Control: no-cache` so that new deploys are served immediately
- SPA routing: `_redirects` file in `frontend/public/` with `/* /index.html 200` to ensure all routes are handled by React Router
- Deploy previews on PR branches (Cloudflare Pages automatically creates preview URLs per commit)

**What it does not do**:
- Authentication (all auth is in the Go API)
- API proxying (the browser calls the Go API directly; Cloudflare DNS routes `api.vimtrainer.dev` separately)
- Business logic of any kind

### 2.2 Go API on Cloud Run

**Role**: The only stateful computation layer. All business logic lives here.

**Responsibilities**:
- JWT issuance and validation (no external auth service)
- Keymap parsing: receives uploaded files, runs parser, returns structured keymaps
- GitHub import pipeline: clones repos, locates configs, parses, cleans up temp files
- Spaced repetition scheduling: SM-2 algorithm runs here, results persisted to DB
- Daily queue generation: deterministic algorithm runs once per user per UTC day
- Achievement checking: after each session, evaluates all achievement conditions
- Analytics aggregation: runs SQL GROUP BY queries, returns chart-ready data
- Storage writes: persists uploaded files via the `StorageService` interface

**Stateless design rationale**: Cloud Run scales horizontally. The Go API holds no in-memory session state. All state is in Supabase PostgreSQL. A request from the same user can be handled by any Go container instance. This is non-negotiable for Cloud Run's scaling model.

**Connection management**: Each Go instance uses GORM with a `pgxpool`-backed connection pool configured with `MaxOpenConns=10`. With pgBouncer in transaction mode, 10 logical Go connections share Supabase's server connections efficiently. At 3 Cloud Run instances, maximum total pgBouncer client connections is 30 — well within Supabase Pro tier limits.

### 2.3 Supabase PostgreSQL

**Role**: Single source of truth for all persistent data.

**Why Supabase over raw RDS or Cloud SQL**: Supabase provides managed PostgreSQL with pgBouncer included, a web UI for direct DB inspection during development, automated backups, and connection string compatibility with any PostgreSQL driver. We use none of Supabase's auth, realtime, or edge functions — only the database and pgBouncer. This keeps the architecture portable: if we outgrow Supabase, we swap the `DATABASE_URL` env var and nothing else changes.

**pgBouncer configuration**:
- Mode: transaction pooling (connections are released after each transaction, allowing high client concurrency on a small server pool)
- Server connection limit: 25 (Supabase Free: 15, Pro: 25)
- Client connection limit: 200 (sufficient for Cloud Run auto-scale to ~20 instances at 10 connections each)
- Connection timeout: 5 seconds
- Application-level pool: GORM `MaxOpenConns=10`, `MaxIdleConns=5`, `ConnMaxLifetime=300s`

**Why not Supabase Auth**: Supabase Auth adds an external dependency for a critical path operation (every API request validates a JWT). Our Go JWT implementation is 50 lines of code and has no external failure mode. Removing Supabase Auth also keeps us portable — we can move the database to any PostgreSQL host without changing the auth system.

### 2.4 Storage Abstraction

The storage layer is defined as a Go interface so that the local filesystem implementation (used in dev and initial production) can be swapped for Cloudflare R2 without changing any service or handler code.

```go
// internal/storage/storage.go
type StorageService interface {
    // Store saves a file and returns a storage key (path/identifier)
    Store(ctx context.Context, key string, content io.Reader, contentType string) (string, error)
    // Retrieve returns a reader for the stored file
    Retrieve(ctx context.Context, key string) (io.ReadCloser, error)
    // Delete removes a stored file
    Delete(ctx context.Context, key string) error
    // Exists checks whether a key exists in storage
    Exists(ctx context.Context, key string) (bool, error)
}
```

**Local implementation** (`internal/storage/local.go`): Writes to `${STORAGE_PATH}/uploads/{key}`. `STORAGE_PATH` defaults to `./data`. In Docker Compose, this path is bind-mounted to a host directory so data survives container restarts.

**R2 implementation contract** (`internal/storage/r2.go`): Uses the AWS S3-compatible SDK (Cloudflare R2 is S3-compatible). The `Store` method calls `s3client.PutObject`. No other code changes when switching. The implementation will be written as part of R2 migration but the interface contract is locked now.

**Key generation strategy**: Upload keys follow the pattern `users/{user_id}/uploads/{uuid}-{original_filename}`. This namespaces files by user and prevents collisions.

### 2.5 GitHub Import Service

The `GitHubImportService` is the most operationally sensitive component because it runs an external `git clone` command. Every safety constraint is enforced here.

**Pipeline** (fully sequential, each step fails fast):
1. Validate URL is `https://github.com/{user}/{repo}` (no subdomains, no raw githubusercontent)
2. Run `git clone --depth=1 --single-branch {url} {tmp_dir}` with a 30-second timeout via `exec.CommandContext`
3. If clone exits non-zero: classify error (repo not found, private repo, timeout) and return structured error
4. Walk `tmp_dir` using search heuristics (see section 4.4 below)
5. Call `KeymapParserService.ParseDirectory(dir)` on the located config directory
6. Defer `os.RemoveAll(tmp_dir)` — cleanup happens even if parsing fails
7. Return parsed keymaps

**Temp directory isolation**: Each import request gets a unique temp dir: `os.MkdirTemp("", "vimtrainer-clone-*")`. This prevents concurrent imports from interfering.

**Config location heuristics** (evaluated in priority order):
1. `.config/nvim/` at repo root
2. `nvim/` at repo root
3. Any directory containing `init.lua` or `init.vim` (BFS, max depth 4)
4. Framework-specific: `lua/plugins/` (LazyVim), `lua/` with `AstroNvim` marker file

**Timeout enforcement**: `exec.CommandContext(ctx, "git", ...)` where `ctx` has a 30-second deadline. When the context expires, Git's process group is killed. The deferred `os.RemoveAll` still runs.

### 2.6 Keymap Parser

The parser runs server-side only. No parsing logic exists in the frontend. This is a firm architectural decision: client-side parsing would expose parsing logic to reverse engineering and would make parser bug fixes require frontend deployments.

**Supported syntax patterns**:

Lua:
- `vim.keymap.set(mode, lhs, rhs, { desc = "..." })`
- `vim.api.nvim_set_keymap(mode, lhs, rhs, { noremap = true, desc = "..." })`
- Both single-mode strings and multi-mode tables: `{"n", "v"}`

Vimscript:
- `nnoremap`, `inoremap`, `vnoremap`, `xnoremap`, `onoremap`, `cnoremap`, `tnoremap`
- `nmap`, `imap`, `vmap`, `xmap`

**Parser design**: The parser is a multi-pass line scanner, not a full AST parser. Line scanning catches 95% of real-world keymap definitions. A full Lua AST parser would handle `for` loops and conditional mappings, but adds significant complexity for marginal coverage improvement. This is a deliberate scope decision: partial parse tolerance (skip lines that do not match) is the mechanism for handling complex Lua.

**Output per keymap**:
```go
type ParsedKeymap struct {
    LHS         string // the key sequence, e.g., "<leader>ff"
    Mode        string // "n", "i", "v", "x", "o", "c", "t"
    Description string // from desc option or empty
    SourceFile  string // relative path within the uploaded archive or repo
}
```

---

## 3. Data Flow Diagrams

### 3.1 Keymap File Upload Flow

```
Client                    Go API                    PostgreSQL
  │                         │                           │
  │  POST /api/keymaps/     │                           │
  │  parse-file             │                           │
  │  (multipart, ≤5MB)      │                           │
  │────────────────────────►│                           │
  │                         │ validate extension        │
  │                         │ validate size             │
  │                         │ if .zip: extract to       │
  │                         │   temp dir                │
  │                         │ KeymapParserService       │
  │                         │   .ParseFiles(paths)      │
  │                         │ return []ParsedKeymap     │
  │◄────────────────────────│                           │
  │  200 { keymaps: [...] } │                           │
  │  (no DB write yet)      │                           │
  │                         │                           │
  │ User reviews & confirms │                           │
  │                         │                           │
  │  POST /api/keymaps/     │                           │
  │  import                 │                           │
  │  { keymaps: [...] }     │                           │
  │────────────────────────►│                           │
  │                         │ BEGIN TRANSACTION         │
  │                         │───────────────────────────►
  │                         │ INSERT keymap_source      │
  │                         │───────────────────────────►
  │                         │ INSERT keymaps (batch)    │
  │                         │ ON CONFLICT (lhs, mode,   │
  │                         │  user_id) DO NOTHING      │
  │                         │───────────────────────────►
  │                         │ COMMIT                    │
  │                         │───────────────────────────►
  │◄────────────────────────│                           │
  │  200 { imported: N,     │                           │
  │    duplicates: M }      │                           │
```

**Two-phase design rationale**: The parse endpoint returns parsed keymaps to the client for review without writing to the database. Only after the user confirms their selection does the import endpoint write to the DB. This avoids accumulating unreviewed garbage data in the database and gives the user control over what enters their practice set.

### 3.2 GitHub Dotfiles Import Flow

```
Client                  Go API                 GitHub            PostgreSQL
  │                       │                      │                   │
  │  POST /api/keymaps/   │                      │                   │
  │  parse-github         │                      │                   │
  │  { repo_url }         │                      │                   │
  │──────────────────────►│                      │                   │
  │                       │ validate URL format  │                   │
  │                       │ create tmp_dir       │                   │
  │                       │                      │                   │
  │  progress: cloning    │ git clone --depth=1  │                   │
  │◄──────────────────────│─────────────────────►│                   │
  │                       │                      │ (streaming clone) │
  │                       │◄─────────────────────│                   │
  │                       │ clone complete        │                   │
  │                       │                      │                   │
  │  progress: locating   │ walk tmp_dir         │                   │
  │◄──────────────────────│ find nvim config dir │                   │
  │                       │                      │                   │
  │  progress: parsing    │ ParseDirectory()     │                   │
  │◄──────────────────────│ collect ParsedKeymap │                   │
  │                       │                      │                   │
  │                       │ os.RemoveAll(tmp_dir)│                   │
  │                       │ ← cleanup runs       │                   │
  │                       │   regardless of      │                   │
  │                       │   parse outcome      │                   │
  │                       │                      │                   │
  │◄──────────────────────│                      │                   │
  │  200 { keymaps, framework_detected }         │                   │
  │                       │                      │                   │
  │  [user reviews]       │                      │                   │
  │                       │                      │                   │
  │  POST /api/keymaps/import (same as 3.1)      │                   │
  │──────────────────────►│                      │                   │
  │                       │────────────────────────────────────────►│
  │                       │ INSERT keymap_source (type='github')    │
  │                       │ INSERT keymaps                          │
  │◄──────────────────────│◄────────────────────────────────────────│
```

**Progress communication**: The parse-github endpoint is long-running (up to 30 seconds). The frontend polls the endpoint response for progress messages. The Go handler writes chunked responses with `Transfer-Encoding: chunked` to stream progress states: `{"status": "cloning"}`, `{"status": "locating"}`, `{"status": "parsing"}`, `{"status": "complete", "keymaps": [...]}`. The client renders a progress indicator based on the `status` field.

### 3.3 Practice Session Flow

```
Client                          Go API                    PostgreSQL
  │                               │                           │
  │ GET /api/sessions/            │                           │
  │   daily-queue                 │                           │
  │──────────────────────────────►│                           │
  │                               │ SELECT daily_queues       │
  │                               │ WHERE user_id = ?         │
  │                               │   AND date = TODAY()      │
  │                               │───────────────────────────►
  │                               │ (generate if missing)     │
  │                               │ DailyQueueService         │
  │                               │   .GenerateForUser()      │
  │                               │───────────────────────────►
  │◄──────────────────────────────│                           │
  │ 200 { session_id, challenges:  │                          │
  │   [{ id, description, mode,   │                           │
  │      category }] }            │                           │
  │ NOTE: lhs NOT included        │                           │
  │                               │                           │
  │ [user sees description,       │                           │
  │  types answer]                │                           │
  │                               │                           │
  │ POST /api/sessions/           │                           │
  │   {session_id}/attempts       │                           │
  │ { keymap_id,                  │                           │
  │   entered_sequence,           │                           │
  │   response_time_ms }          │                           │
  │──────────────────────────────►│                           │
  │                               │ SELECT lhs FROM keymaps   │
  │                               │ WHERE id = keymap_id      │
  │                               │───────────────────────────►
  │                               │ compare entered vs lhs    │
  │                               │ is_correct = (entered==lhs)│
  │                               │                           │
  │                               │ INSERT practice_attempts  │
  │                               │───────────────────────────►
  │                               │                           │
  │                               │ SpacedRepetitionService   │
  │                               │   .UpdateRecord()         │
  │                               │ UPSERT srs_records        │
  │                               │───────────────────────────►
  │◄──────────────────────────────│                           │
  │ 200 { is_correct,             │                           │
  │   correct_answer: lhs }       │                           │
  │ (lhs revealed after attempt)  │                           │
  │                               │                           │
  │ POST /api/sessions/           │                           │
  │   {session_id}/complete       │                           │
  │──────────────────────────────►│                           │
  │                               │ UPDATE practice_sessions  │
  │                               │   SET completed_at = NOW()│
  │                               │───────────────────────────►
  │                               │ AchievementService        │
  │                               │   .CheckAndUnlock()       │
  │                               │───────────────────────────►
  │                               │ DailyQueueService         │
  │                               │   .MarkComplete()         │
  │                               │───────────────────────────►
  │◄──────────────────────────────│                           │
  │ 200 { score, accuracy,        │                           │
  │   streak, achievements_earned }                           │
```

**Why the correct answer is not sent upfront**: If the client had the `lhs` values in the initial challenge payload, a motivated user could inspect the network response and cheat. The answer is revealed only in the attempt response, after the user has submitted. This is a mild anti-cheat measure appropriate for the trust model of a personal practice app — it is not a security control.

### 3.4 Analytics Query Flow

```
Client                        Go API                     PostgreSQL
  │                             │                            │
  │ GET /api/analytics/         │                            │
  │   summary?range=30d         │                            │
  │────────────────────────────►│                            │
  │                             │ JWTAuth validates token    │
  │                             │                            │
  │                             │ AnalyticsService           │
  │                             │   .GetDashboardData()      │
  │                             │                            │
  │                             │ -- accuracy trend --       │
  │                             │ SELECT DATE(started_at),   │
  │                             │   AVG(accuracy)            │
  │                             │ FROM practice_sessions     │
  │                             │ WHERE user_id=?            │
  │                             │   AND started_at > NOW()   │
  │                             │   - INTERVAL '30 days'     │
  │                             │ GROUP BY DATE(started_at)  │
  │                             │───────────────────────────►│
  │                             │                            │
  │                             │ -- missed commands --      │
  │                             │ SELECT k.id,               │
  │                             │   k.description,           │
  │                             │   k.lhs, k.category,       │
  │                             │   COUNT(*) FILTER          │
  │                             │   (WHERE NOT pa.is_correct)│
  │                             │   / COUNT(*)::float        │
  │                             │   AS error_rate            │
  │                             │ FROM practice_attempts pa  │
  │                             │ JOIN keymaps k ON ...      │
  │                             │ WHERE pa.user_id=?         │
  │                             │   AND pa.attempted_at >    │
  │                             │   NOW() - INTERVAL '30d'   │
  │                             │ GROUP BY k.id              │
  │                             │ ORDER BY error_rate DESC   │
  │                             │ LIMIT 10                   │
  │                             │───────────────────────────►│
  │                             │                            │
  │                             │ [5 more queries: response  │
  │                             │  time trend, daily time,   │
  │                             │  category breakdown,       │
  │                             │  most improved,            │
  │                             │  mastery score]            │
  │                             │───────────────────────────►│
  │                             │                            │
  │                             │ assemble AnalyticsDashboard│
  │                             │ struct                     │
  │◄────────────────────────────│                            │
  │ 200 {                       │                            │
  │   accuracy_trend: [...],    │                            │
  │   response_time_trend: [],  │                            │
  │   daily_time: [...],        │                            │
  │   category_breakdown: [],   │                            │
  │   most_missed: [...],       │                            │
  │   most_improved: [...],     │                            │
  │   mastery_score: N          │                            │
  │ }                           │                            │
```

**N+1 avoidance**: All analytics data for the dashboard is fetched in a single `GET /api/analytics/summary` call that runs 7 SQL queries server-side and assembles one JSON response. The client does not fetch individual charts separately. This eliminates the N+1 pattern where the client fires one HTTP request per chart.

**Query latency budget**: Each analytics query should complete in under 200ms at steady state. With proper indexes (see `database-architecture.md`), aggregations over 30 days of data for a single user are fast. If response time degrades past 500ms total, the first optimization is caching the response on the server for 5 minutes before moving to separate endpoints.

---

## 4. Cross-Cutting Concerns

### 4.1 JWT Authentication

**Token structure** (all JWTs are HS256, signed with `JWT_SECRET` env var):

Access token payload:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "type": "access",
  "iat": 1718500000,
  "exp": 1718503600
}
```

Refresh token payload:
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1718500000,
  "exp": 1719104800
}
```

**Token storage**:
- Access token: `localStorage` (readable by JS, needed for API calls)
- Refresh token: `httpOnly` cookie with `SameSite=Strict` (not readable by JS, prevents XSS token theft)

**Expiry and refresh strategy**:
- Access token: 1-hour expiry
- Refresh token: 7-day expiry
- Refresh flow: when the React app receives a 401 from any API call, it fires `POST /api/auth/refresh` with the httpOnly cookie. The Go handler validates the refresh token, issues a new access token (and optionally a new refresh token), and the client retries the original request.
- TanStack Query's `onError` callback in the axios interceptor handles this transparently

**Guest vs authenticated token handling**:
The `GuestAuth` middleware (applied to practice routes) accepts both formats:
1. `Authorization: Bearer {jwt}` — treats as authenticated user, extracts `user_id` from token
2. `X-Guest-Token: {uuid}` — treats as guest, looks up guest session by token, extracts ephemeral `guest_id`

Protected routes (analytics, profile, import confirmation) use `JWTAuth` middleware which only accepts JWT and returns 401 for guest tokens.

### 4.2 Guest Mode

**How guest sessions work**:
1. On "Start Practicing (No Account)" click, the frontend calls `POST /api/auth/guest`
2. The Go handler creates a `guest_sessions` record with a UUID token and 24-hour expiry
3. The token is returned and stored in `localStorage` as `vimtrainer_guest_token`
4. Subsequent requests include `X-Guest-Token: {uuid}` header
5. The `GuestAuth` middleware resolves guest sessions to a `guest_id` (the UUID) which flows through the service layer identically to a `user_id`

**Guest data scope**:
- Practice attempts are stored in `practice_attempts` with `guest_id` set (and `user_id` null)
- SRS records are stored in `spaced_repetition_records` with `guest_id` set
- Motion Trainer tier proficiency is stored in `spaced_repetition_records` category fields
- Settings are not persisted server-side for guests; they use `localStorage`

**Migration on registration**:
When a guest registers, `POST /api/auth/register` accepts an optional `guest_token` field. If present, the Go handler:
1. Verifies the guest token is valid and not expired
2. Updates all `practice_attempts` rows where `guest_id = token` to set `user_id = new_user_id`
3. Updates all `spaced_repetition_records` similarly
4. Deletes the guest session record
5. Marks localStorage settings as migrated

**Why server-side guest sessions**: Storing guest data in localStorage alone creates a terrible UX if the user clears storage or switches browsers. Server-side guest sessions let us offer "your first session is saved" even for guests, which improves the conversion funnel.

### 4.3 CORS Configuration

The Go API's CORS middleware is configured as follows:

```go
// internal/middleware/cors.go
AllowedOrigins: []string{
    "https://vimtrainer.dev",
    "https://*.vimtrainer.pages.dev", // Cloudflare Pages preview deployments
    "http://localhost:5173",           // Vite dev server
    "http://localhost:3000",           // Alternative local port
}
AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
AllowedHeaders: []string{
    "Authorization",
    "Content-Type",
    "X-Guest-Token",
    "X-Request-ID",
}
AllowCredentials: true  // required for httpOnly refresh token cookie
MaxAge: 86400           // 24-hour preflight cache
```

In local Docker Compose, the Vite dev server proxies `/api/*` to the Go backend, so CORS is not triggered for local development. The CORS middleware only activates in environments where the SPA and API are on different origins (production and staging).

### 4.4 Rate Limiting Strategy

Rate limiting is applied at two levels:

**Per-IP (unauthenticated endpoints)**:
- `POST /api/auth/register`: 5 requests per IP per minute (prevents account creation abuse)
- `POST /api/auth/login`: 10 requests per IP per minute (prevents credential stuffing)
- `POST /api/auth/guest`: 3 requests per IP per hour (prevents guest session spam)
- `POST /api/keymaps/parse-github`: 5 requests per IP per 10 minutes (prevents repo clone abuse)

**Per-user (authenticated endpoints)**:
- `POST /api/keymaps/parse-file`: 20 uploads per user per hour
- `POST /api/sessions/{id}/attempts`: 500 requests per user per minute (generous — rapid typers)
- `GET /api/analytics/*`: 30 requests per user per minute

**Implementation**: The `RateLimiter` middleware uses an in-memory token bucket per key (IP or user ID). The bucket state is local to the Go instance. Under Cloud Run horizontal scaling, each instance maintains its own bucket — a user could burst across instances. This is acceptable for MVP: the limits are loose enough that legitimate users never hit them, and per-instance enforcement is sufficient to prevent the targeted abuse cases. A shared Redis rate limiter is explicitly deferred to post-launch.

**Headers returned** on rate limit hit:
```
HTTP 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718503600
```

### 4.5 File Upload Security

The `KeymapHandler.ParseFile` handler applies the following controls before passing any data to the parser:

1. **Size limit**: `http.MaxBytesReader(w, r.Body, 5*1024*1024)` — enforced at the HTTP layer, not after reading the full body
2. **Extension validation**: Only `.lua`, `.vim`, and `.zip` extensions accepted (checked against the filename, not MIME type)
3. **MIME type validation**: After reading the file, confirm the magic bytes match the claimed type (`.zip` must start with `PK\x03\x04`)
4. **ZIP bomb protection**: For ZIP files, the `archive/zip` reader checks that the uncompressed size does not exceed 50MB before extracting. Each extracted file is also size-checked before parsing.
5. **Path traversal prevention**: ZIP entries are validated to ensure no entry has a path component starting with `..` or `/` before extraction
6. **Parser timeout**: The parse operation runs with a 10-second context deadline. A pathologically complex file cannot hang the request handler.
7. **Temp file cleanup**: Extracted ZIP contents are written to `os.MkdirTemp` and removed via `defer os.RemoveAll(tmpDir)` regardless of parse outcome.

### 4.6 Error Handling Conventions

All API errors return the same JSON structure:

```json
{
  "error": {
    "code": "KEYMAP_PARSE_FAILED",
    "message": "No keymaps found in the uploaded file",
    "details": {
      "lines_scanned": 342,
      "lines_failed": 0,
      "supported_patterns": ["vim.keymap.set", "nnoremap", "inoremap"]
    }
  }
}
```

**HTTP status to error code mapping**:
| HTTP Status | When Used |
|-------------|-----------|
| 400 | Invalid request body, validation failure, unsupported file type |
| 401 | Missing or invalid JWT, expired refresh token |
| 403 | Authenticated but not authorized (e.g., accessing another user's data) |
| 404 | Resource not found (session, keymap, user) |
| 409 | Conflict — duplicate resource (duplicate keymap, duplicate email) |
| 413 | Request too large (file exceeds 5MB) |
| 422 | Semantically invalid request (valid JSON but business rule violated) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error (logged with full stack trace) |
| 503 | Database connection failure or downstream timeout |

**Error propagation chain**:
```
Repository layer:     returns (T, error) — wraps DB errors with context
Service layer:        wraps repository errors with service-level context
                      returns domain errors (not HTTP errors)
Handler layer:        maps domain errors to HTTP status + error code
                      via switch/type assertion
```

Domain errors are defined in `internal/apperrors/errors.go`:
```go
type AppError struct {
    Code    string // machine-readable error code
    Message string // human-readable, safe to expose to client
    Detail  any    // optional structured context
    Cause   error  // underlying error, NOT sent to client, logged server-side
}

var (
    ErrNotFound       = &AppError{Code: "NOT_FOUND", ...}
    ErrUnauthorized   = &AppError{Code: "UNAUTHORIZED", ...}
    ErrRateLimited    = &AppError{Code: "RATE_LIMITED", ...}
    ErrParseNoResults = &AppError{Code: "PARSE_NO_RESULTS", ...}
    ErrDuplicate      = &AppError{Code: "DUPLICATE_RESOURCE", ...}
)
```

---

## 5. Scalability Considerations

### 5.1 Cloud Run Auto-Scaling

Cloud Run scales based on concurrent request count. The Go API is stateless, so any instance can serve any request. Key configuration:

```yaml
# cloud-run.yaml (deployment config)
resources:
  limits:
    cpu: "1"
    memory: "512Mi"
concurrency: 80          # requests per instance before scaling out
min-instances: 0         # scale to zero when idle (cost optimization)
max-instances: 10        # cap to prevent runaway costs
```

**Scale to zero trade-off**: With `min-instances: 0`, the first request after an idle period triggers a cold start (~1-2 seconds for Go). For a tool used primarily in focused practice sessions (users return daily), this is acceptable. If cold start latency becomes a complaint, set `min-instances: 1` (~$5/month).

**Connection pool math**: At `max-instances: 10` and `MaxOpenConns: 10` per instance, the maximum theoretical connections to pgBouncer is 100. Supabase Pro supports 25 server connections. In transaction pooling mode, pgBouncer multiplexes 100 client connections onto 25 server connections efficiently because most connections are idle between transactions. This math holds at the projected MVP scale.

### 5.2 Supabase Tier Planning

**Free tier limits**:
- 500MB database storage
- 15 server connections (before pgBouncer)
- Shared compute

**Free tier is sufficient for**: MVP launch, first 1000 users, first 3 months.

**Trigger to upgrade to Pro ($25/month)**:
- Database size approaching 400MB
- pgBouncer client connections consistently hitting 90% capacity
- Query latency increasing due to shared compute contention

**Pro tier provides**: 8GB storage, 25 server connections, dedicated compute, PITR backups.

### 5.3 Storage Growth

Local filesystem storage on Cloud Run is **ephemeral** — files written to `/data` inside the container are lost when the instance restarts. For MVP, uploaded files are not stored long-term: the upload is parsed, results returned, and the file discarded. The `StorageService` is only used for the GitHub clone temp directory (which is also ephemeral) and future user-uploaded avatar images (not in MVP scope).

**When to migrate to R2**: When we introduce user-uploaded assets that need to persist across deployments (e.g., profile images, or storing the original config file for re-parse). The `StorageService` interface is already designed for this swap.

**R2 migration path**:
1. Add `STORAGE_PROVIDER=r2` env var to Cloud Run
2. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` env vars
3. Wire `R2StorageService` in `cmd/server/main.go` DI when `STORAGE_PROVIDER=r2`
4. No other code changes required

### 5.4 Database Read Patterns

Analytics queries are the most read-heavy pattern. The `practice_attempts` table will grow fastest (one row per keymap per session). For a user with 200 keymaps doing daily 20-command sessions, that is 200 × 365 = 73,000 rows per year. Analytics queries over 30 days touch at most ~4,000 rows for a single user.

**No read replicas needed at MVP scale**: All queries are filtered by `user_id`, so data locality is excellent. With proper indexes on `(user_id, attempted_at)`, these queries are index scans over a small row set.

**First scale pressure point**: If the 10-user daily-queue generation query (`SELECT 10 weakest keymaps by accuracy for user X`) starts taking more than 100ms, add a materialized view. This is expected at 10,000+ attempts per user, not at MVP.

---

## 6. Local Development Architecture

### 6.1 Docker Compose Services

```yaml
# docker-compose.yml (at project root)
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vimtrainer
      POSTGRES_USER: vimtrainer
      POSTGRES_PASSWORD: vimtrainer_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vimtrainer"]
      interval: 5s
      retries: 5

  api:
    build:
      context: ./backend
      target: dev               # multi-stage: dev uses Air for hot-reload
    environment:
      DATABASE_URL: postgres://vimtrainer:vimtrainer_dev@postgres:5432/vimtrainer?sslmode=disable
      JWT_SECRET: dev-secret-change-in-production
      ENVIRONMENT: development
      PORT: 8080
      STORAGE_PATH: /data
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app          # source code mounted for hot-reload
      - api_data:/data          # persistent storage volume for uploads
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      target: dev               # uses Vite dev server, not nginx
    environment:
      VITE_API_URL: http://localhost:8080
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules       # prevent host node_modules from overriding container

volumes:
  postgres_data:
  api_data:
```

**The `postgres_data` named volume** persists the database across `docker-compose down` calls. `docker-compose down -v` removes it (use for fresh-start scenarios).

**The `/docker-entrypoint-initdb.d` mount**: Postgres runs SQL files in this directory on first startup. We mount `./backend/migrations` there, which means all migrations run automatically when the container first initializes. On subsequent starts, the volume already has the data, so migrations are skipped.

**Production migration strategy**: In production, migrations do not auto-run on startup. Instead, a separate migration job runs before the Cloud Run deployment via `goose up` in the CI/CD pipeline.

### 6.2 Environment Variable Management

**Local**: `.env` file in `./backend/` loaded by `godotenv` in `main.go` when `ENVIRONMENT=development`. The `.env.example` file documents every variable with a safe dev default. `.env` is gitignored.

**Cloud Run**: Environment variables are set directly in the Cloud Run service configuration, sourced from Google Cloud Secret Manager for sensitive values (`JWT_SECRET`, `DATABASE_URL`).

**Variable precedence** (in Go): `os.Getenv` reads from actual environment, which takes precedence over `.env` file loading. This means CI/CD can override any value without changing the `.env` file.

**Required environment variables** (documented fully in `backend-architecture.md`):
- `DATABASE_URL` — full PostgreSQL connection string
- `JWT_SECRET` — minimum 32 characters, cryptographically random
- `PORT` — defaults to `8080`
- `ENVIRONMENT` — `development` | `production`
- `STORAGE_PATH` — filesystem path for local storage
- `CORS_ORIGINS` — comma-separated list of allowed origins

### 6.3 Database Seeding and Migrations in Dev

**Migration tool**: `golang-migrate/migrate` CLI. Migration files are plain SQL in `./backend/migrations/`, named `001_initial_schema.sql`, `002_add_achievements.sql`, etc.

**Seed data**: A `seed.sql` file in `./backend/migrations/seeds/` inserts:
- 1 test user (`test@example.com`, password `password`)
- The 45 built-in Motion Trainer keymaps (Beginner, Intermediate, Advanced tiers)
- The 10 achievement definitions
- 5 sample practice sessions with attempts (for testing analytics charts)

Seeds are applied manually: `make seed` runs `psql` against the local database. They are not run in production.

**Migration workflow in dev**:
```
make migrate-up       # apply all pending migrations
make migrate-down     # roll back one migration
make migrate-status   # show applied vs pending
make db-reset         # drop all tables + re-run all migrations + seed
```
