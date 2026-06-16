# VimTrainer — User Journeys

**Version**: 1.0  
**Date**: 2026-06-16

This document describes the 8 primary user journeys through VimTrainer. Each journey includes the happy path, branching points, and error states. These journeys drive frontend routing, backend endpoint requirements, and QA test cases.

---

## Journey 1: First Visit Onboarding

**Who**: Any first-time visitor (no account, no token)  
**Entry**: `vimtrainer.dev`

### Happy Path A — Guest Mode

```
Landing page
  └── "Start Practicing (No Account Needed)"
        └── POST /auth/guest → guest JWT issued
              └── /onboarding Step 1: Experience level
                    (New to Vim / Know the basics / Experienced)
                    └── /onboarding Step 2: Do you have a config?
                          ├── "Yes, import it" → Journey 2 (Import)
                          │     └── On import complete → Journey 4 (Practice)
                          └── "No, start with motions" → /practice/motions
                                └── Auto-start at matching difficulty tier
                                      └── After first session → results screen
                                            └── Banner: "Save your progress — create a free account"
```

### Happy Path B — Register Directly

```
Landing page
  └── "Create Account"
        └── /auth/register form (email + password)
              └── POST /auth/register → access token + refresh cookie
                    └── /onboarding (same as Guest Step 3+, but progress persists immediately)
                          └── After first session → /dashboard
```

### Error States

| Error | User-facing message | Behavior |
|-------|---------------------|----------|
| Email already registered | "An account with this email already exists. Log in instead?" | Inline form error, link to /login |
| Password < 8 chars | "Password must be at least 8 characters" | Client-side, no network call |
| Network error | "Something went wrong. Please try again." | Toast, form data preserved |
| Guest token expired (> 24h) | "Your guest session has expired. Create an account to save progress." | New guest token issued |

---

## Journey 2: Keymap File Import

**Who**: Any authenticated user (guest or registered) with a Neovim config file  
**Entry**: Onboarding Step 2 / `/import` / Dashboard empty state

### Happy Path — Single File Upload

```
/import page
  └── Drag-drop zone + "Browse Files"
        └── Client validates: extension (.lua/.vim/.vimrc/.zip), size (< 10MB)
              └── POST /keymaps/upload → preview_token + parse_result
                    └── Review table (all keymaps pre-selected, checkbox per row)
                          Columns: ☐ Key Sequence | Mode | Description | Source File
                          Filters: mode, category, text search
                          └── User reviews and deselects unwanted keymaps
                                └── "Add X keymaps to my practice set"
                                      └── POST /keymaps/upload/confirm → source created
                                            └── "X keymaps added"
                                                  ├── "Start Practicing Now"
                                                  └── "Go to Dashboard"
```

### Branch — ZIP Archive

Same flow; backend walks all `.lua`/`.vim` files in archive. Source file column shows relative path within ZIP.

### Error States

| Error | User-facing message |
|-------|---------------------|
| Unsupported file type | "VimTrainer supports .lua, .vim, .vimrc, and .zip files." |
| File > 10MB | "File exceeds 10MB limit. Try uploading individual files instead." |
| No keymaps found | "No keymaps found in this file. Ensure your file contains vim.keymap.set() or nnoremap/inoremap/vnoremap definitions." |
| Partial parse | "X keymaps extracted. Y lines could not be parsed and were skipped." — expandable detail |
| All duplicates | "All keymaps in this upload already exist in your practice set." |
| Preview token expired | "Upload session expired. Please re-upload your file." |

---

## Journey 3: GitHub Dotfiles Import

**Who**: Any authenticated user (guest or registered) with a public GitHub dotfiles repo  
**Entry**: Import page → "Import from GitHub instead" / `/import`

### Happy Path

```
/import (GitHub tab)
  └── URL input: "https://github.com/username/dotfiles"
        └── Client validates URL format (https://github.com/user/repo pattern)
              └── POST /keymaps/github → job_id (202 Accepted)
                    └── Frontend polls GET /keymaps/github/status/:job_id
                          Progress messages: "Cloning..." → "Locating Neovim config..." → "Parsing keymaps..."
                          (Exponential backoff: 1s, 2s, 4s, 8s max)
                          └── status: "complete" → preview_token + parse_result
                                └── Framework detection banner (if LazyVim/AstroNvim/NvChad detected)
                                      └── Review table — identical to Journey 2
                                            └── POST /keymaps/upload/confirm → source created
```

### Error States

| Error | Code | User-facing message |
|-------|------|---------------------|
| Invalid URL format | `INVALID_GITHUB_URL` | "Please enter a valid GitHub repository URL." |
| Repo not found / private | `REPO_NOT_FOUND` | "Repository not found. Check the URL and ensure the repository is public." |
| No Neovim config | `NO_NEOVIM_CONFIG` | "No Neovim configuration found. Ensure your repo contains a .config/nvim/ directory." |
| Clone timeout | `CLONE_TIMEOUT` | "Repository is taking too long to process. Try uploading specific files instead." |
| 0 keymaps parsed | `PARSE_NO_RESULTS` | "No keymaps were found in the Neovim config." |

---

## Journey 4: Practice Session

**Who**: Any authenticated user (guest or registered) with keymaps or using Motion Trainer  
**Entry**: "Start Practicing" / `/practice` nav / `/practice/motions` / `/practice/leader` / daily queue

### Happy Path

```
/practice (mode selection)
  └── Select mode: My Keymaps / Motion Trainer / Leader Key / Flashcards
        └── Select length: 10 / 20 / 30 commands
              └── POST /sessions → session_id + ordered challenges[]
                    └── Session arena:
                          Progress bar: "3 / 20"
                          Challenge display: description + category tag
                          Auto-focused key input (hidden, captures keypresses)
                          │
                          ├── User types correct sequence
                          │     └── Green flash (300ms) → auto-advance
                          │
                          └── User types incorrect sequence + Enter
                                └── Red shake (400ms) → show correct answer (1200ms) → advance
                          │
                          (repeat until all challenges complete)
                          │
                          └── POST /sessions/:id/complete → session summary + achievements
                                └── Results screen:
                                      Accuracy % | Avg response time | Longest streak
                                      Per-command table
                                      Missed commands section
                                      CTAs: Practice Again / Dashboard / Practice Missed Commands
```

### Branch — Early Exit

```
User presses Escape mid-session
  └── Modal: "End session early?"
        ├── "Keep Going" → resume
        └── "End Session" → partial session saved → results screen (labeled "Partial Session")
```

### Key Capture Logic

- Hidden `<input>` with `autoFocus` receives keydown events
- Keys accumulate in `practuredKeys[]` until sequence matches or 2-second idle timeout
- Leader key (`<leader>`) maps to user's configured symbol (default `\`)
- Special key display: `<CR>` = Enter, `<BS>` = Backspace, `<Esc>` = Escape, `<Space>` = Space
- On sequence match: submit immediately (no Enter required for multi-key sequences)
- On timeout: submit partial sequence as incorrect, advance

### Error States

| State | Behavior |
|-------|----------|
| No keymaps (My Keymaps mode) | Empty state: "Import your Neovim config to practice your own keymaps" + import CTA |
| Session save fails | Silent retry (3x). After all fail: subtle banner "Session data could not be saved." |
| Tab loses focus mid-session | Timer pauses, "Session paused" indicator. Resumes on focus return. |

---

## Journey 5: Daily Training Queue

**Who**: Registered users only  
**Entry**: Main nav → "Daily Queue" / Dashboard home

### Happy Path

```
Dashboard / /practice (Daily Queue section)
  └── GET /sessions/daily-queue → queue (or creates new queue for today)
        Queue composition: "10 weakest • 5 new • 5 random"
        Progress: "X of 20 completed today"
        └── "Start" or "Resume"
              └── Practice session — identical to Journey 4
                    (but no mode selection, queue is fixed)
                    └── POST /sessions/:id/complete
                          └── Results screen labeled "Daily Queue Complete"
                                Streak counter increments
                                Achievement check fires
                                CTAs: View Analytics / Practice More / Go Home
```

### Branch — Incomplete Queue from Yesterday

```
User returns after missing a day
  └── Dashboard shows yesterday's queue as "Expired" with partial summary
        Today's new queue generated
        └── Normal daily queue flow continues
```

### Error States

| State | Behavior |
|-------|----------|
| No imported keymaps | Queue draws from Motion Trainer Beginner. Banner: "No keymaps imported yet. Your daily queue uses core Vim motions." |
| Guest user accessing queue | "Daily queues require an account to save your streak." + registration CTA |

---

## Journey 6: Flashcard Review

**Who**: Any authenticated user with practice history  
**Entry**: Nav → "Flashcards" / Dashboard / Post-session CTA

### Happy Path

```
/practice/flashcards
  └── Deck selection: All Commands / filtered by category
        Stats: "42 cards — 12 Learning, 18 Known, 12 New"
        └── "Review Due Cards"
              └── POST /sessions (mode: "flashcard") → session with due SRS cards
                    └── Per card:
                          Description displayed (key sequence hidden)
                          "Reveal Answer" (or Space)
                          └── Key sequence revealed + mode label
                                ├── "Knew It" → SRS interval increases, advance
                                └── "Missed It" → SRS resets to 1 day, card flagged for re-review
                    └── POST /sessions/:id/complete
                          Results: Knew It % / Missed It % / Cards moved to Known
                          "Review Missed Cards Again" (if any missed)
```

### Error States

| State | Behavior |
|-------|----------|
| No cards due | "No cards due for review today. Next review: tomorrow." + "Review All Anyway" option |
| No keymaps | "Import your Neovim config to create your flashcard deck." + import CTA |

---

## Journey 7: Analytics Dashboard

**Who**: Registered users only  
**Entry**: Nav → "Analytics" / Profile → "View Analytics" / Session results → "View Analytics"

### Happy Path

```
/dashboard
  └── Date range selector: Last 7 days / Last 30 days / All time (default: 30 days)
        └── GET /analytics/summary → all chart data
              Layout (top to bottom):
              ├── Mastery Score gauge (large, prominent)
              ├── Accuracy Trend (line chart — 30 days)
              ├── Response Time Trend (line chart — 30 days)
              ├── Daily Practice Time (bar chart)
              ├── Category Breakdown (donut chart — clickable to filter)
              └── Most Missed Commands (horizontal bar — top 10 by error rate)
                    └── Click any command bar
                          └── GET /analytics/commands/:id → drill-down panel
                                Command details: accuracy %, avg response time, session appearances
                                Mini accuracy-over-time chart
                                "Practice This Now" → targeted 10-command session (5x this command + 5 from same category)
```

### Error States

| State | Behavior |
|-------|----------|
| < 3 sessions | Empty state per chart: "Complete more sessions to see trends. You need at least 3 sessions." |
| Guest user | "Analytics requires an account to track your history." + registration CTA |
| Chart data load failure | Per-chart error state: "Failed to load chart data. Refresh to try again." |

---

## Journey 8: Settings

**Who**: Any authenticated user (guest or registered)  
**Entry**: Nav → "Settings" / User menu → "Settings"

### Happy Path

```
/settings
  └── Sections: Appearance / Practice / Accessibility / Account
        │
        ├── Theme toggle (Dark/Light/System)
        │     └── UI updates immediately, PATCH /settings (registered) or localStorage (guest)
        │
        ├── Session Length dropdown (10/20/30)
        │     └── Auto-saves on change
        │
        ├── Practice Sounds toggle
        │     └── Auto-saves, plays test sound on enable
        │
        ├── Reduced Motion toggle
        │     └── Auto-saves, removes all CSS transitions immediately
        │
        └── Account section (registered only)
              └── "Change Password" → /settings/change-password
                    └── PUT /users/me/password (requires current password)
              └── "Delete Account" → confirmation dialog (type "delete my account")
                    └── DELETE /users/me → soft-delete, cookie cleared, redirect to /
```

### Guest User — Account Section

```
Settings → Account section
  └── "You're practicing as a guest."
        └── "Create an account to save your settings, progress, and streak across devices."
              └── Inline registration form or link to /auth/register
```

### Persistence Rules

| User type | Storage | Mechanism |
|-----------|---------|-----------|
| Registered | Database | `PATCH /settings` (debounced 500ms for text inputs, immediate for toggles) |
| Guest | localStorage | `vimtrainer_settings` key |
| Guest → Register | Merge | localStorage values win over backend defaults on registration |

### Error States

| Error | Behavior |
|-------|----------|
| Settings save failure | Toast: "Settings could not be saved." UI reflects optimistic value, retried on next change |
| Invalid leader key (> 1 char) | Inline validation: "Leader key must be a single character or '\<Space\>'." Change not saved |

---

## Journey Cross-Reference

| Journey | Key Endpoints | Auth Required |
|---------|--------------|---------------|
| 1. Onboarding | `POST /auth/register`, `POST /auth/guest` | None |
| 2. File Import | `POST /keymaps/upload`, `POST /keymaps/upload/confirm` | Guest or Registered |
| 3. GitHub Import | `POST /keymaps/github`, `GET /keymaps/github/status/:id` | Guest or Registered |
| 4. Practice Session | `POST /sessions`, `POST /sessions/:id/attempts`, `POST /sessions/:id/complete` | Guest or Registered |
| 5. Daily Queue | `GET /sessions/daily-queue` | Registered only |
| 6. Flashcard Review | `POST /sessions` (flashcard mode), `POST /sessions/:id/complete` | Guest or Registered |
| 7. Analytics | `GET /analytics/summary`, `GET /analytics/commands/:id` | Registered only |
| 8. Settings | `GET /settings`, `PATCH /settings` | Guest (localStorage) or Registered |
