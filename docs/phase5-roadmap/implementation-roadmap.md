# VimTrainer — Implementation Roadmap

**Document version**: 1.0
**Author**: Senior Project Manager
**Date**: 2026-06-16
**Project**: VimTrainer — open-source Vim/Neovim keymap practice app
**Engineer count**: 1 senior full-stack engineer

---

## 1. Executive Summary

### Total Estimate

**32 working days** across 8 milestones.

| Milestone | Name | Days |
|-----------|------|------|
| M1 | Foundation & Infrastructure | 3 |
| M2 | Authentication & Guest Mode | 4 |
| M3 | Keymap Import & Library | 5 |
| M4 | Core Practice Engine | 6 |
| M5 | Settings & Profile | 3 |
| M6 | Analytics Dashboard | 4 |
| M7 | Achievements & Streaks | 3 |
| M8 | Polish, Performance & Deployment | 4 |

**MVP complete**: End of M5 (day 20). Everything in M6–M8 is V1 material that can ship iteratively after the core loop is usable.

### Critical Path

M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8

All milestones are sequential. There is no meaningful parallelism for a single engineer because each milestone's backend and frontend work share context and state. M4 is the longest and highest-risk milestone and is the primary schedule risk.

### Top 3 Risks

1. **Multi-key sequence capture in the browser** (M4): Intercepting `<leader>ff` style sequences reliably across browser/OS keydown event handling is the most technically uncertain work in the project. Budget an extra day if the first approach fails.

2. **Lua parser correctness** (M3): Neovim Lua config files have wildly inconsistent keymap call patterns. A naive parser will fail on real dotfiles. The parser must handle at minimum 4-5 common patterns or import will feel broken to real users.

3. **SRS + queue interaction correctness** (M4): The SM-2 algorithm must produce correct ease-factor updates and next-review intervals. A subtle bug here silently corrupts every user's practice quality without any obvious error. Needs careful manual verification against known SM-2 test vectors.

---

## 2. Dependency Graph (ASCII)

```
M1 (Foundation)
 └── M2 (Auth)
      └── M3 (Import)
           └── M4 (Practice Engine)  ← longest, highest risk
                ├── M5 (Settings/Profile)
                │    └── M6 (Analytics)
                │         └── M7 (Achievements)
                │              └── M8 (Deployment)
                └── [M6 can begin while M5 is in progress if M4 backend is done]

Blocking relationships:
  M1 blocks everything     — no DB, no API, no frontend shell
  M2 blocks M3             — import requires authenticated user context
  M3 blocks M4             — practice requires keymaps to exist
  M4 blocks M5, M6, M7    — analytics, settings, achievements all depend on session data
  M5 blocks M6             — analytics dashboard reads settings for display preferences
  M6 blocks M7             — achievement checker references analytics aggregator
  M7 blocks M8             — polish pass happens on complete feature set
```

---

## 3. Eight Milestones

---

### M1 — Foundation & Infrastructure

**Duration**: 3 days
**Goal**: Docker Compose boots postgres + go-api containers. DB migrations run without errors. Go health endpoint returns `{"status":"ok"}`. Vite dev server boots and shows a shell with routing and CSS tokens loaded.

#### Files Created

**Infrastructure**
- `backend/docker-compose.yml`
- `backend/Dockerfile`
- `backend/.env.example`
- `backend/go.mod`
- `backend/go.sum`

**Go entry point & config**
- `backend/cmd/server/main.go`
- `backend/internal/config/config.go`

**Database**
- `backend/internal/database/db.go`
- `backend/internal/database/migrate.go`
- `backend/migrations/001_initial_schema.sql`
- `backend/migrations/002_seed_achievements.sql`
- `backend/migrations/003_seed_builtin_keymaps.sql`

**Middleware**
- `backend/internal/middleware/cors.go`
- `backend/internal/middleware/logger.go`
- `backend/internal/middleware/recovery.go`

**Health handler**
- `backend/internal/handlers/health.go`

**Models (structs only, no business logic)**
- `backend/internal/models/user.go`
- `backend/internal/models/keymap.go`
- `backend/internal/models/session.go`
- `backend/internal/models/attempt.go`
- `backend/internal/models/srs_card.go`
- `backend/internal/models/achievement.go`
- `backend/internal/models/user_achievement.go`
- `backend/internal/models/streak.go`
- `backend/internal/models/settings.go`
- `backend/internal/models/guest.go`

**Repository interfaces**
- `backend/internal/repository/interfaces.go`

**Frontend shell**
- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/public/_redirects`
- `frontend/src/styles/tokens.css`
- `frontend/src/styles/reset.css`
- `frontend/src/styles/base.css`
- `frontend/src/styles/index.css`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/models.ts`
- `frontend/src/types/api.ts`
- `frontend/src/types/stores.ts`
- `frontend/src/pages/Landing.tsx` (stub — renders heading only)

#### Acceptance Criteria

**AC1**: Given a clean checkout, when the engineer runs `docker compose up`, then postgres and go-api containers both reach healthy status within 60 seconds and no container exits with an error code.

**AC2**: Given running containers, when the engineer sends `curl http://localhost:8080/health`, then the response is HTTP 200 with body `{"status":"ok","version":"0.1.0"}`.

**AC3**: Given running containers, when the go-api starts, then all three migration files execute without error and the tables `users`, `keymaps`, `sessions`, `attempts`, `srs_cards`, `achievements`, `user_achievements`, `streaks`, `settings`, `guests` exist in the database.

**AC4**: Given the frontend directory, when the engineer runs `npm run dev`, then the Vite dev server starts on port 5173, the browser shows a page (no blank white screen), and the browser console shows zero errors.

**AC5**: Given the running Vite dev server, when the engineer navigates to a non-existent route like `/foo`, then the app renders a recognizable "not found" state rather than a browser 404.

#### Test Instructions

```bash
# 1. Boot infrastructure
cd backend && docker compose up -d
docker compose ps           # both services should show "healthy" or "running"

# 2. Verify health endpoint
curl -s http://localhost:8080/health | python3 -m json.tool

# 3. Verify migrations ran
docker compose exec postgres psql -U vimtrainer -d vimtrainer -c "\dt"
# Should list: users, keymaps, sessions, attempts, srs_cards, achievements,
#              user_achievements, streaks, settings, guests

# 4. Boot frontend
cd frontend && npm install && npm run dev
# Open http://localhost:5173 — should see landing stub, zero console errors
```

---

### M2 — Authentication & Guest Mode

**Duration**: 4 days
**Goal**: Full auth flow works end to end. A user can register, log in, receive a JWT access token plus httpOnly refresh cookie, and log out. Guest sessions are created automatically. A guest can complete the migration flow to a full account without losing their session data.

#### Files Created

**Backend auth**
- `backend/internal/auth/jwt.go`
- `backend/internal/auth/middleware.go`
- `backend/internal/auth/password.go`
- `backend/internal/handlers/auth.go`
- `backend/internal/handlers/users.go`
- `backend/internal/repository/user_repository.go`
- `backend/internal/repository/guest_repository.go`

**Frontend auth**
- `frontend/src/api/client.ts` (axios instance with interceptors)
- `frontend/src/api/hooks/auth.ts`
- `frontend/src/stores/authStore.ts`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/TopBar.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/PageLayout.tsx`
- `frontend/src/styles/typography.css`
- `frontend/src/styles/layout.css`
- `frontend/src/styles/components/button.css`
- `frontend/src/styles/components/input.css`
- `frontend/src/styles/components/card.css`
- `frontend/src/styles/components/modal.css`
- `frontend/src/styles/pages/auth.css`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/Spinner.tsx`

#### Acceptance Criteria

**AC1**: Given the register page, when the engineer submits a valid email + password, then the backend creates a user record with a bcrypt-hashed password, returns HTTP 201, and the frontend redirects to `/dashboard` with the user's name visible in the TopBar.

**AC2**: Given an existing account, when the engineer submits correct credentials on the login page, then the frontend stores an access token in memory (not localStorage), a `refresh_token` httpOnly cookie is set by the backend, and the auth-protected route `/dashboard` is accessible without redirecting.

**AC3**: Given a logged-in user, when the engineer clicks logout, then the access token is cleared from memory, the refresh cookie is invalidated server-side, and navigating to `/dashboard` redirects to `/auth/login`.

**AC4**: Given a user visiting the site without logging in, when they navigate to `/practice`, then a guest session is automatically created, a guest token is stored, and they can use the practice modes without seeing a login wall.

**AC5**: Given an active guest session with at least one practice attempt recorded, when the engineer completes the migration flow (registers account while guest), then their guest attempts are reassigned to the new account's user ID and no data is lost.

**AC6**: Given an expired access token, when the frontend makes any API request, then the axios interceptor automatically uses the refresh cookie to obtain a new access token and retries the original request transparently — the user sees no error.

#### Test Instructions

```bash
# 1. Register
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","username":"testuser"}' \
  | python3 -m json.tool
# Expect: 201, user object, access_token

# 2. Login
curl -s -c cookies.txt -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  | python3 -m json.tool
# Expect: 200, access_token; cookies.txt should contain refresh_token

# 3. Access protected route
TOKEN="<access_token from step 2>"
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/users/me | python3 -m json.tool

# 4. Guest creation
curl -s -X POST http://localhost:8080/api/v1/auth/guest | python3 -m json.tool
# Expect: 201, guest_token

# 5. In browser: open http://localhost:5173/auth/register, complete form,
#    confirm redirect to /dashboard, confirm name in TopBar
# 6. Log out, confirm /dashboard redirects to /auth/login
```

---

### M3 — Keymap Import & Library

**Duration**: 5 days
**Goal**: Users can upload `.lua`, `.vim`, or `.zip` files from their local machine, or paste a GitHub repo URL to import a public dotfiles repo. Parsed keymaps appear in a keymap library page. The 68 builtin Vim motions seeded in M1's migration are visible to all users including guests.

#### Files Created

**Backend parsers**
- `backend/internal/services/parser/parser.go` (interface + dispatcher)
- `backend/internal/services/parser/lua.go`
- `backend/internal/services/parser/vimscript.go`
- `backend/internal/services/parser/zip.go`

**Backend GitHub import**
- `backend/internal/services/github/locator.go` (find keymap files in repo tree)
- `backend/internal/services/github/importer.go` (clone/fetch + parse + store)

**Backend storage**
- `backend/internal/storage/interface.go`
- `backend/internal/storage/local.go`
- `backend/internal/storage/r2.go`

**Backend handlers and repositories**
- `backend/internal/handlers/keymaps.go`
- `backend/internal/repository/keymap_repository.go`

**Frontend**
- `frontend/src/api/hooks/keymaps.ts`
- `frontend/src/stores/keymapStore.ts`
- `frontend/src/pages/Import.tsx`
- `frontend/src/utils/keySequence.ts`
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/Tooltip.tsx`
- `frontend/src/components/ui/KeySequence.tsx`
- `frontend/src/styles/components/badge.css`
- `frontend/src/styles/components/tooltip.css`
- `frontend/src/styles/components/key-sequence.css`
- `frontend/src/styles/pages/import.css`

#### Acceptance Criteria

**AC1 (Lua parsing)**: Given a `.lua` file containing at minimum these three call patterns — `vim.keymap.set('n', '<leader>ff', ':Telescope find_files<CR>', {})`, `map('n', '<C-p>', ...)`, and `nmap('<leader>w', ':w<CR>')` — when the file is uploaded, then all three keymaps are parsed and appear in the library with correct mode, key sequence, and description.

**AC2 (Vimscript parsing)**: Given a `.vim` file containing `nnoremap <leader>w :w<CR>` and `vnoremap <C-c> "+y`, when uploaded, then both keymaps are parsed with correct modes (`normal`, `visual`) and key sequences.

**AC3 (ZIP handling)**: Given a `.zip` file containing 3 `.lua` files and 1 `.vim` file, when uploaded, then all files in the archive are parsed and their keymaps merged into one import batch. ZIP bombs are rejected: any archive that expands beyond 50 MB returns HTTP 413.

**AC4 (GitHub import)**: Given a valid public GitHub repo URL containing a Lua Neovim config (e.g. `https://github.com/username/dotfiles`), when the user submits it, then the importer locates keymap files automatically, parses them, and displays the found keymaps — without requiring the user to know the file path.

**AC5 (Builtin motions)**: Given any user (including a guest with no imports), when they visit the keymap library, then the 68 builtin Vim motions seeded by migration `003` are visible in a "Built-in" category and cannot be deleted.

**AC6 (Duplicate detection)**: Given a user who imports the same file twice, when the second import runs, then keymaps with identical (mode, key_sequence, source_file) are updated rather than duplicated, and the library count does not double.

#### Test Instructions

```bash
# 1. Upload a Lua file
curl -s -X POST http://localhost:8080/api/v1/keymaps/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/init.lua" \
  | python3 -m json.tool
# Expect: 200, array of parsed keymaps

# 2. GitHub import
curl -s -X POST http://localhost:8080/api/v1/keymaps/import/github \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repo_url":"https://github.com/nvim-lua/kickstart.nvim"}' \
  | python3 -m json.tool

# 3. Verify builtin seeding
curl -s http://localhost:8080/api/v1/keymaps/builtins | python3 -m json.tool
# Should return array with exactly 68 items

# 4. In browser: open http://localhost:5173/import
#    Upload a .lua file, confirm keymaps appear in library
#    Paste a GitHub URL, confirm import runs and results display
```

---

### M4 — Core Practice Engine

**Duration**: 6 days — most detail, highest risk
**Goal**: All 4 practice modes (practice, motion trainer, leader key, flashcard) are fully functional. A user sees a challenge, types the key sequence, receives instant visual feedback, the SRS card updates, and the daily training queue generates correctly. `<leader>ff` style multi-key sequences are correctly captured and matched.

#### Files Created

**Backend SRS**
- `backend/internal/services/srs/engine.go` (SM-2 algorithm)
- `backend/internal/services/srs/queue.go` (daily queue generation)
- `backend/internal/handlers/sessions.go`
- `backend/internal/handlers/srs.go`
- `backend/internal/handlers/queue.go`
- `backend/internal/repository/session_repository.go`
- `backend/internal/repository/attempt_repository.go`
- `backend/internal/repository/srs_repository.go`

**Backend middleware (rate limiting)**
- `backend/internal/middleware/ratelimit.go`

**Frontend stores**
- `frontend/src/stores/practiceStore.ts`
- `frontend/src/stores/uiStore.ts`

**Frontend practice components**
- `frontend/src/components/practice/PracticeArena.tsx`
- `frontend/src/components/practice/ChallengeDisplay.tsx`
- `frontend/src/components/practice/KeyInput.tsx`
- `frontend/src/components/practice/FeedbackOverlay.tsx`
- `frontend/src/components/practice/SessionStats.tsx`
- `frontend/src/components/practice/SessionComplete.tsx`
- `frontend/src/components/practice/ProgressIndicator.tsx`

**Frontend UI components**
- `frontend/src/components/ui/ProgressBar.tsx`
- `frontend/src/components/ui/Avatar.tsx`

**Frontend hooks**
- `frontend/src/hooks/useGlobalShortcuts.ts`
- `frontend/src/hooks/useStoreHydration.ts`
- `frontend/src/hooks/useSessionConfig.ts`
- `frontend/src/hooks/usePracticeSession.ts`

**Frontend pages**
- `frontend/src/pages/Practice.tsx`
- `frontend/src/pages/Motions.tsx`
- `frontend/src/pages/Leader.tsx`
- `frontend/src/pages/Flashcards.tsx`

**Frontend API hooks**
- `frontend/src/api/hooks/sessions.ts`
- `frontend/src/api/hooks/srs.ts`
- `frontend/src/api/hooks/queue.ts`

**Frontend utils**
- `frontend/src/utils/formatters.ts`
- `frontend/src/utils/srs.ts`

**Frontend styles**
- `frontend/src/styles/animations.css`
- `frontend/src/styles/components/progress-bar.css`
- `frontend/src/styles/components/feedback-overlay.css`
- `frontend/src/styles/components/challenge-display.css`
- `frontend/src/styles/components/key-input.css`
- `frontend/src/styles/components/session-stats.css`
- `frontend/src/styles/components/session-complete.css`
- `frontend/src/styles/components/avatar.css`
- `frontend/src/styles/components/spinner.css`
- `frontend/src/styles/pages/practice.css`

#### Multi-key Sequence Design (Risk Item)

`KeyInput.tsx` must buffer keydown events and match them against a sequence pattern. The approach:

1. On mount, attach a `keydown` listener to `document` (not the input element — there is no input element; the user types "blind" as in Vim).
2. Maintain a `buffer: string[]` in component state.
3. On each keydown, push the canonical key name to the buffer. Canonical form: `<C-p>` for Ctrl+P, `<leader>` substituted from user settings, bare `w` for the letter w.
4. After each keystroke, check if the buffer matches any prefix of any expected sequence. If it matches a prefix, start a 1-second timeout to flush the buffer as "no match." If it matches a full sequence, resolve immediately.
5. Browser-specific concern: `e.preventDefault()` must be called for any key combination that the browser or OS intercepts (e.g. `<C-w>` closes the browser tab). Handle this by calling `preventDefault` on all keydown events while `KeyInput` is mounted and active.
6. Test on both macOS (Cmd vs Ctrl) and Linux to verify modifier key mapping is correct.

#### Acceptance Criteria

**AC1 (Practice mode — basic)**: Given a logged-in user in practice mode with at least 5 keymaps in their library, when a challenge is displayed showing the description "Save file", then the user can type `:w` (or whatever their mapped sequence is) and receive a green "Correct" overlay within 100ms of the final keystroke.

**AC2 (Leader key sequence — `<leader>ff`)**: Given a challenge requiring `<leader>ff` where leader is set to space, when the user presses Space, then f, then f in sequence, then the attempt registers as correct. When the user presses Space, then f, then pauses 1.5 seconds without pressing the second f, then the attempt registers as incorrect (timeout).

**AC3 (Motion trainer mode)**: Given motion trainer mode, when the challenge shows a Vim motion like `gg`, then the user types `gg` and sees confirmation of what the motion does, plus their response time in milliseconds is recorded.

**AC4 (Flashcard mode)**: Given flashcard mode, when a card is shown face-down (description only), the user thinks of the answer and flips it, then they self-rate the difficulty (again / hard / good / easy), and the SRS card's ease factor and next-review date update accordingly in the database.

**AC5 (SRS update correctness)**: Given a card with ease factor 2.5 and interval 1 day, when the user rates it "good" (quality 4), then after the session ends the backend stores ease factor 2.5 (unchanged for quality 4 in SM-2) and interval 3 days (1 * 2.5 rounded = 2, then +1 = 3 by SM-2 standard formula). Verify by querying the database directly.

**AC6 (Daily queue generation)**: Given a user with 30 SRS cards, when the queue endpoint is called, then it returns exactly 20 cards composed of: 10 cards with the worst ease factors (lowest scores), 5 cards that have never been practiced (new cards), and 5 randomly selected cards from the remaining pool. If fewer than 10 worst-ease cards exist, the remainder fills from random pool.

**AC7 (Session persistence)**: Given a user mid-session who closes the browser tab and reopens it within 24 hours, when they return to the practice page, then `practiceStore` rehydrates from localStorage and the session resumes from where they left off rather than starting over.

#### Test Instructions

```bash
# 1. Verify SM-2 engine with known test vectors
# In backend/internal/services/srs/engine_test.go (write during M4):
# Input: ease=2.5, interval=1, repetitions=1, quality=4
# Expected output: ease=2.5, interval=3, repetitions=2

# 2. Test queue generation
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/queue/daily | python3 -m json.tool
# Count items: should be 20 (or fewer if user has < 20 cards total)

# 3. Manual leader key test in browser:
#    a. Open http://localhost:5173/practice/leader
#    b. Configure leader key to Space in settings
#    c. When challenge shows a <leader>ff binding, press: Space, f, f rapidly
#    d. Confirm green overlay appears
#    e. Try again but pause after Space + f — confirm timeout/red overlay at ~1s

# 4. Verify SRS update in DB after flashcard session:
docker compose exec postgres psql -U vimtrainer -d vimtrainer \
  -c "SELECT key_sequence, ease_factor, interval_days, next_review_at FROM srs_cards WHERE user_id = '<your_user_id>' ORDER BY updated_at DESC LIMIT 5;"
```

---

### M5 — Settings & Profile

**Duration**: 3 days
**Goal**: User settings (theme, leader key, daily goal, notification preferences) persist to the database and apply immediately to the UI. The profile page shows real aggregated stats (total sessions, accuracy, streak) computed from actual session data.

#### Files Created

**Backend**
- `backend/internal/handlers/settings.go`
- `backend/internal/repository/settings_repository.go`
- `backend/internal/handlers/sessions.go` (extend with stats aggregation queries)

**Frontend**
- `frontend/src/api/hooks/settings.ts`
- `frontend/src/api/hooks/users.ts`
- `frontend/src/stores/settingsStore.ts`
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/Profile.tsx`
- `frontend/src/styles/pages/profile.css`
- `frontend/src/styles/pages/settings.css`
- `frontend/src/styles/components/progress-indicator.css`

#### Acceptance Criteria

**AC1 (Settings persist across sessions)**: Given the settings page, when the engineer changes the theme from "dark" to "light" and the leader key from `\` to `<Space>`, then refreshes the page, then both settings are restored to their changed values (verified by checking the settings page and the CSS `data-theme` attribute on `<html>`).

**AC2 (Theme toggle applies immediately)**: Given the settings page, when the theme toggle is switched, then the UI theme changes within one render cycle with no full-page reload. The `<html>` element's `data-theme` attribute changes from `dark` to `light` (or vice versa) synchronously.

**AC3 (Profile shows real stats)**: Given a user who has completed at least 3 practice sessions, when they visit the profile page, then the displayed total sessions, overall accuracy percentage, and current streak are computed from actual database records — not hardcoded zeros.

**AC4 (Settings API)**: Given valid settings payload, when `PUT /api/v1/settings` is called with bearer token, then the response is HTTP 200 and a subsequent `GET /api/v1/settings` returns the updated values.

#### Test Instructions

```bash
# 1. Get current settings
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/settings | python3 -m json.tool

# 2. Update settings
curl -s -X PUT http://localhost:8080/api/v1/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"light","leader_key":"<Space>","daily_goal":15}' \
  | python3 -m json.tool

# 3. Re-fetch and confirm update persisted
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/settings | python3 -m json.tool

# 4. In browser: open http://localhost:5173/settings
#    Toggle theme — confirm <html data-theme="light"> in DevTools Elements
#    Refresh — confirm settings are still set to light theme

# 5. Visit http://localhost:5173/profile
#    Confirm session count, accuracy, streak are non-zero values
#    Cross-check: query DB for sessions count matching displayed value
```

---

### M6 — Analytics Dashboard

**Duration**: 4 days
**Goal**: All 7 analytics endpoints return real computed data from the sessions/attempts tables. The dashboard page renders all 6 Recharts chart components with live data. Charts are not empty or hardcoded.

#### Files Created

**Backend**
- `backend/internal/services/analytics/aggregator.go`
- `backend/internal/handlers/analytics.go`
- `backend/internal/repository/analytics_repository.go` (via interfaces.go extension)

**Frontend charts**
- `frontend/src/components/charts/AccuracyTrendChart.tsx`
- `frontend/src/components/charts/ResponseTimeTrendChart.tsx`
- `frontend/src/components/charts/PracticeTimeChart.tsx`
- `frontend/src/components/charts/CategoryBreakdownChart.tsx`
- `frontend/src/components/charts/MostMissedTable.tsx`
- `frontend/src/components/charts/MasteryScoreGauge.tsx`

**Frontend page and API hook**
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/api/hooks/analytics.ts`
- `frontend/src/styles/pages/dashboard.css`

#### Analytics Endpoints (7 total)

| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/analytics/accuracy-trend` | Daily accuracy % for last 30 days |
| `GET /api/v1/analytics/response-time-trend` | Avg response time in ms per day, last 30 days |
| `GET /api/v1/analytics/practice-time` | Total practice minutes per day, last 30 days |
| `GET /api/v1/analytics/category-breakdown` | Accuracy % by keymap category |
| `GET /api/v1/analytics/most-missed` | Top 20 keymaps by incorrect attempt count |
| `GET /api/v1/analytics/mastery-score` | Single float 0–100 overall mastery score |
| `GET /api/v1/analytics/summary` | Aggregate: total sessions, total attempts, global accuracy, streak |

#### Acceptance Criteria

**AC1 (Accuracy trend chart)**: Given a user with sessions spanning at least 7 days, when they visit the dashboard, then the AccuracyTrendChart renders a line chart with one data point per day and the y-axis range is 0–100%.

**AC2 (Most missed table)**: Given a user with at least 10 distinct keymaps practiced, when the dashboard loads, then MostMissedTable renders a sortable table of the keymaps with the most incorrect attempts, showing key sequence, description, and miss count.

**AC3 (Mastery gauge)**: Given a user, when the mastery score endpoint is called, then it returns a float between 0 and 100 computed as the weighted average ease factor across all SRS cards normalized to a 0–100 scale. The gauge component renders this value visually.

**AC4 (No empty charts)**: Given a new user with fewer than 3 days of data, when they visit the dashboard, then charts render with available data points rather than crashing or showing blank white boxes. Empty states ("not enough data yet") are shown for charts that require minimum data.

#### Test Instructions

```bash
# 1. Check all 7 analytics endpoints
for endpoint in accuracy-trend response-time-trend practice-time \
                category-breakdown most-missed mastery-score summary; do
  echo "=== $endpoint ==="
  curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8080/api/v1/analytics/$endpoint" | python3 -m json.tool
done

# 2. In browser: open http://localhost:5173/dashboard
#    Confirm all 6 chart areas render (no white boxes, no "undefined" text)
#    Open DevTools Network tab — confirm all 7 analytics requests return 200
#    Confirm MostMissedTable has at least some rows
#    Confirm MasteryScoreGauge shows a numeric value between 0 and 100
```

---

### M7 — Achievements & Streaks

**Duration**: 3 days
**Goal**: All 10 achievements automatically unlock after qualifying practice sessions. Streak is tracked per-calendar-day and displayed in the TopBar. Toast notifications fire when an achievement unlocks mid-session.

#### Files Created

**Backend**
- `backend/internal/services/achievement/checker.go`
- `backend/internal/handlers/achievements.go`
- `backend/internal/repository/achievement_repository.go`
- `backend/internal/repository/streak_repository.go`

**Frontend**
- `frontend/src/api/hooks/achievements.ts`
- `frontend/src/styles/components/achievements.css`
- `frontend/src/styles/components/streak.css`
- `frontend/src/styles/components/toast.css`

#### The 10 Achievements (seeded in migration 002)

| ID | Name | Unlock Condition |
|----|------|-----------------|
| 1 | First Session | Complete any practice session |
| 2 | Streak Starter | Maintain a 3-day streak |
| 3 | Week Warrior | Maintain a 7-day streak |
| 4 | Century Club | Log 100 total attempts |
| 5 | Sharp Shooter | Achieve 95%+ accuracy in a single session of 20+ attempts |
| 6 | Importer | Import keymaps from any source |
| 7 | Speed Demon | Average response time under 500ms for a session of 10+ attempts |
| 8 | Leader of the Pack | Complete 20 leader key challenges correctly |
| 9 | Motion Master | Practice all 68 builtin motions at least once |
| 10 | Consistent | Complete practice sessions on 30 distinct days |

#### Acceptance Criteria

**AC1 (First Session triggers immediately)**: Given a new user who has never practiced, when they complete their first practice session (any mode, any length), then the "First Session" achievement unlocks, a toast notification appears in the bottom-right corner within 2 seconds of session end, and the achievement shows as earned on the profile page.

**AC2 (Streak tracking)**: Given a user who practices today, when the engineer queries `GET /api/v1/users/streak`, then it returns the current streak count (at least 1). If the user practiced yesterday and today, the streak is 2. If the user skipped yesterday, the streak resets to 1.

**AC3 (Streak displayed in TopBar)**: Given a logged-in user with a streak of 3 or more days, when any page loads, then the TopBar shows a flame icon and the streak count next to the user avatar.

**AC4 (Achievement page)**: Given any authenticated user, when they visit `/profile` and scroll to the achievements section, then all 10 achievements are listed, earned achievements are highlighted with the unlock date, and unearned achievements are visible but grayed out with their unlock condition shown.

#### Test Instructions

```bash
# 1. Complete a practice session via browser, then check achievements
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/achievements | python3 -m json.tool
# "First Session" should appear as earned

# 2. Check streak
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/users/streak | python3 -m json.tool

# 3. Trigger "First Session" in browser:
#    a. Create a fresh account (new email)
#    b. Navigate to /practice
#    c. Complete a short session (5 attempts)
#    d. On session-end screen, confirm toast notification fires
#    e. Navigate to /profile, confirm "First Session" is earned with today's date
```

---

### M8 — Polish, Performance & Deployment

**Duration**: 4 days
**Goal**: Lighthouse performance score ≥ 90 on the landing page. App deploys successfully to Cloudflare Pages (frontend) and Google Cloud Run (backend). Docker Compose works on a clean machine following only the README instructions. All known rough edges from previous milestones are resolved.

#### Files Created/Updated

**Deployment**
- `backend/Dockerfile` (multi-stage build, final image ≤ 50 MB)
- `frontend/public/_redirects` (Cloudflare Pages SPA routing)
- `backend/.env.example` (all production environment variables documented)
- `README.md` (setup, local dev, and deployment instructions)

**Performance**
- `frontend/vite.config.ts` (chunk splitting for Recharts, lazy loading)
- `frontend/src/App.tsx` (React.lazy for route-level code splitting)

**CI/CD (optional but recommended)**
- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml`

#### Acceptance Criteria

**AC1 (Lighthouse ≥ 90)**: Given the production-built frontend (`npm run build && npm run preview`), when Lighthouse is run against `http://localhost:4173` in Chrome DevTools, then the Performance score is 90 or above. The primary levers are code splitting (Recharts only loads on `/dashboard`) and image optimization.

**AC2 (Cloud Run health check)**: Given the backend Docker image built with `docker build -t vimtrainer-api .`, when the image is deployed to Cloud Run with correct environment variables, then `curl https://<cloud-run-url>/health` returns HTTP 200 within 2 seconds on a cold start.

**AC3 (Cloudflare Pages SPA routing)**: Given the frontend deployed to Cloudflare Pages, when the engineer navigates directly to `https://<pages-url>/practice/motions` (deep link, no prior navigation), then the app loads correctly rather than returning a 404. This is what `public/_redirects` with `/* /index.html 200` enables.

**AC4 (Clean machine setup)**: Given a machine with only Docker, git, Node.js, and Go installed, when the engineer follows the README `## Quick Start` section exactly, then `docker compose up` starts the full stack, the frontend dev server starts, and `curl http://localhost:8080/health` returns 200 — all without any undocumented steps.

#### Test Instructions

```bash
# 1. Lighthouse test (production build)
cd frontend && npm run build && npm run preview
# Open Chrome -> DevTools -> Lighthouse -> Analyze page load on http://localhost:4173
# Target: Performance >= 90

# 2. Docker image size check
docker build -t vimtrainer-api ./backend
docker image inspect vimtrainer-api --format='{{.Size}}' | awk '{print $1/1024/1024 " MB"}'
# Target: < 50 MB

# 3. SPA routing test on Cloudflare Pages preview
# After deploy: open https://<your-pages-url>/practice/motions directly in a new tab
# Should NOT 404 — should load the app

# 4. Clean machine test (use a VM or Docker-in-Docker):
git clone https://github.com/yourorg/vimtrainer && cd vimtrainer
# Follow README exactly, no deviation
docker compose up -d
curl http://localhost:8080/health
# Must return 200 following README only
```

---

## 4. File Creation Map

Complete listing of every file in the project. Use this as the authoritative checklist during development.

### Backend

| File Path | Milestone | Type | Purpose |
|-----------|-----------|------|---------|
| `backend/cmd/server/main.go` | M1 | BE | Entry point, router setup, dependency wiring |
| `backend/internal/config/config.go` | M1 | BE | Load env vars, return typed Config struct |
| `backend/internal/database/db.go` | M1 | BE | Open Supabase PostgreSQL connection via GORM |
| `backend/internal/database/migrate.go` | M1 | BE | Run migration files in order on startup |
| `backend/migrations/001_initial_schema.sql` | M1 | Infra | Create all tables, indexes, foreign keys |
| `backend/migrations/002_seed_achievements.sql` | M1 | Infra | Insert 10 achievement rows |
| `backend/migrations/003_seed_builtin_keymaps.sql` | M1 | Infra | Insert 68 builtin Vim motions |
| `backend/internal/middleware/cors.go` | M1 | BE | CORS headers, allowed origins from config |
| `backend/internal/middleware/logger.go` | M1 | BE | Request/response logging with duration |
| `backend/internal/middleware/recovery.go` | M1 | BE | Panic recovery, return 500 JSON |
| `backend/internal/middleware/ratelimit.go` | M4 | BE | Per-IP rate limiting for API endpoints |
| `backend/internal/handlers/health.go` | M1 | BE | `GET /health` returns status + version |
| `backend/internal/models/user.go` | M1 | BE | User struct with GORM tags |
| `backend/internal/models/keymap.go` | M1 | BE | Keymap struct (mode, key_sequence, description, source) |
| `backend/internal/models/session.go` | M1 | BE | Practice session struct |
| `backend/internal/models/attempt.go` | M1 | BE | Individual keymap attempt struct |
| `backend/internal/models/srs_card.go` | M1 | BE | SRS state per user per keymap |
| `backend/internal/models/achievement.go` | M1 | BE | Achievement definition struct |
| `backend/internal/models/user_achievement.go` | M1 | BE | User-achievement junction with earned_at |
| `backend/internal/models/streak.go` | M1 | BE | Streak tracking struct |
| `backend/internal/models/settings.go` | M1 | BE | User settings struct |
| `backend/internal/models/guest.go` | M1 | BE | Guest session struct |
| `backend/internal/repository/interfaces.go` | M1 | BE | All repository interfaces (Go interfaces) |
| `backend/internal/repository/user_repository.go` | M2 | BE | CRUD for users |
| `backend/internal/repository/guest_repository.go` | M2 | BE | CRUD for guests, migration logic |
| `backend/internal/repository/keymap_repository.go` | M3 | BE | CRUD for keymaps, builtin query |
| `backend/internal/repository/session_repository.go` | M4 | BE | CRUD for sessions |
| `backend/internal/repository/attempt_repository.go` | M4 | BE | CRUD for attempts |
| `backend/internal/repository/srs_repository.go` | M4 | BE | CRUD for SRS cards |
| `backend/internal/repository/settings_repository.go` | M5 | BE | CRUD for settings |
| `backend/internal/repository/achievement_repository.go` | M7 | BE | Read achievements, write user_achievements |
| `backend/internal/repository/streak_repository.go` | M7 | BE | Read/update streak records |
| `backend/internal/auth/jwt.go` | M2 | BE | Sign/verify JWTs, refresh token logic |
| `backend/internal/auth/middleware.go` | M2 | BE | Gin middleware to validate Bearer token |
| `backend/internal/auth/password.go` | M2 | BE | bcrypt hash/compare |
| `backend/internal/handlers/auth.go` | M2 | BE | register, login, logout, refresh, guest endpoints |
| `backend/internal/handlers/users.go` | M2 | BE | me, update profile, streak endpoints |
| `backend/internal/handlers/keymaps.go` | M3 | BE | upload, import-github, list, delete endpoints |
| `backend/internal/handlers/sessions.go` | M4 | BE | start, complete session; list sessions |
| `backend/internal/handlers/srs.go` | M4 | BE | rate attempt, get card state |
| `backend/internal/handlers/queue.go` | M4 | BE | get daily queue |
| `backend/internal/handlers/settings.go` | M5 | BE | get/put settings |
| `backend/internal/handlers/analytics.go` | M6 | BE | all 7 analytics endpoints |
| `backend/internal/handlers/achievements.go` | M7 | BE | list achievements, list earned achievements |
| `backend/internal/services/parser/parser.go` | M3 | BE | Parser interface, file-type dispatcher |
| `backend/internal/services/parser/lua.go` | M3 | BE | Parse Neovim Lua keymap patterns |
| `backend/internal/services/parser/vimscript.go` | M3 | BE | Parse Vimscript nnoremap/vnoremap/etc |
| `backend/internal/services/parser/zip.go` | M3 | BE | Extract ZIP, iterate files, delegate to lua/vim parsers |
| `backend/internal/services/github/locator.go` | M3 | BE | Find keymap files in GitHub repo tree via API |
| `backend/internal/services/github/importer.go` | M3 | BE | Fetch files, parse, return keymaps |
| `backend/internal/storage/interface.go` | M3 | BE | Storage interface for file uploads |
| `backend/internal/storage/local.go` | M3 | BE | Store uploaded files on local disk (dev) |
| `backend/internal/storage/r2.go` | M3 | BE | Store uploaded files in Cloudflare R2 (prod) |
| `backend/internal/services/srs/engine.go` | M4 | BE | SM-2 algorithm: update ease factor, interval, repetitions |
| `backend/internal/services/srs/queue.go` | M4 | BE | Build daily queue: 10 worst + 5 new + 5 random |
| `backend/internal/services/analytics/aggregator.go` | M6 | BE | Compute all 7 analytics shapes from DB |
| `backend/internal/services/achievement/checker.go` | M7 | BE | Check all 10 conditions, unlock if met |
| `backend/Dockerfile` | M1 | Infra | Multi-stage Go build; updated for prod in M8 |
| `backend/docker-compose.yml` | M1 | Infra | postgres + go-api services |
| `backend/.env.example` | M1 | Infra | All required env vars with placeholders |
| `backend/go.mod` | M1 | Infra | Go module definition |
| `backend/go.sum` | M1 | Infra | Dependency checksums |

### Frontend

| File Path | Milestone | Type | Purpose |
|-----------|-----------|------|---------|
| `frontend/index.html` | M1 | FE | HTML entry point |
| `frontend/vite.config.ts` | M1 | FE | Vite config; chunk splitting added M8 |
| `frontend/tsconfig.json` | M1 | FE | TypeScript compiler config |
| `frontend/public/_redirects` | M1 | FE | Cloudflare Pages SPA catch-all rule |
| `frontend/src/main.tsx` | M1 | FE | React root render, router setup |
| `frontend/src/App.tsx` | M1 | FE | Route definitions; lazy loading added M8 |
| `frontend/src/types/models.ts` | M1 | FE | TypeScript interfaces matching backend models |
| `frontend/src/types/api.ts` | M1 | FE | API request/response types |
| `frontend/src/types/stores.ts` | M1 | FE | Zustand store state types |
| `frontend/src/api/client.ts` | M2 | FE | Axios instance, base URL, interceptors |
| `frontend/src/api/hooks/auth.ts` | M2 | FE | useLogin, useRegister, useLogout, useGuestCreate |
| `frontend/src/api/hooks/keymaps.ts` | M3 | FE | useUpload, useGitHubImport, useListKeymaps |
| `frontend/src/api/hooks/sessions.ts` | M4 | FE | useStartSession, useCompleteSession |
| `frontend/src/api/hooks/srs.ts` | M4 | FE | useRateAttempt, useCardState |
| `frontend/src/api/hooks/queue.ts` | M4 | FE | useDailyQueue |
| `frontend/src/api/hooks/analytics.ts` | M6 | FE | useAccuracyTrend, useResponseTimeTrend, etc. |
| `frontend/src/api/hooks/achievements.ts` | M7 | FE | useAchievements, useEarnedAchievements |
| `frontend/src/api/hooks/settings.ts` | M5 | FE | useGetSettings, useUpdateSettings |
| `frontend/src/api/hooks/users.ts` | M5 | FE | useMe, useUserStats, useStreak |
| `frontend/src/stores/authStore.ts` | M2 | FE | Zustand store: user, token, guest state |
| `frontend/src/stores/practiceStore.ts` | M4 | FE | Zustand store: active session, queue, current card |
| `frontend/src/stores/keymapStore.ts` | M3 | FE | Zustand store: keymap library |
| `frontend/src/stores/settingsStore.ts` | M5 | FE | Zustand store: theme, leader key, preferences |
| `frontend/src/stores/uiStore.ts` | M4 | FE | Zustand store: toasts, modal state, sidebar open |
| `frontend/src/hooks/useGlobalShortcuts.ts` | M4 | FE | Register app-level keyboard shortcuts |
| `frontend/src/hooks/useStoreHydration.ts` | M4 | FE | Rehydrate Zustand stores from localStorage |
| `frontend/src/hooks/useSessionConfig.ts` | M4 | FE | Derive session config from settings + route |
| `frontend/src/hooks/usePracticeSession.ts` | M4 | FE | Orchestrate full practice session lifecycle |
| `frontend/src/utils/keySequence.ts` | M3 | FE | Parse/normalize key sequences, canonical form |
| `frontend/src/utils/formatters.ts` | M4 | FE | Format ms durations, dates, accuracy % |
| `frontend/src/utils/srs.ts` | M4 | FE | SM-2 client-side preview (for flashcard mode UI) |
| `frontend/src/components/ui/Button.tsx` | M2 | FE | Button with variants (primary, ghost, danger) |
| `frontend/src/components/ui/Input.tsx` | M2 | FE | Text input with label, error state |
| `frontend/src/components/ui/Card.tsx` | M2 | FE | Container card with optional header/footer |
| `frontend/src/components/ui/Modal.tsx` | M2 | FE | Accessible modal with backdrop, close on Escape |
| `frontend/src/components/ui/Spinner.tsx` | M2 | FE | Loading spinner, multiple sizes |
| `frontend/src/components/ui/Badge.tsx` | M3 | FE | Category/status badge |
| `frontend/src/components/ui/Tooltip.tsx` | M3 | FE | Hover tooltip for key sequence explanations |
| `frontend/src/components/ui/KeySequence.tsx` | M3 | FE | Render `<C-p>` as styled keyboard key chips |
| `frontend/src/components/ui/ProgressBar.tsx` | M4 | FE | Linear progress bar for session progress |
| `frontend/src/components/ui/Avatar.tsx` | M4 | FE | User avatar with initials fallback |
| `frontend/src/components/layout/AppShell.tsx` | M2 | FE | Root layout: sidebar + topbar + main area |
| `frontend/src/components/layout/Sidebar.tsx` | M2 | FE | Nav links, collapse on mobile |
| `frontend/src/components/layout/TopBar.tsx` | M2 | FE | App header with user menu; streak added M7 |
| `frontend/src/components/layout/PageLayout.tsx` | M2 | FE | Consistent page padding/max-width |
| `frontend/src/components/practice/PracticeArena.tsx` | M4 | FE | Orchestrates challenge → input → feedback loop |
| `frontend/src/components/practice/ChallengeDisplay.tsx` | M4 | FE | Show current challenge description + context |
| `frontend/src/components/practice/KeyInput.tsx` | M4 | FE | Invisible input, captures keydown, buffers sequences |
| `frontend/src/components/practice/FeedbackOverlay.tsx` | M4 | FE | Green/red overlay with correct answer + response time |
| `frontend/src/components/practice/SessionStats.tsx` | M4 | FE | Live accuracy/speed counter during session |
| `frontend/src/components/practice/SessionComplete.tsx` | M4 | FE | End-of-session summary screen |
| `frontend/src/components/practice/ProgressIndicator.tsx` | M4 | FE | X of Y cards progress in session |
| `frontend/src/components/charts/AccuracyTrendChart.tsx` | M6 | FE | Recharts LineChart: accuracy % over 30 days |
| `frontend/src/components/charts/ResponseTimeTrendChart.tsx` | M6 | FE | Recharts LineChart: avg response time over 30 days |
| `frontend/src/components/charts/PracticeTimeChart.tsx` | M6 | FE | Recharts BarChart: daily practice minutes |
| `frontend/src/components/charts/CategoryBreakdownChart.tsx` | M6 | FE | Recharts PieChart: accuracy by keymap category |
| `frontend/src/components/charts/MostMissedTable.tsx` | M6 | FE | Sortable table of most-missed keymaps |
| `frontend/src/components/charts/MasteryScoreGauge.tsx` | M6 | FE | Recharts RadialBar or custom SVG gauge |
| `frontend/src/pages/Landing.tsx` | M1 | FE | Public landing page (stub in M1, full in M8) |
| `frontend/src/pages/Login.tsx` | M2 | FE | Login form page |
| `frontend/src/pages/Register.tsx` | M2 | FE | Registration form page |
| `frontend/src/pages/Import.tsx` | M3 | FE | File upload + GitHub import UI |
| `frontend/src/pages/Practice.tsx` | M4 | FE | Generic practice mode page |
| `frontend/src/pages/Motions.tsx` | M4 | FE | Motion trainer mode page |
| `frontend/src/pages/Leader.tsx` | M4 | FE | Leader key practice page |
| `frontend/src/pages/Flashcards.tsx` | M4 | FE | Flashcard mode page |
| `frontend/src/pages/Dashboard.tsx` | M6 | FE | Analytics dashboard with all charts |
| `frontend/src/pages/Profile.tsx` | M5 | FE | User profile, stats summary, achievements |
| `frontend/src/pages/Settings.tsx` | M5 | FE | App settings: theme, leader key, daily goal |

### CSS

| File Path | Milestone | Type | Purpose |
|-----------|-----------|------|---------|
| `frontend/src/styles/tokens.css` | M1 | FE | CSS custom properties: colors, spacing, radii, fonts |
| `frontend/src/styles/reset.css` | M1 | FE | CSS reset / normalization |
| `frontend/src/styles/base.css` | M1 | FE | Body, html defaults using tokens |
| `frontend/src/styles/index.css` | M1 | FE | Import barrel for all stylesheets |
| `frontend/src/styles/typography.css` | M2 | FE | Heading, body, code font rules |
| `frontend/src/styles/layout.css` | M2 | FE | Grid/flex utilities, container max-widths |
| `frontend/src/styles/animations.css` | M4 | FE | Keyframe animations: flash, fade, shake |
| `frontend/src/styles/components/button.css` | M2 | FE | Button variants, hover/active states |
| `frontend/src/styles/components/input.css` | M2 | FE | Input, label, error message styles |
| `frontend/src/styles/components/card.css` | M2 | FE | Card shadow, border, padding |
| `frontend/src/styles/components/modal.css` | M2 | FE | Modal overlay, dialog sizing |
| `frontend/src/styles/components/badge.css` | M3 | FE | Badge color variants |
| `frontend/src/styles/components/tooltip.css` | M3 | FE | Tooltip positioning, arrow |
| `frontend/src/styles/components/key-sequence.css` | M3 | FE | Keyboard key chip styling |
| `frontend/src/styles/components/progress-bar.css` | M4 | FE | Progress bar fill animation |
| `frontend/src/styles/components/feedback-overlay.css` | M4 | FE | Correct/incorrect overlay colors, fade |
| `frontend/src/styles/components/challenge-display.css` | M4 | FE | Challenge text sizing, context dim |
| `frontend/src/styles/components/key-input.css` | M4 | FE | Invisible focus area, cursor indicator |
| `frontend/src/styles/components/session-stats.css` | M4 | FE | Live stats bar layout |
| `frontend/src/styles/components/session-complete.css` | M4 | FE | End screen layout, score ring |
| `frontend/src/styles/components/avatar.css` | M4 | FE | Avatar circle, initials fallback |
| `frontend/src/styles/components/spinner.css` | M2 | FE | Spinner animation |
| `frontend/src/styles/components/progress-indicator.css` | M5 | FE | Step progress dots/bar |
| `frontend/src/styles/components/achievements.css` | M7 | FE | Achievement card earned/locked states |
| `frontend/src/styles/components/streak.css` | M7 | FE | Streak flame + counter in TopBar |
| `frontend/src/styles/components/toast.css` | M7 | FE | Toast notification slide-in animation |
| `frontend/src/styles/pages/auth.css` | M2 | FE | Login/register page centered layout |
| `frontend/src/styles/pages/import.css` | M3 | FE | Import page file drop zone |
| `frontend/src/styles/pages/practice.css` | M4 | FE | Practice pages full-screen layout |
| `frontend/src/styles/pages/profile.css` | M5 | FE | Profile page grid layout |
| `frontend/src/styles/pages/settings.css` | M5 | FE | Settings page form layout |
| `frontend/src/styles/pages/dashboard.css` | M6 | FE | Dashboard chart grid layout |

### Root / CI

| File Path | Milestone | Type | Purpose |
|-----------|-----------|------|---------|
| `README.md` | M8 | Docs | Setup, local dev, deployment instructions |
| `.github/workflows/deploy-backend.yml` | M8 | Infra | CI: build + push Docker image to Cloud Run |
| `.github/workflows/deploy-frontend.yml` | M8 | Infra | CI: build + deploy to Cloudflare Pages |

**Total file count**: 60 backend files + 86 frontend files + 2 CI files + 1 README = **149 files**

---

## 5. Critical Path Analysis

### Milestones on the Critical Path

Every milestone is on the critical path. With a single engineer and strict sequential dependencies there is no slack anywhere. Any slip in any milestone directly delays the ship date by the same number of days.

### What Happens if M4 Slips 2 Days

M4 is 6 days and contains the most uncertainty (multi-key sequences, SM-2 correctness, queue generation). A 2-day slip means:

- Total schedule becomes 34 days instead of 32
- M5, M6, M7, and M8 all shift right by 2 days
- MVP demonstrability (end of M5) moves from day 20 to day 22

A 2-day M4 slip is recoverable without cutting features. A 4-day slip should trigger a scope conversation: defer M7 (Achievements) to post-MVP and ship without it.

### Compression Options

**If you must compress the schedule by 3 days:**

1. **Merge M5 into M4 (save 1 day)**: Do profile and settings pages immediately after the practice backend is working, before moving to analytics. The backend for both is lightweight.

2. **Defer MasteryScoreGauge to post-launch (save 0.5 days)**: The gauge is the most complex chart component. Ship M6 with 5 charts and add the gauge in a follow-up.

3. **Defer GitHub import to V1 (save 1.5 days from M3)**: Implement only file upload (`.lua`, `.vim`, `.zip`) for MVP. GitHub import is a convenience feature. This reduces M3 from 5 days to 3.5 days.

Total compression available: approximately 3 days without cutting core functionality.

**Do not attempt to compress M1 or M2.** Infrastructure and auth bugs discovered late cost more than the time saved early.

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Lua parser misses real-world patterns** — Neovim configs use `vim.keymap.set`, `map`, `nmap`, `which-key` tables, and lazy.nvim spec `keys = {}` blocks. Missing common patterns makes import feel broken. | H | H | Before writing the parser, collect 10 real dotfiles from GitHub and catalog the distinct call patterns. Build the parser to handle all of them. Accept that exotic patterns (which-key nested tables) can be deferred. |
| **Browser keydown capture breaks `<leader>ff`** — OS-level shortcuts (`<C-w>` closes tab), browser shortcuts (`<C-t>` opens tab), and focus stealing can all intercept keystrokes before JavaScript sees them. | H | H | Use a fullscreen practice mode that calls `e.preventDefault()` on all keydowns while active. Test specifically on macOS Chrome, macOS Firefox, and Linux Chrome before claiming M4 done. |
| **Supabase connection pool exhaustion on Cloud Run** — Cloud Run scales to multiple instances; each instance opens its own DB connection pool. Supabase free tier limits concurrent connections. | M | H | Set `GORM DB.SetMaxOpenConns(5)` per instance and configure Cloud Run max-instances=3. Total max connections: 15, well within Supabase limits. Document this in `.env.example`. |
| **Go git clone security — path traversal and large repos** — `git clone` of an attacker-supplied URL could traverse to sensitive paths or clone a 10 GB repo and exhaust disk. | M | H | Do not shell out to `git clone`. Use GitHub's REST API (`/repos/{owner}/{repo}/contents`) to fetch only the files the locator identifies. Never clone. Enforce a 5 MB response-size cap per API call. |
| **ZIP bomb / decompression bomb** — A malicious `.zip` file with heavily nested or recursive entries can expand to gigabytes and OOM the server. | L | H | Before extracting, check compressed file count (reject > 1000 entries) and enforce a 50 MB uncompressed size cap. Use streaming extraction with a byte counter rather than extracting to disk first. |
| **Vite bundle size with Recharts** — Recharts adds ~300 KB to the bundle. Including it in the main chunk will tank Lighthouse performance score below 90. | H | M | Route-level code splitting via `React.lazy(() => import('./pages/Dashboard'))`. Recharts never loads unless the user navigates to `/dashboard`. Verify with `vite-bundle-visualizer` before claiming M8 done. |
| **CORS misconfiguration in production** — Hardcoding `Access-Control-Allow-Origin: *` works locally but is wrong for production. The frontend origin must be explicitly allowlisted or cookie-based auth breaks. | M | H | `cors.go` reads allowed origins from `ALLOWED_ORIGINS` env var. Set this to the Cloudflare Pages domain in Cloud Run environment config. Test by opening production frontend and confirming login works end to end (cookies require same-site settings too). |
| **Cloud Run cold start latency** — Go cold starts on Cloud Run are typically 500ms–1.5s. For a practice app where users expect instant feedback, a cold start on the first API call after idle creates a jarring experience. | M | M | Set `--min-instances=1` on the Cloud Run service to keep one warm instance. For an open-source self-hosted app with low traffic this is acceptable cost (~$5/month). Document this in the README deployment section. |

---

## 7. Definition of Done

Each condition below must be manually verifiable. "Tests pass" is not sufficient — every item requires a human action and a specific observable outcome.

**Infrastructure**
- [ ] `docker compose up` on a clean checkout produces no container errors within 60 seconds
- [ ] All 3 migration files execute in order on first boot; `\dt` in psql lists all 10 tables
- [ ] `curl http://localhost:8080/health` returns `{"status":"ok"}` with HTTP 200

**Authentication**
- [ ] A new user can register, log in, and access `/dashboard` in under 30 seconds
- [ ] Logging out then navigating to `/dashboard` redirects to `/auth/login`
- [ ] A guest user can practice without registering; their session data survives guest→account migration

**Keymap Import**
- [ ] Uploading a real Neovim `init.lua` file (not a toy file) produces at least 5 parsed keymaps
- [ ] Uploading the same file twice does not double the keymap count in the library
- [ ] All 68 builtin motions are visible to a brand-new guest user with no imports

**Practice Engine**
- [ ] All 4 practice modes (practice, motions, leader, flashcards) are reachable from the sidebar
- [ ] Typing `<leader>ff` in leader key mode with space as leader registers as correct
- [ ] After a flashcard session, the `srs_cards` table shows updated `ease_factor` and `next_review_at`
- [ ] The daily queue endpoint returns 20 cards (or all available cards if user has fewer than 20)

**Settings & Profile**
- [ ] Changing the theme to light mode and refreshing still shows light mode
- [ ] Profile page shows non-zero session count after completing any practice session
- [ ] Changing the leader key in settings affects which key the practice modes expect

**Analytics**
- [ ] All 7 analytics endpoints return HTTP 200 with non-empty data arrays after 1 week of use
- [ ] Dashboard page renders all 6 chart components without any blank white boxes
- [ ] MostMissedTable is sortable and updates after new practice sessions

**Achievements**
- [ ] "First Session" achievement fires a toast notification on the session-complete screen after the first session
- [ ] All 10 achievements are listed on the profile page with correct unlock conditions
- [ ] Streak count in TopBar increments after practicing on consecutive days

**Deployment**
- [ ] Frontend deployed to Cloudflare Pages: deep-linking to `/practice/motions` does not 404
- [ ] Backend deployed to Cloud Run: `curl https://<production-url>/health` returns 200
- [ ] Lighthouse Performance score ≥ 90 on the production landing page
- [ ] README quick-start instructions work on a machine that has never run this project

---

## 8. Day 1 Checklist

This is the exact sequence of actions the engineer performs on Day 1. Completing this list unblocks all future work and produces the first demoable state (health endpoint returning 200).

**Environment setup (morning)**

1. Install Go 1.22+, Node.js 20+, Docker Desktop. Verify with `go version`, `node --version`, `docker --version`.
2. Create the project directory structure: `mkdir -p vimtrainer/{backend,frontend}`.
3. Initialize Go module: `cd backend && go mod init github.com/yourorg/vimtrainer`.
4. Install Go dependencies: `go get github.com/gin-gonic/gin gorm.io/gorm gorm.io/driver/postgres github.com/golang-jwt/jwt/v5 golang.org/x/crypto github.com/joho/godotenv`.
5. Initialize frontend: `cd frontend && npm create vite@latest . -- --template react-ts`. Accept overwrite prompt.
6. Install frontend dependencies: `npm install axios zustand react-router-dom recharts`.

**Backend foundation (midday)**

7. Create `backend/.env.example` with these keys: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ALLOWED_ORIGINS`, `PORT`, `STORAGE_TYPE`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `GITHUB_TOKEN`.
8. Copy `.env.example` to `.env` and fill in local values (postgres connection string pointing to Docker container).
9. Write `backend/internal/config/config.go` — read env vars into a typed struct.
10. Write `backend/migrations/001_initial_schema.sql` — all CREATE TABLE statements.
11. Write `backend/migrations/002_seed_achievements.sql` — INSERT 10 achievement rows.
12. Write `backend/migrations/003_seed_builtin_keymaps.sql` — INSERT 68 builtin Vim motions.
13. Write `backend/internal/database/db.go` and `migrate.go`.
14. Write `backend/internal/handlers/health.go`.
15. Write `backend/cmd/server/main.go` — wire config, DB, health route, start server on `$PORT`.

**Docker setup (afternoon)**

16. Write `backend/Dockerfile` — multi-stage: `golang:1.22-alpine` build stage, `alpine:3.19` runtime stage.
17. Write `backend/docker-compose.yml` with two services: `postgres` (image: `postgres:16-alpine`, health check: `pg_isready`) and `go-api` (build: `.`, depends_on postgres, env_file: `.env`).

**Verify M1 acceptance criteria (end of day)**

18. Run `docker compose up --build`. Watch logs until both containers are stable.
19. Run `curl http://localhost:8080/health` and confirm `{"status":"ok"}`.
20. Connect to postgres: `docker compose exec postgres psql -U vimtrainer -d vimtrainer -c "\dt"`. Confirm 10 tables exist.
21. Run `cd frontend && npm run dev`. Open `http://localhost:5173`. Confirm page loads without console errors.
22. Create a git commit: `git add -A && git commit -m "M1: Foundation — health endpoint, migrations, Vite shell"`.

At end of Day 1 the project has a running local stack, a verified health endpoint, a migrated database, and a booting frontend shell. Every subsequent milestone builds on this foundation.
