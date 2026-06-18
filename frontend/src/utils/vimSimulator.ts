// V1: command-match validation against a list of accepted sequences.
// Outcome-based buffer diff deferred to V2.

export type SimulatorMode = 'normal' | 'insert' | 'visual';

export interface SimulatorState {
  mode: SimulatorMode;
  typed: string[];        // keys accumulated so far
  complete: boolean;      // true when a valid command was matched
  mismatch: boolean;      // true when typed sequence can't match any command
  matchedCommand: string; // which accepted command was matched
}

function initState(): SimulatorState {
  return { mode: 'normal', typed: [], complete: false, mismatch: false, matchedCommand: '' };
}

export function createSimulator(acceptedCommands: string[]): {
  state: SimulatorState;
  feed: (key: string) => SimulatorState;
  reset: () => SimulatorState;
} {
  let state = initState();

  function feed(key: string): SimulatorState {
    if (state.complete || state.mismatch) return state;

    const newTyped = [...state.typed, key];
    const typedStr = newTyped.join('');

    // Check for exact match
    const exactMatch = acceptedCommands.find(cmd => cmd === typedStr);
    if (exactMatch) {
      state = { ...state, typed: newTyped, complete: true, matchedCommand: exactMatch };
      return state;
    }

    // Check if any command still has this as a prefix
    const hasPrefix = acceptedCommands.some(cmd => cmd.startsWith(typedStr));
    if (hasPrefix) {
      state = { ...state, typed: newTyped };
      return state;
    }

    // Mismatch — no command starts with this
    state = { ...state, typed: newTyped, mismatch: true };
    return state;
  }

  function reset(): SimulatorState {
    state = initState();
    return state;
  }

  return { get state() { return state; }, feed, reset };
}

export function normalizeEditorKey(e: KeyboardEvent): string {
  // Pure modifier key presses — ignore
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return '';
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl) return `<C-${e.key.toLowerCase()}>`;
  switch (e.key) {
    case 'Escape':    return '<Esc>';
    case 'Enter':     return '<CR>';
    case 'Backspace': return '<BS>';
    case 'Tab':       return '<Tab>';
    // Space = leader key (saurabh's config: leader = <Space>)
    case ' ':         return '<leader>';
    case 'ArrowUp':   return '<Up>';
    case 'ArrowDown': return '<Down>';
    case 'ArrowLeft': return '<Left>';
    case 'ArrowRight':return '<Right>';
    default: return e.key.length === 1 ? e.key : `<${e.key}>`;
  }
}
