import { useState, useEffect, useRef, useCallback } from 'react';
import { BufferPane } from '../../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../../components/terminal/BufferPane/BufferPane';
import { InfoPanel } from '../../components/terminal/InfoPanel/InfoPanel';
import { PaneSep } from '../../components/terminal/PaneSep/PaneSep';
import { sessionApi } from '../../services/api';
import { usePracticeStore } from '../../stores/practiceStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { getBuiltinPack, shufflePack } from '../../utils/builtinPacks';
import type { PackName } from '../../utils/builtinPacks';
import type { Challenge } from '../../types/stores';

type AppMode = 'setup' | 'active' | 'complete';
type LengthOpt = 20 | 30 | 50;

function normalizeKey(e: KeyboardEvent): string {
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return '';
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl) return `<C-${e.key.toLowerCase()}>`;
  switch (e.key) {
    case 'Escape':     return '<Esc>';
    case 'Enter':      return '<CR>';
    case 'Backspace':  return '<BS>';
    case 'Tab':        return '<Tab>';
    case ' ':          return '<leader>';
    case 'ArrowUp':    return '<Up>';
    case 'ArrowDown':  return '<Down>';
    case 'ArrowLeft':  return '<Left>';
    case 'ArrowRight': return '<Right>';
    default: return e.key.length === 1 ? e.key : `<${e.key}>`;
  }
}

const PACKS: Array<{ id: PackName; label: string; key: string }> = [
  { id: 'motion',     label: 'motions',   key: '1' },
  { id: 'editing',    label: 'editing',   key: '2' },
  { id: 'lsp',        label: 'lsp',       key: '3' },
  { id: 'git',        label: 'git',       key: '4' },
  { id: 'navigation', label: 'navigation',key: '5' },
  { id: 'core',       label: 'core',      key: '6' },
  { id: 'all',        label: 'all',       key: '7' },
];

const LENGTHS: LengthOpt[] = [20, 30, 50];

export default function PracticePage() {
  const defaultLen = useSettingsStore(s => s.sessionLength) as LengthOpt;
  const { setStatus, setCmdline, clearCmdline } = useTerminalStore();

  const {
    sessionId, challenges, currentIndex, sessionStats,
    startSession, submitAttempt, nextChallenge, completeSession, resetSession,
  } = usePracticeStore();

  const [appMode, setAppMode]       = useState<AppMode>('setup');
  const [selectedPack, setPack]     = useState<PackName>('motion');
  const [sessionLength, setLength]  = useState<LengthOpt>((defaultLen as LengthOpt) ?? 20);
  const [loading, setLoading]       = useState(false);
  const [startError, setStartError] = useState('');
  const [typedKeys, setTypedKeys]   = useState<string[]>([]);
  const [feedbackState, setFeedback]= useState<'idle' | 'correct' | 'incorrect'>('idle');
  const challengeStartRef = useRef(Date.now());
  const processingRef     = useRef(false);

  const current: Challenge | undefined = challenges[currentIndex];
  const isDone = currentIndex >= challenges.length && challenges.length > 0;
  const accuracy = sessionStats.totalCount > 0
    ? Math.round((sessionStats.correctCount / sessionStats.totalCount) * 100)
    : 100;

  // Update statusline
  useEffect(() => {
    if (appMode === 'active') {
      setStatus({
        statusMode: 'PRACTICE',
        statusFile: 'practice',
        statusCategory: selectedPack,
        statusProgress: `${currentIndex}/${challenges.length}`,
        statusAccuracy: `${accuracy}%`,
        statusTiming: sessionStats.avgResponseMs > 0 ? `${sessionStats.avgResponseMs}ms` : '',
      });
    } else {
      setStatus({ statusMode: 'NORMAL', statusFile: 'practice', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '' });
    }
  }, [appMode, currentIndex, challenges.length, accuracy, sessionStats.avgResponseMs, selectedPack, setStatus]);

  // Session complete
  useEffect(() => {
    if (isDone && appMode === 'active') {
      completeSession();
      if (sessionId && sessionId !== 'guest') sessionApi.complete(sessionId).catch(() => {});
      setAppMode('complete');
    }
  }, [isDone, appMode, completeSession, sessionId]);

  const handleStart = useCallback(async () => {
    setStartError(''); setLoading(true);
    try {
      const res = await sessionApi.create({ mode: 'practice', length: sessionLength });
      const { session, keymaps } = res.data.data as {
        session: { id: string };
        keymaps: Array<{ id: string; key_sequence: string; mode: string; description: string; category: string }>;
      };
      const list: Challenge[] = keymaps.map((k, i) => ({
        keymapId: k.id, keySequence: k.key_sequence, mode: k.mode,
        description: k.description, category: k.category, index: i,
      }));
      startSession(session.id, 'practice', list);
    } catch {
      // Guest fallback — use built-in pack
      const pack = shufflePack(getBuiltinPack(selectedPack)).slice(0, sessionLength);
      const list: Challenge[] = pack.map((k, i) => ({
        keymapId: k.id, keySequence: k.keySequence, mode: k.mode,
        description: k.description, category: k.category, index: i,
      }));
      startSession('guest', 'motion', list);
    } finally { setLoading(false); }
    setTypedKeys([]); setFeedback('idle');
    challengeStartRef.current = Date.now(); setAppMode('active');
  }, [sessionLength, selectedPack, startSession]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Setup screen: Enter starts, number keys select pack/length
    if (appMode === 'setup') {
      const k = e.key;
      if (k === 'Enter' && !loading) { void handleStart(); return; }
      const packByKey: Record<string, PackName> = { '1': 'motion', '2': 'editing', '3': 'lsp', '4': 'git', '5': 'navigation', '6': 'core', '7': 'all' };
      if (packByKey[k]) { setPack(packByKey[k]); return; }
      return;
    }
    if (appMode !== 'active' || feedbackState !== 'idle' || processingRef.current) return;
    if (!current) return;

    const key = normalizeKey(e);
    if (!key) return;
    if (e.ctrlKey || e.metaKey) e.preventDefault();

    if (key === '<Esc>') {
      resetSession(); setAppMode('setup'); setTypedKeys([]); setFeedback('idle'); clearCmdline();
      return;
    }
    if (key === '<Tab>') {
      // Skip challenge
      nextChallenge(); setTypedKeys([]); clearCmdline();
      return;
    }

    const newKeys = [...typedKeys, key];
    setTypedKeys(newKeys);
    const target = current.keySequence;
    const typed  = newKeys.join('');
    const ms     = Date.now() - challengeStartRef.current;

    if (typed === target) {
      processingRef.current = true;
      setFeedback('correct');
      setCmdline({ type: 'correct', text: `-- correct  ${ms}ms` });
      submitAttempt({ isCorrect: true, correctSequence: target, responseMs: ms });
      if (sessionId && sessionId !== 'guest') {
        sessionApi.submitAttempt(sessionId, {
          keymap_id: current.keymapId, typed_sequence: typed,
          is_correct: true, response_ms: ms,
        }).catch(() => {});
      }
      setTimeout(() => {
        processingRef.current = false; setFeedback('idle'); setTypedKeys([]);
        challengeStartRef.current = Date.now(); nextChallenge(); clearCmdline();
      }, 800);
    } else if (!target.startsWith(typed)) {
      processingRef.current = true;
      setFeedback('incorrect');
      setCmdline({ type: 'incorrect', text: `-- expected: ${target}` });
      submitAttempt({ isCorrect: false, correctSequence: target, responseMs: ms });
      if (sessionId && sessionId !== 'guest') {
        sessionApi.submitAttempt(sessionId, {
          keymap_id: current.keymapId, typed_sequence: typed,
          is_correct: false, response_ms: ms,
        }).catch(() => {});
      }
      setTimeout(() => {
        processingRef.current = false; setFeedback('idle'); setTypedKeys([]);
        challengeStartRef.current = Date.now(); nextChallenge(); clearCmdline();
      }, 2000);
    }
  }, [appMode, feedbackState, current, typedKeys, submitAttempt, nextChallenge, resetSession, sessionId, setCmdline, clearCmdline, handleStart, loading, setPack]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Setup ──────────────────────────────────────────────────────────────
  if (appMode === 'setup') {
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- practice setup</span> },
      { num: 2, content: '' },
      { num: 3, content: 'Pack:' },
      { num: 4, content: '' },
      ...PACKS.map((p, i): BufferLine => ({
        num: 5 + i,
        content: (
          <span
            className={`setup-opt${selectedPack === p.id ? ' setup-opt--active' : ''}`}
            onClick={() => setPack(p.id)}
          >
            {'    '}<kbd className="setup-key">{p.key}</kbd>{' '}{p.label}
          </span>
        ),
      })),
      { num: 5 + PACKS.length,     content: '' },
      { num: 6 + PACKS.length,     content: 'Length:' },
      { num: 7 + PACKS.length,     content: '' },
      { num: 8 + PACKS.length,     content: (
        <span className="setup-lengths">
          {'    '}
          {LENGTHS.map(l => (
            <span
              key={l}
              className={`setup-opt${sessionLength === l ? ' setup-opt--active' : ''}`}
              onClick={() => setLength(l)}
            >
              <kbd className="setup-key">{l}</kbd>{' '}
            </span>
          ))}
        </span>
      )},
      { num: 9 + PACKS.length,     content: '' },
      { num: 10 + PACKS.length,    content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 11 + PACKS.length,    content: '' },
      { num: 12 + PACKS.length,    content: (
        <button className="setup-start" onClick={handleStart} disabled={loading}>
          {loading ? 'loading...' : 'Press Enter to start'}
        </button>
      )},
      ...(startError ? [{ num: 13 + PACKS.length, content: <span style={{ color: 'var(--red)' }}>{startError}</span> }] : []),
    ];
    const tilde = startError ? 14 + PACKS.length : 13 + PACKS.length;
    return <div className="practice-shell"><BufferPane lines={lines} tildeStart={tilde} totalLines={Math.max(35, tilde + 3)} /></div>;
  }

  // ── Complete ───────────────────────────────────────────────────────────
  if (appMode === 'complete') {
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- session complete</span> },
      { num: 2, content: '' },
      { num: 3, content: `accuracy    ${accuracy}%` },
      { num: 4, content: `challenges  ${sessionStats.totalCount}` },
      { num: 5, content: `avg         ${sessionStats.avgResponseMs}ms` },
      { num: 6, content: `streak      ${sessionStats.longestStreak}×` },
      { num: 7, content: '' },
      { num: 8, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 9, content: '' },
      { num: 10, content: (
        <button className="setup-start" onClick={() => { resetSession(); setAppMode('setup'); }}>
          practice again
        </button>
      )},
    ];
    return <div className="practice-shell"><BufferPane lines={lines} tildeStart={11} totalLines={35} /></div>;
  }

  // ── Active arena ───────────────────────────────────────────────────────
  const typedStr = typedKeys.join('');
  const arenaLines: BufferLine[] = [
    { num: 1,  content: <span className="buf-comment">-- practice · {current?.category ?? ''} · {currentIndex}/{challenges.length}</span> },
    { num: 2,  content: '' },
    { num: 3,  content: 'Description:' },
    { num: 4,  content: '' },
    { num: 5,  content: <span className="practice-desc">{'    '}{current?.description}</span>, active: true },
    { num: 6,  content: '' },
    { num: 7,  content: 'Expected:' },
    { num: 8,  content: '' },
    { num: 9,  content: (
      <span className={`practice-answer${feedbackState !== 'idle' ? ' practice-answer--revealed' : ''}`}>
        {'    '}<span className="kb">{current?.keySequence}</span>
      </span>
    )},
    { num: 10, content: '' },
    { num: 11, content: 'Typed:' },
    { num: 12, content: '' },
    { num: 13, content: (
      <span className="practice-typed">
        {'    '}
        {feedbackState === 'idle' ? (
          <><span className="kb">{typedStr}</span><span className="buf-cursor" /></>
        ) : feedbackState === 'correct' ? (
          <span style={{ color: 'var(--green)' }}>{current?.keySequence} ✓</span>
        ) : (
          <span style={{ color: 'var(--red)' }}>{typedStr || '?'} ✗</span>
        )}
      </span>
    ), active: feedbackState === 'idle' },
    { num: 14, content: '' },
    { num: 15, content: <span className="buf-dim">{'    '}Esc quit  Tab skip</span> },
  ];

  // Build full keymap reference list: completed (dim), current (accent), remaining
  const allKeymapRows = challenges.map((c, i) => ({
    label: i < currentIndex ? '✓' : i === currentIndex ? '▶' : `${i + 1}`,
    value: <span title={c.description}><span className="kb" style={{ fontSize: '12px' }}>{c.keySequence}</span>{' '}<span style={{ color: 'var(--dim)', fontSize: '11px' }}>{c.description.length > 14 ? c.description.slice(0, 13) + '…' : c.description}</span></span>,
    accent: i === currentIndex,
  }));

  const infoSections = [
    {
      title: 'STATS',
      rows: [
        { label: 'progress', value: `${currentIndex}/${challenges.length}` },
        { label: 'accuracy', value: `${accuracy}%`, accent: accuracy >= 90 },
        { label: 'streak',   value: `${sessionStats.currentStreak}×` },
        { label: 'avg',      value: sessionStats.avgResponseMs > 0 ? `${sessionStats.avgResponseMs}ms` : '—' },
      ],
    },
    {
      title: 'KEYMAPS',
      rows: allKeymapRows,
    },
  ];

  return (
    <div className="practice-shell">
      <BufferPane lines={arenaLines} tildeStart={16} totalLines={35} />
      <PaneSep />
      <InfoPanel sections={infoSections} />
    </div>
  );
}
