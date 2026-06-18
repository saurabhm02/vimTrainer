// Built-in keymaps extracted from saurabh's neovim config
// leader = <Space>

export interface BuiltinKeymap {
  id: string;
  keySequence: string;
  description: string;
  category: string;
  mode: string;
}

// ── Default Vim Motions ───────────────────────────────────────────────────
export const MOTION_PACK: BuiltinKeymap[] = [
  { id: 'vm-01', keySequence: 'gg',    description: 'Go to first line',                  category: 'motion', mode: 'normal' },
  { id: 'vm-02', keySequence: 'G',     description: 'Go to last line',                   category: 'motion', mode: 'normal' },
  { id: 'vm-03', keySequence: 'zz',    description: 'Center current line in window',     category: 'motion', mode: 'normal' },
  { id: 'vm-04', keySequence: 'zt',    description: 'Scroll line to top of window',      category: 'motion', mode: 'normal' },
  { id: 'vm-05', keySequence: 'zb',    description: 'Scroll line to bottom of window',   category: 'motion', mode: 'normal' },
  { id: 'vm-06', keySequence: '%',     description: 'Jump to matching bracket',          category: 'motion', mode: 'normal' },
  { id: 'vm-07', keySequence: '*',     description: 'Search word under cursor (fwd)',    category: 'motion', mode: 'normal' },
  { id: 'vm-08', keySequence: '#',     description: 'Search word under cursor (bwd)',    category: 'motion', mode: 'normal' },
  { id: 'vm-09', keySequence: 'w',     description: 'Move to next word start',           category: 'motion', mode: 'normal' },
  { id: 'vm-10', keySequence: 'b',     description: 'Move to prev word start',           category: 'motion', mode: 'normal' },
  { id: 'vm-11', keySequence: 'e',     description: 'Move to end of word',               category: 'motion', mode: 'normal' },
  { id: 'vm-12', keySequence: 'W',     description: 'Move to next WORD start',           category: 'motion', mode: 'normal' },
  { id: 'vm-13', keySequence: 'B',     description: 'Move to prev WORD start',           category: 'motion', mode: 'normal' },
  { id: 'vm-14', keySequence: '0',     description: 'Go to beginning of line',           category: 'motion', mode: 'normal' },
  { id: 'vm-15', keySequence: '$',     description: 'Go to end of line',                 category: 'motion', mode: 'normal' },
  { id: 'vm-16', keySequence: '^',     description: 'Go to first non-blank char',        category: 'motion', mode: 'normal' },
  { id: 'vm-17', keySequence: 'f',     description: 'Find char forward on line',         category: 'motion', mode: 'normal' },
  { id: 'vm-18', keySequence: 'F',     description: 'Find char backward on line',        category: 'motion', mode: 'normal' },
  { id: 'vm-19', keySequence: 't',     description: 'Move before char forward',          category: 'motion', mode: 'normal' },
  { id: 'vm-20', keySequence: 'T',     description: 'Move before char backward',         category: 'motion', mode: 'normal' },
  { id: 'vm-21', keySequence: ';',     description: 'Repeat last f/t/F/T motion',        category: 'motion', mode: 'normal' },
  { id: 'vm-22', keySequence: ',',     description: 'Repeat last f/t/F/T (reverse)',     category: 'motion', mode: 'normal' },
  { id: 'vm-23', keySequence: 'H',     description: 'Move to top of screen',             category: 'motion', mode: 'normal' },
  { id: 'vm-24', keySequence: 'M',     description: 'Move to middle of screen',          category: 'motion', mode: 'normal' },
  { id: 'vm-25', keySequence: 'L',     description: 'Move to bottom of screen',          category: 'motion', mode: 'normal' },
  { id: 'vm-26', keySequence: 'gd',    description: 'Go to local definition',            category: 'motion', mode: 'normal' },
  { id: 'vm-27', keySequence: 'gD',    description: 'Go to global declaration',          category: 'motion', mode: 'normal' },
  { id: 'vm-28', keySequence: 'gi',    description: 'Go to last insert position',        category: 'motion', mode: 'normal' },
  { id: 'vm-29', keySequence: 'gv',    description: 'Reselect last visual selection',    category: 'motion', mode: 'normal' },
  { id: 'vm-30', keySequence: "'.",    description: "Jump to last change position",      category: 'motion', mode: 'normal' },
];

// ── Text Objects / Editing ────────────────────────────────────────────────
export const EDITING_PACK: BuiltinKeymap[] = [
  { id: 've-01', keySequence: 'ciw',   description: 'Change inner word',                 category: 'editing', mode: 'normal' },
  { id: 've-02', keySequence: 'diw',   description: 'Delete inner word',                 category: 'editing', mode: 'normal' },
  { id: 've-03', keySequence: 'yiw',   description: 'Yank inner word',                   category: 'editing', mode: 'normal' },
  { id: 've-04', keySequence: 'viw',   description: 'Select inner word',                 category: 'editing', mode: 'normal' },
  { id: 've-05', keySequence: 'caw',   description: 'Change around word',                category: 'editing', mode: 'normal' },
  { id: 've-06', keySequence: 'daw',   description: 'Delete around word',                category: 'editing', mode: 'normal' },
  { id: 've-07', keySequence: 'di(',   description: 'Delete inside parentheses',         category: 'editing', mode: 'normal' },
  { id: 've-08', keySequence: 'da(',   description: 'Delete around parentheses',         category: 'editing', mode: 'normal' },
  { id: 've-09', keySequence: 'ci(',   description: 'Change inside parentheses',         category: 'editing', mode: 'normal' },
  { id: 've-10', keySequence: 'ca(',   description: 'Change around parentheses',         category: 'editing', mode: 'normal' },
  { id: 've-11', keySequence: 'di{',   description: 'Delete inside curly braces',        category: 'editing', mode: 'normal' },
  { id: 've-12', keySequence: 'ci{',   description: 'Change inside curly braces',        category: 'editing', mode: 'normal' },
  { id: 've-13', keySequence: 'di"',   description: 'Delete inside double quotes',       category: 'editing', mode: 'normal' },
  { id: 've-14', keySequence: "di'",   description: 'Delete inside single quotes',       category: 'editing', mode: 'normal' },
  { id: 've-15', keySequence: 'ci"',   description: 'Change inside double quotes',       category: 'editing', mode: 'normal' },
  { id: 've-16', keySequence: 'cit',   description: 'Change inner tag',                  category: 'editing', mode: 'normal' },
  { id: 've-17', keySequence: 'dit',   description: 'Delete inner tag',                  category: 'editing', mode: 'normal' },
  { id: 've-18', keySequence: 'D',     description: 'Delete to end of line',             category: 'editing', mode: 'normal' },
  { id: 've-19', keySequence: 'C',     description: 'Change to end of line',             category: 'editing', mode: 'normal' },
  { id: 've-20', keySequence: 'dd',    description: 'Delete current line',               category: 'editing', mode: 'normal' },
  { id: 've-21', keySequence: 'yy',    description: 'Yank current line',                 category: 'editing', mode: 'normal' },
  { id: 've-22', keySequence: 'cc',    description: 'Change current line',               category: 'editing', mode: 'normal' },
  { id: 've-23', keySequence: 'J',     description: 'Join lines (keep cursor pos)',       category: 'editing', mode: 'normal' },
  { id: 've-24', keySequence: 'u',     description: 'Undo',                              category: 'editing', mode: 'normal' },
  { id: 've-25', keySequence: '<C-r>', description: 'Redo',                              category: 'editing', mode: 'normal' },
  { id: 've-26', keySequence: '.',     description: 'Repeat last change',                category: 'editing', mode: 'normal' },
  { id: 've-27', keySequence: '~',     description: 'Toggle case of char under cursor',  category: 'editing', mode: 'normal' },
  { id: 've-28', keySequence: 'guu',   description: 'Lowercase current line',            category: 'editing', mode: 'normal' },
  { id: 've-29', keySequence: 'gUU',   description: 'Uppercase current line',            category: 'editing', mode: 'normal' },
  { id: 've-30', keySequence: '>>',    description: 'Indent line right',                 category: 'editing', mode: 'normal' },
  { id: 've-31', keySequence: '<<',    description: 'Indent line left',                  category: 'editing', mode: 'normal' },
  { id: 've-32', keySequence: 'p',     description: 'Paste after cursor',                category: 'editing', mode: 'normal' },
  { id: 've-33', keySequence: 'P',     description: 'Paste before cursor',               category: 'editing', mode: 'normal' },
  { id: 've-34', keySequence: 'o',     description: 'Open new line below, insert mode',  category: 'editing', mode: 'normal' },
  { id: 've-35', keySequence: 'O',     description: 'Open new line above, insert mode',  category: 'editing', mode: 'normal' },
  { id: 've-36', keySequence: 'A',     description: 'Append at end of line',             category: 'editing', mode: 'normal' },
  { id: 've-37', keySequence: 'I',     description: 'Insert at beginning of line',       category: 'editing', mode: 'normal' },
  { id: 've-38', keySequence: 'a',     description: 'Append after cursor',               category: 'editing', mode: 'normal' },
  { id: 've-39', keySequence: 's',     description: 'Delete char and insert',            category: 'editing', mode: 'normal' },
  { id: 've-40', keySequence: 'S',     description: 'Delete line and insert',            category: 'editing', mode: 'normal' },
];

// ── LSP keymaps (saurabh's config) ───────────────────────────────────────
export const LSP_PACK: BuiltinKeymap[] = [
  { id: 'ls-01', keySequence: 'gR',         description: 'LSP references (Telescope)',      category: 'lsp', mode: 'normal' },
  { id: 'ls-02', keySequence: 'gD',         description: 'Go to declaration',               category: 'lsp', mode: 'normal' },
  { id: 'ls-03', keySequence: 'gd',         description: 'LSP definitions (Telescope)',      category: 'lsp', mode: 'normal' },
  { id: 'ls-04', keySequence: 'gi',         description: 'LSP implementations',             category: 'lsp', mode: 'normal' },
  { id: 'ls-05', keySequence: 'gt',         description: 'LSP type definitions',            category: 'lsp', mode: 'normal' },
  { id: 'ls-06', keySequence: '<leader>vca',description: 'Code actions',                    category: 'lsp', mode: 'normal' },
  { id: 'ls-07', keySequence: '<leader>rn', description: 'Smart rename',                    category: 'lsp', mode: 'normal' },
  { id: 'ls-08', keySequence: '<leader>D',  description: 'Buffer diagnostics',              category: 'lsp', mode: 'normal' },
  { id: 'ls-09', keySequence: 'df',         description: 'Line diagnostics float',          category: 'lsp', mode: 'normal' },
  { id: 'ls-10', keySequence: 'K',          description: 'Hover documentation',             category: 'lsp', mode: 'normal' },
  { id: 'ls-11', keySequence: '<leader>f',  description: 'Format file (LSP)',               category: 'lsp', mode: 'normal' },
  { id: 'ls-12', keySequence: '<leader>lx', description: 'Toggle LSP virtual text',         category: 'lsp', mode: 'normal' },
  { id: 'ls-13', keySequence: '<leader>lr', description: 'Restart LSP',                     category: 'lsp', mode: 'normal' },
];

// ── Git keymaps (Gitsigns + Fugitive) ────────────────────────────────────
export const GIT_PACK: BuiltinKeymap[] = [
  { id: 'gt-01', keySequence: ']h',          description: 'Next git hunk',                  category: 'git', mode: 'normal' },
  { id: 'gt-02', keySequence: '[h',          description: 'Prev git hunk',                  category: 'git', mode: 'normal' },
  { id: 'gt-03', keySequence: '<leader>gs',  description: 'Stage hunk',                     category: 'git', mode: 'normal' },
  { id: 'gt-04', keySequence: '<leader>gr',  description: 'Reset hunk',                     category: 'git', mode: 'normal' },
  { id: 'gt-05', keySequence: '<leader>gS',  description: 'Stage buffer',                   category: 'git', mode: 'normal' },
  { id: 'gt-06', keySequence: '<leader>gR',  description: 'Reset buffer',                   category: 'git', mode: 'normal' },
  { id: 'gt-07', keySequence: '<leader>gu',  description: 'Undo stage hunk',                category: 'git', mode: 'normal' },
  { id: 'gt-08', keySequence: '<leader>gp',  description: 'Preview hunk',                   category: 'git', mode: 'normal' },
  { id: 'gt-09', keySequence: '<leader>gbl', description: 'Blame line (full)',               category: 'git', mode: 'normal' },
  { id: 'gt-10', keySequence: '<leader>gB',  description: 'Toggle line blame',              category: 'git', mode: 'normal' },
  { id: 'gt-11', keySequence: '<leader>gd',  description: 'Diff this',                      category: 'git', mode: 'normal' },
  { id: 'gt-12', keySequence: '<leader>gD',  description: 'Diff this ~',                    category: 'git', mode: 'normal' },
  { id: 'gt-13', keySequence: '<leader>gg',  description: 'Fugitive (fullscreen tab)',       category: 'git', mode: 'normal' },
  { id: 'gt-14', keySequence: '<leader>lg',  description: 'Open Lazygit',                   category: 'git', mode: 'normal' },
  { id: 'gt-15', keySequence: '<leader>gl',  description: 'Lazygit logs',                   category: 'git', mode: 'normal' },
  { id: 'gt-16', keySequence: '<leader>gbr', description: 'Git branches picker',            category: 'git', mode: 'normal' },
  { id: 'gt-17', keySequence: '<leader>wl',  description: 'List git worktrees',             category: 'git', mode: 'normal' },
  { id: 'gt-18', keySequence: '<leader>wc',  description: 'Create git worktree',            category: 'git', mode: 'normal' },
];

// ── Navigation / Harpoon ──────────────────────────────────────────────────
export const NAV_PACK: BuiltinKeymap[] = [
  { id: 'nv-01', keySequence: '<C-d>',   description: 'Scroll down (cursor centered)',   category: 'navigation', mode: 'normal' },
  { id: 'nv-02', keySequence: '<C-u>',   description: 'Scroll up (cursor centered)',     category: 'navigation', mode: 'normal' },
  { id: 'nv-03', keySequence: '<C-f>',   description: 'Scroll full page down',           category: 'navigation', mode: 'normal' },
  { id: 'nv-04', keySequence: '<C-b>',   description: 'Scroll full page up',             category: 'navigation', mode: 'normal' },
  { id: 'nv-05', keySequence: 'n',       description: 'Next search result (centered)',   category: 'navigation', mode: 'normal' },
  { id: 'nv-06', keySequence: 'N',       description: 'Prev search result (centered)',   category: 'navigation', mode: 'normal' },
  { id: 'nv-07', keySequence: '<C-o>',   description: 'Jump back in jump list',          category: 'navigation', mode: 'normal' },
  { id: 'nv-08', keySequence: '<C-i>',   description: 'Jump forward in jump list',       category: 'navigation', mode: 'normal' },
  { id: 'nv-09', keySequence: '<leader>a',  description: 'Harpoon: add file',            category: 'navigation', mode: 'normal' },
  { id: 'nv-10', keySequence: '<C-e>',   description: 'Harpoon: toggle menu',            category: 'navigation', mode: 'normal' },
  { id: 'nv-11', keySequence: '<C-y>',   description: 'Harpoon: jump to file 1',         category: 'navigation', mode: 'normal' },
  { id: 'nv-12', keySequence: '<C-n>',   description: 'Harpoon: jump to file 3',         category: 'navigation', mode: 'normal' },
  { id: 'nv-13', keySequence: '<C-s>',   description: 'Harpoon: jump to file 4',         category: 'navigation', mode: 'normal' },
  { id: 'nv-14', keySequence: '-',       description: 'Oil: open parent directory',      category: 'navigation', mode: 'normal' },
  { id: 'nv-15', keySequence: '<leader>-',  description: 'Oil: float window',            category: 'navigation', mode: 'normal' },
  { id: 'nv-16', keySequence: '<leader>pr', description: 'Recent files (Telescope)',     category: 'navigation', mode: 'normal' },
];

// ── Core custom keymaps ───────────────────────────────────────────────────
export const CORE_PACK: BuiltinKeymap[] = [
  { id: 'co-01', keySequence: '<leader>s',   description: 'Replace word under cursor globally', category: 'core', mode: 'normal' },
  { id: 'co-02', keySequence: '<leader>d',   description: 'Delete to void register',           category: 'core', mode: 'normal' },
  { id: 'co-03', keySequence: '<leader>X',   description: 'Make file executable',              category: 'core', mode: 'normal' },
  { id: 'co-04', keySequence: '<leader>fp',  description: 'Copy file path to clipboard',       category: 'core', mode: 'normal' },
  { id: 'co-05', keySequence: '<leader>u',   description: 'Toggle undotree',                   category: 'core', mode: 'normal' },
  { id: 'co-06', keySequence: '<leader>re',  description: 'Restart Neovim',                    category: 'core', mode: 'normal' },
  { id: 'co-07', keySequence: '<C-c>',       description: 'Clear search highlight',            category: 'core', mode: 'normal' },
  { id: 'co-08', keySequence: '<leader>sv',  description: 'Split window vertically',           category: 'core', mode: 'normal' },
  { id: 'co-09', keySequence: '<leader>sh',  description: 'Split window horizontally',         category: 'core', mode: 'normal' },
  { id: 'co-10', keySequence: '<leader>se',  description: 'Make splits equal size',            category: 'core', mode: 'normal' },
  { id: 'co-11', keySequence: '<leader>sx',  description: 'Close current split',               category: 'core', mode: 'normal' },
  { id: 'co-12', keySequence: '<leader>to',  description: 'Open new tab',                      category: 'core', mode: 'normal' },
  { id: 'co-13', keySequence: '<leader>tx',  description: 'Close current tab',                 category: 'core', mode: 'normal' },
  { id: 'co-14', keySequence: '<leader>tn',  description: 'Go to next tab',                    category: 'core', mode: 'normal' },
  { id: 'co-15', keySequence: '<leader>tp',  description: 'Go to previous tab',                category: 'core', mode: 'normal' },
  { id: 'co-16', keySequence: '<leader>tt',  description: 'Toggle float terminal',             category: 'core', mode: 'normal' },
  { id: 'co-17', keySequence: '<leader>tH',  description: 'Toggle horizontal terminal',        category: 'core', mode: 'normal' },
  { id: 'co-18', keySequence: '<leader>xw',  description: 'Workspace diagnostics (Trouble)',   category: 'core', mode: 'normal' },
  { id: 'co-19', keySequence: '<leader>xd',  description: 'Document diagnostics (Trouble)',    category: 'core', mode: 'normal' },
  { id: 'co-20', keySequence: '<leader>xq',  description: 'Quickfix list (Trouble)',           category: 'core', mode: 'normal' },
  { id: 'co-21', keySequence: '<leader>pk',  description: 'Search keymaps (Snacks)',           category: 'core', mode: 'normal' },
  { id: 'co-22', keySequence: '<leader>vh',  description: 'Help pages (Snacks)',               category: 'core', mode: 'normal' },
  { id: 'co-23', keySequence: '<leader>rN',  description: 'Rename current file (Snacks)',      category: 'core', mode: 'normal' },
  { id: 'co-24', keySequence: '<leader>dB',  description: 'Delete buffer (Snacks)',            category: 'core', mode: 'normal' },
  { id: 'co-25', keySequence: '<leader>th',  description: 'Pick colorscheme (Snacks)',         category: 'core', mode: 'normal' },
];

export const ALL_KEYMAPS: BuiltinKeymap[] = [
  ...MOTION_PACK,
  ...EDITING_PACK,
  ...LSP_PACK,
  ...GIT_PACK,
  ...NAV_PACK,
  ...CORE_PACK,
];

export type PackName = 'motion' | 'editing' | 'lsp' | 'git' | 'navigation' | 'core' | 'all';

export function getBuiltinPack(pack: PackName): BuiltinKeymap[] {
  switch (pack) {
    case 'motion':     return MOTION_PACK;
    case 'editing':    return EDITING_PACK;
    case 'lsp':        return LSP_PACK;
    case 'git':        return GIT_PACK;
    case 'navigation': return NAV_PACK;
    case 'core':       return CORE_PACK;
    case 'all':        return ALL_KEYMAPS;
  }
}

export function shufflePack(pack: BuiltinKeymap[]): BuiltinKeymap[] {
  return [...pack].sort(() => Math.random() - 0.5);
}
