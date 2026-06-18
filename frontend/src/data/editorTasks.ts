export interface EditorTask {
  id: string;
  title: string;
  language: 'go' | 'lua' | 'typescript' | 'python';
  description: string;
  initialBuffer: string[];   // lines shown in the editor buffer
  instruction: string;       // what the user must do
  acceptedCommands: string[];// any of these key sequences completes the task
  hint?: string;             // shown when hint is toggled
}

export const EDITOR_TASKS: EditorTask[] = [
  // ── Go ────────────────────────────────────────────────────────────────
  {
    id: 'go-01',
    language: 'go',
    title: 'Go to first line',
    description: 'The cursor is at the bottom. Jump to the very first line.',
    initialBuffer: [
      'package main',
      '',
      'import "fmt"',
      '',
      'func main() {',
      '    fmt.Println("hello")',
      '}',
    ],
    instruction: 'Go to the first line of the file',
    acceptedCommands: ['gg', '1G', ':1<CR>'],
    hint: 'gg  — jump to first line',
  },
  {
    id: 'go-02',
    language: 'go',
    title: 'Go to last line',
    description: 'Jump to the very last line of the file.',
    initialBuffer: [
      'package main',
      '',
      'import "fmt"',
      '',
      'func main() {',
      '    fmt.Println("hello")',
      '}',
    ],
    instruction: 'Go to the last line of the file',
    acceptedCommands: ['G'],
    hint: 'G  — jump to last line',
  },
  {
    id: 'go-03',
    language: 'go',
    title: 'Delete inner word',
    description: 'The cursor is on a variable name. Delete just the word under the cursor.',
    initialBuffer: [
      'func greet(name string) string {',
      '    greeting := "Hello, " + name',
      '    return greeting',
      '}',
    ],
    instruction: 'Delete the word under the cursor without entering Insert mode',
    acceptedCommands: ['diw', 'daw'],
    hint: 'diw  — delete inner word',
  },
  {
    id: 'go-04',
    language: 'go',
    title: 'Change inner word',
    description: 'Replace the word under the cursor and enter Insert mode.',
    initialBuffer: [
      'var count int = 0',
      'count++',
      'fmt.Println(count)',
    ],
    instruction: 'Change the word under the cursor (delete + enter Insert mode)',
    acceptedCommands: ['ciw', 'caw'],
    hint: 'ciw  — change inner word',
  },
  {
    id: 'go-05',
    language: 'go',
    title: 'Yank inner word',
    description: 'Copy the word under the cursor into the unnamed register.',
    initialBuffer: [
      'type Server struct {',
      '    host string',
      '    port int',
      '}',
    ],
    instruction: 'Yank (copy) the word under the cursor',
    acceptedCommands: ['yiw', 'yaw'],
    hint: 'yiw  — yank inner word',
  },

  // ── Lua ───────────────────────────────────────────────────────────────
  {
    id: 'lua-01',
    language: 'lua',
    title: 'Center the current line',
    description: 'Scroll the buffer so the current line is vertically centered.',
    initialBuffer: [
      'local M = {}',
      '',
      'function M.setup(opts)',
      '    opts = opts or {}',
      '    M.opts = vim.tbl_deep_extend("force", defaults, opts)',
      'end',
      '',
      'return M',
    ],
    instruction: 'Center the current line in the window',
    acceptedCommands: ['zz'],
    hint: 'zz  — center current line',
  },
  {
    id: 'lua-02',
    language: 'lua',
    title: 'Jump to matching bracket',
    description: 'Jump between the opening and closing parenthesis.',
    initialBuffer: [
      'vim.keymap.set("n", "<leader>ff",',
      '    function()',
      '        require("telescope.builtin").find_files()',
      '    end,',
      '    { desc = "Find files" })',
    ],
    instruction: 'Jump to the matching bracket/parenthesis',
    acceptedCommands: ['%'],
    hint: '%  — jump to matching bracket',
  },
  {
    id: 'lua-03',
    language: 'lua',
    title: 'Delete inside parentheses',
    description: 'Delete the content inside the parentheses without deleting the parens.',
    initialBuffer: [
      'local result = calculate(x, y, z)',
      'print(result)',
    ],
    instruction: 'Delete everything inside the parentheses on the current line',
    acceptedCommands: ['di(', 'di)'],
    hint: 'di(  — delete inside parentheses',
  },
  {
    id: 'lua-04',
    language: 'lua',
    title: 'Scroll down half page',
    description: 'Move down half a page without moving the cursor to a specific line.',
    initialBuffer: Array.from({ length: 20 }, (_, i) => `-- line ${i + 1}`),
    instruction: 'Scroll down half a page',
    acceptedCommands: ['<C-d>'],
    hint: '<C-d>  — scroll down half page',
  },
  {
    id: 'lua-05',
    language: 'lua',
    title: 'Scroll up half page',
    description: 'Move up half a page.',
    initialBuffer: Array.from({ length: 20 }, (_, i) => `-- line ${i + 1}`),
    instruction: 'Scroll up half a page',
    acceptedCommands: ['<C-u>'],
    hint: '<C-u>  — scroll up half page',
  },

  // ── TypeScript ────────────────────────────────────────────────────────
  {
    id: 'ts-01',
    language: 'typescript',
    title: 'Search word under cursor',
    description: 'Search forward for all occurrences of the word under the cursor.',
    initialBuffer: [
      'interface User {',
      '    id: string;',
      '    name: string;',
      '    email: string;',
      '}',
      '',
      'function getUser(id: string): User {',
      '    return users.find(u => u.id === id)!;',
      '}',
    ],
    instruction: 'Search forward for the word under the cursor',
    acceptedCommands: ['*'],
    hint: '*  — search word under cursor (forward)',
  },
  {
    id: 'ts-02',
    language: 'typescript',
    title: 'Delete to end of line',
    description: 'Delete everything from the cursor to the end of the line.',
    initialBuffer: [
      'const message = "Hello, world!  // TODO: change this"',
      'console.log(message)',
    ],
    instruction: 'Delete from the cursor position to the end of the line',
    acceptedCommands: ['D', 'd$'],
    hint: 'D  — delete to end of line',
  },
  {
    id: 'ts-03',
    language: 'typescript',
    title: 'Change to end of line',
    description: 'Delete to end of line and enter Insert mode.',
    initialBuffer: [
      'export function handleSubmit(e: React.FormEvent) {',
      '    e.preventDefault() // add logic here',
      '}',
    ],
    instruction: 'Change from cursor to end of line (delete + Insert mode)',
    acceptedCommands: ['C', 'c$'],
    hint: 'C  — change to end of line',
  },
  {
    id: 'ts-04',
    language: 'typescript',
    title: 'Go to local definition',
    description: 'Jump to where the symbol under the cursor is defined.',
    initialBuffer: [
      'const router = createRouter()',
      '',
      'router.get("/api/users", getUsers)',
      'router.post("/api/users", createUser)',
    ],
    instruction: 'Go to the local definition of the symbol under the cursor',
    acceptedCommands: ['gd'],
    hint: 'gd  — go to local definition',
  },
  {
    id: 'ts-05',
    language: 'typescript',
    title: 'Select inner word',
    description: 'Visually select the word under the cursor.',
    initialBuffer: [
      'const apiUrl = process.env.VITE_API_URL ?? "http://localhost:3000"',
    ],
    instruction: 'Visually select the word under the cursor',
    acceptedCommands: ['viw', 'vaw'],
    hint: 'viw  — select inner word',
  },

  // ── Python ────────────────────────────────────────────────────────────
  {
    id: 'py-01',
    language: 'python',
    title: 'Search backward for word',
    description: 'Search backward for all occurrences of the word under the cursor.',
    initialBuffer: [
      'def process_items(items):',
      '    result = []',
      '    for item in items:',
      '        if item.valid:',
      '            result.append(item)',
      '    return result',
    ],
    instruction: 'Search backward for the word under the cursor',
    acceptedCommands: ['#'],
    hint: '#  — search word under cursor (backward)',
  },
  {
    id: 'py-02',
    language: 'python',
    title: 'Go to last insert position',
    description: 'Jump back to where you last made an insertion.',
    initialBuffer: [
      'class DataProcessor:',
      '    def __init__(self, config):',
      '        self.config = config',
      '        self.data = []',
      '',
      '    def process(self):',
      '        pass',
    ],
    instruction: 'Jump to the last position where Insert mode was used',
    acceptedCommands: ['gi'],
    hint: 'gi  — go to last insert position',
  },
  {
    id: 'py-03',
    language: 'python',
    title: 'Delete around parentheses',
    description: 'Delete everything inside AND including the parentheses.',
    initialBuffer: [
      'result = calculate(value, multiplier, offset)',
      'print(result)',
    ],
    instruction: 'Delete everything including the surrounding parentheses',
    acceptedCommands: ['da(', 'da)'],
    hint: 'da(  — delete around parentheses (includes parens)',
  },
  {
    id: 'py-04',
    language: 'python',
    title: 'Go to global definition',
    description: 'Jump to the global definition of the symbol under the cursor.',
    initialBuffer: [
      'from utils import validate_input',
      '',
      'def run():',
      '    data = validate_input(raw)',
      '    return process(data)',
    ],
    instruction: 'Go to the global definition of the symbol under the cursor',
    acceptedCommands: ['gD'],
    hint: 'gD  — go to global definition',
  },
  {
    id: 'py-05',
    language: 'python',
    title: 'Change inner tag',
    description: 'Change the content inside an HTML/XML tag.',
    initialBuffer: [
      '<!-- Template snippet -->',
      '<div class="container">',
      '    <p>Replace this text</p>',
      '</div>',
    ],
    instruction: 'Change the content inside the <p> tag',
    acceptedCommands: ['cit'],
    hint: 'cit  — change inner tag',
  },
];

export function getTasksByLanguage(lang: EditorTask['language']): EditorTask[] {
  return EDITOR_TASKS.filter(t => t.language === lang);
}

export function getRandomTask(): EditorTask {
  return EDITOR_TASKS[Math.floor(Math.random() * EDITOR_TASKS.length)];
}
