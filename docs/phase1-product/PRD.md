# PRD: VimTrainer — Phase 1
**Status**: Approved
**Author**: Alex (PM)
**Last Updated**: 2026-06-16
**Version**: 1.0
**Stakeholders**: Engineering Lead, Design Lead, DevOps

---

## 1. Product Vision & Mission

**Vision**: Every Neovim user operates at the full potential of their configuration — no forgotten bindings, no wasted keystrokes, no productivity gaps between installing a plugin and owning it.

**Mission**: VimTrainer makes muscle memory for Vim motions and custom Neovim keybindings as trainable and measurable as typing speed — starting from the user's own config file.

---

## 2. Problem Statement

### Who Suffers

Neovim power users — developers who have invested hours curating `init.lua`, installing plugins like Telescope, Harpoon, LSP, and defining hundreds of custom leader mappings — operate at a fraction of their theoretical efficiency because they cannot recall the shortcuts they themselves configured. This is not a knowledge problem. It is a muscle memory problem.

There are three distinct failure modes:

1. **Configuration exceeds recall capacity.** A developer configures `<leader>ff` for Telescope find files, `<leader>ca` for code actions, `<leader>rn` for rename. Six months later, they use the mouse for tasks they already automated. The config is correct. The habit is not.

2. **Migration paralysis.** A developer moving from VS Code or IntelliJ to Neovim knows what they want to do but not which keystrokes achieve it. Basic motions — `ciw`, `daw`, `gg/G`, visual block — feel unnatural. They abandon Neovim or revert to familiar but inefficient patterns.

3. **Plugin amnesia.** A developer installs which-key to discover available bindings, but discovery is not practice. Seeing a binding once does not produce recall under the pressure of real coding.

### Why Existing Solutions Fail

| Tool | What It Does | Why It Fails for This Problem |
|------|-------------|-------------------------------|
| `vimtutor` | Teaches 40 core motions via interactive lesson | Static, covers ~1% of a real Neovim config, no custom keymap support |
| which-key.nvim | Shows available bindings in a popup | Discovery only — no active recall, no repetition, no measurement |
| Vim Adventures | Gamifies basic motions in a browser game | Novelty wears off quickly, no support for custom configs |
| Anki (manual) | Spaced repetition flashcards | Requires manual card creation, no integration with config files |
| ThePrimeagen's tutorials | Video walkthroughs of Neovim usage | Passive consumption, not active practice, not personalized |

None of these tools meet the user where they are: in their own config, with their own shortcuts, needing to build habits that stick under the pressure of real work.

### The Cost of Not Solving It

- Developers revert to mouse or IDE shortcuts for tasks their Neovim config already handles — directly undermining the productivity gain they configured Neovim to provide.
- Plugin setups go underutilized. Telescope, Harpoon, and LSP bindings sit dormant in config files that never become habits.
- The activation energy for Neovim migration remains artificially high, pushing otherwise willing developers back to GUI editors.

---

## 3. Target Audience

### Primary

**Neovim power users with custom configurations.** These developers have 50–500+ keymaps defined across multiple config files. They use plugin managers (Lazy.nvim, Packer), maintain dotfiles on GitHub, and care about their editor as a productivity instrument. They are willing to invest time in deliberate practice if the tool respects their existing setup.

### Secondary

**VS Code and IntelliJ migrants actively transitioning to Neovim.** These developers have made the decision to switch but are in the uncomfortable middle phase — they know Neovim is more powerful but cannot yet operate at their prior efficiency. They need structured motion training and a clear on-ramp.

### Tertiary

**Intermediate Vim users who want to audit and sharpen existing habits.** These users know Vim well but suspect they have blind spots — motions they skip, shortcuts they've forgotten, inefficient patterns they've never corrected. They want a measurement baseline and targeted practice.

### Out of Scope for V1

- Emacs users
- Nano or micro editor users
- Developers with no interest in terminal-based editors
- Teams looking for onboarding tooling (enterprise use case, post-V1)

---

## 4. Product Goals & Success Metrics

### Goals

| # | Goal | Rationale |
|---|------|-----------|
| G1 | Validate that Neovim users will import their config and actively practice | Core PMF hypothesis — if users won't import their config, the product's differentiation is irrelevant |
| G2 | Validate that users return for multiple sessions without prompting | Habit formation requires return visits; one-and-done sessions indicate insufficient stickiness |
| G3 | Validate that users can achieve measurable accuracy improvement within 30 days | If users do not improve, the training mechanism is not working |
| G4 | Establish a baseline user pool large enough to inform V1.1 decisions | Need minimum 200 active users within 60 days of launch to generate statistically meaningful signal |

### Success Metrics

| Metric | Definition | Baseline | Target (60 days post-launch) | Measurement Method |
|--------|------------|----------|------------------------------|--------------------|
| Keymap Import Rate | % of registered users who complete at least one keymap import | 0% (new product) | 55% | Backend event: `keymap_import_completed` |
| Session Completion Rate | % of started practice sessions that reach the results screen | 0% | 70% | Backend event: `session_completed / session_started` |
| D7 Retention | % of users who return and complete a session within 7 days of first session | 0% | 30% | User activity table: sessions with user_id, 7-day window |
| D30 Retention | % of users who complete a session in week 4 (days 22–30) | 0% | 15% | User activity table: 30-day window |
| Daily Active Users (DAU) | Unique users completing at least one practice session per day | 0 | 50 DAU by day 60 | Sessions per day with distinct user_ids |
| Accuracy Improvement (P50) | Median accuracy delta between a user's first session and their session in week 3 | 0 | +15 percentage points | Accuracy stored per session, delta computed per user cohort |
| Guest-to-Registered Conversion | % of guest users who create an account within the same session | 0% | 25% | Auth events: guest sessions followed by registration |

### Anti-Metrics (What We Are NOT Optimizing For in V1)

- Revenue / conversion to paid plan (no billing in V1)
- Viral coefficient / referral rate (V2 concern)
- SEO traffic (V2 concern)
- Social sharing (V2 concern)

---

## 5. Non-Goals (V1 Explicit Exclusions)

| Excluded Feature | Reason |
|-----------------|--------|
| Billing, subscriptions, feature gating | Open source / self-hosted first. Monetization strategy requires PMF data we do not yet have. |
| Social auth (GitHub OAuth, Google) | Reduces scope and auth surface. Email/password + JWT is sufficient for V1. |
| Multiplayer or competitive modes | Significant complexity with unclear demand signal. Research after launch. |
| Community keymap sharing / public library | Content moderation, curation, and trust infrastructure needed first. |
| Mobile app or mobile-responsive practice modes | Vim is a keyboard-first tool used on desktop/laptop. Mobile is not the use case. |
| Plugin marketplace integration | Requires partnerships and API agreements. Post-V1. |
| AI-powered suggestions or GPT-assisted learning | Deterministic spaced repetition is sufficient and testable. AI adds cost and unpredictability. |
| VS Code / JetBrains keymap import | Out of target audience for V1. |
| Private GitHub repo import | OAuth and token management scope. V1 supports public repos only. |
| Team or organization accounts | Enterprise feature. Post-V2. |
| In-app config editor | Users edit their config in their editor. Not our problem to solve. |
| Neovim plugin auto-detection beyond bundled profiles | LazyVim, AstroNvim, NvChad, Kickstart.nvim supported. Custom plugins parsed via standard keymap APIs only. |

---

## 6. Feature Specifications

### Feature 1: Keymap File Import

**Description**: Users upload one or more Neovim config files. The parser extracts all keymap definitions and presents them for review before adding to the practice queue.

**Supported File Types**: `.lua`, `.vim`, `.zip` archives containing `.lua` or `.vim` files.

**Supported Keymap APIs**:
- `vim.keymap.set(mode, lhs, rhs, opts)` — Lua
- `vim.api.nvim_set_keymap(mode, lhs, rhs, opts)` — Lua
- `nnoremap`, `inoremap`, `vnoremap`, `xnoremap`, `onoremap`, `cnoremap`, `tnoremap` — Vimscript
- `nmap`, `imap`, `vmap`, `xmap` — Vimscript (with silent flag awareness)

**Extracted Fields Per Keymap**:
- Key sequence (e.g., `<leader>ff`)
- Mode (Normal, Insert, Visual, Command, Terminal)
- Description (from `desc` field in opts, or inferred from rhs string)
- Source file name

**Acceptance Criteria**:
- [ ] Given a valid `.lua` file, when a user uploads it, then all `vim.keymap.set` and `vim.api.nvim_set_keymap` calls are parsed and extracted within 5 seconds.
- [ ] Given a valid `.vim` file, when a user uploads it, then all `nnoremap`, `inoremap`, `vnoremap`, `xnoremap` definitions are extracted.
- [ ] Given a `.zip` archive, when a user uploads it, then the system recursively searches all contained `.lua` and `.vim` files and parses keymaps from each.
- [ ] Given a file with 500+ keymaps, when extraction completes, then the review UI renders all keymaps paginated (50 per page) without performance degradation.
- [ ] Given a malformed file, when parsing fails on a specific line, then the system skips that line, logs the error, and continues parsing the remainder of the file.
- [ ] Given a successfully parsed file, when the user reaches the review screen, then each keymap displays: key sequence, mode, description (or "No description"), and source file.
- [ ] Given the review screen, when a user deselects individual keymaps, then only the selected keymaps are added to their practice set.
- [ ] Given a duplicate keymap (same lhs + mode already in user's set), when the import is confirmed, then the system flags duplicates and prompts the user to keep existing, replace, or skip.
- [ ] File size limit: 5MB maximum. Files exceeding this return a clear error message.
- [ ] Supported file types only. Unsupported extensions return a clear rejection message without crashing.

---

### Feature 2: GitHub Dotfiles Import

**Description**: Users provide a public GitHub repository URL. The backend clones the repo, locates the Neovim config directory, and parses keymaps using the same parser as Feature 1.

**Config Location Heuristics (in priority order)**:
1. `.config/nvim/` directory
2. `nvim/` directory at repo root
3. Any directory containing `init.lua` or `init.vim`
4. Known framework locations: `lua/plugins/`, `lua/config/keymaps.lua`, `lua/core/keymaps.lua`

**Supported Frameworks**: LazyVim, AstroNvim, NvChad, Kickstart.nvim (detected by presence of framework-specific files).

**Acceptance Criteria**:
- [ ] Given a valid public GitHub repo URL, when the user submits it, then the backend clones the repo, locates the Neovim config, and returns parsed keymaps within 30 seconds.
- [ ] Given a repo with a standard `.config/nvim/` structure, then the system locates and parses all `.lua` and `.vim` files within that directory.
- [ ] Given a LazyVim config, then plugin keymaps defined in `lua/plugins/*.lua` are extracted in addition to user-defined keymaps.
- [ ] Given an AstroNvim config, then keymaps in the standard AstroNvim structure are correctly identified and extracted.
- [ ] Given a repo with no recognizable Neovim config, then the system returns a clear error: "No Neovim configuration found in this repository."
- [ ] Given a private repository URL, then the system returns: "Private repositories are not supported. Please use a public repository."
- [ ] Given an invalid URL (non-GitHub, malformed), then the system returns a validation error before attempting any clone operation.
- [ ] Cloned repos are deleted from temporary storage immediately after parsing completes.
- [ ] If cloning exceeds 30 seconds (large repo), the operation times out and returns a friendly error with a suggestion to use file upload instead.
- [ ] The user sees a progress indicator during the clone and parse operation.

---

### Feature 3: Practice Mode (MonkeyType-Style)

**Description**: The core training loop. The app shows a Vim action description; the user types the corresponding shortcut. Immediate visual feedback (green/red). Metrics tracked per keystroke and per session.

**Session Structure**:
- Configurable length: 10, 20, 30 commands per session (user setting)
- Commands sourced from: user's imported keymaps, built-in motion library, daily training queue
- Ordering: determined by spaced repetition engine (Feature 7)

**Per-Command Metrics**:
- Correct on first attempt (boolean)
- Number of attempts before correct answer
- Response time (ms from prompt display to final correct keypress)
- Key sequence entered (for mistake analysis)

**Session Metrics**:
- Total commands attempted
- Accuracy (% correct on first attempt)
- Average response time
- Streak (longest consecutive correct sequence)
- Session score (weighted formula: accuracy * speed bonus * streak multiplier)

**Acceptance Criteria**:
- [ ] Given a started session, when a command prompt appears, then the action description is displayed in full and the input field is focused automatically.
- [ ] Given a user typing a correct key sequence, when the final key is pressed, then the input turns green and advances to the next command within 300ms.
- [ ] Given a user typing an incorrect key sequence, when they press Enter or complete an invalid sequence, then the input turns red, the correct answer is shown, and the attempt is recorded as incorrect.
- [ ] Given a correct first-attempt answer, then response time is measured from prompt display timestamp to final correct keypress timestamp.
- [ ] Given a session in progress, when the user has answered the configured number of commands, then the session ends and the results screen is shown automatically.
- [ ] Given the results screen, then it displays: total commands, accuracy %, average response time, longest streak, session score, and a breakdown of missed commands.
- [ ] Given a session, when the user presses Escape, then a confirmation dialog asks "End session early?" before discarding — partial session data is saved if confirmed.
- [ ] Given a multi-key leader sequence (e.g., `<leader>ff`), when the user types the leader key, then the input field shows the partial sequence and waits for completion without timing out in under 2 seconds.
- [ ] The leader key symbol displayed in prompts matches the user's configured leader key setting (default: `\`).
- [ ] Session data is persisted to the backend within 5 seconds of session completion.

---

### Feature 4: Motion Trainer

**Description**: Structured curriculum for core Vim motions, independent of user config. Three difficulty tiers with a fixed motion set at each tier.

**Motion Set**:

| Tier | Motions |
|------|---------|
| Beginner | `h`, `j`, `k`, `l`, `w`, `b`, `e`, `x`, `dd`, `yy`, `p`, `P`, `u`, `<C-r>` |
| Intermediate | `ge`, `gg`, `G`, `0`, `^`, `$`, `ciw`, `diw`, `daw`, `caw`, `f{char}`, `t{char}`, `%`, `*`, `#` |
| Advanced | `ci"`, `di"`, `ca"`, `da"`, `ci(`, `di(`, `<C-d>`, `<C-u>`, `m{char}`, `` `{char} ``, `q{char}`, `@{char}`, `<C-o>`, `<C-i>`, `vi{`, `va{` |

**Acceptance Criteria**:
- [ ] Given a user accessing Motion Trainer, then they see three tier cards (Beginner, Intermediate, Advanced) with a motion count and a brief description of what each tier covers.
- [ ] Given a user selecting Beginner, then the practice session uses only Beginner-tier motions.
- [ ] Given a user completing a tier with accuracy >= 80% across 3 consecutive sessions, then that tier is marked as "Proficient" with a visual indicator.
- [ ] Given a motion with a `{char}` parameter (e.g., `f{char}`), when it appears as a prompt, then the description clearly specifies an example character (e.g., "Jump forward to the next 'e' — type: fe").
- [ ] Motion Trainer sessions use the same scoring and metrics system as Practice Mode (Feature 3).
- [ ] A user can access Motion Trainer without importing any keymaps — it is available from onboarding.
- [ ] Proficiency progress is persisted per user account. Guest users see a prompt to register to save progress.

---

### Feature 5: Leader Key Trainer

**Description**: Filtered practice mode showing only commands that begin with the user's configured leader key. Designed for users with dense leader key mapping sets.

**Acceptance Criteria**:
- [ ] Given a user with imported keymaps, when they open Leader Key Trainer, then only keymaps whose `lhs` begins with `<leader>` (or the user's configured leader key symbol) are shown.
- [ ] Given a user with no leader key mappings in their imported set, then the Leader Key Trainer shows an empty state with a prompt to import a config or configure a leader key.
- [ ] Given a session in Leader Key Trainer, when a prompt appears, then the action description is shown and the leader key symbol is visually highlighted in the expected answer display.
- [ ] Leader Key Trainer sessions use the same scoring and metrics system as Practice Mode (Feature 3).
- [ ] Leader Key Trainer results are tracked separately in analytics under the "Leader Key" category.

---

### Feature 6: Flashcard Mode

**Description**: Active recall training. The user sees an action description, attempts to recall the shortcut mentally, then reveals the answer and self-rates their recall.

**Card States**: New, Learning, Known, Mastered.

**Recall Rating**: After reveal, the user marks the card as "Knew It" or "Missed It". No partial credit.

**Deck Composition**: Drawn from the user's imported keymaps and/or Motion Trainer motions.

**Acceptance Criteria**:
- [ ] Given a flashcard session, when a card appears, then only the action description is shown — the key sequence is hidden.
- [ ] Given a card is shown, when the user presses Space or clicks "Reveal", then the correct key sequence is displayed.
- [ ] Given a revealed card, when the user clicks "Knew It", then the card's recall score increases and it is scheduled for later review per the spaced repetition algorithm.
- [ ] Given a revealed card, when the user clicks "Missed It", then the card's recall score decreases and it is scheduled for earlier re-review.
- [ ] Given a flashcard session, then the user can see their progress (X of Y cards reviewed) throughout the session.
- [ ] Given the end of a flashcard session, then the results screen shows: cards reviewed, % Knew It, cards moved to "Known", cards remaining in "Learning".
- [ ] Flashcard sessions are distinct from Practice Mode sessions in analytics — they are tracked under "Flashcard" category.
- [ ] A user can start a flashcard session focused on a specific category (e.g., only LSP commands, only leader key commands).

---

### Feature 7: Spaced Repetition Engine

**Description**: Deterministic algorithm (no ML, no AI) that personalizes the practice queue based on historical performance. Missed commands recur sooner; mastered commands recur less frequently.

**Algorithm**: Modified SM-2 (SuperMemo 2) adapted for key sequence recall:
- Each command has an `ease_factor` (default 2.5), `interval` (days), and `due_date`.
- "Correct on first attempt" increases interval and ease factor.
- "Incorrect" resets interval to 1 day and decreases ease factor (floor: 1.3).
- Commands due today or overdue are prioritized in the practice queue.

**Acceptance Criteria**:
- [ ] Given a command answered correctly 3 times consecutively, when the next session starts, then that command appears less frequently (interval >= 4 days).
- [ ] Given a command answered incorrectly in a session, when the next session starts the following day, then that command appears in the queue.
- [ ] Given a brand new imported command with no history, when the next session starts, then it is treated as "due immediately" and appears in the daily queue.
- [ ] Given the practice queue for a session, the ordering is: overdue commands first, then due-today commands, then new commands, then commands due in the future (if queue has space).
- [ ] The spaced repetition state (ease_factor, interval, due_date) is persisted per command per user in the database.
- [ ] Guest users accumulate spaced repetition state in browser localStorage. When they register, their localStorage state is migrated to the backend.
- [ ] The algorithm is fully deterministic — given the same history, it produces the same queue every time. No randomness that cannot be explained to the user.

---

### Feature 8: Analytics Dashboard

**Description**: Visual overview of the user's performance history. Built with Recharts. Data sourced from session records stored in the backend.

**Charts and Visualizations**:

| Chart | Type | Data | Time Range |
|-------|------|------|-----------|
| Accuracy Trend | Line chart | Session accuracy % over time | Last 30 days |
| Response Time Trend | Line chart | Average response time (ms) per session | Last 30 days |
| Daily Practice Time | Bar chart | Minutes practiced per day | Last 30 days |
| Most Missed Commands | Horizontal bar | Commands sorted by error rate | All time |
| Most Improved Commands | Horizontal bar | Commands with largest accuracy delta (last 14 days vs prior 14 days) | Rolling 28 days |
| Category Breakdown | Donut chart | Session time % by category (Motions, Leader Key, LSP, etc.) | Last 30 days |
| Mastery Score | Single stat | % of imported commands with interval >= 7 days | Current |

**Acceptance Criteria**:
- [ ] Given a user with at least 3 completed sessions, when they open the Analytics dashboard, then all charts render with real data within 2 seconds.
- [ ] Given a user with fewer than 3 completed sessions, when they open Analytics, then empty state placeholders with "Complete more sessions to see trends" are shown for each chart.
- [ ] Given the "Most Missed Commands" chart, when the user clicks a command, then a drill-down panel shows: command key sequence, description, category, accuracy history, and a "Practice This Now" button.
- [ ] Given the "Practice This Now" button, when clicked, then it starts a targeted 10-command session focused on that command and its category peers.
- [ ] All charts respond to a global date range filter (Last 7 days, Last 30 days, All time) without page reload.
- [ ] Data shown in charts matches the raw session data stored in the database — no rounding errors greater than 0.1%.
- [ ] The dashboard is accessible without import — users see motion trainer data if no keymaps are imported.

---

### Feature 9: Daily Training Queue

**Description**: A pre-composed practice session generated once per day per user. Designed to be completable in under 10 minutes.

**Queue Composition**:
- 10 commands with the lowest accuracy in the last 14 days ("weakest")
- 5 commands never practiced ("new")
- 5 commands selected uniformly at random from all imported commands

**Queue Generation**:
- Generated at midnight UTC for each user (or on first login of the day if not yet generated)
- Fixed for the day — refreshing does not change the queue
- Persisted so a user can resume a partially completed daily queue

**Acceptance Criteria**:
- [ ] Given a user who logs in for the first time today, when the Daily Training Queue loads, then 20 commands are shown composed per the formula above.
- [ ] Given a user who has fewer than 10 imported commands with accuracy history, then the "weakest" slot is filled with all available weak commands and the remainder is padded with new or random commands to reach 20 total.
- [ ] Given a user who resumes a partially completed daily queue, then already-answered commands are shown as complete and the user starts from the first unanswered command.
- [ ] Given a completed daily queue, when the user returns later the same day, then the completed state is shown with a "Practice More" button that starts a free practice session.
- [ ] Given a new day (UTC midnight), when the user logs in, then a new queue is generated. The previous day's incomplete queue is marked as "Expired."
- [ ] Daily queue completion is tracked as a distinct event and contributes to streak calculation.
- [ ] Users without any imported keymaps see a daily queue drawn from Motion Trainer Beginner motions only, with a prompt to import their config.

---

### Feature 10: Achievements

**Description**: One-time milestones that reward meaningful usage milestones. Not gamification for its own sake — each achievement corresponds to a real behavioral threshold.

**Achievement Set**:

| Achievement | Trigger Condition | Category |
|-------------|------------------|---------|
| First Session | Complete the first practice session | Onboarding |
| Motion Master | Achieve >= 90% accuracy on all Intermediate motions in a single session | Skill |
| Leader Key Master | Practice 50+ distinct leader key commands | Skill |
| Accuracy King | Complete a session with 100% first-attempt accuracy (min 20 commands) | Skill |
| Speed Demon | Average response time < 1000ms across a 20-command session with >= 90% accuracy | Skill |
| 7-Day Streak | Complete the daily queue on 7 consecutive calendar days | Habit |
| 30-Day Streak | Complete the daily queue on 30 consecutive calendar days | Habit |

**Acceptance Criteria**:
- [ ] Given a user who meets an achievement trigger, when the qualifying session or action completes, then the achievement is awarded within the same page load (no separate refresh required).
- [ ] Given an awarded achievement, when the session results screen appears, then a dismissible achievement notification is shown prominently.
- [ ] Given the Profile page, then all earned achievements are displayed with: name, icon, description, and the date earned.
- [ ] Given an unearned achievement on the Profile page, then it is shown in a locked/greyed state with the condition needed to earn it.
- [ ] Each achievement can only be earned once per user account.
- [ ] Achievement state is persisted in the backend. Guest users see achievements but they are not persisted — a prompt to register is shown on unlock.
- [ ] Streak achievements use calendar days in UTC. A streak is broken if the daily queue is not completed on any given UTC calendar day.

---

### Feature 11: Profile Page

**Description**: A single-page summary of the user's lifetime activity on VimTrainer.

**Displayed Stats**:
- Total sessions completed
- Total practice time (hours:minutes)
- All-time accuracy (% correct first attempts, across all sessions)
- Average response time (ms, all-time)
- Commands mastered (interval >= 7 days in spaced repetition)
- Commands imported (total unique keymaps in practice set)
- Current streak (consecutive days with daily queue completed)
- Longest streak (historical best)
- Member since (account creation date)
- Earned achievements (with icons)

**Acceptance Criteria**:
- [ ] Given a registered user, when they navigate to the Profile page, then all stats are populated with real data and load within 2 seconds.
- [ ] Given a user with 0 sessions, when they view their profile, then stats show 0 values with a prompt to start their first session.
- [ ] All stats on the Profile page exactly match what would be computed by summing the underlying session records — no cached stale values.
- [ ] The Profile page is only accessible to registered users. Guest users see a prompt to register.

---

### Feature 12: Settings

**Description**: User preferences that control the practice experience. All settings persisted to the backend for registered users; to localStorage for guest users.

**Settings**:

| Setting | Type | Options | Default |
|---------|------|---------|---------|
| Theme | Select | Dark, Light, System | Dark |
| Session Duration | Select | 10, 20, 30 commands | 20 |
| Sound Effects | Toggle | On / Off | Off |
| Animations | Toggle | On / Off | On |
| Keyboard Layout | Select | QWERTY, Dvorak, Colemak | QWERTY |
| Leader Key Symbol | Text input | Any single character or `<Space>` | `\` |

**Acceptance Criteria**:
- [ ] Given a user changing the theme, when they select a new theme, then the UI updates immediately without a page reload.
- [ ] Given a user setting the leader key symbol, when they save the setting, then all subsequent practice sessions and the Leader Key Trainer use the new symbol.
- [ ] Given a registered user changing any setting, when they log in on a different device, then the settings are applied correctly on that device.
- [ ] Given a guest user changing settings, when they register and log in, then their localStorage settings are migrated to their account.
- [ ] Given "System" theme selection, then the app respects the OS-level `prefers-color-scheme` value at all times, including when the OS theme changes while the app is open.
- [ ] Given sound effects set to Off, then zero audio is played during any session. The setting is respected from the first keypress after the change.

---

## 7. Technical Constraints

### Stack (Locked, Not Open for V1 Discussion)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+, TypeScript, Vite, Custom CSS |
| Frontend Deploy | Cloudflare Pages |
| Backend | Go 1.22+, Gin, GORM |
| Backend Deploy | Google Cloud Run (primary), Docker Compose (local), Railway / Fly.io (self-hosted alternatives) |
| Database | Supabase-hosted PostgreSQL |
| Auth | JWT (Go-implemented), Email/Password, Guest Mode via anonymous session token |
| Storage (V1) | Backend local storage with abstraction interface |
| Storage (V1.1+) | Cloudflare R2 (via storage interface, no frontend changes required) |
| DNS | Cloudflare |

### Deployment Constraints

- The application must run end-to-end via `docker-compose up` with no external dependencies other than internet access for database connection.
- Docker images must be cloud-agnostic. No vendor-specific SDKs embedded in the runtime binary.
- All environment-specific configuration is provided via environment variables (no hardcoded URLs, secrets, or region identifiers).

### Auth Constraints

- No social OAuth providers in V1.
- JWT tokens: 1-hour expiry for access tokens, 7-day expiry for refresh tokens.
- Guest mode: anonymous session token issued on first visit, valid for 24 hours, stored in localStorage. All guest session data is associated with this token.
- Password requirements: minimum 8 characters. No additional complexity requirements in V1.

### Parser Constraints

- The keymap parser runs on the backend — no client-side parsing.
- Uploaded files are processed in memory; they are never written to persistent disk storage.
- For GitHub import, the repo is cloned to a temporary directory and deleted immediately after parsing.
- Maximum supported zip archive size: 5MB uncompressed.

### Performance Constraints

- Practice Mode input response (keypress to visual feedback): < 100ms (client-side, no round trip).
- Session data persistence: fire-and-forget at session end. Does not block the results screen from rendering.
- Analytics dashboard initial load: < 2 seconds for users with up to 365 days of data.
- Keymap import (file upload): < 5 seconds for files up to 5MB.
- GitHub import: < 30 seconds for repos up to 100MB.

---

## 8. Open Questions

The following questions are documented but not resolved. Each must be assigned an owner and a resolution deadline before development of the relevant feature begins.

| # | Question | Feature Affected | Owner | Deadline |
|---|----------|-----------------|-------|---------|
| OQ1 | What is the correct behavior when a user re-imports a config file with changes? Merge, replace, or diff-and-prompt? | Feature 1, Feature 2 | Engineering Lead | Before Feature 1 dev start |
| OQ2 | Should the daily queue prioritize spaced repetition due-dates or the 10-weakest formula? If they conflict, which wins? | Feature 9, Feature 7 | PM | Before Feature 9 dev start |
| OQ3 | For multi-key sequences that depend on context (e.g., `f{char}` where char varies), how do we validate user input in Practice Mode? Accept any `f` + character? Require a specific example character shown in the prompt? | Feature 3, Feature 4 | PM + Engineering | Before Feature 3 dev start |
| OQ4 | What happens to a guest user's spaced repetition state if they never register? How long do we retain localStorage state? | Feature 7, Auth | Engineering Lead | Before auth implementation |
| OQ5 | For AstroNvim and NvChad, do we parse framework-default keymaps (which the user hasn't explicitly set) or only user-overridden keymaps? | Feature 2 | PM | Before Feature 2 dev start |
| OQ6 | Should the streak counter use UTC midnight or the user's local timezone midnight? Timezone-awareness adds backend complexity. | Feature 10, Feature 9 | Engineering Lead | Before Feature 9 dev start |
| OQ7 | What is the data retention policy for session records? If a user deletes their account, do we anonymize or purge? | All analytics features | Engineering Lead + Legal if applicable | Before database schema finalization |
| OQ8 | Do we support `.nvim` local config files (per-project Neovim configs) in V1 import? | Feature 1 | PM | Before Feature 1 dev start |
