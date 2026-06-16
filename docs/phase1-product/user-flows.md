# VimTrainer — User Flows
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Alex (PM)

Each flow is documented at the interaction level — step by step, with decision branches, error states, and the system behavior at each point. These flows are the source of truth for frontend routing, backend endpoint design, and QA test case generation.

---

## Flow 1: Onboarding Flow

### Entry Points
- User navigates to `vimtrainer.dev` for the first time
- User arrives from a referral link or GitHub README

### Preconditions
- No existing session token in localStorage
- No existing account for this email (for the registration branch)

### Happy Path: Guest Mode Entry

```
1. User lands on the marketing/landing page.
   - CTA options visible: "Start Practicing (No Account Needed)" and "Create Account"
   - Below the fold: feature highlights (Import config, Practice, Track progress)

2. User clicks "Start Practicing (No Account Needed)".
   - System issues an anonymous guest session token (UUID) and stores it in localStorage.
   - System creates a temporary guest record in the backend keyed on this token.
   - User is redirected to /onboarding

3. Onboarding screen — Step 1: "What's your experience level?"
   - Three options: "I'm new to Vim", "I know the basics", "I'm an experienced Vim user"
   - User selects one option.
   - Selection is stored in the guest session (influences default starting tier in Motion Trainer).

4. Onboarding screen — Step 2: "Do you have a Neovim config to import?"
   - Two options: "Yes, let me import it" and "No, start with motion basics"
   
   [Branch A: User selects "Yes, let me import it"]
   → User is taken to the Keymap Import Flow (Flow 2), Step 1.
   → On completion of import, user is redirected to their first practice session.
   
   [Branch B: User selects "No, start with motion basics"]
   → User is redirected to the Motion Trainer at the tier matching their selected experience level.
   → Beginner tier auto-starts if experience level was "I'm new to Vim".
   → Tier selection screen shown if experience was "I know the basics" or "Experienced".

5. After completing first session (either branch), user sees the results screen with:
   - Session score summary
   - A dismissible banner: "Save your progress — create a free account"
   - Option to continue without registering
```

### Happy Path: Account Creation

```
1. User clicks "Create Account" on the landing page.
   - Redirect to /register

2. Registration form:
   - Email address (required)
   - Password (required, min 8 characters)
   - Confirm password (required)
   - Submit button: "Create Account"

3. User fills in the form and submits.
   - Frontend validates: email format, password match, minimum length — all client-side before submission.
   - POST /api/auth/register

4. Backend creates user record, issues JWT access token (1-hour expiry) and refresh token (7-day expiry).
   - Tokens stored in localStorage (access) and httpOnly cookie (refresh).
   - User is redirected to /onboarding (same flow as guest, steps 3–5 above).
   - User is registered, so progress is persisted immediately without a save prompt.

5. User completes onboarding.
   - First session data is persisted to their account.
   - Redirected to /dashboard (Daily Training Queue) after results screen.
```

### Error States

- Email already registered: inline form error "An account with this email already exists. Log in instead?" with link to /login.
- Weak password (< 8 chars): inline error before submission, no network call made.
- Network error during registration: toast notification "Something went wrong. Please try again." Form data preserved.
- Guest token expired (> 24 hours): on next visit, a new guest token is issued. Prior guest session data is not recoverable — this is surfaced as "Your guest session has expired. Create an account to save progress."

---

## Flow 2: Keymap File Import Flow

### Entry Points
- Onboarding Step 2 → "Yes, let me import it"
- /import page (from main navigation, for returning users)
- "Import Config" button on dashboard empty state

### Preconditions
- User has a guest session or is registered and logged in
- User has one or more Neovim config files available locally

### Happy Path: Single File Upload

```
1. User arrives at the import page.
   - Upload area: drag-and-drop zone + "Browse Files" button
   - Supported formats listed: .lua, .vim, .zip (max 5MB)
   - Secondary option visible: "Import from GitHub instead" (links to Flow 3)

2. User drags a file onto the upload zone (or clicks Browse and selects a file).
   - Frontend validates file extension before upload.
   - Frontend validates file size (< 5MB) before upload.
   - If validation passes: file is uploaded via POST /api/keymaps/parse-file
   - Upload progress bar shown.

3. Backend parses the file.
   - Returns a JSON array of extracted keymaps within 5 seconds.
   - Each keymap object: { id, lhs, mode, description, source_file, selected: true }
   - User sees a loading state ("Parsing your config...") during processing.

4. Review screen appears with extracted keymaps.
   - Table columns: Checkbox (selected), Key Sequence, Mode, Description, Source File
   - All keymaps pre-selected (checked) by default.
   - Total count shown: "Found 147 keymaps in keymaps.lua"
   - Pagination: 50 keymaps per page
   - Filter bar: filter by mode (Normal, Insert, Visual, etc.) or search by description/key sequence

5. User reviews the list.
   - User can deselect individual keymaps using checkboxes.
   - User can deselect all keymaps in a mode using the mode filter + "Deselect all filtered" action.
   - User can edit the description of any keymap inline (optional).

6. User clicks "Add X keymaps to my practice set" (count updates dynamically as selections change).
   - POST /api/keymaps/import with the selected keymap list.
   - Backend persists keymaps to user_keymaps table, associated with user ID.
   - Duplicate detection: if any lhs+mode pair already exists in the user's set, a modal appears:
     "3 keymaps already exist in your practice set. Replace existing? / Keep existing / Skip duplicates"
   - User confirms.

7. Success state.
   - "147 keymaps added to your practice set."
   - Two CTAs: "Start Practicing Now" (starts a session with these keymaps) and "Go to Dashboard"
```

### Branch: ZIP Archive Upload

```
Steps 1–2 identical.

3. Backend extracts the zip, recursively finds all .lua and .vim files, parses each.
   - Returns combined keymap list with source_file indicating which file each keymap came from.
   - Loading state: "Searching archive for Neovim config files..."

4. Review screen shows source_file column populated with filenames.
   - User can filter by source_file to review one file at a time.

Steps 5–7 identical.
```

### Error States

- Unsupported file type: inline error below upload zone, no upload attempted. "VimTrainer supports .lua, .vim, and .zip files."
- File too large: inline error before upload. "File exceeds 5MB limit. Try uploading individual files instead."
- Parse error (no keymaps found): "No keymaps found in this file. Ensure your file contains vim.keymap.set(), vim.api.nvim_set_keymap(), or nnoremap/inoremap/vnoremap definitions."
- Partial parse (some lines failed): success state with a warning: "147 keymaps extracted. 3 lines could not be parsed and were skipped." Link to expand and see which lines.
- Upload timeout: "Upload timed out. Please check your connection and try again."

---

## Flow 3: GitHub Dotfiles Import Flow

### Entry Points
- Import page → "Import from GitHub instead" link
- Direct navigation to /import/github

### Preconditions
- User has a public GitHub repository containing a Neovim config
- User has a guest session or is registered and logged in

### Happy Path

```
1. User arrives at the GitHub import page.
   - Text input: "GitHub repository URL"
   - Placeholder: "https://github.com/username/dotfiles"
   - Helper text: "The repository must be public. Private repos are not supported."
   - "Import" button

2. User pastes or types a GitHub repo URL and clicks "Import".
   - Frontend validates URL format (must match https://github.com/[user]/[repo] pattern).
   - POST /api/keymaps/parse-github with { repo_url }
   - Loading state shown: "Cloning repository..." → "Locating Neovim config..." → "Parsing keymaps..."
   - Progress messages update every few seconds to indicate the operation is running.

3. Backend processes the request.
   - Clones the repo to a temporary directory (30-second timeout).
   - Searches for Neovim config using heuristics (priority order):
     a. .config/nvim/
     b. nvim/ at root
     c. Any directory containing init.lua or init.vim
     d. Framework-specific paths (LazyVim: lua/plugins/, AstroNvim, NvChad, Kickstart.nvim)
   - Parses all .lua and .vim files in the located config directory.
   - Deletes cloned repo from temporary storage immediately after parsing.
   - Returns extracted keymaps JSON.

4. Framework detection notice (if applicable).
   - If a supported framework is detected, a notice appears above the review table:
     "LazyVim config detected. Keymaps include LazyVim defaults and your user-defined overrides."
   - User can filter to show only "User-defined" keymaps vs. "Framework defaults" if both are present.

5. Review screen — identical to Flow 2, Step 4.
   - Source file shows the relative path within the repo (e.g., lua/config/keymaps.lua).

6–7. Identical to Flow 2, Steps 5–7.
```

### Error States

- Invalid URL format: inline error before submission. "Please enter a valid GitHub repository URL (https://github.com/username/repo)."
- Private repository: "This repository is private. VimTrainer requires a public repository for import."
- Repository not found (404): "Repository not found. Check the URL and ensure the repository is public."
- No Neovim config found: "No Neovim configuration was found in this repository. Ensure your repo contains a .config/nvim/ directory or a recognizable Neovim config structure."
- Clone timeout (> 30 seconds): "This repository is taking too long to process. For large repos, try uploading specific config files instead."
- Parse succeeded with 0 keymaps: "No keymaps were found in the Neovim config. Ensure your config uses vim.keymap.set(), vim.api.nvim_set_keymap(), or nnoremap/inoremap/vnoremap."

---

## Flow 4: Practice Session Flow

### Entry Points
- "Start Practicing" CTA after import
- "Practice" from main navigation
- "Practice This Now" from Analytics drill-down
- Daily Training Queue (starts as a structured session)

### Preconditions
- User has at least one keymap in their practice set, OR is using Motion Trainer mode
- User has a guest session or is registered and logged in

### Happy Path

```
1. Session configuration screen (if entry is from "Practice" navigation).
   - Select mode: My Keymaps / Motion Trainer / Leader Key Only
   - Select session length: 10 / 20 / 30 commands
   - Select difficulty (if Motion Trainer): Beginner / Intermediate / Advanced
   - "Start Session" button

2. Session begins. Command 1 of N displayed.
   - Layout: 
     - Top: progress bar (e.g., "3 / 20") and current streak counter
     - Center: large action description text (e.g., "Find files with Telescope")
     - Below description: category tag (e.g., "Telescope")
     - Input area: empty text field, auto-focused, cursor visible
     - Leader key hint visible if the expected answer begins with leader (shows configured symbol)
   - Timer starts from the moment the prompt is displayed (for response time measurement).

3. User types the key sequence.
   - As user types, partial sequence is shown in the input field.
   - For leader sequences: after typing the leader key, a subtle visual indicator confirms leader key received.
   - No time limit per command (the response time is measured but does not cause failure).

4a. User types the correct sequence and presses Enter (or auto-submits on sequence completion).
   - Input field flashes green.
   - "Correct" feedback displayed briefly (< 300ms, then auto-advance).
   - Session metrics updated: correct count, response time recorded.
   - Next command loads automatically.

4b. User types an incorrect sequence and presses Enter.
   - Input field flashes red.
   - Correct answer is revealed below the input: "Correct answer: <leader>ff"
   - User can see their entered sequence vs. the correct answer.
   - "Continue" button (or auto-advance after 1.5 seconds, configurable via settings).
   - Session metrics updated: incorrect count, response time recorded.
   - Spaced repetition engine marks this command for earlier review.
   - Next command loads.

5. User completes all N commands.
   - Session automatically transitions to the results screen.

6. Results screen.
   - Session score (large, prominent number)
   - Accuracy: X% (Y correct of Z total)
   - Average response time: Xms
   - Longest streak: X
   - Commands table: each command with status (correct/incorrect), response time, and number of attempts
   - "Missed commands" section: highlighted list of incorrect answers with correct answers shown
   - CTAs: "Practice Again" (new session, same settings) / "Go to Dashboard" / "Practice Missed Commands" (if any were missed, starts a targeted session with only the missed commands)

7. Session data is persisted to the backend.
   - Fire-and-forget: POST /api/sessions with full session payload.
   - Results screen does not wait for this call to render.
   - If the call fails, it is retried silently up to 3 times. If all retries fail, a subtle banner appears: "Session data could not be saved. Check your connection."
```

### Branch: User Ends Session Early

```
At any point during step 3 or 4, user presses Escape.
   - Modal appears: "End session early?"
   - Options: "Keep Going" / "End Session"
   - If "End Session": partial session data (commands completed so far) is saved.
   - Results screen shown for commands completed. Clearly labeled: "Partial Session".
   - Same CTA options as step 6.
```

### Error States

- No keymaps in practice set (My Keymaps mode): empty state with "Import your Neovim config to practice your own keymaps" and import CTA.
- Session data save fails silently (all retries exhausted): subtle banner notification, does not interrupt the UI.
- Browser tab becomes inactive mid-session: timer pauses when tab loses focus, resumes on focus return. This is surfaced with a "Session paused" indicator.

---

## Flow 5: Daily Training Flow

### Entry Points
- Main navigation → "Daily Queue"
- Dashboard home (daily queue shown prominently)
- Return visit after day 1 (queue shown as primary CTA)

### Preconditions
- User is registered (daily queue requires persistence — guest users see a prompt to register)
- User has at least some practice history or imported keymaps

### Happy Path

```
1. User navigates to the Daily Queue.
   - Banner shown: "Today's Queue — [Day N of streak] — 20 commands"
   - Progress indicator: "X of 20 completed" (if user started earlier today)
   - Queue composition visible: "10 weakest • 5 new • 5 random"
   - "Start" button (or "Resume" if partially completed)

2. User clicks "Start" or "Resume".
   - Practice session begins — identical to Flow 4, Steps 2–4, but the command set is fixed to today's queue.
   - No session configuration screen (the queue is pre-configured).
   - Progress bar shows position within the 20-command queue.

3. User completes all 20 commands.
   - Results screen (identical to Flow 4, Step 6) with the label "Daily Queue Complete".
   - Streak counter increments: "3-day streak!"
   - Achievement check: if streak milestones are hit (7, 30 days), achievement notification fires.
   - CTAs: "View Analytics" / "Practice More" (free practice session) / "Go Home"

4. User returns later in the same day.
   - Daily Queue card on dashboard shows: "Completed today" with summary stats.
   - "Practice More" button available for additional free-form practice.
   - Streak is already counted — no double-counting.
```

### Branch: Incomplete Queue from Previous Day

```
1. User logs in and has an uncompleted queue from yesterday.
   - Dashboard shows yesterday's queue as "Expired" with a summary of how many were completed.
   - Today's new queue is generated and displayed.
   - No option to complete yesterday's queue — daily queues are date-specific.
```

### Error States

- No imported keymaps and no practice history: queue is drawn from Motion Trainer Beginner motions. Banner: "No keymaps imported yet. Your daily queue uses core Vim motions. Import your config to personalize your queue."
- Guest user accessing Daily Queue: "Daily queues require an account to save your streak. Create a free account to get started." with registration CTA.

---

## Flow 6: Flashcard Review Flow

### Entry Points
- Main navigation → "Flashcards"
- "Review Flashcards" from Dashboard
- Post-session CTA: "Review missed commands as flashcards"

### Preconditions
- User has imported keymaps or has Motion Trainer history
- User has a guest session or is registered and logged in

### Happy Path

```
1. Flashcard deck selection screen.
   - Default deck: "All Commands" (all imported keymaps + motions practiced)
   - Filtered deck options: by category (LSP, Telescope, Harpoon, Motions, Leader Key, etc.)
   - Deck stats shown: "42 cards — 12 Learning, 18 Known, 12 New"
   - "Review Due Cards" button (shows only cards due for review today per spaced repetition)
   - "Review All" button (reviews entire selected deck regardless of due date)

2. User clicks "Review Due Cards".
   - Session starts with the first due card.
   - Card layout:
     - Top: progress (Card X of Y)
     - Center: action description (e.g., "Open file picker (Telescope)")
     - Category tag below description
     - "Reveal Answer" button (or press Space)
     - Input field hidden — this is recall-only, not typing practice

3. User attempts to recall the answer mentally, then clicks "Reveal Answer" (or presses Space).
   - Key sequence appears below the description: "<leader>ff"
   - Mode label: "Normal Mode"
   - Two buttons appear: "Knew It" and "Missed It"
   - A "Hint" option available for first-time cards: shows the first character of the sequence

4a. User clicks "Knew It".
   - Card state updated: recall score increases, interval increases per spaced repetition algorithm.
   - Brief positive visual feedback.
   - Next card loads automatically.

4b. User clicks "Missed It".
   - Card state updated: recall score decreases, interval resets to 1 day.
   - Brief negative visual feedback (card turns red briefly).
   - Correct answer remains visible for an extra 1 second before next card loads.
   - Card is added to "Review again" pile for the end of the session.

5. Session continues until all due cards are reviewed.

6. End of session — results screen.
   - Total cards reviewed: X
   - Knew It: X (Y%)
   - Missed It: X (Y%)
   - Cards moved to "Known": X
   - Cards added back to "Learning": X
   - "Review Missed Cards Again" button (if any were missed — runs another round of only missed cards)
   - "Done" button → returns to dashboard
```

### Error States

- No cards due: "No cards are due for review today. Your next review is scheduled for tomorrow." with "Review All Anyway" option.
- No keymaps imported: "Import your Neovim config to create your flashcard deck." with import CTA.

---

## Flow 7: Analytics Review Flow

### Entry Points
- Main navigation → "Analytics"
- Profile page → "View Analytics"
- Session results screen → "View Analytics"

### Preconditions
- User is registered (analytics requires persistent session history)
- User has completed at least 1 session (0-session state has empty states per chart)

### Happy Path

```
1. User navigates to the Analytics dashboard.
   - Global date range selector at top right: "Last 7 days" / "Last 30 days" / "All time" (default: Last 30 days)
   - All charts load within 2 seconds.
   - Layout (top to bottom, left to right):
     a. Mastery Score — large single stat (prominent)
     b. Accuracy Trend — line chart
     c. Response Time Trend — line chart
     d. Daily Practice Time — bar chart
     e. Category Breakdown — donut chart
     f. Most Missed Commands — horizontal bar chart
     g. Most Improved Commands — horizontal bar chart

2. User changes the date range to "Last 7 days".
   - All charts re-render with updated data without page reload.
   - Charts that have no data for the selected range show "Not enough data for this period."

3. User views "Most Missed Commands" chart.
   - Shows top 10 commands by error rate, sorted descending.
   - Each bar shows: command description, error rate %, and category tag.

4. User clicks on a specific command bar (e.g., "Go to definition — LSP").
   - Drill-down panel slides in from the right (or expands inline).
   - Panel shows:
     - Command: `gd` (Normal Mode)
     - Description: "Go to definition"
     - Category: LSP
     - All-time accuracy: 43%
     - Average response time: 2,840ms
     - Sessions where this command appeared: 12
     - Accuracy history: mini line chart for this specific command over time
     - "Practice This Now" button

5. User clicks "Practice This Now".
   - A 10-command targeted session starts.
   - Session includes: 5 instances of this specific command + 5 commands from the same category (LSP).
   - Session runs through Flow 4.
   - On completion, user is returned to the Analytics dashboard with a toast: "Good session! Your recent accuracy on 'gd' was X%."

6. User views Category Breakdown donut chart.
   - Hovering over a segment shows: category name, % of total practice time, total minutes.
   - Clicking a segment filters the Most Missed and Most Improved charts to show only commands from that category.
```

### Error States

- Fewer than 3 sessions: empty state charts with "Complete more sessions to see trends. You need at least 3 sessions for charts to populate."
- Guest user accessing Analytics: "Analytics requires an account to track your history. Create a free account." with registration CTA.
- Data load failure: error state per chart with "Failed to load chart data. Refresh to try again."

---

## Flow 8: Settings Flow

### Entry Points
- Main navigation → "Settings"
- User menu → "Settings"
- First-session prompt: "Customize your experience" (settings shortcut after first session)

### Preconditions
- User has a guest session or is registered and logged in

### Happy Path

```
1. User navigates to Settings.
   - Settings page renders with current values populated.
   - Sections: Appearance / Practice / Accessibility / Account

2. Appearance section.
   - Theme: radio buttons (Dark / Light / System) — currently selected shown
   - User clicks "Light".
   - UI updates immediately to Light theme.
   - Change is persisted (backend for registered users, localStorage for guests) without a save button.
   - Theme change applies to the entire application including the settings page itself.

3. Practice section.
   - Session Duration: dropdown (10 / 20 / 30 commands) — auto-saves on change
   - Sound Effects: toggle (On / Off) — auto-saves on change, plays a short test sound if turned On
   - Animations: toggle (On / Off) — auto-saves on change; turning Off removes all transition animations immediately
   - Leader Key Symbol: text input — displays current value (default: \)
   
4. User changes Leader Key Symbol.
   - Text input accepts: single character or the string "<Space>"
   - User types "," and clicks outside the input (blur event triggers save).
   - Toast notification: "Leader key symbol updated to ','."
   - All subsequent session prompts use the new symbol.

5. Accessibility section.
   - Keyboard Layout: dropdown (QWERTY / Dvorak / Colemak)
   - User selects "Colemak".
   - Auto-saved on selection.
   - Toast: "Keyboard layout set to Colemak."
   - Note: in V1, keyboard layout affects display hints in prompts but does not remap key detection.

6. Account section (registered users only).
   - Email address (read-only, with "Change email" link — out of scope for V1, shown as disabled)
   - Password: "Change Password" link → navigates to /settings/change-password
   - Danger zone: "Delete Account" (requires confirmation: type "DELETE" to confirm)

7. Guest user viewing Account section.
   - Shows: "You're practicing as a guest."
   - CTA: "Create an account to save your settings, progress, and streak across devices."
   - Registration form inline or link to /register.
```

### Persistence Behavior

- Registered users: all settings persisted to user_settings table via PATCH /api/settings on each change (debounced 500ms for text inputs).
- Guest users: all settings persisted to localStorage under key `vimtrainer_settings`.
- On registration: guest localStorage settings are posted to the backend and merged into the new user account settings. If a setting exists in both, the localStorage value wins (user's most recent intent).
- On login from a new device: backend settings are loaded and localStorage is overwritten.

### Error States

- Settings save failure (network): toast notification "Settings could not be saved. Check your connection." The UI still reflects the user's chosen value optimistically — the save is retried on the next setting change.
- Invalid leader key input (more than one character that is not `<Space>`): inline validation error "Leader key must be a single character or '<Space>'." Change is not saved.
- Delete account confirmation fails (user types something other than "DELETE"): button remains disabled. No account deletion triggered.
