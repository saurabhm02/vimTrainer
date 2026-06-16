# VimTrainer — User Personas
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Alex (PM)

These four personas represent the primary user archetypes VimTrainer is designed to serve in Phase 1. Every product decision should be evaluated against at least one of these personas. If a feature does not serve any of them, it does not belong on the V1 roadmap.

---

## Persona 1: The Config Artisan

**Name**: Arjun Sharma
**Role**: Senior Backend Engineer
**Age**: 31
**Location**: Bangalore, India
**Experience Level**: Expert Vim/Neovim user (5+ years)

### Background

Arjun has been using Neovim as his primary editor for four years. He maintains a meticulously organized dotfiles repository on GitHub — `github.com/arjunsharma/dotfiles` — with over 300 custom keymaps spread across a LazyVim-based config. He's the person on his team who evangelizes Neovim to anyone who will listen, and whose config setup takes two hours to walk through.

His `keymaps.lua` is organized by category: LSP bindings, buffer navigation, Telescope, Harpoon, git (Fugitive + Gitsigns), diagnostics, and a handful of custom macros he built over years of iteration. He knows exactly what each binding does when he needs it — the problem is that "when he needs it" only applies to the 60 bindings he uses every day. The other 240 exist in his config as aspirational infrastructure he has never converted into reflex.

### Daily Workflow

- Works 8–10 hours/day in Neovim, primarily in Go and TypeScript codebases
- Uses Telescope for file search, grep, and buffer switching
- Uses Harpoon for marking and jumping between 4–6 "hot" files per task
- Uses LSP bindings heavily: go-to-definition, find references, code actions, rename
- Uses tmux panes alongside Neovim, has custom `<leader>t*` bindings for pane management
- Syncs dotfiles across 3 machines: work laptop (macOS), personal desktop (Arch Linux), and a cloud dev box

### Pain Points

1. **The long tail problem.** He has 300 bindings. He actively uses 60. The other 240 are dead weight that cost him keystrokes every time he reaches for a feature and draws a blank, falls back to a command line or mouse click, and moves on. He knows the binding exists. He just can't recall it under pressure.
2. **Plugin upgrade regression.** When he upgrades Lazy.nvim or a major plugin, keymaps sometimes change. He has no systematic way to audit what changed and re-learn the new bindings before they become a problem in a real coding session.
3. **No measurement.** He has no baseline for which bindings he has truly mastered and which ones he is faking fluency on. He suspects his `vim-fugitive` bindings are weaker than his self-assessment suggests.
4. **The new machine gap.** When setting up a new machine or the cloud dev box, the muscle memory lag is noticeable for 2–3 weeks. He wants to close that gap faster.

### Goals on VimTrainer

- Import his entire `keymaps.lua` and get a mastery score across all 300+ bindings
- Identify the specific commands in each category where his accuracy and response time are below standard
- Run 10-minute practice sessions during work-from-home lunch breaks to close identified gaps
- Get a weekly view of which previously weak commands are now approaching mastery
- Validate that his self-assessment ("I'm good at LSP, mediocre at git") matches measured reality

### What Success Looks Like

Three weeks after onboarding, Arjun opens the Analytics dashboard and sees: his LSP category is at 91% mastery, but his Harpoon bindings are at 54% accuracy. He starts three daily Leader Key Trainer sessions focused on Harpoon. By week six, Harpoon is at 83% and he has caught himself reaching for the shortcut without thinking about it during an actual coding session. He tells two colleagues.

### What Would Make Him Leave

- If the parser fails to extract his LazyVim plugin keymaps and only gets his manually defined ones — he would consider the import useless
- If the practice interface feels like a toy (childish visuals, excessive celebration animations, mobile-first layout)
- If there is no analytics depth — he wants to drill into individual command history, not just see a summary
- If session data is lost due to bugs — he is building a training habit and broken state would shatter trust immediately

---

## Persona 2: The Vim Migrant

**Name**: Sofia Marchetti
**Role**: Frontend Developer
**Age**: 26
**Location**: Milan, Italy
**Experience Level**: Vim beginner (< 3 months of active use)

### Background

Sofia spent her first three years as a developer in VS Code. She was productive — extensions, IntelliSense, Git integration, debugging panels. But she watched too many conference talks and followed too many senior engineers who swore by keyboard-driven development. She decided to make the switch to Neovim three months ago and has been in a state of productive discomfort since.

She can navigate. She knows `hjkl` by reflex. She can write and quit. But anything beyond basic movement — visual block, `ciw`, text objects, marks, macros — still requires her to stop, think, and sometimes Google. She has set up LazyVim because she could not face configuring LSP from scratch, but she barely understands what half the keybindings do. She is productive enough to keep going, but slower than she was in VS Code and frustrated by it.

She has no custom keymaps yet. She is still learning the defaults.

### Daily Workflow

- Works in TypeScript/React with LazyVim's default config
- Frequently reaches for the mouse when visual selection gets complicated
- Still uses `i` to go into insert mode and types entire words before realizing she should have used `ciw`
- Has which-key installed but reads it passively — "oh, that binding exists" — rather than practicing it
- Spends 6–8 hours/day in Neovim, often stopping to look up motions mid-task

### Pain Points

1. **The confidence gap.** She knows what she wants to do (delete this word, yank this paragraph, jump to the end of the file) but cannot translate intent to keystrokes without hesitation. Every hesitation breaks her flow state.
2. **Breadth vs. depth confusion.** She is trying to learn too many things at once. She does not have a curriculum. She watches ThePrimeagen videos and learns 10 new motions but retains 2.
3. **No feedback on improvement.** She has been at this for three months and cannot tell if she is getting better. She feels better, but has no evidence.
4. **The motion vs. plugin boundary.** She cannot distinguish which keybindings come from core Vim (and she must learn) versus LazyVim defaults (good to know) versus things she should customize. Everything is a pile.

### Goals on VimTrainer

- Complete the Beginner and Intermediate Motion Trainer tiers systematically
- Get a clear sense of which core motions she has mastered and which are still shaky
- Have a structured daily practice routine she can complete in under 10 minutes
- Eventually import her LazyVim config and start learning the plugin defaults she already has but is not using

### What Success Looks Like

Eight weeks in, Sofia opens the Analytics dashboard and sees Beginner motions at 95% accuracy, Intermediate at 72%. She knows specifically which intermediate motions are weakest (text objects: `ciw`, `daw`, `ca"`). She practices them targeted for one week. By week ten, her intermediate accuracy is at 88% and she has genuinely stopped reaching for the mouse when she needs to delete a word. She feels like a Vim user for the first time.

### What Would Make Her Leave

- If the onboarding requires her to import a config file before she can do anything — she has nothing to import yet and would bounce
- If Motion Trainer forces her to start at Beginner when she already knows `hjkl` — she needs to test into the right tier
- If the app feels condescending ("Great job! You learned h!") — she is a professional, not a child
- If there is no structured curriculum — if it's just randomized practice with no sense of progression, she will feel lost
- If she cannot use the app without an account on first visit (guest mode is critical for her first impression)

---

## Persona 3: The Plugin Explorer

**Name**: Marcus Webb
**Role**: Staff Engineer / Engineering Manager
**Age**: 35
**Location**: Austin, TX, USA
**Experience Level**: Intermediate-to-advanced Vim user (3 years)

### Background

Marcus is dangerous. He knows enough Vim to be highly productive in his core workflows, but his Neovim config has grown into a sprawling ecosystem of plugins that he does not fully use. He has Telescope, Harpoon, nvim-dap (debugger), nvim-tree, which-key, gitsigns, diffview, null-ls, LuaSnip, and a handful of others, each with their own keymap surface.

He adds plugins because they are excellent and he wants their capabilities. But installing a plugin and practicing its bindings until they are muscle memory are two completely different activities, and Marcus only ever completes the first one. His actual workflow uses maybe 40% of what his config enables.

His particular blind spot: he installs plugins during a weekend of tinkering, adds the keymaps, feels productive, and then returns to his Monday work routine where the old habits take over. The new plugin bindings never get used enough to become reflex.

### Daily Workflow

- Leads a team of 6 engineers, so his coding time is fragmented (2–4 hours of focused coding per day, broken into chunks)
- Uses Telescope heavily (find files, live grep, buffers), is very fluent here
- Uses nvim-dap occasionally but has to look up the bindings every single time — `<leader>db` for breakpoint? Or was it `<F5>`?
- Has Harpoon installed but falls back to `:b <tab>` for buffer switching half the time
- Uses gitsigns for hunks but cannot remember the hunk navigation binding without checking which-key
- Adds to his config during downtime but does not build habits from additions

### Pain Points

1. **Plugin amnesia.** He can name every plugin in his config. He cannot reliably recall the bindings for 60% of them without consulting which-key.
2. **Fragmented practice time.** He does not have 30-minute blocks for deliberate practice. He has 5–10 minute gaps between meetings. If practice requires a long session, he will not practice.
3. **The "I'll learn it when I need it" trap.** He tells himself he will look up `nvim-dap` bindings when he actually needs to debug something. But under the pressure of a real debugging session, he does not want to be consulting which-key — he wants reflex. The need and the practice never align.
4. **No prioritization signal.** He does not know which of his many underused plugins is causing the most productivity drag. He would practice if he had data telling him where to start.

### Goals on VimTrainer

- Import his full config and immediately see which categories have the lowest mastery scores
- Run short focused sessions (10 commands, < 5 minutes) during meeting gaps on plugin-specific categories
- Specifically conquer `nvim-dap`, `gitsigns`, and `diffview` bindings which he knows are his worst areas
- See measurable improvement in those specific categories within 4 weeks
- Use the "Most Missed Commands" analytics to drive his practice rather than guessing

### What Success Looks Like

Four weeks after onboarding, Marcus's Analytics shows nvim-dap bindings at 78% mastery (up from 34% at import), gitsigns at 82%. He no longer consults which-key for hunk navigation during code review. In a real debugging session, he steps through code with `<F5>/<F10>/<F11>` without thinking. He mentions VimTrainer in his team's weekly engineering notes as a tool worth trying.

### What Would Make Him Leave

- If session length cannot be set to 10 commands — 20-command default is too long for his available time
- If there is no category filtering in practice — he needs to drill `nvim-dap` bindings specifically, not get a random mix of all keymaps
- If the analytics are shallow (just an overall accuracy %) and don't break down by plugin or category
- If loading times are slow — he is opening the app in a 5-minute gap. If it takes 30 seconds to reach a practice session, that gap is gone.

---

## Persona 4: The Daily Driver

**Name**: Priya Nair
**Role**: Principal Engineer / Open Source Contributor
**Age**: 38
**Location**: Amsterdam, Netherlands
**Experience Level**: Expert Vim/Neovim user (8+ years)

### Background

Priya has used Vim in some form for eight years. She writes Go at her day job, contributes to a mid-sized open-source project on weekends, and maintains a handcrafted `init.lua` (no framework — pure Neovim with manually curated plugins). She is, by any standard, a highly proficient Vim user.

But she has reached a point where she suspects her current habits contain inefficiencies she has carried for years without questioning. She still uses `:w` to save instead of her `<leader>w` mapping. She uses `dd` to delete lines instead of `d$` + `dd` when the context would be better served by a different motion. She has accumulated bad habits disguised as workflow, and she has no external reference point to identify them.

She is not looking to learn Vim — she wants to audit and refine what she already knows, and she is disciplined enough to maintain a deliberate practice habit if the tool is good.

### Daily Workflow

- 8+ hours/day in Neovim, zero mouse usage
- Deep LSP usage (she writes Go and relies on gopls heavily)
- Extensive macro usage (`q` + register) for repetitive refactoring
- Contributes to open source in evening sessions — different project, similar config, occasionally hits muscle memory gaps when switching contexts
- Periodically reviews her config and removes bindings she never uses — but has no data to inform which ones those are

### Pain Points

1. **No baseline measurement.** She has been using Vim for 8 years and genuinely does not know her average response time for her 20 most-used commands. She suspects it is slower than it should be for an expert.
2. **Habit debt.** Years of accumulated shortcuts — some optimal, some not — have calcified into patterns. She uses what she learned, not always what is best. She wants an external audit.
3. **Config ROI blindness.** She has 200+ keymaps. She suspects she actively uses 50–70. She wants to know which 130–150 are dormant and decide whether to remove them or practice them.
4. **Plateau without evidence.** She feels like a very proficient Vim user, but she cannot tell if she has been at a plateau for two years or genuinely improving. Without measurement, she cannot tell.

### Goals on VimTrainer

- Get a full mastery audit of her entire config — see every binding's current accuracy and response time
- Identify specific commands where her response time is above 2 seconds (a threshold she considers "not muscle memory")
- Establish a baseline accuracy and response time score, then track improvement (or decay) over 90 days
- Identify bindings she never touches in practice (never appears in sessions, not in daily queue) and consider removing them from her config
- Use Speed Demon and Accuracy King achievements as benchmarks, not for the badge, but because the conditions (< 1000ms average, 100% accuracy) represent a concrete standard worth meeting

### What Success Looks Like

After 90 days, Priya has a clear picture: her core motion accuracy is 97%, her LSP bindings average 890ms response time (below her 2000ms threshold), but her macro-related bindings (`q{char}`, `@{char}`) average 2,400ms. She starts a 2-week targeted macro practice. The accuracy data has also revealed that she has 47 keymaps she has never once triggered in practice — she audits them in her actual config and removes 31 that no longer reflect how she works. Her config is tighter. Her practice data is honest. She has evidence of expert-level proficiency for the first time.

### What Would Make Her Leave

- If the tool cannot handle 200+ keymaps without performance issues
- If the analytics lack response time breakdown — accuracy alone is not sufficient for her use case
- If the tool feels like it is designed for beginners (patronizing copy, overly celebratory achievement animations that cannot be disabled)
- If session data is not exportable or queryable — she wants raw data access, not just charts
- If the spaced repetition engine is opaque and she cannot understand why a specific command is appearing in a session
