# VimTrainer Design System

**Version**: 1.0
**Last Updated**: 2026-06-16
**Status**: Production Reference

Design inspiration: MonkeyType (typography-forward), Linear (precise, keyboard-first), Raycast (command palette, dark and beautiful), Neovim (terminal aesthetics).

---

## 1. Color Palette

### 1.1 Background Scale

```css
--bg-base:     #0D0D0D;   /* Page background — near black */
--bg-surface:  #141414;   /* Cards, panels, sidebar */
--bg-elevated: #1C1C1C;   /* Dropdowns, modals, popovers */
--bg-overlay:  #242424;   /* Tooltip backgrounds, hover states on elevated */
```

### 1.2 Text Scale

```css
--text-primary:   #E8E8E8;  /* Body copy, headings — high contrast */
--text-secondary: #A0A0A0;  /* Subheadings, metadata, descriptions */
--text-muted:     #858585;  /* Placeholders, disabled labels, footnotes — WCAG AA 5.52:1 on bg-base */
--text-disabled:  #404040;  /* Non-interactive text, strikethrough content */
```

### 1.3 Brand / Accent

```css
--accent:       #7C8CF8;  /* Primary CTA, active nav links, focus rings */
--accent-hover: #6B7AF0;  /* Accent on hover/active state */
--accent-muted: #2A2D4A;  /* Accent background for subtle highlights */
```

### 1.4 Semantic Colors

```css
--success:       #4ADE80;  /* Correct answer, positive metrics */
--success-muted: #0F2A1A;  /* Correct answer background flash */
--error:         #F87171;  /* Incorrect answer, validation errors */
--error-muted:   #2A0F0F;  /* Incorrect answer background flash */
--warning:       #FBBF24;  /* Accuracy below target, caution states */
--warning-muted: #2A1F0A;  /* Warning background highlight */
```

### 1.5 Key Chip Colors

The most important visual element in the application.

```css
--key-bg:     #1E1E1E;  /* Key chip face background */
--key-border: #3A3A3A;  /* Key chip top/side border */
--key-shadow: #000000;  /* Bottom border creating depth illusion */
--key-text:   #E8E8E8;  /* Key label text */

/* Leader key chip — distinct visual */
--key-leader-bg:     #2A2D4A;  /* Accent-muted background */
--key-leader-border: #4A4F8A;  /* Muted accent border */
--key-leader-text:   #7C8CF8;  /* Accent color text */

/* Modifier key chip (Ctrl, Shift, Alt, Cmd) */
--key-modifier-bg:     #1A1A1A;
--key-modifier-border: #333333;
--key-modifier-text:   #A0A0A0;

/* Special key chip (ESC, Enter, Space, Tab, BS) */
--key-special-bg:     #1E1E1E;
--key-special-border: #3A3A3A;
--key-special-text:   #E8E8E8;
```

### 1.6 Border Colors

```css
--border-subtle:  #1F1F1F;  /* Subtle dividers, card borders */
--border-default: #2A2A2A;  /* Default borders, input outlines */
--border-strong:  #3A3A3A;  /* Focus-visible borders, active states */
--border-accent:  #7C8CF8;  /* Accent focus rings */
```

### 1.7 Avatar Colors (deterministic from name)

```css
--avatar-color-0: #7C8CF8;  /* Indigo */
--avatar-color-1: #4ADE80;  /* Green */
--avatar-color-2: #FBBF24;  /* Yellow */
--avatar-color-3: #F87171;  /* Red */
--avatar-color-4: #34D399;  /* Emerald */
--avatar-color-5: #A78BFA;  /* Violet */
--avatar-color-6: #60A5FA;  /* Blue */
--avatar-color-7: #FB923C;  /* Orange */
```

---

## 2. Typography

### 2.1 Font Families

```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Roboto, Helvetica, Arial, sans-serif;

--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono',
             'Roboto Mono', Menlo, Monaco, Consolas, 'Courier New', monospace;
```

### 2.2 Type Scale

All sizes in px (set as `rem` in implementation: value / 16):

```css
--text-xs:   11px;   /* 0.6875rem  — metadata, footnotes, badge labels */
--text-sm:   13px;   /* 0.8125rem  — helper text, table cells, secondary content */
--text-base: 15px;   /* 0.9375rem  — body copy, form labels, nav items */
--text-md:   16px;   /* 1rem       — card headings, input values */
--text-lg:   18px;   /* 1.125rem   — section headings */
--text-xl:   20px;   /* 1.25rem    — page subheadings */
--text-2xl:  24px;   /* 1.5rem     — page headings */
--text-3xl:  30px;   /* 1.875rem   — analytics section headings, profile stats */
--text-4xl:  36px;   /* 2.25rem    — challenge description (hero text) */
--text-5xl:  48px;   /* 3rem       — mastery score gauge number */
```

### 2.3 Line Heights

```css
--leading-tight:  1.2;   /* Headings, large display text */
--leading-snug:   1.35;  /* Key chips, badges, small labels */
--leading-normal: 1.5;   /* Body copy, form labels, descriptions */
--leading-relaxed:1.65;  /* Multi-line helper text, documentation */
```

### 2.4 Letter Spacing

```css
--tracking-tight:  -0.025em;  /* Large headings (--text-4xl, --text-5xl) */
--tracking-normal:  0em;      /* Body copy, inputs */
--tracking-wide:    0.05em;   /* Uppercase labels, badge text */
--tracking-wider:   0.1em;    /* ALL CAPS metadata labels */
```

### 2.5 Font Weights

```css
--font-normal:   400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;
```

### 2.6 Typography Combinations by Use Case

| Use Case | Size | Weight | Family | Letter Spacing |
|----------|------|--------|--------|----------------|
| Challenge description | `--text-4xl` | `--font-semibold` | `--font-sans` | `--tracking-tight` |
| Mastery score number | `--text-5xl` | `--font-bold` | `--font-sans` | `--tracking-tight` |
| Page heading | `--text-2xl` | `--font-semibold` | `--font-sans` | `--tracking-tight` |
| Section heading | `--text-lg` | `--font-semibold` | `--font-sans` | `--tracking-normal` |
| Body / description | `--text-base` | `--font-normal` | `--font-sans` | `--tracking-normal` |
| Key chip label | `--text-sm` | `--font-medium` | `--font-mono` | `--tracking-wide` |
| Category badge | `--text-xs` | `--font-semibold` | `--font-sans` | `--tracking-wider` |
| Stats numbers | `--text-xl` | `--font-bold` | `--font-sans` | `--tracking-tight` |
| Helper/meta text | `--text-sm` | `--font-normal` | `--font-sans` | `--tracking-normal` |

---

## 3. Spacing

4px base grid. All spacing values are multiples of 4px.

```css
--space-1:  4px;    /* Tight: icon gap, chip internal padding */
--space-2:  8px;    /* Compact: badge padding, small gaps */
--space-3:  12px;   /* Default: button padding y, form gap */
--space-4:  16px;   /* Standard: card padding, list item gap */
--space-5:  20px;   /* Comfortable: section gap */
--space-6:  24px;   /* Roomy: card body padding */
--space-7:  28px;   /* Generous: between sections */
--space-8:  32px;   /* Large: page section gap */
--space-9:  36px;   /* XL: hero padding */
--space-10: 40px;   /* XXL: practice arena vertical padding */
--space-11: 44px;   /* Touch target minimum height */
--space-12: 48px;   /* Button large height */
--space-13: 52px;   /* —  */
--space-14: 56px;   /* Sidebar width collapsed */
--space-15: 60px;   /* TopBar height */
--space-16: 64px;   /* Section vertical margin */
```

---

## 4. Border, Radius, Shadow

### 4.1 Border Radius

```css
--radius-sm:   4px;    /* Badges, small chips */
--radius-md:   6px;    /* Buttons, inputs, key chips */
--radius-lg:   8px;    /* Cards, modals, dropdowns */
--radius-xl:   12px;   /* Large modals, panels */
--radius-full:  9999px; /* Pills, avatars */
```

### 4.2 Border Widths

```css
--border-width:        1px;
--border-width-medium: 2px;  /* Focus rings */
--border-width-thick:  3px;  /* Key chip bottom border (depth illusion) */
```

### 4.3 Box Shadows

```css
--shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.4);
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.4);

/* Key chip 3D depth shadow — bottom border creates physical key illusion */
--shadow-key: 0 3px 0 0 var(--key-shadow);
```

---

## 5. Motion and Animation

### 5.1 Duration Tokens

```css
--duration-instant: 0ms;    /* prefers-reduced-motion fallback */
--duration-fast:    100ms;  /* Hover state transitions, focus rings */
--duration-normal:  200ms;  /* Most UI transitions (buttons, inputs) */
--duration-slow:    350ms;  /* Modal entry, page transitions */
--duration-correct: 400ms;  /* Correct feedback overlay lifetime */
--duration-wrong:   600ms;  /* Incorrect feedback overlay lifetime */
```

### 5.2 Easing Functions

```css
--ease-default:    cubic-bezier(0.4, 0, 0.2, 1);  /* Material standard — smooth */
--ease-in:         cubic-bezier(0.4, 0, 1, 1);    /* Elements leaving screen */
--ease-out:        cubic-bezier(0, 0, 0.2, 1);    /* Elements entering screen */
--ease-spring:     cubic-bezier(0.34, 1.1, 0.64, 1);  /* Subtle overshoot — score pop (was 1.56; reduced per audit) */
--ease-linear:     linear;                         /* Progress bars, timers */
```

### 5.3 Correct Feedback Animation

Triggered when user answers correctly. Duration: 400ms total.

```css
@keyframes feedback-correct-pulse {
  0%   { background-color: transparent; }
  20%  { background-color: var(--success-muted); }
  100% { background-color: transparent; }
}

@keyframes feedback-correct-border {
  0%   { border-color: var(--border-default); }
  20%  { border-color: var(--success); }
  100% { border-color: var(--border-default); }
}

.practice-arena--correct {
  animation:
    feedback-correct-pulse var(--duration-correct) var(--ease-out) forwards,
    feedback-correct-border var(--duration-correct) var(--ease-out) forwards;
}
```

### 5.4 Incorrect Feedback Animation

Triggered when user answers incorrectly. Duration: 600ms total with shake.

```css
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

.practice-arena--incorrect {
  animation:
    feedback-incorrect-shake 350ms var(--ease-out),
    feedback-incorrect-bg var(--duration-wrong) var(--ease-default) forwards;
}

.challenge-display--incorrect {
  color: var(--error);
  transition: color var(--duration-fast);
}
```

### 5.5 Score Pop Animation

```css
@keyframes score-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); color: var(--success); }
  100% { transform: scale(1); }
}

.session-stats__score--popping {
  animation: score-pop 300ms var(--ease-spring);
}
```

### 5.6 Caret Blink Animation

```css
@keyframes caret-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

.key-input__caret {
  animation: caret-blink 1s var(--ease-linear) infinite;
}
```

### 5.7 Modal Entry Animation

```css
@keyframes modal-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modal-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal__backdrop { animation: modal-backdrop-in var(--duration-slow) var(--ease-out); }
.modal__panel    { animation: modal-panel-in var(--duration-slow) var(--ease-out); }
```

### 5.8 prefers-reduced-motion Handling

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .key-input__caret {
    animation: none;
    opacity: 1;  /* Show static caret instead */
  }

  .practice-arena--correct,
  .practice-arena--incorrect {
    animation: none;
    /* Fallback: border color only, no motion */
  }

  .practice-arena--correct  { border: 2px solid var(--success); }
  .practice-arena--incorrect{ border: 2px solid var(--error); }
}
```

---

## 6. The Key Chip Visual

The key chip is the central design motif of VimTrainer. Every keymap sequence is rendered as physical keyboard keys.

### 6.1 Key Chip CSS

```css
/* Base key chip — all keys share this foundation */
.key-chip {
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  font-family:     var(--font-mono);
  font-weight:     var(--font-medium);
  letter-spacing:  var(--tracking-wide);
  border-radius:   var(--radius-md);
  border-style:    solid;
  border-width:    1px 1px 3px 1px;  /* Bottom border thicker — creates depth */
  user-select:     none;
  white-space:     nowrap;
  line-height:     1;
  vertical-align:  middle;

  /* Size: md (default) */
  font-size:    var(--text-sm);    /* 13px */
  padding:      3px 7px;
  min-width:    28px;
  height:       26px;

  /* Colors */
  background-color: var(--key-bg);
  border-color:     var(--key-border);
  border-bottom-color: var(--key-shadow);
  color:            var(--key-text);

  /* Depth shadow */
  box-shadow: var(--shadow-key);
}

/* Size variants */
.key-chip--sm {
  font-size: var(--text-xs);   /* 11px */
  padding:   2px 5px;
  min-width: 22px;
  height:    20px;
  border-width: 1px 1px 2px 1px;
}

.key-chip--lg {
  font-size: var(--text-md);   /* 16px */
  padding:   5px 12px;
  min-width: 40px;
  height:    36px;
  border-width: 1px 1px 4px 1px;
  box-shadow: 0 4px 0 0 var(--key-shadow);
}

/* Leader key chip */
.key-chip--leader {
  background-color: var(--key-leader-bg);
  border-color:     var(--key-leader-border);
  border-bottom-color: #1A1C3A;
  color:            var(--key-leader-text);
  font-weight:      var(--font-bold);
}

/* Modifier key (Ctrl, Shift, Alt, Cmd) */
.key-chip--modifier {
  background-color: var(--key-modifier-bg);
  border-color:     var(--key-modifier-border);
  border-bottom-color: #111111;
  color:            var(--key-modifier-text);
  font-size:        var(--text-xs);
  padding-left:     8px;
  padding-right:    8px;
}

/* Special keys (ESC, Enter, Space, Tab, BS) */
.key-chip--special {
  background-color: var(--key-special-bg);
  border-color:     var(--key-special-border);
  border-bottom-color: var(--key-shadow);
  color:            var(--key-special-text);
  min-width:        44px;   /* Wider for text like "Enter" */
  font-size:        var(--text-xs);
  padding-left:     10px;
  padding-right:    10px;
}

/* Space key — extra wide */
.key-chip--space {
  min-width: 80px;
}

/* Key sequence container */
.key-sequence {
  display:     inline-flex;
  align-items: center;
  gap:         var(--space-1);   /* 4px between chips */
  flex-wrap:   nowrap;
}

.key-sequence--sm .key-chip { /* sm size applied to all chips via parent */ }
.key-sequence--md .key-chip { /* md is default — no overrides needed */ }
.key-sequence--lg .key-chip { /* lg size applied to all chips via parent */ }

/* Dim state — before reveal in flashcard mode */
.key-sequence--dim .key-chip {
  opacity:    0.3;
  filter:     blur(3px);
  transition: opacity var(--duration-normal), filter var(--duration-normal);
}

/* Plus separator between modifier + key */
.key-sequence__separator {
  color:       var(--text-muted);
  font-size:   var(--text-xs);
  font-family: var(--font-sans);
  user-select: none;
  margin:      0 var(--space-1);
}
```

### 6.2 Key Chip Parsing Rules

Sequence string → visual chips:

| Input Token | Visual Output | Class |
|-------------|---------------|-------|
| `<leader>` | User's leader key symbol | `.key-chip--leader` |
| `<C-x>` | `Ctrl` + `x` | `.key-chip--modifier` + `.key-chip` |
| `<S-x>` | `Shift` + `x` | `.key-chip--modifier` + `.key-chip` |
| `<M-x>` / `<A-x>` | `Alt` + `x` | `.key-chip--modifier` + `.key-chip` |
| `<D-x>` | `Cmd` + `x` | `.key-chip--modifier` + `.key-chip` |
| `<CR>` / `<Enter>` | `Enter` | `.key-chip--special` |
| `<Esc>` / `<ESC>` | `ESC` | `.key-chip--special` |
| `<Space>` | `Space` | `.key-chip--special key-chip--space` |
| `<Tab>` | `Tab` | `.key-chip--special` |
| `<BS>` | `⌫` | `.key-chip--special` |
| Single char | That character | `.key-chip` |

**Example renders:**
- `<leader>ff` → `[⁻]` `[f]` `[f]` (leader chip + two key chips)
- `<C-p>` → `[Ctrl]` `[p]` (modifier + key)
- `gg` → `[g]` `[g]` (two key chips)
- `<S-Tab>` → `[Shift]` `[Tab]` (modifier + special)
- `<leader>ca` → `[⁻]` `[c]` `[a]` (leader + two keys)

---

## 7. Component-Level Design Tokens

### 7.1 Button Tokens

```css
/* Button base */
--btn-height-sm:     32px;
--btn-height-md:     40px;
--btn-height-lg:     48px;
--btn-padding-x-sm:  var(--space-3);   /* 12px */
--btn-padding-x-md:  var(--space-4);   /* 16px */
--btn-padding-x-lg:  var(--space-6);   /* 24px */
--btn-font-size-sm:  var(--text-sm);
--btn-font-size-md:  var(--text-base);
--btn-font-size-lg:  var(--text-md);
--btn-border-radius: var(--radius-md);
--btn-font-weight:   var(--font-medium);
--btn-transition:    background-color var(--duration-fast) var(--ease-default),
                     border-color var(--duration-fast) var(--ease-default),
                     box-shadow var(--duration-fast) var(--ease-default),
                     opacity var(--duration-fast) var(--ease-default);

/* Primary variant */
--btn-primary-bg:           var(--accent);
--btn-primary-bg-hover:     var(--accent-hover);
--btn-primary-text:         #FFFFFF;
--btn-primary-border:       transparent;

/* Secondary variant */
--btn-secondary-bg:         transparent;
--btn-secondary-bg-hover:   var(--bg-overlay);
--btn-secondary-text:       var(--text-primary);
--btn-secondary-border:     var(--border-default);

/* Ghost variant */
--btn-ghost-bg:             transparent;
--btn-ghost-bg-hover:       var(--bg-overlay);
--btn-ghost-text:           var(--text-secondary);
--btn-ghost-border:         transparent;

/* Danger variant */
--btn-danger-bg:            var(--error);
--btn-danger-bg-hover:      #E66060;
--btn-danger-text:          #FFFFFF;
--btn-danger-border:        transparent;

/* Focus ring */
--btn-focus-ring:  0 0 0 2px var(--bg-base), 0 0 0 4px var(--accent);
```

### 7.2 Input Tokens

```css
--input-height:          40px;
--input-padding-x:       var(--space-3);   /* 12px */
--input-font-size:       var(--text-base);
--input-border-radius:   var(--radius-md);
--input-bg:              var(--bg-surface);
--input-border:          var(--border-default);
--input-border-hover:    var(--border-strong);
--input-border-focus:    var(--accent);
--input-border-error:    var(--error);
--input-border-success:  var(--success);
--input-text:            var(--text-primary);
--input-placeholder:     var(--text-muted);
--input-focus-ring:      0 0 0 3px rgba(124, 140, 248, 0.2);  /* dark theme only */
--input-focus-ring-color: color-mix(in srgb, var(--accent) 20%, transparent); /* use this in CSS — theme-adaptive */
--input-disabled-bg:     var(--bg-base);
--input-disabled-text:   var(--text-disabled);
--input-label-size:      var(--text-sm);
--input-label-weight:    var(--font-medium);
--input-label-color:     var(--text-secondary);
--input-helper-size:     var(--text-sm);
--input-helper-color:    var(--text-muted);
```

### 7.3 Card Tokens

```css
--card-bg:            var(--bg-surface);
--card-border:        var(--border-subtle);
--card-border-radius: var(--radius-lg);
--card-padding:       var(--space-6);       /* 24px */
--card-gap:           var(--space-4);       /* 16px between header/body/footer */

/* Variants */
--card-elevated-shadow: var(--shadow-md);
--card-elevated-bg:     var(--bg-elevated);
--card-bordered-border: var(--border-default);
```

### 7.4 Practice Arena Tokens

```css
--arena-bg:              var(--bg-base);
--arena-challenge-size:  var(--text-4xl);
--arena-challenge-color: var(--text-primary);
--arena-stats-bg:        var(--bg-surface);
--arena-stats-border:    var(--border-subtle);
--arena-progress-height: 3px;
--arena-max-width:       680px;   /* Content column width */
```

---

## 8. Light Theme Override Tokens

Applied when `<html class="light">` is present.

```css
html.light {
  /* Background scale — inverted to light */
  --bg-base:     #FAFAFA;
  --bg-surface:  #FFFFFF;
  --bg-elevated: #F4F4F5;
  --bg-overlay:  #EBEBEC;

  /* Text scale */
  --text-primary:   #111111;
  --text-secondary: #525252;
  --text-muted:     #717171;  /* WCAG AA 4.54:1 on #FAFAFA — was #A1A1AA (2.38:1, severe fail) */
  --text-disabled:  #D4D4D8;

  /* Border colors */
  --border-subtle:  #F0F0F0;
  --border-default: #E4E4E7;
  --border-strong:  #D1D1D6;

  /* Key chips in light theme */
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

  /* Brand — darkened for light-bg contrast (4.92:1 vs #FAFAFA; was #7C8CF8 at 2.73:1 — failed 3:1) */
  --accent:       #4D5EE8;
  --accent-hover: #3D4EDA;
  --accent-muted: #ECEEFF;

  /* Semantic — lighter muted backgrounds */
  --success-muted: #F0FDF4;
  --error-muted:   #FEF2F2;
  --warning-muted: #FFFBEB;

  /* Shadows — lighter on light theme */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
  --shadow-key: 0 3px 0 0 var(--key-shadow);

  /* Card */
  --card-bg: #FFFFFF;
}
```

---

## 9. Focus Ring Standard

All interactive elements must have a visible focus ring for keyboard navigation.

```css
/* Global focus ring — applied to all :focus-visible elements */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px var(--accent);
}

/* Practice arena exception — focus ring suppressed on KeyInput only during active session.
   Buttons and modals triggered inside the arena retain visible focus rings. */
.practice-arena--active .key-input:focus-visible,
.practice-arena--active .key-input *:focus-visible {
  box-shadow: none;
  outline: none;
}
```

---

## 10. Z-Index Scale

```css
--z-base:    0;
--z-raised:  10;
--z-dropdown:100;
--z-sidebar: 200;
--z-topbar:  300;
--z-modal:   400;
--z-toast:   500;
--z-tooltip: 600;
```
