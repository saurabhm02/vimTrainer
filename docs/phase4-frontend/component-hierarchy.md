# VimTrainer Component Hierarchy

**Version**: 1.0
**Last Updated**: 2026-06-16
**Status**: Production Reference

---

## Overview

This document is the canonical reference for every React component in the VimTrainer frontend. It defines TypeScript prop interfaces, store subscriptions, memoization strategy, and responsibilities for all components.

**Guiding rules:**
- `src/components/ui/` — stateless primitives, zero business logic, zero store subscriptions
- `src/components/layout/` — structural shells, subscribe only to `uiStore`
- `src/components/practice/` — session-aware components, subscribe to `practiceStore`
- `src/components/charts/` — data visualization, receive data as props from parent pages
- Pages orchestrate queries + stores and pass data down to components

---

## 1. Primitive UI Components (`src/components/ui/`)

### 1.1 Button

**File:** `src/components/ui/Button/Button.tsx`

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  /** Accessible label when button content is only an icon */
  'aria-label'?: string;
  className?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`. Pure presentational component; memoization prevents unnecessary re-renders when parent store slices update.

**Responsibilities:**
- Render a styled `<button>` element with variant/size classes.
- Show a `Spinner` (sm) in place of `leftIcon` when `loading={true}` and set `disabled` + `aria-busy="true"` automatically.
- Compose CSS classes: `btn btn--{variant} btn--{size}` plus `btn--full-width` and `btn--loading` modifiers.
- Forward all native button attributes via rest props.

---

### 1.2 Input

**File:** `src/components/ui/Input/Input.tsx`

```typescript
type InputVariant = 'default' | 'error' | 'success';

interface InputProps {
  variant?: InputVariant;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  /** Shows checkmark icon when variant is 'success' */
  successMessage?: string;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'password' | 'url' | 'search';
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  name?: string;
  id?: string;
  maxLength?: number;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render label (if provided) → `<input>` → helper/error/success text in a stacked vertical layout.
- Apply `input--error` class and `aria-invalid="true"` when `variant === 'error'`.
- Auto-generate `id` from `label` if `id` not provided, linking `<label htmlFor>`.
- Render left/right addons inside input wrapper for prefix/suffix icons or text.

---

### 1.3 Badge

**File:** `src/components/ui/Badge/Badge.tsx`

```typescript
type BadgeVariant = 'default' | 'accent' | 'success' | 'error' | 'warning' | 'muted';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Dot indicator before label */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render a `<span>` chip with `badge badge--{variant} badge--{size}` classes.
- Optionally prepend a colored dot (CSS `::before` pseudo-element) when `dot={true}`.
- Used for category tags (Normal/Insert/Visual), mode labels, accuracy percentages.

---

### 1.4 Card

**File:** `src/components/ui/Card/Card.tsx`

```typescript
type CardVariant = 'default' | 'elevated' | 'bordered';

interface CardProps {
  variant?: CardVariant;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Removes default padding from body — useful for full-bleed content */
  noPadding?: boolean;
  onClick?: () => void;
  /** Makes the card tabbable and shows focus ring when onClick is provided */
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render `card__header` / `card__body` / `card__footer` slots.
- `elevated` variant adds `box-shadow`; `bordered` variant adds `border: 1px solid var(--border-subtle)`.
- `interactive` sets `tabIndex={0}`, `role="button"`, and keyboard `onKeyDown` for Enter/Space.

---

### 1.5 Modal

**File:** `src/components/ui/Modal/Modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Width preset */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disable closing on backdrop click */
  disableBackdropClose?: boolean;
  /** Disable closing on ESC key */
  disableEscClose?: boolean;
  children: React.ReactNode;
  /** Footer content — typically action buttons */
  footer?: React.ReactNode;
  /** ID for aria-labelledby */
  labelId?: string;
}
```

**Store subscriptions:** `uiStore` — reads `modalStack` to determine z-index layering for nested modals.

**Memoized:** No — modal open/close state changes make memoization ineffective.

**Responsibilities:**
- Render into `document.body` via `ReactDOM.createPortal`.
- Trap focus within modal using a focus trap implementation (Tab/Shift+Tab cycle).
- Close on ESC keydown (unless `disableEscClose`).
- Close on backdrop click (unless `disableBackdropClose`).
- Lock body scroll (`document.body.style.overflow = 'hidden'`) while open; restore on close.
- Apply `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`.
- Animate in with `modal--entering` class and out with `modal--exiting` class (CSS transition).

---

### 1.6 Tooltip

**File:** `src/components/ui/Tooltip/Tooltip.tsx`

```typescript
type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string | React.ReactNode;
  position?: TooltipPosition;
  /** Delay before showing in ms */
  delay?: number;
  disabled?: boolean;
  children: React.ReactElement;
  className?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Clone `children` with added `aria-describedby` pointing to tooltip content.
- Show tooltip on hover (mouse) and on focus (keyboard).
- Position tooltip with CSS custom properties `--tooltip-offset-x` / `--tooltip-offset-y` computed from `getBoundingClientRect()`.
- Render into portal to avoid overflow clipping.
- Apply `role="tooltip"` and unique `id` generated with `useId()`.

---

### 1.7 KeySequence

**File:** `src/components/ui/KeySequence/KeySequence.tsx`

**This is the most important UI primitive in the application.** It renders key binding strings as visual key chips.

```typescript
interface KeyChip {
  label: string;
  /** Rendered with special leader chip styling */
  isLeader?: boolean;
  /** Modifier keys (Ctrl, Shift, Alt, Cmd) get distinct styling */
  isModifier?: boolean;
  /** Special keys (ESC, Enter, Space, Tab, BS) get wider chips */
  isSpecial?: boolean;
}

interface KeySequenceProps {
  /** Raw keymap string e.g. "<leader>ff", "<C-p>", "gd", "<S-Tab>" */
  sequence: string;
  /** Scale the chips: 'sm' for table rows, 'md' for stats, 'lg' for practice arena */
  size?: 'sm' | 'md' | 'lg';
  /** Show dim styling — used for expected answer before reveal */
  dim?: boolean;
  className?: string;
}
```

**Store subscriptions:** `settingsStore` — reads `leader_key_symbol` to replace `<leader>` token with the user's actual leader key (default: `\`).

**Memoized:** Yes — `React.memo`. Sequence strings are stable; re-rendering every chip on unrelated store changes is wasteful.

**Parsing logic** (implemented in `src/utils/parseKeySequence.ts`):
- Tokenize the sequence string: `<leader>ff` → `['<leader>', 'f', 'f']`
- Token patterns:
  - `<leader>` → `{ label: leaderSymbol, isLeader: true }`
  - `<C-x>` → `{ label: 'Ctrl', isModifier: true }` + `{ label: 'x' }`
  - `<S-x>` → `{ label: 'Shift', isModifier: true }` + `{ label: 'x' }`
  - `<M-x>` / `<A-x>` → `{ label: 'Alt', isModifier: true }` + `{ label: 'x' }`
  - `<D-x>` → `{ label: 'Cmd', isModifier: true }` + `{ label: 'x' }`
  - `<CR>` / `<Enter>` → `{ label: 'Enter', isSpecial: true }`
  - `<Esc>` / `<ESC>` → `{ label: 'ESC', isSpecial: true }`
  - `<Space>` → `{ label: 'Space', isSpecial: true }`
  - `<Tab>` → `{ label: 'Tab', isSpecial: true }`
  - `<BS>` → `{ label: '⌫', isSpecial: true }`
  - Single char → `{ label: char }`
- Render each token as a `<kbd>` element with appropriate class modifiers.

**Responsibilities:**
- Parse sequence string into `KeyChip[]` using `parseKeySequence()`.
- Render chip row with `key-sequence` wrapper class.
- Apply `key-chip--leader`, `key-chip--modifier`, `key-chip--special` CSS modifiers.
- Size classes: `key-sequence--sm`, `key-sequence--md`, `key-sequence--lg`.

---

### 1.8 ProgressBar

**File:** `src/components/ui/ProgressBar/ProgressBar.tsx`

```typescript
interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** Optional label shown above the bar */
  label?: string;
  /** Optional value shown to the right of label */
  valueLabel?: string;
  /** Color variant */
  variant?: 'default' | 'success' | 'error' | 'warning';
  /** Height in px — default 6 */
  height?: number;
  /** Animate fill with CSS transition */
  animated?: boolean;
  className?: string;
  /** For screen readers */
  'aria-label'?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render `<div role="progressbar" aria-valuenow aria-valuemin="0" aria-valuemax="100">`.
- Set `--progress-value: {value}%` as inline CSS custom property, consumed by CSS fill.
- Animate transition with `transition: width var(--duration-normal) ease-out` when `animated`.
- Label row renders above bar if `label` or `valueLabel` provided.

---

### 1.9 Avatar

**File:** `src/components/ui/Avatar/Avatar.tsx`

```typescript
interface AvatarProps {
  /** User's display name — used for initials and accessible label */
  name: string;
  /** If provided, renders image instead of initials */
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Derive initials: `"John Doe"` → `"JD"`, `"Alice"` → `"A"` (max 2 chars, uppercase).
- Derive letter-color: deterministic color from `name.charCodeAt(0) % 8` selecting from 8 preset accent colors defined as CSS custom properties (`--avatar-color-0` through `--avatar-color-7`).
- Show `<img>` with `alt={name}` when `src` is provided; fall back to initials if image fails to load (`onError`).
- Apply `aria-label={name}` to the container.

---

### 1.10 Spinner

**File:** `src/components/ui/Spinner/Spinner.tsx`

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Used as aria-label — defaults to "Loading" */
  label?: string;
  className?: string;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render an SVG circle spinner with CSS `@keyframes spin` animation.
- Sizes: `sm` = 16px, `md` = 24px, `lg` = 40px.
- Apply `role="status"` and `aria-label`.
- Respect `prefers-reduced-motion`: pause animation, show static arc instead.

---

## 2. Practice Arena Components (`src/components/practice/`)

### 2.1 PracticeArena

**File:** `src/components/practice/PracticeArena/PracticeArena.tsx`

```typescript
interface PracticeArenaProps {
  /** Session mode determines challenge pool */
  mode: 'all' | 'motions' | 'leader' | 'custom';
  /** Challenge count for this session — default from settings */
  sessionLength?: number;
  /** Pre-filtered keymaps for custom sessions */
  keymapIds?: string[];
  /** Called when session completes naturally */
  onSessionComplete?: (result: SessionResult) => void;
}

interface SessionResult {
  totalChallenges: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  averageResponseTimeMs: number;
  durationMs: number;
  missedKeymaps: Array<{ keymapId: string; attempts: number }>;
}
```

**Store subscriptions:**
- `practiceStore` — `sessionState`, `currentChallenge`, `score`, `streak`, `accuracy`, `sessionTimer`
- `settingsStore` — `session_duration_minutes`, `sounds_enabled`, `animations_enabled`

**Memoized:** No — this is the session root; it manages all session state transitions.

**Responsibilities:**
- Own the session lifecycle: mount → dispatch `startSession(mode, length)` → render active session → dispatch `endSession()` → render `SessionComplete`.
- Route keyboard events to `KeyInput` by maintaining a `ref` on the input capture area.
- Guard against navigation-away during active session: `useBlocker` from React Router.
- Conditionally render `ChallengeDisplay`, `KeyInput`, `FeedbackOverlay`, `SessionStats`, `ProgressIndicator` based on `sessionState`.
- Apply `practice-arena--correct` / `practice-arena--incorrect` CSS classes on feedback states (drives full-arena color flash).

---

### 2.2 ChallengeDisplay

**File:** `src/components/practice/ChallengeDisplay/ChallengeDisplay.tsx`

```typescript
interface ChallengeDisplayProps {
  /** Human-readable action description e.g. "Find files with Telescope" */
  actionDescription: string;
  /** Vim mode the keymap operates in */
  mode: 'normal' | 'insert' | 'visual' | 'command' | 'terminal';
  /** Plugin or category name e.g. "Telescope", "LSP", "Harpoon" */
  category: string;
  /** Visual state from parent FeedbackOverlay */
  feedbackState: 'idle' | 'correct' | 'incorrect';
}
```

**Store subscriptions:** None — receives data from `PracticeArena` via props.

**Memoized:** Yes — `React.memo`. Only re-renders when challenge or feedback state changes.

**Responsibilities:**
- Render the action description in large typography (`--text-4xl`, `--font-sans`).
- Render mode badge (`Badge` component, variant based on mode).
- Render category label.
- Apply `challenge-display--correct` / `challenge-display--incorrect` modifier class for color transitions (green/red text flash).
- Do NOT show the expected answer — that would defeat the purpose.

---

### 2.3 KeyInput

**File:** `src/components/practice/KeyInput/KeyInput.tsx`

**Performance-critical component. Must have deterministic render timing.**

```typescript
interface KeyInputProps {
  /** Whether this input is accepting keystrokes */
  active: boolean;
  /** Current typed buffer — displayed as key chips */
  typedBuffer: string[];
  /** Called on every keystroke with the new char */
  onKeyPress: (key: string, rawEvent: KeyboardEvent) => void;
  /** Called when sequence is considered complete (Enter or leader-sequence timeout) */
  onSequenceComplete: (sequence: string) => void;
  /** Called when user presses Escape to skip challenge */
  onSkip: () => void;
  /** Leader key symbol for detecting leader sequences */
  leaderKey: string;
  /** Expected sequence length hint — drives timeout strategy */
  expectedLength: number;
}
```

**Store subscriptions:** None — stateless with respect to stores. All state lives in `PracticeArena` via `practiceStore`.

**Memoized:** No — receives volatile `typedBuffer` and handler props.

**Responsibilities:**
- Attach `keydown` event listener to `window` (not to a DOM input element) to capture all keystrokes while `active`.
- Ignore modifier-only events (pure Ctrl/Shift/Alt/Cmd press without a key).
- Accumulate keystroke buffer and render typed chars as `KeySequence` chips with a blinking caret after the last chip.
- Detect multi-key sequence completion:
  - Leader sequences: wait up to 1000ms after leader key for subsequent keys; fire `onSequenceComplete` on timeout or when buffer reaches `expectedLength`.
  - Non-leader sequences: fire `onSequenceComplete` immediately when `typedBuffer.length === expectedLength`.
- ESC key: clear buffer and call `onSkip`.
- Show `key-input__caret` element with CSS `blink` animation.
- Prevent default on all captured keys to stop browser shortcuts.

---

### 2.4 FeedbackOverlay

**File:** `src/components/practice/FeedbackOverlay/FeedbackOverlay.tsx`

```typescript
type FeedbackState = 'idle' | 'correct' | 'incorrect';

interface FeedbackOverlayProps {
  state: FeedbackState;
  /** The correct answer sequence — shown on incorrect feedback */
  correctSequence?: string;
  /** How long the overlay remains visible before auto-dismissing (ms) */
  duration?: number;
  /** Called when overlay animation completes */
  onDismiss: () => void;
}
```

**Store subscriptions:** `settingsStore` — reads `animations_enabled`, `sounds_enabled`.

**Memoized:** No — state changes every challenge.

**Responsibilities:**
- Render an absolutely-positioned overlay covering `PracticeArena`.
- `correct` state: green background flash + checkmark icon, fade out after `duration` (default 400ms).
- `incorrect` state: red background flash + X icon + show correct answer as `KeySequence`, hold for 600ms.
- When `sounds_enabled`: play feedback audio via `AudioContext` (sine wave beep for correct, lower tone for incorrect). Audio is generated procedurally — no audio files required.
- When `animations_enabled === false`: skip CSS animation, show/hide instantly.
- Call `onDismiss` after animation completes using `animationend` event listener.
- Apply `aria-live="assertive"` for screen reader announcements.

---

### 2.5 SessionStats

**File:** `src/components/practice/SessionStats/SessionStats.tsx`

```typescript
interface SessionStatsProps {
  /** 0–100 */
  accuracy: number;
  /** Current correct streak */
  streak: number;
  /** Total score */
  score: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Total number of challenges in session */
  totalChallenges: number;
  /** Number of challenges answered (correct + incorrect) */
  answeredCount: number;
}
```

**Store subscriptions:** None — receives live data from `PracticeArena` which reads `practiceStore`.

**Memoized:** Yes — `React.memo`. Values update frequently; avoid cascade re-renders in sibling components.

**Responsibilities:**
- Render a horizontal stats bar below the challenge area.
- Accuracy: percentage displayed with color coding (`--success` above 80%, `--warning` 50-80%, `--error` below 50%).
- Streak: fire count with icon; highlight with `--accent` color when streak ≥ 5.
- Timer: format `elapsedMs` as `mm:ss` using `src/utils/formatTime.ts`.
- Score: integer display with `+` animation when score increments (CSS `@keyframes score-pop`).

---

### 2.6 SessionComplete

**File:** `src/components/practice/SessionComplete/SessionComplete.tsx`

```typescript
interface MissedKeymap {
  keymapId: string;
  description: string;
  sequence: string;
  attempts: number;
}

interface SessionCompleteProps {
  result: SessionResult;
  missedKeymaps: MissedKeymap[];
  onPracticeAgain: () => void;
  onGoToDashboard: () => void;
  onClose: () => void;
}
```

**Store subscriptions:** None.

**Memoized:** No — rendered once per session completion.

**Responsibilities:**
- Display session summary: accuracy (large number), streak high, total score, time taken.
- Render accuracy as a large percentage with color-coded ring.
- List top 5 missed keymaps with their correct sequences as `KeySequence` chips and attempt counts.
- Provide "Practice Again" and "Go to Dashboard" CTAs.
- Animate entry with slide-up + fade transition.
- Accessible: `role="region" aria-label="Session complete"`, focus on heading on mount.

---

### 2.7 ProgressIndicator

**File:** `src/components/practice/ProgressIndicator/ProgressIndicator.tsx`

```typescript
interface ProgressIndicatorProps {
  current: number;
  total: number;
  /** Current correct streak — used for streak fire visualization */
  streak: number;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Display "3 / 20" text counter.
- Render `ProgressBar` with `value={(current / total) * 100}` and `animated={true}`.
- When `streak >= 3`, render a streak indicator with fire icon and count.
- Positioned at top of practice arena.

---

## 3. Analytics Chart Components (`src/components/charts/`)

All chart components receive data via props from the Dashboard page. They do not subscribe to stores or make API calls.

### 3.1 AccuracyTrendChart

**File:** `src/components/charts/AccuracyTrendChart/AccuracyTrendChart.tsx`

```typescript
interface AccuracyDataPoint {
  date: string;
  accuracy: number;
  sessionCount: number;
}

interface AccuracyTrendChartProps {
  data: AccuracyDataPoint[];
  /** Number of days to display — default 30 */
  days?: number;
  loading?: boolean;
  height?: number;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`. Chart data is stable between queries.

**Responsibilities:**
- Render a Recharts `LineChart` with `accuracy` on Y axis (0–100%) and `date` on X axis.
- Use `--accent` (`#7C8CF8`) as line color.
- Render `ReferenceLine` at y=80 (target accuracy) with dashed style.
- Custom `Tooltip` showing date, accuracy %, session count.
- Custom `dot` shape: small filled circle, larger on hover.
- Show `Spinner` overlay when `loading`.
- Empty state when `data.length === 0`: render centered "No data yet" message.

---

### 3.2 ResponseTimeTrendChart

**File:** `src/components/charts/ResponseTimeTrendChart/ResponseTimeTrendChart.tsx`

```typescript
interface ResponseTimeDataPoint {
  date: string;
  /** Average response time in milliseconds */
  avgResponseTimeMs: number;
  /** Fastest response in the day */
  minResponseTimeMs: number;
}

interface ResponseTimeTrendChartProps {
  data: ResponseTimeDataPoint[];
  days?: number;
  loading?: boolean;
  height?: number;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render a Recharts `AreaChart` with `avgResponseTimeMs` as filled area and `minResponseTimeMs` as a secondary line.
- Y axis displays values in seconds (format: `{v / 1000}s`).
- Area fill: `--accent-muted` with 60% opacity.
- Goal: lower is better — show trend direction with arrow indicator in card header.

---

### 3.3 PracticeTimeChart

**File:** `src/components/charts/PracticeTimeChart/PracticeTimeChart.tsx`

```typescript
interface PracticeTimeDataPoint {
  date: string;
  /** Minutes practiced that day */
  minutes: number;
}

interface PracticeTimeChartProps {
  data: PracticeTimeDataPoint[];
  days?: number;
  loading?: boolean;
  height?: number;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render a Recharts `BarChart` with daily practice minutes.
- Bar color: `--accent` for days with ≥ `settingsStore.session_duration_minutes`, `--text-muted` for shorter sessions.
- Note: reads `settingsStore.session_duration_minutes` via `useSettingsStore()` — the one chart component that accesses a store, for the goal line.
- Show weekly average as `ReferenceLine`.
- X axis labels: abbreviated day names (`Mon`, `Tue`, etc.).

---

### 3.4 CategoryBreakdownChart

**File:** `src/components/charts/CategoryBreakdownChart/CategoryBreakdownChart.tsx`

```typescript
interface CategoryDataPoint {
  category: string;
  accuracy: number;
  practiceCount: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryDataPoint[];
  loading?: boolean;
  height?: number;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render a Recharts `RadarChart` with categories on axes and accuracy as the value.
- Fill: `--accent` at 30% opacity, stroke `--accent`.
- Category labels formatted with ellipsis truncation at 12 chars.
- Legend below chart showing category names with colored dots.

---

### 3.5 MostMissedTable

**File:** `src/components/charts/MostMissedTable/MostMissedTable.tsx`

```typescript
interface MissedEntry {
  rank: number;
  keymapId: string;
  description: string;
  sequence: string;
  category: string;
  accuracy: number;
  attemptCount: number;
}

interface MostMissedTableProps {
  entries: MissedEntry[];
  /** Maximum rows to display — default 10 */
  limit?: number;
  loading?: boolean;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render a ranked table: rank → description → `KeySequence` chip → category `Badge` → accuracy bar → attempt count.
- Accuracy bar: inline `ProgressBar` (height 4px) with `error` variant for accuracy < 50%, `warning` for < 80%.
- Sort by accuracy ascending (worst first).
- `role="table"` with proper `thead`/`tbody` semantics.
- No pagination — limit controlled by prop.

---

### 3.6 MasteryScoreGauge

**File:** `src/components/charts/MasteryScoreGauge/MasteryScoreGauge.tsx`

**This is a custom SVG component — does NOT use Recharts.**

```typescript
interface MasteryScoreGaugeProps {
  /** 0–1000 mastery score */
  score: number;
  /** Previous score for delta display */
  previousScore?: number;
  loading?: boolean;
  /** SVG size in px — default 200 */
  size?: number;
}
```

**Store subscriptions:** None.

**Memoized:** Yes — `React.memo`.

**Responsibilities:**
- Render a semicircular SVG gauge (180° arc from 7 o'clock to 5 o'clock).
- Track arc: thin `--border-subtle` stroke, full semicircle.
- Fill arc: colored stroke from 0 to `(score / 1000) * 180°`.
  - 0–300: `--error`
  - 300–600: `--warning`
  - 600–800: `--accent`
  - 800–1000: `--success`
- Score number in center: large `--text-5xl` `--font-sans`.
- Delta indicator below score: `+12` in `--success` or `-5` in `--error` with arrow.
- CSS transition on arc `stroke-dashoffset` for animated fill on mount.
- Accessible: `role="img" aria-label="Mastery score: {score} out of 1000"`.

---

## 4. Layout Components (`src/components/layout/`)

### 4.1 AppShell

**File:** `src/components/layout/AppShell/AppShell.tsx`

```typescript
interface AppShellProps {
  children: React.ReactNode;
}
```

**Store subscriptions:**
- `uiStore` — `isSidebarOpen` for conditional layout class
- `settingsStore` — `theme` to apply `<html>` class (handled in `useStoreHydration`, not here)

**Memoized:** No — shell re-renders only on route change.

**Responsibilities:**
- Root layout: `<div class="app-shell">` with CSS Grid (`sidebar + main` columns).
- Render `Sidebar` and `<main class="app-shell__main">` with `children`.
- Apply `app-shell--sidebar-collapsed` class when `!isSidebarOpen`.
- Handle `Cmd+/` (macOS) / `Ctrl+/` (Windows/Linux) to toggle sidebar via `uiStore.toggleSidebar`.

---

### 4.2 Sidebar

**File:** `src/components/layout/Sidebar/Sidebar.tsx`

```typescript
interface SidebarProps {
  /** Provided by AppShell — not used by consumers directly */
  isCollapsed?: boolean;
}
```

**Store subscriptions:**
- `uiStore` — `isSidebarOpen`, `toggleSidebar`
- `authStore` — `user`, `isGuest`

**Memoized:** No.

**Responsibilities:**
- Render navigation links: Practice, Dashboard, Import, Profile, Settings.
- Highlight active route with `aria-current="page"` and `.nav-link--active` class.
- Show `Avatar` + username at bottom when authenticated; "Guest" badge when `isGuest`.
- Keyboard shortcut: `Cmd+/` or `Ctrl+/` triggers collapse.
- Collapsed state: show only icon, hide text labels (CSS width transition).
- Show streak counter in sidebar nav when user is authenticated.
- `aria-label="Main navigation"`, `role="navigation"`.

---

### 4.3 TopBar

**File:** `src/components/layout/TopBar/TopBar.tsx`

```typescript
interface TopBarProps {
  /** Page heading — shown in top bar */
  title: string;
  /** Breadcrumb path segments */
  breadcrumb?: Array<{ label: string; href?: string }>;
  /** Action buttons rendered on the right side */
  actions?: React.ReactNode;
}
```

**Store subscriptions:**
- `authStore` — `user` for user menu
- `uiStore` — for toast trigger and keyboard shortcut display

**Memoized:** Yes — `React.memo`. Title changes only on route change.

**Responsibilities:**
- Render page title and optional breadcrumb on left.
- Render action slot on right (e.g., "Start Session" button on Dashboard).
- Show keyboard shortcut hint display: current global shortcuts.
- Mobile: show hamburger to open sidebar as drawer.

---

### 4.4 PageLayout

**File:** `src/components/layout/PageLayout/PageLayout.tsx`

```typescript
interface PageLayoutProps {
  title: string;
  description?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  /** Remove max-width constraint — useful for practice arena */
  fullWidth?: boolean;
  children: React.ReactNode;
}
```

**Store subscriptions:** None.

**Memoized:** No.

**Responsibilities:**
- Render `TopBar` with `title`, `breadcrumb`, `actions`.
- Wrap `children` in `<div class="page-layout__content">` with optional `page-layout--full-width` modifier.
- Set document title via `useEffect`: `document.title = \`${title} | VimTrainer\``.
- Max-width: `1200px` centered by default.

---

## 5. Component Tree (Route-Level Overview)

```
RouterProvider
└── AppShell
    ├── Sidebar
    └── Routes
        ├── "/" → LandingPage (no AppShell)
        ├── "/practice" → PageLayout → PracticeArena
        │   ├── ProgressIndicator
        │   ├── ChallengeDisplay
        │   ├── KeyInput
        │   ├── FeedbackOverlay
        │   ├── SessionStats
        │   └── SessionComplete (conditional)
        ├── "/practice/motions" → PageLayout → PracticeArena (mode="motions")
        ├── "/practice/leader" → PageLayout → PracticeArena (mode="leader")
        ├── "/practice/flashcards" → PageLayout → FlashcardDeck
        ├── "/import" → PageLayout → ImportPage
        ├── "/dashboard" → PageLayout
        │   ├── MasteryScoreGauge
        │   ├── AccuracyTrendChart
        │   ├── ResponseTimeTrendChart
        │   ├── PracticeTimeChart
        │   ├── CategoryBreakdownChart
        │   └── MostMissedTable
        ├── "/profile" → PageLayout → ProfilePage
        ├── "/settings" → PageLayout → SettingsPage
        └── "/auth/*" → AuthLayout → LoginPage | RegisterPage
```

---

## 6. Memoization Policy Summary

| Component | Memoized | Reason |
|-----------|----------|--------|
| Button | Yes | Pure presentational |
| Input | Yes | Pure presentational |
| Badge | Yes | Pure presentational |
| Card | Yes | Pure presentational |
| Modal | No | State drives content |
| Tooltip | Yes | Pure presentational |
| KeySequence | Yes | Sequence strings stable |
| ProgressBar | Yes | Pure presentational |
| Avatar | Yes | Name/src stable |
| Spinner | Yes | Pure presentational |
| PracticeArena | No | Session root |
| ChallengeDisplay | Yes | Props stable per challenge |
| KeyInput | No | Handler props volatile |
| FeedbackOverlay | No | State changes every challenge |
| SessionStats | Yes | Avoid cascade from frequent timer updates |
| SessionComplete | No | One-shot render |
| ProgressIndicator | Yes | Simple numeric props |
| All chart components | Yes | Data stable between queries |
| AppShell | No | Route root |
| Sidebar | No | Auth state changes |
| TopBar | Yes | Title stable per route |
| PageLayout | No | Composes TopBar |
