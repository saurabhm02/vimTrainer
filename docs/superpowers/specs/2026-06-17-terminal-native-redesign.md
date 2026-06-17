# VimTrainer — Terminal-Native Redesign Specification

**Date**: 2026-06-17  
**Status**: Design Review  
**Scope**: Frontend only — backend architecture, API, DB schema, auth, SRS algorithm, and import pipeline are preserved unchanged  
**Supersedes**: docs/phase4-frontend/design-system.md, docs/phase4-frontend/component-hierarchy.md, docs/phase4-frontend/css-architecture.md, docs/phase4-frontend/routing-plan.md

---

## 1. Product Positioning Update

### Previous positioning

VimTrainer was positioned as a MonkeyType-inspired typing trainer for keymaps — a web application with dark aesthetic, card-based challenge widgets, sidebar navigation, dashboard analytics, and SaaS-style information hierarchy.

### New positioning

**VimTrainer is a terminal-native Vim practice environment.**

Users should feel like they are inside Neovim, LazyGit, btop, or k9s — not inside a React dashboard. The browser is the terminal emulator. The UI is the terminal application running inside it.

The product vision from the PRD was always correct:

> "VimTrainer makes muscle memory for Vim motions and custom Neovim keybindings as trainable and measurable as typing speed."

The failure was in execution. The frontend implemented a flashcard quiz aesthetic instead of an environment that trains the actual mental model Neovim users operate with.

### What this means in practice

| Old pattern | New pattern |
|-------------|-------------|
| Centered card widget for challenge | Challenge lives inside a buffer document |
| Sidebar navigation | Tabline navigation (editor / practice / flow / recall / stats) |
| TopBar with page title | Nothing — tabline is the only chrome |
| Dashboard with chart cards | Stats rendered as dense terminal text — btop aesthetic |
| Modal overlays | Cmdline feedback and inline buffer state changes |
| CSS card borders and shadows | Single-pixel separators and character borders only |
| Sans-serif for challenge text | Monospace-first throughout |
| px-grid spacing (4px base) | Character-grid spacing (1ch, 1lh units) |

---

## 2. Design System — Terminal-Native Tokens

Replace `docs/phase4-frontend/design-system.md`. The following is the authoritative token set.

### 2.1 Core Grid Units

Everything in the UI is measured in character units — this is what makes it feel like a terminal, not a web app.

```css
:root {
  /* The two primitive units. All spacing derives from these. */
  --lh: 18px;    /* One line of text — the vertical grid unit */
  --ch: 7.8px;   /* One monospace character — the horizontal grid unit */
               /* Note: --ch is approximate. Use the ch CSS unit in practice. */
}
```

**Rule**: Padding, margins, widths, and heights must be expressed as multiples of `--lh` or `ch` units. No arbitrary pixel values in layout properties.

```css
/* ✓ Correct */
.gutter     { width: 4ch; }
.panel      { width: 26ch; }
.statusline { height: var(--lh); }

/* ✗ Wrong */
.card       { padding: 24px; }
.panel      { width: 220px; border-radius: 8px; }
```

### 2.2 Color Palette

Colors carry over from the existing system. No changes required.

```css
:root {
  --bg:    #0c0c0c;   /* True black — body and buffer background */
  --bg2:   #111111;   /* Tabline, slightly elevated */
  --bg3:   #1a1a1a;   /* Statusline, cmdline */
  --sep:   #252525;   /* Pane separators, section dividers */
  --ln:    #3a3a3a;   /* Line numbers — dim */
  --ln-cur:#888888;   /* Current line number */
  --dim:   #555555;   /* Inactive text, section labels */
  --muted: #888888;   /* Secondary text */
  --text:  #c8c8c8;   /* Primary text */
  --hi:    #e8e8e8;   /* Highlighted / important text */
  --acc:   #7c8cf8;   /* Indigo accent — active elements, mode badge */
  --green: #4ade80;   /* Correct, success */
  --red:   #f87171;   /* Incorrect, error */
  --yellow:#fbbf24;   /* Warning, timer */
}
```

Mode badge colors (statusline left block):

```css
--mode-guided:    #7c8cf8;   /* Indigo */
--mode-flow:      #4ade80;   /* Green */
--mode-recall:    #fbbf24;   /* Yellow */
--mode-editor:    #e879f9;   /* Fuchsia */
```

**Light theme**: Not supported in V1 terminal-native design. The product is inherently a dark-mode terminal. Remove light theme token set.

### 2.3 Typography

**Primary font**: JetBrains Mono everywhere. No Inter. No sans-serif body copy.

```css
:root {
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  --font-size: 13px;   /* Terminal default */
  --line-height: 18px; /* = var(--lh) */
}

html, body {
  font-family: var(--font-mono);
  font-size: var(--font-size);
  line-height: var(--line-height);
}
```

**Typography scale**: Sizes are now defined by purpose, not by abstract scale names.

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Buffer content (normal) | 13px | 400 | `--text` |
| Challenge description | 15px | 300 | `--hi` |
| Section headers (QUEUE, STATS) | 13px | 400 | `--muted` |
| Line numbers | 13px | 400 | `--ln` / `--ln-cur` |
| Statusline text | 12px | 400/700 | varies |
| Tabline text | 13px | 400 | `--dim` / `--text` |
| Comment lines | 13px | 400 | `--dim` |
| Code in Editor Mode | 13px | 400 | syntax colors |
| Tilde (~) for empty lines | 13px | 400 | `#2a2a2a` |

**Removed**: `--text-4xl`, `--text-3xl`, `--text-2xl` as challenge display sizes. The challenge description in Practice/Flow/Recall mode is 15px light weight — readable but not a hero banner.

### 2.4 Removed Tokens

These tokens are no longer part of the system. Remove them from `tokens.css`:

```
--border-radius-* (all values — no rounded corners in terminal UI)
--shadow-* (all box shadows)
--card-* (all card tokens)
--arena-max-width
--sidebar-width
--topbar-height
--font-sans
--text-3xl through --text-5xl (hero sizes)
--space-* as primary layout unit (replaced by ch/lh)
```

CSS variables for buttons, inputs, and modal overlays are preserved — they appear in auth pages and settings.

### 2.5 The KeyChip in Terminal Context

The KeyChip component continues to exist but changes role. In the buffer, keybindings are shown as styled inline spans, not as 3D key components. The full KeyChip visual (3D border-bottom depth effect) is reserved for two specific uses:

1. The landing page demo (public-facing, can be slightly more visual)
2. The `?` help overlay (command palette style popup showing all available bindings)

Inside Practice, Flow, Recall, and Editor mode buffers, keybindings render as:

```
<span class="kb">ciw</span>
<span class="kb leader">&lt;leader&gt;ff</span>
```

```css
.kb {
  color: var(--acc);
  font-family: var(--font-mono);
}
.kb.leader::before {
  content: '';
  /* leader key renders with accent color only, no 3D box */
}
```

---

## 3. Information Architecture — Terminal-Native Layout

### 3.1 Global Layout Structure

Replace the `AppShell` (sidebar + main content) with a terminal layout:

```
┌─ tabline (1 line) ────────────────────────────────────────────────────────────┐
│ vimtrainer.nvim │ editor │ practice │ flow │ recall │ stats │ import          │
├─ body (flex: 1) ──────────────────────────────────────────────────────────────┤
│                                                                               │
│  [left buffer pane]                │ [right info panel]                       │
│                                    │                                          │
│  Line-numbered buffer content       │ Dense text sections                      │
│  fills all available height         │ SECTION                                  │
│                                     │ ─────────                               │
│  Practice / Flow / Recall / Editor  │ content                                  │
│  content rendered here              │                                          │
│                                                                               │
├─ statusline (1 line) ─────────────────────────────────────────────────────────┤
│ [MODE] filename │ category │ progress │ accuracy │ timing          col:row     │
└─ cmdline (1 line) ────────────────────────────────────────────────────────────┘
```

**Total non-content chrome**: 3 lines (tabline + statusline + cmdline).
**Practice content**: everything between — typically 30–50 lines on a standard display.

### 3.2 Tabline

Replaces sidebar and topbar entirely. Single line at the top.

```
 vimtrainer.nvim │ editor │ practice │ flow │ recall │ stats │ import 
```

Visual rules:
- Active tab: `--text` color, `--bg` background (slightly lighter than bar)  
- Inactive tabs: `--dim` color, `--bg2` background
- Separator: `│` character (U+2502), not a CSS border
- No underlines, no active indicators beyond bg/color contrast
- Logo on far left: `vimtrainer.nvim` in `--dim` color
- Keyboard navigation: `gt` / `gT` to cycle tabs (Neovim convention)

### 3.3 Left Pane (Buffer)

The buffer is the primary content area. It contains:

- A gutter on the left: 4 characters wide, right-aligned line numbers
- After the gutter: 1 space, then buffer content
- Empty lines below content show `~` (tilde) in `#2a2a2a`

```css
.buf {
  display: flex;
  flex: 1;
}
.gutter {
  width: 4ch;
  padding-right: 1ch;
  color: var(--ln);
  text-align: right;
  user-select: none;
  flex-shrink: 0;
}
.gutter .cur { color: var(--ln-cur); }
.buf-content {
  flex: 1;
  padding-left: 1ch;
}
```

Each line is exactly `var(--lh)` tall. Gutter and content lines are always aligned.

### 3.4 Pane Separator

Between left buffer and right panel: a single 1px vertical border.

```css
.pane-sep {
  width: 1px;
  background: var(--sep);
  flex-shrink: 0;
}
```

Not a character. Not a CSS border with border-width > 1px. Not a card edge.

### 3.5 Right Panel

Fixed 26 character width. Contains dense text sections separated by `───` rules. No padding except 1ch left offset from separator.

```css
.panel {
  width: 26ch;
  padding-left: 1ch;
  flex-shrink: 0;
  overflow-y: hidden;
}
```

Section structure (plain text, no sub-components):

```
QUEUE
──────────────────────────
12/20

NEXT
──────────────────────────
 13  Format buffer
 14  LSP rename
 15  Go to definition

STATS
──────────────────────────
accuracy    94%
streak        8×
avg        820ms
```

Visual rules:
- Section headers: ALL CAPS, `--muted` color — these are the only uppercase text in the system
- Section separators: `──` with `--sep` color
- Values: `--text` or `--acc` / `--green` / `--red` by semantic meaning
- Line height: exactly `var(--lh)` — every line in the panel aligns with the buffer

### 3.6 Statusline

The single most information-dense element. Exactly `var(--lh)` tall.

```
 [MODE]  filename  │  category  │  progress  │  accuracy  │  timing       col:row 
```

Structure (left to right):
1. **Mode badge**: colored background block, mode name in ALL CAPS bold. Background color varies by mode.
2. **Filename/context**: current mode name or filename in Editor Mode
3. **Category**: current keymap category (telescope, lsp, motion, etc.)
4. **Progress**: `12/20` in accent color
5. **Accuracy**: `94%` in green/yellow/red by threshold
6. **Avg timing**: `820ms`
7. **Right side**: elapsed time or timer (flow mode), column position (editor mode)

```css
.statusline {
  height: var(--lh);
  background: var(--bg3);
  border-top: 1px solid var(--sep);
  display: flex;
  align-items: stretch;
  font-size: 12px;
}
.sl-mode {
  padding: 0 10px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
}
```

### 3.7 Cmdline

One line below statusline. Shows contextual feedback:

- Idle: empty (just background)
- After correct: `-- correct  820ms` in `--dim`
- After incorrect: shows correct answer: `-- expected: <leader>ff`
- Command input: `:` prompt for command palette in the future
- Mode transitions: `-- INSERT --` style annotations

```css
.cmdline {
  height: var(--lh);
  background: var(--bg);
  border-top: 1px solid #0f0f0f;
  display: flex;
  align-items: center;
  padding: 0 2px;
  font-size: 13px;
  color: var(--dim);
}
```

### 3.8 Removed Navigation Elements

**Remove permanently**:
- `Sidebar` component — the entire file and its CSS
- `TopBar` component — the entire file and its CSS  
- `AppShell` (existing implementation) — rewrite from scratch as terminal layout
- `PageLayout` — no longer needed; each mode owns its layout
- `--sidebar-width` CSS variable and all references
- `--topbar-height` CSS variable and all references

---

## 4. Mode Specifications

### 4.1 Editor Mode (Flagship)

**Status**: New — does not exist in current codebase.

**Purpose**: Train real muscle memory by performing actual Vim operations on real code. This is the only mode where users interact with code, not with abstract descriptions.

**What the user sees**:

```
 1  package main                                       │ TASK  3/8
 2                                                     │ ─────────────────────────
 3  import "fmt"                                       │ Change the function name
 4                                                     │ "Println" to something
 5  func main() {                                      │ else
 6      fmt.█rintln("hello, world")                    │
 7  }                                                  │ EXPECTED
 8  ~                                                  │ ─────────────────────────
 9  ~                                                  │ ciw
10  ~                                                  │ cw
11  ~                                                  │
                                                       │ INPUT
                                                       │ ─────────────────────────
                                                       │ c█
                                                       │
                                                       │ ?    show hint
                                                       │ Esc  cancel
```

**Validation model**: Outcome-based, not keypress-based.

The system captures the Vim command entered by the user, simulates its effect on the buffer state, and compares the resulting buffer to the expected buffer state. Multiple commands that produce the same result are all marked correct.

```typescript
interface EditorTask {
  id: string;
  description: string;          // "Change the function name 'Println'"
  language: 'go' | 'lua' | 'typescript' | 'python';
  initialBuffer: string[];      // Lines of code
  cursorLine: number;           // 0-indexed
  cursorCol: number;            // 0-indexed
  expectedBuffer: string[];     // Expected state after operation
  // Note: expectedBuffer has a placeholder for what the user types
  // e.g., ["fmt.█(\"hello\")", ...] — █ = cursor insertion point
  acceptedCommands: string[];   // Known correct solutions for hints
  hint?: string;                // Optional hint text
}
```

**Buffer simulation**: Editor Mode requires a simplified Vim operation executor. It does NOT need to implement all of Vim — only the operations covered by the task set. Required operations for V1:

| Operation | Keys | Description |
|-----------|------|-------------|
| Change inner word | `ciw` | Delete word under cursor, enter insert mode |
| Change word | `cw` | Delete from cursor to word end, enter insert mode |
| Delete inner word | `diw` | Delete word under cursor |
| Delete word | `dw` | Delete from cursor to word end |
| Yank inner word | `yiw` | Yank word under cursor |
| Change to end | `C` | Delete from cursor to line end, insert |
| Delete to end | `D` | Delete from cursor to line end |
| Replace char | `r{char}` | Replace char under cursor |
| Substitute | `s` | Delete char under cursor, insert |

For V1, the task set is curated around operations the simulator can handle deterministically. The simulator does not need to handle visual mode, macros, or complex motions.

**Implementation complexity**: HIGH. See Section 6.

**Route**: `/editor` or as the default landing route for authenticated users

---

### 4.2 Practice Mode

**Status**: Exists — requires full visual redesign, minimal logic changes.

**Purpose**: Description → Keybinding. Fastest mode for drilling imported keymaps.

**What the user sees**:

```
 1  -- VimTrainer · practice mode · telescope.nvim
 2
 3  Category:
 4
 5      telescope
 6
 7  Description:
 8
 9      Find Files
10
11  Expected:
12
13      <leader>ff
14
15  Typed:
16
17      <leader>f█
18
19  ~
20  ~
```

**Changes from current implementation**:
- Remove `arena__challenge` card component — content lives in buffer lines
- Remove centered layout — content starts at left margin, indented 4 spaces
- Remove `arena__description` large font size — description is 15px light
- Remove FeedbackOverlay component — feedback goes to cmdline
- Remove progress indicator component — progress moves to statusline
- Keep all keypress capture and SM-2 scoring logic unchanged

**Feedback flow**:
- Correct: buffer line 17 flashes `--green` for 400ms, then advances. Cmdline shows `-- correct  380ms` briefly
- Incorrect: buffer line 13 (Expected) reveals at full opacity. Cmdline shows `-- expected: <leader>ff`. Advances after 2000ms.
- The `arena__answer` element stays at opacity 0.08 during practice, revealing to 1.0 on feedback — behavior is preserved, styling is not

---

### 4.3 Flow Mode

**Status**: New — closest existing is the landing page mini-arena. Requires new implementation.

**Purpose**: Continuous rhythm training. No transitions, no setup screens. Challenges scroll continuously in a buffer.

**What the user sees**:

```
 1  -- continuous flow · motion · 47s remaining
 2
 3  Go to first line
 4      gg          ✓ 420ms
 5
 6  Scroll down half-page
 7      <C-d>       ✓ 380ms
 8
 9  Delete inner word
10      ciw         ✗ typed: dw
11
12  ────────────────────────────────────────────────────────────────────
13
14  Center line in window
15
16      z█
17
18  ────────────────────────────────────────────────────────────────────
19
20  Yank line (upcoming)
21  ~
22  ~
```

**Key design decisions**:
- Past challenges (above the `────` rule): dimmed (`--dim`), showing result inline
- Current challenge (between the two `────` rules): normal text, active cursor
- Next challenge (below second rule): dimmed, as a lookahead
- The buffer scrolls — as challenges complete, content shifts up, maintaining scroll position at the current challenge
- Timer in statusline right, not in the buffer

**Differences from Practice Mode**:
- Time-bounded (60s default), not count-bounded
- No queue panel — right pane shows session stats only
- Answer revealed immediately on incorrect, not held for user to see
- No SM-2 scoring — this mode is for speed and rhythm, not SRS scheduling

---

### 4.4 Recall Mode

**Status**: Maps to existing "flashcard" mode. Requires visual redesign and direction reversal.

**Purpose**: SRS review. Show the keybinding, user types its description. This is the hard recall direction — binding → meaning — which builds the inverse muscle memory (seeing `:lua vim.lsp.buf.rename()` in which-key and knowing what you mapped it to).

**What the user sees**:

```
 1  -- recall mode · spaced repetition · 12 due today
 2
 3  Card 5/12:
 4
 5  -- You see the keybinding. Type what it does.
 6
 7      ciw
 8
 9  Your answer:
10
11      change inn█
12
13  ── press Enter to submit ─────────────────────────────────────────
14
15  -- After answering, rate difficulty:
16      1 again · 2 hard · 3 good · 4 easy
17
18  ~
```

**After submitting**:

```
 1  -- recall mode · spaced repetition · 12 due today
 2
 3  Card 5/12:
 4
 5      ciw
 6
 7  Your answer:
 8
 9      change inner word
10
11  Correct answer:
12
13      change inner word (change in-word text object)
14
15  ── Rate difficulty: 1 again · 2 hard · 3 good · 4 easy ──────────
```

**SM-2 integration**: The existing SM-2 backend implementation is unchanged. Recall mode maps to the existing `/sessions` + attempt submission API. Ease factor calculation (1-4 rating → ease delta) uses the existing algorithm.

**Direction**: This mode is keybinding → description. Practice mode is description → keybinding. They are complementary, not redundant.

---

## 5. Navigation Model

### 5.1 Tabline Navigation

Primary navigation is the tabline. Keyboard shortcuts follow Vim conventions:

| Key | Action |
|-----|--------|
| `gt` | Next tab |
| `gT` | Previous tab |
| `1gt`–`7gt` | Jump to tab by number |
| `:e` or `Ctrl+K` | Command palette (future) |

Tab order: `editor` · `practice` · `flow` · `recall` · `stats` · `import`

The active tab is visually distinct by background only — no underlines, no indicator dots.

### 5.2 Within-Mode Navigation

Each mode handles its own keyboard events. Global keys that always work:

| Key | Action |
|-----|--------|
| `Esc` | Quit current session, return to setup |
| `Tab` | Skip current challenge |
| `?` | Toggle hint visibility |
| `q` | Same as Esc in most modes |

### 5.3 Setup Screens

Each mode has a setup screen before the session begins. Setup screens also follow the buffer aesthetic:

```
 1  -- practice setup
 2
 3  Category:
 4
 5      [ telescope ] [ lsp ] [ motion ] [ all ]
 6
 7  Length:
 8
 9      [ 10 ] [ 20 ] [ 30 ] [ 50 ]
10
11  ─────────────────────────────────────
12
13  Press Enter to start
14
15  ~
```

Category and length selectors are keyboard-navigated with arrow keys, selected with Enter/Space.

### 5.4 No Command Palette in V1

The `:` command palette (Neovim-style) is a future feature. V1 navigation is tabline-only.

---

## 6. Stats / Analytics Page

Replace the Recharts dashboard cards with terminal-style stats. Referencing btop and htop aesthetics.

### What it looks like

```
 1  -- vimtrainer stats · saurabh · last 30 days
 2
 3  OVERVIEW
 4  ────────────────────────────────────────────────────────────────────
 5  sessions       47      accuracy    91%     streak    12d
 6  challenges   940      avg ms      610     best ms   280
 7
 8  ACCURACY TREND  (30d)
 9  ────────────────────────────────────────────────────────────────────
10  100% ┤
11   80% ┤   ·····     ········    ·············
12   60% ┤ ··     ·····        ····
13   40% ┤
14       └──────────────────────────────────────── Jun 17
15
16  WORST KEYMAPS
17  ────────────────────────────────────────────────────────────────────
18   1  <leader>ca   code action       41%  ████░░░░░░  22 attempts
19   2  gr           LSP references    55%  █████░░░░░  18 attempts
20   3  <C-w>v       vertical split    58%  █████░░░░░  14 attempts
```

**Implementation note**: The sparkline charts (lines 10-14) use Unicode box-drawing characters rendered as pre-formatted text, not Recharts SVG. This keeps the aesthetic terminal-native and removes the Recharts dependency from the stats view. ASCII sparklines are sufficient for the data density needed.

**Recharts**: Remove the dependency from the analytics page. Keep it only if other charting needs arise that cannot be served by ASCII sparklines. The bar charts for "worst keymaps" (line 18-20) use block characters (`█░`) — no SVG required.

---

## 7. Required Implementation Changes

### 7.1 Keep (Backend — no changes)

- Go API server, all handlers
- Supabase PostgreSQL schema
- JWT authentication (access + refresh tokens)
- SM-2 algorithm implementation
- Keymap import pipeline (Lua parser, vimrc parser)
- All API endpoints and contracts
- Docker / Cloud Run deployment config
- All ADRs (001-005)

### 7.2 Keep (Frontend — logic preserved, visual rewritten)

| File | Action |
|------|--------|
| `practiceStore.ts` | Keep — session state management unchanged |
| `authStore.ts` | Keep — auth state unchanged |
| `settingsStore.ts` | Keep — settings unchanged |
| `keymapStore.ts` | Keep — keymap data management unchanged |
| `uiStore.ts` | Reduce — remove sidebar state, keep toast/modal state |
| `src/utils/parseKeySequence.ts` | Keep — sequence parsing logic unchanged |
| `src/utils/formatTime.ts` | Keep |
| `src/services/api.ts` | Keep — all API service methods unchanged |
| `src/types/models.ts` | Keep — API response types unchanged |
| Auth pages (Login, Register) | Keep — these use the auth layout, not the terminal layout |

### 7.3 Remove

| File/Component | Reason |
|----------------|--------|
| `components/layout/Sidebar/` | Removed — tabline replaces sidebar |
| `components/layout/TopBar/` | Removed — no topbar in terminal UI |
| `components/layout/PageLayout/` | Removed — each mode owns layout |
| `components/layout/AppShell/` | Rewrite from scratch |
| `components/ui/Card/` | Removed — no cards in terminal UI |
| `components/practice/PracticeArena/` | Rewrite as TerminalArena |
| `components/practice/ChallengeDisplay/` | Removed — challenge is buffer lines |
| `components/practice/FeedbackOverlay/` | Removed — feedback is cmdline |
| `components/practice/SessionStats/` | Removed — stats are in statusline |
| `components/practice/ProgressIndicator/` | Removed — progress in statusline |
| `components/charts/AccuracyTrendChart/` | Remove Recharts — ASCII sparkline |
| `components/charts/ResponseTimeTrendChart/` | Remove Recharts — ASCII sparkline |
| `components/charts/PracticeTimeChart/` | Remove Recharts — ASCII chart |
| `components/charts/CategoryBreakdownChart/` | Remove Recharts radar |
| `components/charts/MasteryScoreGauge/` | Remove SVG gauge — text stat |
| `styles/components/sidebar.css` | Remove |
| `styles/components/topbar.css` | Remove |
| `styles/components/app-shell.css` | Rewrite |
| `styles/components/card.css` | Remove (keep for auth pages only if needed) |
| `styles/pages/dashboard.css` | Rewrite as terminal stats |
| `styles/pages/practice.css` | Full rewrite |

### 7.4 New Components to Build

| Component | File | Description |
|-----------|------|-------------|
| `TerminalShell` | `components/layout/TerminalShell/` | Root layout: tabline + body + statusline + cmdline |
| `Tabline` | `components/layout/Tabline/` | Tab navigation bar |
| `Statusline` | `components/layout/Statusline/` | Bottom status bar |
| `Cmdline` | `components/layout/Cmdline/` | Bottom feedback line |
| `BufferPane` | `components/terminal/BufferPane/` | Left pane: gutter + content |
| `InfoPanel` | `components/terminal/InfoPanel/` | Right pane: dense text sections |
| `PaneSep` | `components/terminal/PaneSep/` | 1px vertical separator |
| `EditorBuffer` | `components/editor/EditorBuffer/` | Syntax-highlighted code display with cursor |
| `VimSimulator` | `utils/vimSimulator.ts` | Core vim operation execution engine (see §6) |
| `AsciiSparkline` | `components/stats/AsciiSparkline/` | Unicode character sparkline charts |

### 7.5 Route Changes

```typescript
// New route structure
const routes = [
  { path: '/', element: <LandingPage /> },          // Keep — public demo
  { path: '/auth/login', element: <LoginPage /> },   // Keep
  { path: '/auth/register', element: <RegisterPage /> }, // Keep
  
  // Terminal shell wraps all authenticated routes
  {
    element: <AuthGuard><TerminalShell /></AuthGuard>,
    children: [
      { path: '/editor',   element: <EditorPage /> },    // NEW — flagship
      { path: '/practice', element: <PracticePage /> },  // Rewrite
      { path: '/flow',     element: <FlowPage /> },      // NEW
      { path: '/recall',   element: <RecallPage /> },    // Replaces /flashcards
      { path: '/stats',    element: <StatsPage /> },     // Replaces /dashboard
      { path: '/import',   element: <ImportPage /> },    // Keep — light reskin
    ]
  }
]
```

**Removed routes**: `/dashboard`, `/practice/motions`, `/practice/leader`, `/practice/flashcards`  
**Consolidation**: Motions and leader-key modes become category filters within Practice mode, not separate routes.

---

## 8. Risks and Complexity Analysis

### 8.1 Editor Mode — Buffer Simulation

**Risk level**: HIGH  
**Complexity**: HIGH

Editor Mode requires simulating a subset of Vim's editing model in the browser. This is the hardest part of the entire product.

**What must work**:

1. **Cursor tracking**: maintain (line, col) position in a buffer (string[])
2. **Text objects**: understand "inner word" (between word boundaries), "a word" (including surrounding space)
3. **Operator + motion composition**: `c` (operator) + `iw` (text object) = change inner word
4. **Enter/exit insert mode**: after an operator command, accept arbitrary text input until `Esc`
5. **Buffer diff**: compare before/after state to expected state

**Scope limiting strategy** (mandatory for V1):

Do NOT build a general Vim motion executor. Build a curated command recognizer:

```typescript
type VimCommand =
  | { type: 'change-inner-word' }   // ciw
  | { type: 'change-word' }         // cw
  | { type: 'change-to-end' }       // C
  | { type: 'delete-inner-word' }   // diw
  | { type: 'delete-word' }         // dw
  | { type: 'delete-to-end' }       // D
  | { type: 'replace-char', char: string }  // r{char}
  | { type: 'substitute' }          // s
  | { type: 'yank-inner-word' }     // yiw
```

The command parser recognizes these 9 patterns. Tasks are authored to use only these commands. The simulator applies each command to the buffer state deterministically.

Validation: after a change command, the user is in "insert mode" inside the simulator — they type replacement text, then press `Esc`. The result is compared against `task.expectedBuffer` with a placeholder substituted.

**Alternative approach (lower risk)**: Accept the command as typed text, compare it to `task.acceptedCommands`, and validate by command match rather than outcome. This eliminates the simulator entirely but loses the "multiple correct answers" property. This is the V1-safe fallback.

**Decision**: Build command-match validation for V1. Build outcome-based validation for V2 once the task library is established and the simulator can be tested against it. Document this as a known limitation.

### 8.2 Continuous Flow Mode — Buffer Scroll

**Risk level**: MEDIUM  
**Complexity**: MEDIUM

Flow mode renders a scrolling buffer where past challenges accumulate above the current position. This requires:

- Efficient list rendering that doesn't re-render all completed items on each keystroke
- Scroll management: auto-scroll to keep current challenge in view
- Visual separation between past/current/future without transitions

**Approach**: Use a `useRef` to the buffer container, `scrollIntoView` on the current challenge element after each advance. Past challenges rendered as static dimmed elements — React's reconciler handles them efficiently since they don't change.

### 8.3 ASCII Sparklines

**Risk level**: LOW  
**Complexity**: LOW

Generate sparklines as Unicode characters. No external library needed. The algorithm maps data points to 8 Unicode braille/block characters:

```typescript
const SPARK_CHARS = ['▁','▂','▃','▄','▅','▆','▇','█'];

function sparkline(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map(v => {
    const normalized = (v - min) / (max - min || 1);
    return SPARK_CHARS[Math.floor(normalized * 7)];
  }).join('');
}
```

### 8.4 KeyChip Regression

**Risk level**: LOW  
**Complexity**: LOW

The KeyChip component continues to work on the landing page and in the `?` help overlay. Removing it from the practice buffer is a CSS change only — the component stays in the codebase. Risk of accidental removal is low.

### 8.5 Authentication / Settings Pages

**Risk level**: LOW  
**Complexity**: LOW

Auth pages (login, register) are wrapped in `AuthLayout`, not `TerminalShell`. They keep their current centered card aesthetic — this is appropriate for auth flows. No changes needed except ensuring `TerminalShell` is not accidentally applied to auth routes.

Settings page gets a terminal-native reskin but remains simple form fields. The card wrapper around settings sections is replaced with `───` section separators in a buffer-like layout.

---

## 9. Open Questions

These questions must be answered before implementation begins. They are noted here rather than decided unilaterally because they have product-level implications.

**Q1**: What is the default landing route for authenticated users?  
Options: `/editor` (signals Editor Mode is flagship) or `/practice` (existing behavior, lower disruption). Recommendation: `/editor`.

**Q2**: Does the landing page (`/`) change to reflect the new terminal aesthetic?  
The current landing page runs a mini MonkeyType-style arena with built-in keymaps. It could become a terminal-native demo buffer instead. Risk: losing the immediate interactivity that demonstrates the product in 2 seconds. Recommendation: Defer landing page redesign to V2. Keep current landing page behavior, update visual styling to match terminal tokens.

**Q3**: V1 Editor Mode validation — command match or outcome match?  
Section 8.1 recommends command match for V1. This simplifies implementation but means `ciw` and `cw` would not both be accepted as correct (even if they produce the same result). Acceptable for V1?

**Q4**: Is the right pane always visible, or can it be toggled?  
In the wireframes, the right pane (queue, stats) is always open. A toggle (`<C-w>` to hide/show) would give the buffer more width. Recommendation: Always visible in V1. Toggle in V2.

**Q5**: Is there a light mode?  
Terminal-native design is inherently dark. Removing the light theme reduces token complexity significantly. Recommendation: Drop light mode from V1.

---

## 10. Implementation Order

Given the redesign scope, this is the recommended implementation sequence within the existing milestone structure. This inserts into the existing roadmap after M2 (Auth) is complete.

**Phase A — Terminal Shell (2 days)**  
Build `TerminalShell`, `Tabline`, `Statusline`, `Cmdline`, `BufferPane`, `InfoPanel`, `PaneSep`. Wire up routing. All pages show placeholder buffer content but the chrome is correct.

**Phase B — Practice Mode (2 days)**  
Port existing `PracticePage` logic into the terminal shell. Remove card components. Challenges render as buffer lines. This is the lowest-risk rewrite — logic is preserved, only visual layer changes.

**Phase C — Flow Mode (2 days)**  
New mode built on top of Practice Mode's keypress capture logic. Add timer, scrolling buffer, continuous challenge advance.

**Phase D — Recall Mode (1 day)**  
Rename/rewrite FlashcardsPage. Direction reversal (binding → description). SM-2 rating UI (1-4 keyboard shortcuts) in cmdline.

**Phase E — Stats Page (2 days)**  
Remove Recharts. Implement ASCII sparklines. Port existing analytics API queries, render as terminal stats layout.

**Phase F — Editor Mode (5 days)**  
New EditorBuffer component. VimSimulator (command-match V1). Task library (20 tasks minimum for launch). Buffer display with syntax highlighting (Prism.js or similar — single dependency). Validation pipeline.

**Phase G — Import + Settings Reskin (1 day)**  
Apply terminal aesthetic to Import and Settings pages. No logic changes.

**Total frontend implementation**: ~15 days for the redesign on top of the existing M1-M2 foundation.

---

## 11. Summary of Decisions

| Decision | Chosen |
|----------|--------|
| Primary font | JetBrains Mono, 13px, everywhere |
| Layout unit | Character-grid (ch/lh) |
| Navigation | Tabline — no sidebar |
| Cards | Removed — buffer lines and plain text sections only |
| Shadows | Removed from layout — KeyChip depth shadow retained |
| Border radius | 0 for all layout elements |
| Light mode | Dropped for V1 |
| Analytics charting | ASCII sparklines + block chars — no Recharts |
| Editor Mode V1 validation | Command match (not outcome/diff) |
| Editor Mode V2 validation | Outcome-based buffer diff |
| Feedback delivery | Cmdline (not overlay components) |
| Stats/progress display | Statusline (not in-pane components) |
| Landing page | Defer redesign — terminal token update only |
