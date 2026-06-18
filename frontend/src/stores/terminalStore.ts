import { create } from 'zustand';

export type CmdlineType = 'correct' | 'incorrect' | 'info' | 'idle';

export interface CmdlineMsg {
  type: CmdlineType;
  text: string;
}

interface StatusFields {
  statusMode: string;
  statusFile: string;
  statusCategory: string;
  statusProgress: string;
  statusAccuracy: string;
  statusTiming: string;
  statusRight: string;
}

interface TerminalStore extends StatusFields {
  cmdlineMsg: CmdlineMsg;
  setCmdline: (msg: CmdlineMsg) => void;
  clearCmdline: () => void;
  setStatus: (fields: Partial<StatusFields>) => void;
}

export const useTerminalStore = create<TerminalStore>()((set) => ({
  cmdlineMsg: { type: 'idle', text: '' },
  statusMode: 'NORMAL',
  statusFile: 'vimtrainer',
  statusCategory: '',
  statusProgress: '',
  statusAccuracy: '',
  statusTiming: '',
  statusRight: '',
  setCmdline: (msg) => set({ cmdlineMsg: msg }),
  clearCmdline: () => set({ cmdlineMsg: { type: 'idle', text: '' } }),
  setStatus: (fields) => set(fields),
}));
