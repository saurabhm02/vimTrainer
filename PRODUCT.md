# Product

## Register

product

## Users

Vim and Neovim developers who spend 6–10 hours a day in a terminal editor. They have invested weeks or months building a personal config — leader mappings, LSP bindings, plugin shortcuts — but their fingers still hesitate on custom keys while muscle memory snaps to defaults. They are not beginners: they already understand Vim. What they want is to stop thinking about their shortcuts and start just using them.

Secondary user: the motivated switcher — a developer migrating from VS Code or IntelliJ to Neovim, who knows what they want the tool to do but whose hands don't know how to do it yet.

Both users arrive with a specific task: practice *their* keymaps, not a generic curriculum. The practice arena is the product. Everything else is infrastructure.

## Product Purpose

VimTrainer lets users import their own Neovim configuration and practice their exact shortcuts using a MonkeyType-style challenge loop. It measures accuracy and response time per keymap, uses spaced repetition to surface weak bindings, generates a daily training queue, and tracks mastery over time.

Success: a user opens VimTrainer before a coding session, works through their daily queue in 5–10 minutes, and notices their hands moving faster in their editor the following week.

Open source. Self-hosted first. No billing in V1.

## Brand Personality

Precise. Terminal-native. Addictive.

The interface should feel like a well-configured Neovim: minimal chrome, instant response, no UI in the way of the task. Not cold or clinical — it should feel *crafted*, like a config that someone spent time on. The practice experience earns the user's trust by feeling as fast as their editor.

## Anti-references

- **MonkeyType aesthetics copied wholesale**: large gradient-blurred hero backgrounds, "test results" modal with gradient numbers. VimTrainer borrows the *idea* (focused practice loop), not the visual language.
- **Generic SaaS dashboards**: stat cards with colored left borders, hero-metric templates (big number, small label, gradient accent), identical card grids.
- **Marketing-site aesthetic**: eyebrow labels above every section, numbered section scaffolding (01 / 02 / 03), gradient text.
- **VS Code-style dark blue**: #1e1f29 / #252526 / the Monokai family. This is the saturated "dark dev tool" color reflex. VimTrainer is darker and more neutral — closer to a terminal background than an IDE.
- **Linear copycat**: we share keyboard-first and precision, but Linear uses blue; VimTrainer uses indigo because keymapping is a different activity than project management. The tools should feel different.

## Design Principles

1. **The practice arena is the only thing that matters.** Every other page exists to get users into practice and to show them what to practice next. No decorative chrome, no nav clutter, no distractions during an active session.

2. **The keyboard is the primary interface.** Every action the user needs must be reachable by keyboard. Navigation shortcuts, session start/stop, mode switching, settings access — all keyboard-driven. The app itself should feel like practicing in it.

3. **Feedback is instant or it's broken.** The time between keypress and visual confirmation must be imperceptible. Any lag in the practice loop breaks the muscle memory training. This is a hard constraint, not a preference.

4. **The key chip is the design motif.** Keybindings rendered as physical keys are the central visual element. They must look like real keys: substantial, pressable, legible. This is not decorative — it is the primary way users read their shortcuts.

5. **Density is earned, not imposed.** The analytics dashboard can be dense because users navigating there want information. The practice arena is stripped of everything except the challenge. Match information density to user intent at each surface.

## Accessibility & Inclusion

WCAG AA minimum. Hard requirements:
- All body text ≥ 4.5:1 contrast on its background (including placeholder text)
- All large text / interactive labels ≥ 3:1
- Full keyboard navigation — no feature requires a mouse
- `prefers-reduced-motion` respected: all animations have a static fallback
- Focus rings visible on all interactive elements (suppressed only inside the active practice arena where they create visual noise)
- Screen reader: semantic HTML throughout, ARIA labels on icon-only buttons
