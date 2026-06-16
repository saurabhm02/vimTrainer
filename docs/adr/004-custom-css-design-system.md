# ADR-004: Custom CSS Design System (No Utility Framework)

**Date**: 2026-06-16  
**Status**: Accepted  
**Deciders**: Project leads

---

## Context

The frontend requires a styling approach. VimTrainer has a specific visual identity — terminal-native, precise, dark — that is in tension with the default aesthetics that emerge from utility-first frameworks.

Options evaluated:

1. **Tailwind CSS** — utility-first CSS framework
2. **CSS Modules** — scoped CSS via build-time class name hashing
3. **styled-components / Emotion** — CSS-in-JS
4. **MUI / Chakra UI / Ant Design** — component libraries with bundled design systems
5. **Custom CSS with BEM-lite naming** — hand-authored CSS, global scope, conventional naming

## Decision

Custom CSS only. No utility framework, no CSS-in-JS, no component library. Global CSS files organized by component, using BEM-lite (`.component__element--modifier`) naming conventions. All design tokens as CSS custom properties in `tokens.css`.

## Rationale

**The visual identity requires full control.** VimTrainer's design is built on specific decisions that conflict with framework defaults: near-black backgrounds (`#0D0D0D`), the key chip's `border-width: 1px 1px 3px 1px` 3D depth illusion, monospace type for all key sequences, practice arena focus ring suppression scoped to `.practice-arena--active`. These details require precise CSS that utility frameworks work against.

**Tailwind's utility classes produce the wrong aesthetics by default.** Tailwind's color palette (slate, zinc, gray) and spacing scale nudge toward the generic SaaS dashboard aesthetic that VimTrainer explicitly rejects. More importantly, Tailwind classes in JSX make the relationship between design tokens and component appearance opaque — changing a color token requires a component-level find-and-replace rather than a single token update.

**CSS custom properties are the design system.** All colors, typography, spacing, and motion tokens are defined once in `tokens.css` and consumed everywhere via `var(--token-name)`. Theme switching (dark/light) is a single class toggle on `<html>` that overrides the custom property values. This is cleaner than any runtime theming solution in CSS-in-JS.

**No runtime overhead.** CSS-in-JS (styled-components, Emotion) injects styles at runtime via JavaScript, adds bundle weight, and can cause style flash on initial render. A static CSS bundle has none of these costs. For a performance-critical app where "feedback is instant or it's broken," eliminating any unnecessary JavaScript execution in the rendering path matters.

**Component libraries impose alien design.** MUI, Chakra, and Ant Design components come with opinionated spacing, border radius, and interaction patterns that would require extensive overriding to match VimTrainer's aesthetic. The override surface is larger than the cost of writing the components from scratch.

**BEM-lite scales predictably.** `.practice-arena__challenge-display--correct` is self-documenting, grep-able, and has zero build-time dependency. Class name collisions are prevented by convention (component names are unique) without requiring CSS Modules' build-time hashing or styled-components' runtime injection.

## CSS Architecture

```
src/styles/
├── tokens.css          # All CSS custom properties (colors, type, spacing, motion)
├── reset.css           # Minimal reset (box-sizing, margin: 0, padding: 0)
├── base.css            # html, body, :root defaults
├── components/
│   ├── button.css
│   ├── input.css
│   ├── badge.css
│   ├── card.css
│   ├── key-chip.css    # The most important component CSS
│   ├── practice-arena.css
│   ├── sidebar.css
│   ├── modal.css
│   └── ...
└── index.css           # @import everything in order
```

## Consequences

- **Positive**: Total control over every pixel. No framework fighting.
- **Positive**: Theme switching via CSS custom property override — zero JavaScript.
- **Positive**: Static CSS bundle, no runtime injection, no style flash.
- **Positive**: All design tokens in one file — global change is one-line edit.
- **Positive**: No dependency to maintain or upgrade.
- **Negative**: No design system scaffold. Every component CSS is hand-authored.
- **Negative**: No automatic responsive utilities — media queries written explicitly per component.
- **Negative**: Global scope requires naming discipline. Enforced by BEM-lite convention.
- **Negative**: Larger initial CSS output than a tree-shaken utility framework for large-scale apps. Acceptable at VimTrainer's component count (~25 components).

## Naming Rules

- Block: `.practice-arena`
- Element: `.practice-arena__challenge-display`
- Modifier: `.practice-arena__challenge-display--correct`
- State modifier: `.practice-arena--active`
- Never nest beyond 2 levels of BEM: `.block__element--modifier` is the maximum
- JavaScript state classes: `is-loading`, `is-disabled`, `is-expanded` (no BEM)
- Theme classes: `html.dark` (default), `html.light`
