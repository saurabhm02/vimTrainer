const KEYS = {
  srsState:   'vt:guest:srs',
  settings:   'vt:guest:settings',
  sessionLog: 'vt:guest:sessions',
  token:      'vt:guest:token',
} as const;

export interface GuestSRSEntry {
  keymapId: string;
  easeFactor: number;
  interval: number;
  dueDate: string;  // YYYY-MM-DD
  repetitions: number;
}

export function getGuestSRS(): GuestSRSEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.srsState) ?? '[]');
  } catch {
    return [];
  }
}

export function setGuestSRS(entries: GuestSRSEntry[]): void {
  localStorage.setItem(KEYS.srsState, JSON.stringify(entries));
}

export function updateGuestSRSEntry(entry: GuestSRSEntry): void {
  const all = getGuestSRS();
  const idx = all.findIndex(e => e.keymapId === entry.keymapId);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  setGuestSRS(all);
}

export function clearGuestState(): void {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

export function getGuestToken(): string | null {
  return localStorage.getItem(KEYS.token);
}

export function setGuestToken(token: string): void {
  localStorage.setItem(KEYS.token, token);
}
