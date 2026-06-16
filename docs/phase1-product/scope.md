# VimTrainer — Phase 1 Scope Definition
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Alex (PM)

This document defines exactly what ships and when, and why every exclusion was made. The scope tiers are not aspirational — they are contractual within the team. Anything not listed in MVP does not ship on launch day, regardless of how easy it looks.

---

## How to Read This Document

**MVP**: Ships on launch day. Every item must be end-to-end functional — no half-built features, no "coming soon" states for promised functionality. A feature that ships broken or incomplete damages trust more than a feature that is not listed at all.

**V1 (Post-Launch, 0–90 days)**: Features added after launch that require real user data to be useful, or that require MVP to be stable first. These items are directionally committed — they move to scoped development as soon as MVP is stable and launch metrics confirm the right user behaviors.

**V2 (Future, 90+ days)**: Strategic bets that require either PMF evidence from V1 or significant additional investment. Nothing in V2 is committed. Each item has a trigger condition that would move it into the V1 or scoped backlog.

---

## MVP — Ships on Launch Day

### What's Included

**Authentication & Sessions**

- Email/password registration and login
- JWT auth with 1-hour access token and 7-day refresh token
- Guest mode with anonymous session token (24-hour validity, stored in localStorage)
- Guest-to-registered account migration (localStorage state merged to backend on registration)
- Password change flow
- Account deletion (with "DELETE" confirmation)

**Keymap Import: File Upload**

- Upload `.lua`, `.vim`, and `.zip` files (max 5MB)
- Backend parser for `vim.keymap.set()`, `vim.api.nvim_set_keymap()`, `nnoremap`, `inoremap`, `vnoremap`, `xnoremap`, `onoremap`, `cnoremap`, `tnoremap`, `nmap`, `imap`, `vmap`, `xmap`
- Extracted fields: key sequence, mode, description, source file
- Review UI: paginated table (50/page), mode filter, description search, per-keymap deselect
- Duplicate detection with user-choice resolution (replace / keep / skip)
- Partial parse tolerance: failed lines skipped, user notified with count

**Keymap Import: GitHub Dotfiles**

- Public GitHub repo URL input and validation
- Backend clone → locate → parse → delete pipeline (30-second timeout)
- Config location heuristics in priority order
- Framework detection for LazyVim, AstroNvim, NvChad, Kickstart.nvim
- Review UI identical to file upload review
- User-visible progress states (cloning → locating → parsing)

**Practice Mode (MonkeyType-Style)**

- Session length configuration: 10, 20, 30 commands
- Command sourced from: user's imported keymaps (My Keymaps mode), Motion Trainer library, Leader Key Only filter
- Per-command tracking: correct/incorrect, response time, attempt count, entered sequence
- Immediate green/red visual feedback (< 100ms from keypress)
- Partial sequence display for multi-key leader sequences
- Session results screen: accuracy, avg response time, longest streak, session score, missed commands breakdown
- Early session termination with partial save (via Escape + confirmation)
- Session data persistence (fire-and-forget POST, 3 retries on failure)

**Motion Trainer**

- Three tiers: Beginner (14 motions), Intermediate (15 motions), Advanced (16 motions)
- Full motion set as defined in PRD Feature 4
- Tier proficiency tracking: >= 80% accuracy across 3 consecutive sessions marks tier as "Proficient"
- Proficiency state persisted to backend (registered users) or localStorage (guests)
- Available without any keymap import (accessible from onboarding)

**Leader Key Trainer**

- Filtered view of user's imported keymaps where lhs begins with `<leader>` (or configured leader symbol)
- Empty state if no leader key mappings in practice set
- Same session mechanics and scoring as Practice Mode
- Analytics tracked under distinct "Leader Key" category

**Flashcard Mode**

- Deck selection: All Commands, filtered by category
- Active recall flow: show description → user thinks → reveal → Knew It / Missed It
- Card state machine: New → Learning → Known → Mastered
- Due card filtering (cards due today per spaced repetition)
- Session results: cards reviewed, Knew It %, cards moved to Known, cards back to Learning
- "Review missed cards again" end-of-session option

**Spaced Repetition Engine**

- Modified SM-2 algorithm (deterministic — no ML, no randomness)
- Fields per command per user: ease_factor (default 2.5), interval (days), due_date
- Correct first attempt: increases interval and ease_factor
- Incorrect: resets interval to 1 day, decreases ease_factor (floor: 1.3)
- Queue ordering: overdue → due today → new → future (filling session length)
- Backend persistence for registered users
- localStorage persistence for guests with migration on registration

**Daily Training Queue**

- Composition: 10 weakest (lowest accuracy, last 14 days) + 5 new (never practiced) + 5 random
- Generated once per UTC day per user (fixed — does not re-shuffle on refresh)
- Resume support: partially completed queue resumes from first unanswered command
- Completion triggers streak increment
- Expired queue display (prior day's incomplete queue shown as expired)
- Fallback for users with no imports: Beginner motions only + import prompt

**Analytics Dashboard**

- Charts: Accuracy Trend, Response Time Trend, Daily Practice Time, Most Missed Commands, Most Improved Commands, Category Breakdown, Mastery Score
- Global date range filter: Last 7 days / Last 30 days / All time
- "Most Missed Commands" drill-down panel with per-command history and "Practice This Now" CTA
- "Category filter" on donut chart applies to Most Missed and Most Improved charts
- Empty state for < 3 sessions
- All charts built with Recharts

**Achievements**

- All 7 achievements from PRD: First Session, Motion Master, Leader Key Master, Accuracy King, Speed Demon, 7-Day Streak, 30-Day Streak
- In-session achievement unlock notification (same page load, no refresh)
- Profile page: earned achievements (with date) + locked achievements (with condition)
- Guest users see achievement unlocks but are prompted to register to persist them

**Profile Page**

- Lifetime stats: total sessions, total practice time, all-time accuracy, avg response time, commands mastered, commands imported, current streak, longest streak, member since
- Earned achievements display
- Registered users only (guests see register prompt)

**Settings**

- Theme: Dark / Light / System (auto-applies, no save button)
- Session Duration: 10 / 20 / 30 (auto-saves on change)
- Sound Effects: On / Off (auto-saves, test sound on enable)
- Animations: On / Off (immediate effect)
- Keyboard Layout: QWERTY / Dvorak / Colemak (affects display hints)
- Leader Key Symbol: single character or `<Space>` (auto-saves on blur)
- Settings persisted to backend (registered) or localStorage (guest) with migration on registration

**Infrastructure**

- Docker Compose configuration for local development (frontend + backend + PostgreSQL)
- Cloudflare Pages deployment for frontend
- Google Cloud Run deployment for backend
- Supabase PostgreSQL database
- Environment variable-based configuration (no hardcoded values)
- Storage abstraction layer (local filesystem in V1, interface ready for Cloudflare R2)
- JWT auth fully implemented in Go (no third-party auth provider)

**Onboarding**

- Landing page with two CTAs: guest mode and account creation
- 2-step onboarding flow: experience level selection + config import or motion trainer start
- First-session prompt to register (dismissible banner)
- Seamless guest-to-registered transition mid-session

### What's Explicitly Excluded from MVP

| Excluded Item | Reason |
|--------------|--------|
| Social auth (GitHub OAuth, Google) | Reduces auth surface area. Email/password is sufficient for V1 PMF validation. Revisit if guest-to-registered conversion stalls. |
| Private GitHub repo import | Requires OAuth token management and significantly increases auth complexity. Public repos cover the majority of dotfile repos. |
| `.nvim` local project config import | Edge case. Less than 5% of users have per-project Neovim configs. Out of scope for launch. |
| Session data export (CSV/JSON) | Useful for power users like Priya (The Daily Driver), but not a launch blocker. Track demand via support requests post-launch. |
| Configurable spaced repetition parameters | The SM-2 defaults are well-validated. Exposing parameters adds UI complexity without meaningful benefit at this user volume. |
| Category management (user-defined categories) | Categories are inferred from import source and keymap description. User-defined taxonomies are a V1.1 power user feature. |
| Inline config editor | Not our problem. Users edit their config in their editor. |
| Email notifications (streak reminders, achievement alerts) | Requires email infrastructure (SendGrid or similar), unsubscribe flow, and GDPR handling. Adds scope without being on the critical user path. |
| Public profile / shareable stats | Social features require content moderation and design investment. No V1 user research supports this being a retention driver. |
| Dark/light mode animation transitions | Animations on theme switch add polish but are not load-bearing. Plain instant switch is acceptable. |
| Leaderboard | No competitive features in V1. Requires enough concurrent users to be meaningful. |
| Command notes / personal annotations | Power user feature. Not validated as a top pain point across our four personas. |
| Browser extension | Separate engineering effort with browser compatibility overhead. Post-V2. |

---

## V1 — Post-Launch Additions (0–90 Days After Launch)

### Context

These features are not delayed because they are unimportant — they are delayed because they require real user data (from MVP) to be useful, or because they require MVP to be stable and monitored before adding complexity. Every item here has a clear trigger: MVP launches, we observe user behavior, and these features either accelerate toward development or get moved to V2 based on what we learn.

### What's Included

**Analytics Enhancements**

- Per-command response time history (line chart per command in drill-down panel)
- "Commands Never Practiced" report: list of imported keymaps with zero practice history, with a "Clean Up Config" prompt
- Weekly summary email (requires email infrastructure): sent every Monday, shows last week's accuracy trend, streak status, and top 3 missed commands
- Analytics data export (CSV): session history and per-command accuracy export for power users

Trigger to start development: >= 50 DAU, Analytics dashboard is accessed by >= 40% of active users (indicates high demand for deeper data).

**Spaced Repetition Refinements**

- User-visible scheduling transparency: in practice sessions, small label shows "Due today" / "Overdue X days" / "New" for each command
- Manual "Reset this command" option in drill-down panel (resets interval to 1 day, useful after config changes)
- Daily queue composition adjustment: let users set the ratio (e.g., 15 weakest + 5 new instead of 10 + 5 + 5)

Trigger: User feedback in session 1–30 day retention interviews indicates confusion about why certain commands appear.

**Keymap Management**

- Edit keymap descriptions in-place from the practice set view (post-import editing)
- Delete individual keymaps from practice set
- Re-import flow: when re-uploading an existing config, present a diff view (new keymaps, changed keymaps, removed keymaps) and let the user merge selectively
- Category assignment: allow users to assign custom categories to individual keymaps

Trigger: >= 20% of users have imported keymaps more than once (indicates active config management behavior).

**Onboarding Improvements**

- Interactive demo session (no import required): 5-command teaser session on the landing page to show the practice mechanic before asking for any commitment
- Onboarding checklist: persistent "Getting Started" sidebar for new users (Import your config → Complete your first session → Try the Daily Queue → Check your Analytics)
- Experience level test: for "I know the basics" users, a 10-question motion test to auto-place them in the correct Motion Trainer tier instead of making them guess

Trigger: Guest-to-registered conversion rate is below 20% at 30 days post-launch, OR onboarding drop-off analysis shows significant abandonment at the import step.

**Performance Improvements**

- Analytics dashboard query optimization (if load times degrade as session history grows)
- Keymap parser caching: identical file hash does not re-parse (returns cached result)
- Background session sync: session data queued locally and synced in batch if connectivity is lost mid-session

Trigger: Performance regression observed in monitoring, or user feedback citing slowness.

**Achievement Additions**

- Config Curator: import 100+ keymaps
- Comeback Kid: resume practice after a 7+ day gap
- Precision Practitioner: maintain >= 85% all-time accuracy with >= 100 sessions completed

Trigger: Achievement engagement data (what % of users are close to existing achievements) informs whether additional achievements drive meaningful behavior.

**Settings Additions**

- Auto-advance delay: configurable delay (0.5s / 1s / 1.5s) after incorrect answer before advancing to next command
- Session completion sound: distinct sound on session complete (if sounds enabled)
- Command display size: small / medium / large font for action descriptions (accessibility)

Trigger: User feedback requests in the first 30 days post-launch.

### What's Explicitly Excluded from V1

| Excluded Item | Reason |
|--------------|--------|
| Email infrastructure for weekly summaries | Build only if DAU warrants it and email adds measurable retention. Instrument open rates from day 1 if built. |
| Team or organization accounts | No enterprise validation in V1. Single user focus. |
| Plugin-specific import profiles beyond 4 frameworks | Validate demand by looking at which "unknown framework" repos users are importing. Add profiles one by one based on frequency. |
| Custom session modes (user-defined command sets) | Powerful, but requires UI for set management. Wait until keymap management is stable. |
| Progress sharing / social export | No social features until there is a community to share to. |

---

## V2 — Future Releases (90+ Days, Requires PMF Evidence)

V2 items are bets. None of them are scheduled. Each one has a trigger condition — a PMF signal or user behavior threshold that, when observed, would move it into active scoping. Building V2 features without those signals is waste.

### Competitive and Social Features

**What**: Leaderboard (accuracy rankings by category), challenge mode (race against another user's historical session), sharable practice results (image or link).

**Why it matters**: Creates network effects and virality. If VimTrainer has a community, the leaderboard gives power users a reason to return even after they have mastered their config.

**Trigger to build**: DAU >= 500, D30 retention >= 20%, at least one organic community forming (Reddit thread, Discord, Twitter/X conversation about the product without PM-driven promotion).

**Why not V1**: Network effects require a network. Building leaderboards for 50 users creates an empty table, not a feature. Worse, it signals that the product is not yet at scale.

---

**Community Keymap Library**

**What**: Public library of curated keymap sets — "LazyVim defaults," "Telescope power user set," "Go developer LSP bindings" — that users can import as a starting point without having a personal config.

**Why it matters**: Dramatically lowers the barrier for Vim migrants (Sofia's persona) who have no config yet. Provides a starting point for deliberate practice before investing time in a personal config.

**Trigger to build**: >= 30% of new users abandon at the import step (no config to import), AND onboarding interviews confirm "I don't have a config yet" as a primary reason.

**Why not V1**: Requires curation decisions (who maintains the library?), spam/abuse handling, and a content strategy. The Vim Migrant persona is served by Motion Trainer in V1 — we need to validate that is insufficient before building a library.

---

**Plugin Marketplace Integration**

**What**: Direct integration with Lazy.nvim package registry or similar. User selects installed plugins from a list; VimTrainer automatically imports the default keymaps for those plugins without requiring the user to have a config file with explicit mappings.

**Why it matters**: Solves Plugin Explorer (Marcus's) pain at the source — he could select "Telescope" and "nvim-dap" from a plugin list and immediately get a practice set.

**Trigger to build**: Partnership or API availability from plugin ecosystem maintainers, AND >= 40% of users report that their imported keymaps are missing plugin defaults they want to practice.

**Why not V1**: Requires active partnerships or scraping plugin source code for keymap definitions. Significant engineering and maintenance overhead. Validate demand first.

---

**Multiplayer / Real-Time Competition**

**What**: Two users race through the same command set simultaneously. Live accuracy and response time shown side by side. Post-race comparison.

**Why it matters**: Multiplayer creates high-engagement sessions, drives social sharing, and creates a reason to invite colleagues. It is the strongest retention mechanic available once user base is large enough.

**Trigger to build**: D30 retention plateauing for experienced users, AND at least 3 independent user requests for competitive features in feedback.

**Why not V1**: Requires WebSocket infrastructure, matchmaking, and room management. Zero benefit at sub-500 DAU because wait times would kill the experience.

---

**Neovim Plugin Auto-Configuration (Nix / Home Manager)**

**What**: Parse Nix flakes or Home Manager configurations that define Neovim packages and keymaps declaratively. Growing segment of the Neovim community manages configs via Nix.

**Why it matters**: Nix-managed Neovim configs have different file structures than standard dotfiles. Users on NixOS or using Home Manager cannot use the standard file import.

**Trigger to build**: >= 10% of GitHub import attempts fail with "No Neovim config found" on repos that appear to be Nix configurations (detectable by presence of `flake.nix` or `home.nix`).

**Why not V1**: Nix config parsing is a distinct parser problem from Lua/Vimscript. Scope it separately when evidence of demand exists.

---

**Mobile Application**

**What**: Native iOS and Android apps for flashcard review on mobile (not full practice sessions — the typing mechanic requires a physical keyboard).

**Why it matters**: Flashcard review is the one VimTrainer workflow that makes sense on mobile. Commute-time spaced repetition review could meaningfully increase practice frequency for users who have limited desktop time.

**Trigger to build**: >= 30% of web users access the site on mobile and flashcard sessions make up >= 20% of total sessions.

**Why not V1**: Vim is a desktop tool. Our V1 personas — Arjun, Sofia, Marcus, Priya — are all working at a desk with a keyboard. Mobile is a secondary use case that requires its own engineering investment.

---

**Monetization Infrastructure**

**What**: Optional Pro tier with: team/org accounts, private community keymap library access, advanced analytics (raw data export, custom date ranges), priority support, self-hosted license key management.

**Why it matters**: Open source and self-hosted validates PMF. Monetization converts that PMF into a sustainable business. The Pro tier targets the same users who self-host — they value the product enough to pay for the convenience and advanced features of the hosted version.

**Trigger to build**: >= 200 DAU sustained for 30+ days, >= 3 inbound enterprise inquiries asking about team pricing, D30 retention >= 20%.

**Why not V1**: Billing infrastructure (Stripe, invoicing, entitlement management) is non-trivial scope and the wrong thing to build before PMF is confirmed. A paywall before PMF is confirmed destroys the feedback loop. Ship it free, measure obsessively, monetize when you have evidence people would pay.

---

## Scope Change Protocol

Any request to add scope to MVP must go through the following process. There are no exceptions.

1. The requesting stakeholder submits a written change request (Slack message or doc) with: what they want added, which user problem it solves, and why it cannot wait until V1.
2. The PM evaluates against three criteria: Does it block a core user flow? Does it have validated user demand? Can it be shipped end-to-end without creating technical debt?
3. If accepted into MVP: a corresponding item of equal or greater effort is removed from MVP. MVP scope is fixed in total — adding requires removing.
4. If deferred to V1: the request is logged in the V1 backlog with the requester's name and rationale.
5. If rejected: the PM communicates the rejection in writing with the reason, and documents what evidence would change the decision.

No verbal scope additions. No "we'll just add this quickly." Quick additions are how MVPs become six-month delays.
