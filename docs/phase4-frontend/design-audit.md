# VimTrainer Design Audit

**Date:** 2026-06-16  
**Scope:** Phase 4 design specification documents (design system, CSS architecture, component hierarchy)  
**Type:** Pre-implementation design quality review  
**Register:** Product (app UI — design serves the product)

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | `--text-muted` fails 4.5:1 on both dark and light themes |
| 2 | Performance | 2/4 | `will-change` applied to non-composited properties; one hardcoded rgba |
| 3 | Theming | 3/4 | Full token system but light theme accent fails focus ring contrast |
| 4 | Responsive Design | 3/4 | Solid strategy; one mobile sidebar gap |
| 5 | Anti-Patterns | 4/4 | No AI slop tells — key chip motif is genuinely distinctive |
| **Total** | | **14/20** | **Good — address weak dimensions before implementation** |

---

## Anti-Patterns Verdict

**Pass.** This does not look AI-generated. The key chip as central design motif is a committed, domain-appropriate choice. Near-black background (#0D0D0D) rather than VS Code dark-blue or Tailwind slate is a deliberate first-order reflex rejection. No gradient text, no hero-metric templates, no card grids, no eyebrow labels. The practice arena CSS is stripped and purposeful. The design has a point of view.

---

## Executive Summary

- **Audit Health Score: 14/20** (Good)
- **Issues: P1×3, P2×4, P3×3**
- **P1 issues are all accessibility/contrast — must fix before implementation**
- Top issues:
  1. `--text-muted` (#606060) fails WCAG 4.5:1 on all dark backgrounds (3.0:1 on `--bg-base`)
  2. Light theme `--text-muted` (#A1A1AA) fails critically (2.38:1 on `--bg-base: #FAFAFA`)
  3. `--accent` (#7C8CF8) fails 3:1 on light theme background — breaks focus rings
  4. `will-change: background-color` wastes compositor memory with no GPU benefit
  5. Three missing empty-state designs block onboarding flows

---

## Detailed Findings

---

### [P1] text-muted contrast failure — dark theme

**Location:** `design-system.md` §1.2, used in `css-architecture.md` `.key-input__prompt`, `.progress-indicator__counter`  
**Category:** Accessibility  
**Impact:** Placeholder text, prompt text, and helper text fail WCAG AA readability. Users with low vision cannot read these.

**Measured contrast:**
- `--text-muted` (#606060, L≈0.134) on `--bg-base` (#0D0D0D, L≈0.005): **3.33:1** — fails 4.5:1
- `--text-muted` (#606060) on `--bg-surface` (#141414, L≈0.012): **2.97:1** — fails 4.5:1

**WCAG:** 1.4.3 Contrast (Minimum) AA  
**Note:** WCAG 1.4.3 exempts "inactive UI components" (disabled buttons) but NOT placeholder text. Impeccable requires 4.5:1 for placeholder text.

**Fix:** Raise `--text-muted` to `#858585`
- #858585 (L≈0.255) on bg-base: **5.52:1** ✓
- #858585 on bg-surface: **4.92:1** ✓
- Visual difference from #606060 is minimal — the token was too dark

```css
/* Before */
--text-muted: #606060;

/* After */
--text-muted: #858585;
```

**Suggested command:** `/impeccable colorize` (after update) to verify the full token chain

---

### [P1] text-muted contrast failure — light theme (severe)

**Location:** `design-system.md` §8 Light Theme Override  
**Category:** Accessibility  
**Impact:** Muted text in light mode is nearly unreadable. This will affect every user who switches to light theme.

**Measured contrast:**
- `--text-muted: #A1A1AA` (L≈0.371) on `--bg-base: #FAFAFA` (L≈0.954): **2.38:1** — severe fail

**WCAG:** 1.4.3 Contrast (Minimum) AA

**Fix:** Darken to `#737373` (barely passes) or better `#717171`
- #737373 (L≈0.171) on bg-base #FAFAFA: **4.54:1** ✓
- This is darker than current Zinc-400 (#A1A1AA) — use Zinc-600 territory

```css
html.light {
  /* Before */
  --text-muted: #A1A1AA;

  /* After */
  --text-muted: #717171;
}
```

**Suggested command:** `/impeccable colorize`

---

### [P1] Accent color fails focus ring contrast on light theme

**Location:** `design-system.md` §1.3, §9 (Focus Ring Standard)  
**Category:** Accessibility  
**Impact:** Keyboard users on light theme cannot see focus rings clearly. Violates WCAG 2.4.11 Focus Appearance.

**Measured contrast:**
- `--accent: #7C8CF8` (L≈0.318) on `--bg-base: #FAFAFA` (L≈0.954): **2.73:1** — fails 3:1 minimum

The focus ring spec `0 0 0 2px var(--bg-base), 0 0 0 4px var(--accent)` renders the outer accent ring against the page background. On light theme, indigo #7C8CF8 is too light to be visible at adequate contrast.

**WCAG:** 2.4.11 Focus Appearance (AA in WCAG 2.2)

**Fix:** Add a `--accent-on-light` token for the light theme override, used in focus rings and active nav states in light mode:

```css
html.light {
  /* Darker indigo for sufficient contrast on light backgrounds */
  --accent: #4D5EE8;   /* L≈0.154, contrast vs #FAFAFA = 4.92:1 ✓ */
  --accent-hover: #3D4EDA;
  --accent-muted: #ECEEFF;
}
```

This keeps the same indigo family but at a shade that passes 4.5:1 on white/near-white backgrounds.

**Suggested command:** `/impeccable colorize`

---

### [P2] will-change applied to non-composited properties

**Location:** `css-architecture.md` §3 (practice arena), `design-system.md` §5.3-5.4  
**Category:** Performance  
**Impact:** `will-change: background-color` and `will-change: border-color` create compositor layers that consume GPU memory without providing any GPU acceleration benefit. These properties repaint, not composite. The browser ignores the hint but the memory allocation still happens.

**Current code:**
```css
.practice-arena--correct {
  will-change: background-color, border-color;  /* ← both repaint, not composited */
}

.practice-arena--incorrect {
  will-change: background-color, transform;  /* ← only transform is useful here */
}
```

**Fix:** Only apply `will-change: transform` on the incorrect state (which actually translates). Remove `will-change` from correct state entirely — the background/border animation is fast enough without GPU promotion.

```css
.practice-arena--correct {
  /* No will-change — short-duration repaint at 400ms is fast enough */
}

.practice-arena--incorrect {
  will-change: transform;  /* shake animation uses translateX — this is valid */
}
```

**Suggested command:** `/impeccable optimize`

---

### [P2] Hard-coded rgba in key-input focus state

**Location:** `css-architecture.md` §3 `.key-input--active`  
**Category:** Theming (violates CSS architecture rule §2.2)  
**Impact:** If `--accent` changes (it changes in light theme per the P1 fix above), this hard-coded value won't update. It will render the wrong focus glow color in light theme.

**Current:**
```css
.key-input--active {
  box-shadow: 0 0 0 3px rgba(124, 140, 248, 0.15);  /* ← hardcoded accent RGB */
}
```

**Fix:** Use the `--input-focus-ring` token that's already defined in the design system:
```css
/* design-system.md already defines: */
--input-focus-ring: 0 0 0 3px rgba(124, 140, 248, 0.2);

/* But this token also hardcodes the rgba. Fix the token itself to use a CSS color-mix: */
--input-focus-ring-color: color-mix(in srgb, var(--accent) 20%, transparent);
/* Usage: */
.key-input--active {
  box-shadow: 0 0 0 3px var(--input-focus-ring-color);
}
```

Note: `color-mix()` has excellent browser support (all modern browsers as of 2024). This makes the focus ring automatically inherit the correct accent for each theme.

**Suggested command:** `/impeccable harden`

---

### [P2] ease-spring uses overshooting cubic-bezier

**Location:** `design-system.md` §5.2  
**Category:** Motion  
**Impact:** `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots with y1=1.56 — this is a bounce/elastic easing. In most contexts this is jarring. The score-pop animation is the only use, which is a delight moment, but the overshoot is currently 56% over the target value which reads as rubber-band, not spring.

**Current:**
```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* y1=1.56 — overshoots */
```

**Recommendation:** Two options:

**Option A (subtle delight — recommended):** Reduce overshoot to 10%, which still pops without bouncing:
```css
--ease-spring: cubic-bezier(0.34, 1.1, 0.64, 1);
```

**Option B (remove bounce entirely):** Use a clean expo-out that's fast and decisive:
```css
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);  /* ease-out-expo equivalent */
```

The score pop is a `scale(1) → scale(1.3) → scale(1)` sequence. With Option A it will still visibly "pop" without the rubber-band tail.

**Suggested command:** `/impeccable animate`

---

### [P2] Missing empty states for three critical flows

**Location:** Phase 4 component hierarchy — no empty state components specified  
**Category:** Onboarding/Product  
**Impact:** Users who arrive with no keymaps imported, no session history, and no achievements unlocked will see empty containers with no guidance. These are the most common states for new users and determine whether they activate.

**Missing empty states:**
1. **Keymap library (no imports)** — shown at `/import` and the keymapStore when `keymaps.length === 0`. Should explain what to do next and offer the import action inline.
2. **Daily queue (no keymaps to practice)** — if a user has no custom keymaps, the daily queue is empty. Should fall back to builtins with an explanation.
3. **Achievements (none unlocked)** — the achievements page with all locked achievements needs locked-state design and progress indicators.
4. **Session history (first visit)** — the dashboard has no "no sessions yet" state defined.

**Fix:** Add an `EmptyState` component spec to component-hierarchy.md:
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  };
}
```

And document the 4 specific empty states above.

**Suggested command:** `/impeccable onboard`

---

### [P3] Missing text-wrap on challenge display heading

**Location:** `css-architecture.md` §3 `.challenge-display__description`  
**Category:** Typography  
**Impact:** Long action descriptions (e.g., "Go to Definition in Other Window") that wrap across two lines will have unbalanced line lengths. On the practice arena where typography is the entire UI, unbalanced wrapping looks amateurish.

**Fix:**
```css
.challenge-display__description {
  /* add: */
  text-wrap: balance;
}
```

**Browser support:** All modern browsers (96%+ as of 2024). No risk.

---

### [P3] Missing text-3xl step in type scale

**Location:** `design-system.md` §2.2  
**Category:** Typography  
**Impact:** The scale jumps from `--text-2xl: 24px` to `--text-4xl: 36px` with no `--text-3xl` (30px). If analytics headings or section subheadings need something between 24px and 36px, there's no token. Minor gap that will be patched ad-hoc during implementation.

**Fix:**
```css
--text-3xl: 30px;   /* 1.875rem — analytics headings, section subheadings */
```

Insert between `--text-2xl` and `--text-4xl` in tokens.css.

---

### [P3] focus ring suppressed globally during practice — too broad

**Location:** `design-system.md` §9 Focus Ring Standard  
**Category:** Accessibility  
**Impact:** The current rule suppresses all focus rings inside `.practice-arena--active`. This is correct for the KeyInput component (which manages its own visual focus caret), but it also silently removes focus rings from the "End Session" button or any modal triggered during an active session.

**Fix:** Scope the suppression only to `.key-input`:
```css
/* Before — too broad */
.practice-arena--active *:focus-visible {
  box-shadow: none;
  outline: none;
}

/* After — scoped to keyboard input only */
.practice-arena--active .key-input:focus-visible,
.practice-arena--active .key-input *:focus-visible {
  box-shadow: none;
  outline: none;
}
```

---

## Patterns & Systemic Issues

1. **Color tokens in hex, not OKLCH.** All three P1 contrast issues could have been caught earlier with OKLCH values, which make perceptual lightness explicit. The `L` value in OKLCH directly maps to contrast accessibility — dark-theme muted at `oklch(45% 0 0)` versus light-theme muted at `oklch(45% 0 0)` would immediately reveal the contrast asymmetry (because they're the same lightness but different backgrounds). Recommend migrating tokens to OKLCH before the first implementation build. This is P3 on its own, but it prevents future P1s.

2. **Light theme is under-specified.** The P1 contrast failures and the hard-coded rgba issue are all rooted in the same problem: the light theme was designed by inverting dark-theme values rather than designing the light theme independently. The backgrounds inverted correctly; the accent and muted text did not. Before launch, the light theme needs an independent contrast audit pass.

---

## Positive Findings

- **Key chip design is excellent.** `border-width: 1px 1px 3px 1px` for the 3D depth illusion is a genuinely good technique. The leader chip with indigo tint distinguishes it visually from regular keys without being garish.
- **Z-index scale is semantic.** Values 0→600 with named roles is exactly right. No magic numbers.
- **practice-arena `contain: layout style`** is correct and important. Isolating paint scope on the most-rendered UI surface is good.
- **prefers-reduced-motion handling** is thorough — static border fallback for correct/incorrect is better than most implementations.
- **Token naming is consistent.** The `--bg-*`, `--text-*`, `--border-*`, `--space-*` convention is clean and will read well to any engineer.
- **The dark theme color strategy is right.** #0D0D0D is blacker than VS Code, closer to a terminal. This is a deliberate identity choice that passes the second-order reflex test.
- **BEM-lite naming** is practical and appropriately scoped — "never nest more than one level" is the right rule.
- **Focus ring spec** (2px base gap + 4px accent ring) is the same pattern used by Linear and GitHub. Familiarity here is a virtue.

---

## Required Changes Before Implementation

These changes must be applied to the design docs before engineers start writing code. P1 issues will require rework if caught after components are built.

### 1. Update `design-system.md` — token fixes

```css
/* Dark theme (default) */
--text-muted: #858585;          /* was #606060 — raise for WCAG AA */

/* Light theme overrides */
html.light {
  --text-muted: #717171;        /* was #A1A1AA — severe contrast fail */
  --accent: #4D5EE8;            /* was #7C8CF8 — fails 3:1 on light bg */
  --accent-hover: #3D4EDA;
}

/* Color-mix token for focus glow */
--input-focus-ring-color: color-mix(in srgb, var(--accent) 20%, transparent);

/* Add missing scale step */
--text-3xl: 30px;               /* insert between 2xl and 4xl */

/* Ease adjustment */
--ease-spring: cubic-bezier(0.34, 1.1, 0.64, 1);  /* was 1.56 — remove rubber-band */
```

### 2. Update `css-architecture.md` — will-change and hardcoded value fixes

```css
/* Practice arena — remove will-change on repaint properties */
.practice-arena--correct {
  /* Remove: will-change: background-color, border-color; */
}

.practice-arena--incorrect {
  will-change: transform;   /* was: background-color, transform */
}

/* Key input — use color-mix token */
.key-input--active {
  box-shadow: 0 0 0 3px var(--input-focus-ring-color);
  /* was: rgba(124, 140, 248, 0.15) */
}

/* Focus ring suppression — scope to key-input only */
.practice-arena--active .key-input:focus-visible,
.practice-arena--active .key-input *:focus-visible {
  box-shadow: none;
  outline: none;
}
/* Remove: .practice-arena--active *:focus-visible { ... } */

/* Challenge display — add text-wrap */
.challenge-display__description {
  text-wrap: balance;   /* add this */
}
```

### 3. Add EmptyState component to `component-hierarchy.md`

Add `EmptyState` to `src/components/ui/` with the interface defined in the P2 finding above. Document 4 empty state instances (keymap library, daily queue, achievements, dashboard first visit).

---

## Recommended Commands (in priority order)

1. **[P1] Apply the 4 token fixes** from "Required Changes" section above to `design-system.md` and `css-architecture.md` — do this inline before implementation starts.
2. **[P2] `/impeccable onboard`** — design the 4 missing empty states (keymap library, daily queue, achievements, dashboard).
3. **[P2] `/impeccable optimize`** — verify will-change and contain usage across all components once code exists.
4. **[P3] `/impeccable animate`** — revisit the score-pop animation once implemented to verify the ease-spring feel is right in-browser.
5. **[P3] `/impeccable polish`** — final pre-ship quality pass after M8 (deployment milestone).

> Re-run `/impeccable audit` after fixes to see the score improve. Expected score after P1+P2 fixes: **17-18/20**.
