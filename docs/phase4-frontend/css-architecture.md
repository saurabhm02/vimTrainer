# VimTrainer CSS Architecture

**Version**: 1.0
**Last Updated**: 2026-06-16
**Status**: Production Reference

---

## 1. CSS File Listing (`src/styles/`)

```
src/styles/
├── tokens.css           # ALL CSS custom properties — the single source of truth
├── reset.css            # CSS reset (normalize + opinionated defaults)
├── base.css             # Global element styles (body, html, *, headings, links)
├── typography.css       # Font loading, text utilities (.text-muted, .truncate, etc.)
├── layout.css           # Grid and flex utility classes, spacing helpers
├── animations.css       # ALL @keyframes definitions used application-wide
│
├── components/
│   ├── button.css       # .btn component with all variants and sizes
│   ├── input.css        # .input component with label, helper text, variants
│   ├── badge.css        # .badge component
│   ├── card.css         # .card component with header/body/footer slots
│   ├── modal.css        # .modal component, backdrop, panel animations
│   ├── tooltip.css      # .tooltip component
│   ├── key-chip.css     # .key-chip and .key-sequence — the hero visual element
│   ├── progress-bar.css # .progress-bar component
│   ├── avatar.css       # .avatar component
│   ├── spinner.css      # .spinner component
│   ├── sidebar.css      # .sidebar component
│   ├── topbar.css       # .topbar component
│   ├── app-shell.css    # .app-shell grid layout
│   ├── page-layout.css  # .page-layout wrapper
│   ├── toast.css        # .toast-container and .toast notifications
│   └── page-skeleton.css# .page-skeleton loading placeholders
│
├── pages/
│   ├── practice.css     # .practice-arena and all sub-components — hero UI
│   ├── dashboard.css    # .dashboard-page grid layout
│   ├── import.css       # .import-page layout
│   ├── auth.css         # .auth-layout centered card
│   └── landing.css      # .landing-page full-screen layout
│
└── index.css            # Imports all other CSS files in correct order
```

### Import Order in `src/styles/index.css`

```css
/* 1. Design tokens — must be first */
@import './tokens.css';

/* 2. Reset and base */
@import './reset.css';
@import './base.css';
@import './typography.css';
@import './layout.css';
@import './animations.css';

/* 3. Components */
@import './components/button.css';
@import './components/input.css';
@import './components/badge.css';
@import './components/card.css';
@import './components/modal.css';
@import './components/tooltip.css';
@import './components/key-chip.css';
@import './components/progress-bar.css';
@import './components/avatar.css';
@import './components/spinner.css';
@import './components/sidebar.css';
@import './components/topbar.css';
@import './components/app-shell.css';
@import './components/page-layout.css';
@import './components/toast.css';
@import './components/page-skeleton.css';

/* 4. Page-level styles */
@import './pages/landing.css';
@import './pages/auth.css';
@import './pages/practice.css';
@import './pages/dashboard.css';
@import './pages/import.css';
```

And in `src/main.tsx`:

```tsx
import './styles/index.css';
```

---

## 2. CSS Architecture Rules

### 2.1 Naming Convention (BEM-Lite)

We use a simplified BEM where:
- **Block**: component name (`.practice-arena`, `.key-chip`, `.sidebar`)
- **Element**: `block__element` (`.sidebar__nav`, `.key-chip__label`)
- **Modifier**: `block--modifier` (`.btn--primary`, `.practice-arena--correct`)

Rules:
- Never nest more than one level deep in class names: `.card__header__title` is wrong. Use `.card__title` instead.
- Modifiers always combine with the base: `<div class="card card--elevated">`, never `<div class="card--elevated">` alone.
- No utility class overrides — if a component needs a different size, add a modifier. Never add `margin-top: 20px` via an inline style or utility class from outside.

### 2.2 CSS Custom Properties Everywhere

- Every color, spacing, typography, and animation value must reference a token from `tokens.css`.
- Never write raw hex values in component CSS files — always `var(--color-token)`.
- Never write raw px values for colors or sizes that belong on the spacing scale — always `var(--space-N)`.
- Exception: `0` (zero) and `100%` do not need tokens.

### 2.3 No CSS Modules

The project uses global CSS files, not CSS Modules. This is intentional:
- CSS custom properties provide scoping via naming.
- No `.module.css` files.
- No CSS-in-JS (no `styled-components`, no `emotion`, no `@vanilla-extract`).
- No Tailwind utility classes.

Component CSS lives in `src/styles/components/` and is imported once via `index.css`.

### 2.4 Performance Rules

```css
/* Use will-change only for elements that are actually animating */
.practice-arena {
  will-change: background-color;  /* Set during active session, removed after */
}

/* Contain layout on the practice arena — its children's layout cannot affect ancestors */
.practice-arena {
  contain: layout style;
}

/* Never animate width/height — animate transform instead */
/* BAD: */
.bad-animation { transition: width 200ms; }
/* GOOD: */
.good-animation { transition: transform 200ms; }

/* No CSS-in-JS — no runtime style injection */
/* All styles resolved at build time */
```

---

## 3. Complete Practice Arena CSS

The hero UI. Full-screen centered layout with all interactive states.

**File:** `src/styles/pages/practice.css`

```css
/* ═══════════════════════════════════════════════════════
   PRACTICE ARENA — Root container
   ═══════════════════════════════════════════════════════ */

.practice-arena {
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  min-height:      calc(100vh - var(--space-15));  /* Full height minus topbar */
  padding:         var(--space-10) var(--space-6);
  background-color: var(--bg-base);

  /* Contain layout — children cannot affect ancestors */
  contain: layout style;

  /* Smooth background transitions for feedback states */
  transition:
    background-color var(--duration-correct) var(--ease-out),
    border-color     var(--duration-fast) var(--ease-out);

  border: 2px solid transparent;  /* Reserve space for feedback border */
}

/* Correct answer state */
.practice-arena--correct {
  animation:
    feedback-correct-pulse var(--duration-correct) var(--ease-out) forwards,
    feedback-correct-border var(--duration-correct) var(--ease-out) forwards;
  /* No will-change — background-color/border-color are repaint properties, not composited */
}

/* Incorrect answer state */
.practice-arena--incorrect {
  animation:
    feedback-incorrect-shake 350ms var(--ease-out),
    feedback-incorrect-bg    var(--duration-wrong) var(--ease-default) forwards;
  will-change: transform;  /* translateX shake is composited; background-color is not */
}

/* ═══════════════════════════════════════════════════════
   PROGRESS INDICATOR — Top of arena
   ═══════════════════════════════════════════════════════ */

.practice-arena__progress {
  width:         100%;
  max-width:     var(--arena-max-width);
  margin-bottom: var(--space-8);
}

.progress-indicator {
  display:         flex;
  flex-direction:  column;
  gap:             var(--space-2);
}

.progress-indicator__header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
}

.progress-indicator__counter {
  font-family:    var(--font-mono);
  font-size:      var(--text-sm);
  font-weight:    var(--font-medium);
  color:          var(--text-secondary);
  letter-spacing: var(--tracking-wide);
}

.progress-indicator__streak {
  display:     inline-flex;
  align-items: center;
  gap:         var(--space-1);
  font-size:   var(--text-sm);
  font-weight: var(--font-semibold);
  color:       var(--warning);
}

.progress-indicator__streak-icon {
  font-size: var(--text-base);
}

/* ═══════════════════════════════════════════════════════
   CHALLENGE DISPLAY — Hero text area
   ═══════════════════════════════════════════════════════ */

.practice-arena__challenge {
  width:         100%;
  max-width:     var(--arena-max-width);
  text-align:    center;
  margin-bottom: var(--space-10);
}

.challenge-display {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            var(--space-4);
}

.challenge-display__meta {
  display:     flex;
  align-items: center;
  gap:         var(--space-2);
}

.challenge-display__description {
  font-family:    var(--font-sans);
  font-size:      var(--text-4xl);
  font-weight:    var(--font-semibold);
  color:          var(--text-primary);
  line-height:    var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  margin:         0;
  text-wrap:      balance;  /* even line breaks for multi-word descriptions */

  /* Smooth text color transition for feedback */
  transition: color var(--duration-fast) var(--ease-out);
}

/* Feedback state text colors */
.challenge-display--correct .challenge-display__description {
  color: var(--success);
}

.challenge-display--incorrect .challenge-display__description {
  color: var(--error);
}

/* ═══════════════════════════════════════════════════════
   KEY INPUT — Keystroke capture area
   ═══════════════════════════════════════════════════════ */

.practice-arena__input {
  width:         100%;
  max-width:     var(--arena-max-width);
  margin-bottom: var(--space-8);
}

.key-input {
  display:         flex;
  align-items:     center;
  justify-content: center;
  min-height:      56px;
  padding:         var(--space-3) var(--space-6);
  background-color: var(--bg-surface);
  border:          1px solid var(--border-default);
  border-radius:   var(--radius-lg);
  gap:             var(--space-2);

  transition:
    border-color  var(--duration-fast) var(--ease-out),
    box-shadow    var(--duration-fast) var(--ease-out);
}

/* Focus state — keyboard is actively capturing */
.key-input--active {
  border-color: var(--border-accent);
  box-shadow:   0 0 0 3px var(--input-focus-ring-color);  /* theme-adaptive via color-mix token */
}

.key-input--idle {
  border-color: var(--border-subtle);
}

/* Empty state prompt */
.key-input__prompt {
  font-family:    var(--font-mono);
  font-size:      var(--text-sm);
  color:          var(--text-muted);
  letter-spacing: var(--tracking-wide);
  user-select:    none;
}

/* Blinking caret */
.key-input__caret {
  display:          inline-block;
  width:            2px;
  height:           24px;
  background-color: var(--accent);
  border-radius:    1px;
  animation:        caret-blink 1s linear infinite;
  flex-shrink:      0;
}

/* Hint text when session is idle */
.key-input__hint {
  font-family: var(--font-sans);
  font-size:   var(--text-xs);
  color:       var(--text-muted);
  text-align:  center;
  margin-top:  var(--space-2);
}

/* Feedback state borders */
.key-input--correct {
  border-color:     var(--success);
  background-color: var(--success-muted);
}

.key-input--incorrect {
  border-color:     var(--error);
  background-color: var(--error-muted);
}

/* ═══════════════════════════════════════════════════════
   FEEDBACK OVERLAY — Full-arena flash
   ═══════════════════════════════════════════════════════ */

.feedback-overlay {
  position:      absolute;
  inset:         0;
  display:       flex;
  flex-direction:column;
  align-items:   center;
  justify-content:center;
  gap:           var(--space-4);
  pointer-events:none;
  z-index:       var(--z-raised);
  border-radius: inherit;
}

.feedback-overlay--correct {
  background-color: var(--success-muted);
  animation: feedback-correct-pulse var(--duration-correct) var(--ease-out) forwards;
}

.feedback-overlay--incorrect {
  background-color: var(--error-muted);
  animation: feedback-incorrect-bg var(--duration-wrong) var(--ease-default) forwards;
}

.feedback-overlay__icon {
  font-size: 48px;
  line-height: 1;
}

.feedback-overlay__message {
  font-family: var(--font-sans);
  font-size:   var(--text-lg);
  font-weight: var(--font-semibold);
}

.feedback-overlay--correct  .feedback-overlay__message { color: var(--success); }
.feedback-overlay--incorrect .feedback-overlay__message { color: var(--error); }

/* Correct answer display for incorrect feedback */
.feedback-overlay__correct-answer {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            var(--space-2);
}

.feedback-overlay__correct-label {
  font-family:    var(--font-sans);
  font-size:      var(--text-sm);
  color:          var(--text-secondary);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

/* ═══════════════════════════════════════════════════════
   SESSION STATS — Bottom stats bar
   ═══════════════════════════════════════════════════════ */

.practice-arena__stats {
  width:         100%;
  max-width:     var(--arena-max-width);
  margin-top:    auto;  /* Push to bottom */
}

.session-stats {
  display:          grid;
  grid-template-columns: repeat(4, 1fr);
  gap:              var(--space-1);
  background-color: var(--bg-surface);
  border:           1px solid var(--border-subtle);
  border-radius:    var(--radius-lg);
  padding:          var(--space-3) var(--space-4);
}

.session-stats__item {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            2px;
  padding:        var(--space-2) var(--space-3);
  border-right:   1px solid var(--border-subtle);
}

.session-stats__item:last-child {
  border-right: none;
}

.session-stats__label {
  font-family:    var(--font-sans);
  font-size:      var(--text-xs);
  font-weight:    var(--font-medium);
  color:          var(--text-muted);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  white-space:    nowrap;
}

.session-stats__value {
  font-family:    var(--font-mono);
  font-size:      var(--text-xl);
  font-weight:    var(--font-bold);
  color:          var(--text-primary);
  line-height:    1;
}

/* Accuracy color coding */
.session-stats__value--accuracy-high   { color: var(--success); }  /* >= 80% */
.session-stats__value--accuracy-medium { color: var(--warning); }  /* 50-79% */
.session-stats__value--accuracy-low    { color: var(--error); }    /* < 50%  */

/* Streak highlight */
.session-stats__value--streak-active { color: var(--accent); }

/* Score pop animation trigger */
.session-stats__value--popping {
  animation: score-pop 300ms var(--ease-spring);
}

.session-stats__timer {
  font-family:    var(--font-mono);
  font-size:      var(--text-xl);
  font-weight:    var(--font-bold);
  color:          var(--text-secondary);
  line-height:    1;
}

/* ═══════════════════════════════════════════════════════
   SESSION COMPLETE — End-of-session results
   ═══════════════════════════════════════════════════════ */

.session-complete {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            var(--space-8);
  max-width:      var(--arena-max-width);
  width:          100%;
  animation:      modal-panel-in var(--duration-slow) var(--ease-out);
}

.session-complete__heading {
  font-family:    var(--font-sans);
  font-size:      var(--text-2xl);
  font-weight:    var(--font-bold);
  color:          var(--text-primary);
  margin:         0;
  letter-spacing: var(--tracking-tight);
}

.session-complete__accuracy {
  font-family:    var(--font-sans);
  font-size:      var(--text-5xl);
  font-weight:    var(--font-bold);
  line-height:    1;
  letter-spacing: var(--tracking-tight);
}

.session-complete__accuracy--high   { color: var(--success); }
.session-complete__accuracy--medium { color: var(--warning); }
.session-complete__accuracy--low    { color: var(--error); }

.session-complete__stats-grid {
  display:               grid;
  grid-template-columns: repeat(3, 1fr);
  gap:                   var(--space-4);
  width:                 100%;
}

.session-complete__stat-card {
  background-color: var(--bg-surface);
  border:           1px solid var(--border-subtle);
  border-radius:    var(--radius-lg);
  padding:          var(--space-4);
  text-align:       center;
}

.session-complete__stat-label {
  font-size:      var(--text-xs);
  color:          var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  margin-bottom:  var(--space-1);
}

.session-complete__stat-value {
  font-family: var(--font-mono);
  font-size:   var(--text-2xl);
  font-weight: var(--font-bold);
  color:       var(--text-primary);
}

.session-complete__missed {
  width: 100%;
}

.session-complete__missed-heading {
  font-size:      var(--text-base);
  font-weight:    var(--font-semibold);
  color:          var(--text-secondary);
  margin-bottom:  var(--space-3);
}

.session-complete__missed-list {
  display:        flex;
  flex-direction: column;
  gap:            var(--space-2);
  list-style:     none;
  padding:        0;
  margin:         0;
}

.session-complete__missed-item {
  display:          flex;
  align-items:      center;
  justify-content:  space-between;
  padding:          var(--space-3) var(--space-4);
  background-color: var(--bg-surface);
  border:           1px solid var(--border-subtle);
  border-radius:    var(--radius-md);
}

.session-complete__missed-description {
  font-size:    var(--text-sm);
  color:        var(--text-primary);
  flex:         1;
  margin-right: var(--space-4);
  overflow:     hidden;
  text-overflow:ellipsis;
  white-space:  nowrap;
}

.session-complete__missed-attempts {
  font-size:  var(--text-xs);
  color:      var(--text-muted);
  white-space: nowrap;
}

.session-complete__actions {
  display: flex;
  gap:     var(--space-3);
}

/* ═══════════════════════════════════════════════════════
   PRACTICE CONFIG — Mode/length selector (before session)
   ═══════════════════════════════════════════════════════ */

.practice-config {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            var(--space-8);
  max-width:      var(--arena-max-width);
  width:          100%;
}

.practice-config__heading {
  font-family:    var(--font-sans);
  font-size:      var(--text-2xl);
  font-weight:    var(--font-bold);
  color:          var(--text-primary);
  text-align:     center;
  letter-spacing: var(--tracking-tight);
}

.practice-config__options {
  display:               grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap:                   var(--space-3);
  width:                 100%;
}

.practice-config__length-option {
  display:          flex;
  align-items:      center;
  justify-content:  center;
  height:           48px;
  background-color: var(--bg-surface);
  border:           1px solid var(--border-default);
  border-radius:    var(--radius-md);
  font-family:      var(--font-mono);
  font-size:        var(--text-md);
  font-weight:      var(--font-semibold);
  color:            var(--text-secondary);
  cursor:           pointer;
  transition:
    background-color var(--duration-fast) var(--ease-default),
    border-color     var(--duration-fast) var(--ease-default),
    color            var(--duration-fast) var(--ease-default);
}

.practice-config__length-option:hover {
  background-color: var(--bg-elevated);
  border-color:     var(--border-strong);
  color:            var(--text-primary);
}

.practice-config__length-option--selected {
  background-color: var(--accent-muted);
  border-color:     var(--accent);
  color:            var(--accent);
}
```

---

## 4. Complete `src/styles/tokens.css`

```css
/* ═══════════════════════════════════════════════════════
   VIMTRAINER DESIGN TOKENS
   Single source of truth for all visual values.
   Dark theme is default. Light theme overrides in html.light {}.
   ═══════════════════════════════════════════════════════ */

:root {

  /* ──────────────────────────────────────────────────
     BACKGROUND SCALE
     ────────────────────────────────────────────────── */
  --bg-base:     #0D0D0D;
  --bg-surface:  #141414;
  --bg-elevated: #1C1C1C;
  --bg-overlay:  #242424;

  /* ──────────────────────────────────────────────────
     TEXT SCALE
     ────────────────────────────────────────────────── */
  --text-primary:   #E8E8E8;
  --text-secondary: #A0A0A0;
  --text-muted:     #606060;
  --text-disabled:  #404040;

  /* ──────────────────────────────────────────────────
     BRAND / ACCENT
     ────────────────────────────────────────────────── */
  --accent:       #7C8CF8;
  --accent-hover: #6B7AF0;
  --accent-muted: #2A2D4A;

  /* ──────────────────────────────────────────────────
     SEMANTIC COLORS
     ────────────────────────────────────────────────── */
  --success:       #4ADE80;
  --success-muted: #0F2A1A;
  --error:         #F87171;
  --error-muted:   #2A0F0F;
  --warning:       #FBBF24;
  --warning-muted: #2A1F0A;

  /* ──────────────────────────────────────────────────
     KEY CHIPS
     ────────────────────────────────────────────────── */
  --key-bg:     #1E1E1E;
  --key-border: #3A3A3A;
  --key-shadow: #000000;
  --key-text:   #E8E8E8;

  --key-leader-bg:     #2A2D4A;
  --key-leader-border: #4A4F8A;
  --key-leader-text:   #7C8CF8;

  --key-modifier-bg:     #1A1A1A;
  --key-modifier-border: #333333;
  --key-modifier-text:   #A0A0A0;

  --key-special-bg:     #1E1E1E;
  --key-special-border: #3A3A3A;
  --key-special-text:   #E8E8E8;

  /* ──────────────────────────────────────────────────
     BORDERS
     ────────────────────────────────────────────────── */
  --border-subtle:  #1F1F1F;
  --border-default: #2A2A2A;
  --border-strong:  #3A3A3A;
  --border-accent:  #7C8CF8;

  --border-width:        1px;
  --border-width-medium: 2px;
  --border-width-thick:  3px;

  /* ──────────────────────────────────────────────────
     BORDER RADIUS
     ────────────────────────────────────────────────── */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-full: 9999px;

  /* ──────────────────────────────────────────────────
     SHADOWS
     ────────────────────────────────────────────────── */
  --shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
  --shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
  --shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  --shadow-key: 0 3px 0 0 var(--key-shadow);

  /* ──────────────────────────────────────────────────
     TYPOGRAPHY — FONT FAMILIES
     ────────────────────────────────────────────────── */
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono',
               'Roboto Mono', Menlo, Monaco, Consolas, 'Courier New', monospace;

  /* ──────────────────────────────────────────────────
     TYPOGRAPHY — SIZE SCALE
     ────────────────────────────────────────────────── */
  --text-xs:   0.6875rem;  /* 11px */
  --text-sm:   0.8125rem;  /* 13px */
  --text-base: 0.9375rem;  /* 15px */
  --text-md:   1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-4xl:  2.25rem;    /* 36px */
  --text-5xl:  3rem;       /* 48px */

  /* ──────────────────────────────────────────────────
     TYPOGRAPHY — LINE HEIGHTS
     ────────────────────────────────────────────────── */
  --leading-tight:   1.2;
  --leading-snug:    1.35;
  --leading-normal:  1.5;
  --leading-relaxed: 1.65;

  /* ──────────────────────────────────────────────────
     TYPOGRAPHY — LETTER SPACING
     ────────────────────────────────────────────────── */
  --tracking-tight:  -0.025em;
  --tracking-normal:  0em;
  --tracking-wide:    0.05em;
  --tracking-wider:   0.1em;

  /* ──────────────────────────────────────────────────
     TYPOGRAPHY — FONT WEIGHTS
     ────────────────────────────────────────────────── */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* ──────────────────────────────────────────────────
     SPACING — 4px base grid
     ────────────────────────────────────────────────── */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-7:  28px;
  --space-8:  32px;
  --space-9:  36px;
  --space-10: 40px;
  --space-11: 44px;
  --space-12: 48px;
  --space-13: 52px;
  --space-14: 56px;
  --space-15: 60px;
  --space-16: 64px;

  /* ──────────────────────────────────────────────────
     MOTION
     ────────────────────────────────────────────────── */
  --duration-instant: 0ms;
  --duration-fast:    100ms;
  --duration-normal:  200ms;
  --duration-slow:    350ms;
  --duration-correct: 400ms;
  --duration-wrong:   600ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-linear:  linear;

  /* ──────────────────────────────────────────────────
     Z-INDEX SCALE
     ────────────────────────────────────────────────── */
  --z-base:     0;
  --z-raised:  10;
  --z-dropdown:100;
  --z-sidebar: 200;
  --z-topbar:  300;
  --z-modal:   400;
  --z-toast:   500;
  --z-tooltip: 600;

  /* ──────────────────────────────────────────────────
     COMPONENT TOKENS — BUTTON
     ────────────────────────────────────────────────── */
  --btn-height-sm: 32px;
  --btn-height-md: 40px;
  --btn-height-lg: 48px;

  --btn-padding-x-sm: var(--space-3);
  --btn-padding-x-md: var(--space-4);
  --btn-padding-x-lg: var(--space-6);

  --btn-font-size-sm: var(--text-sm);
  --btn-font-size-md: var(--text-base);
  --btn-font-size-lg: var(--text-md);

  --btn-border-radius: var(--radius-md);
  --btn-font-weight:   var(--font-medium);

  --btn-primary-bg:        var(--accent);
  --btn-primary-bg-hover:  var(--accent-hover);
  --btn-primary-text:      #FFFFFF;

  --btn-secondary-bg:       transparent;
  --btn-secondary-bg-hover: var(--bg-overlay);
  --btn-secondary-text:     var(--text-primary);
  --btn-secondary-border:   var(--border-default);

  --btn-ghost-bg:       transparent;
  --btn-ghost-bg-hover: var(--bg-overlay);
  --btn-ghost-text:     var(--text-secondary);

  --btn-danger-bg:       var(--error);
  --btn-danger-bg-hover: #E66060;
  --btn-danger-text:     #FFFFFF;

  --btn-focus-ring: 0 0 0 2px var(--bg-base), 0 0 0 4px var(--accent);

  /* ──────────────────────────────────────────────────
     COMPONENT TOKENS — INPUT
     ────────────────────────────────────────────────── */
  --input-height:           40px;
  --input-padding-x:        var(--space-3);
  --input-font-size:        var(--text-base);
  --input-border-radius:    var(--radius-md);
  --input-bg:               var(--bg-surface);
  --input-border:           var(--border-default);
  --input-border-hover:     var(--border-strong);
  --input-border-focus:     var(--accent);
  --input-border-error:     var(--error);
  --input-border-success:   var(--success);
  --input-text:             var(--text-primary);
  --input-placeholder:      var(--text-muted);
  --input-focus-ring:       0 0 0 3px rgba(124, 140, 248, 0.2);
  --input-disabled-bg:      var(--bg-base);
  --input-disabled-text:    var(--text-disabled);
  --input-label-size:       var(--text-sm);
  --input-label-weight:     var(--font-medium);
  --input-label-color:      var(--text-secondary);
  --input-helper-size:      var(--text-sm);
  --input-helper-color:     var(--text-muted);

  /* ──────────────────────────────────────────────────
     COMPONENT TOKENS — CARD
     ────────────────────────────────────────────────── */
  --card-bg:            var(--bg-surface);
  --card-border:        var(--border-subtle);
  --card-border-radius: var(--radius-lg);
  --card-padding:       var(--space-6);
  --card-gap:           var(--space-4);
  --card-elevated-bg:   var(--bg-elevated);

  /* ──────────────────────────────────────────────────
     COMPONENT TOKENS — PRACTICE ARENA
     ────────────────────────────────────────────────── */
  --arena-bg:              var(--bg-base);
  --arena-challenge-size:  var(--text-4xl);
  --arena-challenge-color: var(--text-primary);
  --arena-stats-bg:        var(--bg-surface);
  --arena-stats-border:    var(--border-subtle);
  --arena-progress-height: 3px;
  --arena-max-width:       680px;

  /* ──────────────────────────────────────────────────
     AVATAR COLORS (deterministic from name.charCodeAt(0) % 8)
     ────────────────────────────────────────────────── */
  --avatar-color-0: #7C8CF8;
  --avatar-color-1: #4ADE80;
  --avatar-color-2: #FBBF24;
  --avatar-color-3: #F87171;
  --avatar-color-4: #34D399;
  --avatar-color-5: #A78BFA;
  --avatar-color-6: #60A5FA;
  --avatar-color-7: #FB923C;

  /* ──────────────────────────────────────────────────
     BREAKPOINTS (used in CSS @media queries as reference)
     ────────────────────────────────────────────────── */
  --bp-sm:  640px;
  --bp-md:  768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}

/* ═══════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   Applied when <html class="light"> is set by applyTheme()
   ═══════════════════════════════════════════════════════ */

html.light {
  --bg-base:     #FAFAFA;
  --bg-surface:  #FFFFFF;
  --bg-elevated: #F4F4F5;
  --bg-overlay:  #EBEBEC;

  --text-primary:   #111111;
  --text-secondary: #525252;
  --text-muted:     #A1A1AA;
  --text-disabled:  #D4D4D8;

  --border-subtle:  #F0F0F0;
  --border-default: #E4E4E7;
  --border-strong:  #D1D1D6;

  --key-bg:     #F1F1F1;
  --key-border: #D0D0D0;
  --key-shadow: #B0B0B0;
  --key-text:   #1A1A1A;

  --key-leader-bg:     #EEF0FF;
  --key-leader-border: #C7CDF8;
  --key-leader-text:   #4B5EE8;

  --key-modifier-bg:     #F5F5F5;
  --key-modifier-border: #DCDCDC;
  --key-modifier-text:   #525252;

  --key-special-bg:     #F1F1F1;
  --key-special-border: #D0D0D0;
  --key-special-text:   #1A1A1A;

  --accent-muted: #ECEEFF;

  --success-muted: #F0FDF4;
  --error-muted:   #FEF2F2;
  --warning-muted: #FFFBEB;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
  --shadow-key: 0 3px 0 0 var(--key-shadow);

  --card-bg: #FFFFFF;
  --input-bg: #FFFFFF;
  --arena-bg: #FAFAFA;
  --arena-stats-bg: #FFFFFF;
}
```

---

## 5. Responsive Strategy

### 5.1 Breakpoints

```css
/* Mobile first — base styles target mobile */

/* sm: 640px — tablets, large phones landscape */
@media (min-width: 640px) { }

/* md: 768px — small laptops, large tablets */
@media (min-width: 768px) { }

/* lg: 1024px — desktop */
@media (min-width: 1024px) { }

/* xl: 1280px — large desktop */
@media (min-width: 1280px) { }
```

### 5.2 Practice Arena Responsive Behavior

```css
/* Mobile (<640px) */
.practice-arena {
  padding: var(--space-6) var(--space-4);
}

.challenge-display__description {
  font-size: var(--text-2xl);  /* Reduce from 4xl on mobile */
}

.session-stats {
  grid-template-columns: repeat(2, 1fr);  /* 2 columns on mobile */
}

/* Desktop (>=640px) */
@media (min-width: 640px) {
  .practice-arena {
    padding: var(--space-10) var(--space-6);
  }

  .challenge-display__description {
    font-size: var(--text-4xl);  /* Full size on desktop */
  }

  .session-stats {
    grid-template-columns: repeat(4, 1fr);  /* 4 columns on desktop */
  }
}
```

### 5.3 Sidebar Mobile Behavior

```css
/* Mobile: sidebar is a drawer overlay */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: var(--z-sidebar);
    transform: translateX(-100%);
    transition: transform var(--duration-normal) var(--ease-out);
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .app-shell__main {
    margin-left: 0;  /* No sidebar offset on mobile */
  }
}

/* Desktop: sidebar is in-flow */
@media (min-width: 768px) {
  .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 220px;
    transition: width var(--duration-normal) var(--ease-out);
  }

  .sidebar--collapsed {
    width: var(--space-14);  /* 56px — icon only */
  }

  .app-shell {
    display: grid;
    grid-template-columns: auto 1fr;
  }
}
```

---

## 6. Complete `src/styles/animations.css`

```css
/* ═══════════════════════════════════════════════════════
   ALL KEYFRAMES — global animation definitions
   ═══════════════════════════════════════════════════════ */

/* ── Feedback: correct answer ── */
@keyframes feedback-correct-pulse {
  0%   { background-color: transparent; }
  20%  { background-color: var(--success-muted); }
  100% { background-color: transparent; }
}

@keyframes feedback-correct-border {
  0%   { border-color: transparent; }
  20%  { border-color: var(--success); }
  100% { border-color: transparent; }
}

/* ── Feedback: incorrect answer ── */
@keyframes feedback-incorrect-shake {
  0%   { transform: translateX(0); }
  10%  { transform: translateX(-8px); }
  20%  { transform: translateX(8px); }
  30%  { transform: translateX(-6px); }
  40%  { transform: translateX(6px); }
  50%  { transform: translateX(-4px); }
  60%  { transform: translateX(4px); }
  70%  { transform: translateX(-2px); }
  80%  { transform: translateX(2px); }
  90%  { transform: translateX(-1px); }
  100% { transform: translateX(0); }
}

@keyframes feedback-incorrect-bg {
  0%   { background-color: transparent; }
  15%  { background-color: var(--error-muted); }
  85%  { background-color: var(--error-muted); }
  100% { background-color: transparent; }
}

/* ── Score pop ── */
@keyframes score-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); color: var(--success); }
  100% { transform: scale(1); }
}

/* ── Caret blink ── */
@keyframes caret-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

/* ── Modal / panel entry ── */
@keyframes modal-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modal-panel-in {
  from {
    opacity:   0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity:   1;
    transform: translateY(0) scale(1);
  }
}

/* ── Toast entry ── */
@keyframes toast-slide-in {
  from {
    opacity:   0;
    transform: translateY(8px);
  }
  to {
    opacity:   1;
    transform: translateY(0);
  }
}

/* ── Spinner ── */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Skeleton pulse (loading state) ── */
@keyframes skeleton-pulse {
  0%   { opacity: 0.5; }
  50%  { opacity: 1; }
  100% { opacity: 0.5; }
}

/* ── Gauge fill (SVG stroke-dashoffset) ── */
@keyframes gauge-fill {
  from { stroke-dashoffset: 283; }  /* Full circumference of semicircle arc */
}

/* ── Sidebar nav item hover ── */
@keyframes nav-item-active {
  from { opacity: 0; transform: scaleX(0); }
  to   { opacity: 1; transform: scaleX(1); }
}

/* ── prefers-reduced-motion: disable all animations ── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .key-input__caret {
    animation: none !important;
    opacity: 1;
  }

  .practice-arena--correct  { border: 2px solid var(--success); }
  .practice-arena--incorrect { border: 2px solid var(--error); }
}
```

---

## 7. Critical CSS Strategy

### 7.1 What's Inline (in `<head>`)

The following CSS is inlined in `index.html` to prevent FOUC (Flash of Unstyled Content) and layout shift before the main bundle loads:

```html
<!-- index.html -->
<style>
  /* Minimal critical CSS — prevents FOUC */
  :root {
    --bg-base:    #0D0D0D;
    --text-primary: #E8E8E8;
    --font-sans: 'Inter', system-ui, sans-serif;
  }
  html.light {
    --bg-base:    #FAFAFA;
    --text-primary: #111111;
  }
  body {
    margin: 0;
    background-color: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  /* Prevent layout shift from sidebar */
  .app-shell {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 100vh;
  }
  /* Loading state while JS initializes */
  #root:empty::after {
    content: '';
    display: block;
    width: 100vw;
    height: 100vh;
    background-color: var(--bg-base);
  }
</style>
```

### 7.2 What's Deferred

- All component CSS (loaded via `styles/index.css` imported in `main.tsx`)
- Font files (Inter, JetBrains Mono) loaded with `font-display: swap`
- Chart-specific CSS loaded with the dashboard chunk

### 7.3 Font Loading

```html
<!-- index.html — preconnect for font performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  rel="preload"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  as="style"
  onload="this.onload=null;this.rel='stylesheet'"
>
<noscript>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  >
</noscript>
```
