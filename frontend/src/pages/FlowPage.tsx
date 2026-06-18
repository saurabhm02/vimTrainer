import { useState, useEffect, useRef, useCallback } from 'react';
import { BufferPane } from '../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../components/terminal/BufferPane/BufferPane';
import { InfoPanel } from '../components/terminal/InfoPanel/InfoPanel';
import { PaneSep } from '../components/terminal/PaneSep/PaneSep';
import { useTerminalStore } from '../stores/terminalStore';
import { getBuiltinPack, shufflePack } from '../utils/builtinPacks';
import type { BuiltinKeymap } from '../utils/builtinPacks';

type FlowState = 'setup' | 'active' | 'done';

const DURATIONS = [60, 120, 180, 300] as const;
type Duration = (typeof DURATIONS)[number];

function normalizeKey(e: KeyboardEvent): string {
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return '';
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl) return `<C-${e.key.toLowerCase()}>`;
  switch (e.key) {
    case 'Escape':    return '<Esc>';
    case 'Enter':     return '<CR>';
    case 'Backspace': return '<BS>';
    case 'Tab':       return '<Tab>';
    case ' ':         return '<leader>';
    default: return e.key.length === 1 ? e.key : `<${e.key}>`;
  }
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function FlowPage() {
  const { setStatus, setCmdline, clearCmdline } = useTerminalStore();

  const [flowState, setFlowState] = useState<FlowState>('setup');
  const [duration, setDuration]   = useState<Duration>(60);
  const [queue, setQueue]         = useState<BuiltinKeymap[]>([]);
  const [cursor, setCursor]       = useState(0);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [typedKeys, setTypedKeys] = useState<string[]>([]);
  const [score, setScore]         = useState({ correct: 0, total: 0 });
  const [history, setHistory]     = useState<Array<{ seq: string; ok: boolean }>>([]);

  const processingRef    = useRef(false);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferRef        = useRef<HTMLDivElement>(null);

  const current = queue[cursor];
  const accuracy = score.total > 0
    ? Math.round((score.correct / score.total) * 100) : 100;

  // Statusline
  useEffect(() => {
    if (flowState === 'active') {
      setStatus({
        statusMode: 'FLOW',
        statusFile: 'flow',
        statusCategory: 'all',
        statusProgress: `${score.correct}/${score.total}`,
        statusAccuracy: `${accuracy}%`,
        statusTiming: fmtTime(timeLeft),
        statusRight: '',
      });
    } else {
      setStatus({ statusMode: 'NORMAL', statusFile: 'flow', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '', statusRight: '' });
    }
  }, [flowState, score, accuracy, timeLeft, setStatus]);

  // Countdown timer
  useEffect(() => {
    if (flowState !== 'active') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setFlowState('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [flowState]);

  const advance = useCallback(() => {
    setCursor(c => c + 1);
    setTypedKeys([]);
    processingRef.current = false;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (flowState !== 'active' || processingRef.current || !current) return;

    const key = normalizeKey(e);
    if (!key) return;
    if (e.ctrlKey || e.metaKey) e.preventDefault();

    if (key === '<Esc>') {
      if (timerRef.current) clearInterval(timerRef.current);
      setFlowState('done'); clearCmdline(); return;
    }

    const newKeys = [...typedKeys, key];
    setTypedKeys(newKeys);
    const typed  = newKeys.join('');
    const target = current.keySequence;

    if (typed === target) {
      processingRef.current = true;
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      setHistory(h => [...h, { seq: target, ok: true }]);
      setCmdline({ type: 'correct', text: `-- correct` });
      setTimeout(() => { clearCmdline(); advance(); }, 400);
    } else if (!target.startsWith(typed)) {
      processingRef.current = true;
      setScore(s => ({ ...s, total: s.total + 1 }));
      setHistory(h => [...h, { seq: target, ok: false }]);
      setCmdline({ type: 'incorrect', text: `-- expected: ${target}` });
      setTimeout(() => { clearCmdline(); advance(); }, 800);
    }
  }, [flowState, current, typedKeys, advance, setCmdline, clearCmdline]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleStart = () => {
    const pack = shufflePack(getBuiltinPack('all'));
    // Repeat pack if needed to fill the session (max 200 items)
    const big: BuiltinKeymap[] = [];
    while (big.length < 200) big.push(...pack);
    setQueue(big);
    setCursor(0);
    setTypedKeys([]);
    setScore({ correct: 0, total: 0 });
    setHistory([]);
    setTimeLeft(duration);
    setFlowState('active');
  };

  // ── Setup ──────────────────────────────────────────────────────────────
  if (flowState === 'setup') {
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- flow mode · timed sprint</span> },
      { num: 2, content: '' },
      { num: 3, content: 'Flow mode is a timed sprint. Keybindings scroll past — type' },
      { num: 4, content: 'them as fast as you can. Time runs out when the clock hits 0.' },
      { num: 5, content: '' },
      { num: 6, content: 'Duration:' },
      { num: 7, content: '' },
      ...DURATIONS.map((d, i): BufferLine => ({
        num: 8 + i,
        content: (
          <span
            className={`setup-opt${duration === d ? ' setup-opt--active' : ''}`}
            onClick={() => setDuration(d)}
          >
            {'    '}<kbd className="setup-key">{i + 1}</kbd>{' '}{fmtTime(d)}
          </span>
        ),
      })),
      { num: 12, content: '' },
      { num: 13, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 14, content: '' },
      { num: 15, content: (
        <button className="setup-start" onClick={handleStart}>
          Press Enter to start
        </button>
      )},
    ];
    return (
      <div className="flow-shell">
        <BufferPane lines={lines} tildeStart={16} totalLines={35} />
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────
  if (flowState === 'done') {
    const wpm = Math.round((score.correct / (duration / 60)));
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- flow complete · {fmtTime(duration)} sprint</span> },
      { num: 2, content: '' },
      { num: 3, content: `correct     ${score.correct}` },
      { num: 4, content: `total       ${score.total}` },
      { num: 5, content: `accuracy    ${accuracy}%` },
      { num: 6, content: `speed       ~${wpm} keys/min` },
      { num: 7, content: '' },
      { num: 8, content: 'Last 10:' },
      { num: 9, content: '' },
      ...history.slice(-10).map((h, i): BufferLine => ({
        num: 10 + i,
        content: (
          <span style={{ color: h.ok ? 'var(--green)' : 'var(--red)' }}>
            {'    '}{h.ok ? '✓' : '✗'} <span className="kb">{h.seq}</span>
          </span>
        ),
      })),
      { num: 20, content: '' },
      { num: 21, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 22, content: '' },
      { num: 23, content: (
        <button className="setup-start" onClick={() => setFlowState('setup')}>
          go again
        </button>
      )},
    ];
    return (
      <div className="flow-shell">
        <BufferPane lines={lines} tildeStart={24} totalLines={35} />
      </div>
    );
  }

  // ── Active ─────────────────────────────────────────────────────────────
  const typedStr = typedKeys.join('');

  // Build scrolling buffer: past 4, current (active), next 3
  const past4   = queue.slice(Math.max(0, cursor - 4), cursor);
  const next3   = queue.slice(cursor + 1, cursor + 4);

  const startNum = Math.max(1, cursor - 3);
  let lineNum = startNum;

  const arenaLines: BufferLine[] = [
    { num: 1, content: <span className="buf-comment">-- flow · {fmtTime(timeLeft)} remaining</span> },
    { num: 2, content: '' },
  ];

  // Past lines (dimmed)
  past4.forEach(item => {
    arenaLines.push({
      num: lineNum++,
      content: <span className="flow-past">{'    '}<span className="kb flow-kb-dim">{item.keySequence}</span>  {item.description}</span>,
      dim: true,
    });
  });

  // Current (active)
  arenaLines.push({
    num: lineNum++,
    content: (
      <span className="flow-current">
        {'  ▶ '}
        <span className="kb">{current?.keySequence}</span>
        {'  '}
        <span className="flow-current-desc">{current?.description}</span>
        {'  '}
        <span className="flow-typed">
          {typedStr}<span className="buf-cursor" />
        </span>
      </span>
    ),
    active: true,
  });

  // Next lines (muted)
  next3.forEach(item => {
    arenaLines.push({
      num: lineNum++,
      content: <span className="flow-next">{'    '}<span className="kb flow-kb-dim">{item.keySequence}</span>  {item.description}</span>,
    });
  });

  const infoSections = [
    { title: 'TIMER',   rows: [{ value: fmtTime(timeLeft), accent: timeLeft <= 10 }] },
    { title: 'SCORE',   rows: [
      { label: 'correct',  value: `${score.correct}` },
      { label: 'accuracy', value: `${accuracy}%`, accent: accuracy >= 90 },
    ]},
    { title: 'STREAK',  rows: [{ value: `${history.filter(h => h.ok).length}/${history.length}` }] },
  ];

  return (
    <div className="flow-shell">
      <BufferPane ref={bufferRef} lines={arenaLines} tildeStart={lineNum} totalLines={35} />
      <PaneSep />
      <InfoPanel sections={infoSections} />
    </div>
  );
}
