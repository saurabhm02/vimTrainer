import { useState, useEffect, useCallback } from 'react';
import { BufferPane } from '../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../components/terminal/BufferPane/BufferPane';
import { InfoPanel } from '../components/terminal/InfoPanel/InfoPanel';
import { PaneSep } from '../components/terminal/PaneSep/PaneSep';
import { useTerminalStore } from '../stores/terminalStore';
import { getBuiltinPack, shufflePack } from '../utils/builtinPacks';
import type { BuiltinKeymap } from '../utils/builtinPacks';
import { getGuestSRS, updateGuestSRSEntry } from '../utils/guestState';
import type { GuestSRSEntry } from '../utils/guestState';

type RecallState = 'setup' | 'question' | 'revealed' | 'done';

// SM-2 next interval (simplified)
function sm2Next(entry: GuestSRSEntry, rating: 1 | 2 | 3 | 4): GuestSRSEntry {
  let { easeFactor, interval, repetitions } = entry;
  if (rating < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
  const due = new Date();
  due.setDate(due.getDate() + interval);
  return { ...entry, easeFactor, interval, repetitions, dueDate: due.toISOString().slice(0, 10) };
}

const RATING_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'blackout',
  2: 'hard',
  3: 'good',
  4: 'easy',
};

export default function RecallPage() {
  const { setStatus, setCmdline, clearCmdline } = useTerminalStore();

  const [recallState, setRecallState] = useState<RecallState>('setup');
  const [queue, setQueue]             = useState<BuiltinKeymap[]>([]);
  const [cursor, setCursor]           = useState(0);
  const [score, setScore]             = useState({ rated: 0, easy: 0 });

  const current = queue[cursor];
  const isDone  = cursor >= queue.length && queue.length > 0;

  // Statusline
  useEffect(() => {
    if (recallState === 'question' || recallState === 'revealed') {
      setStatus({
        statusMode: 'RECALL',
        statusFile: 'recall',
        statusCategory: 'srs',
        statusProgress: `${cursor}/${queue.length}`,
        statusAccuracy: `${queue.length > 0 ? Math.round((score.easy / Math.max(1, score.rated)) * 100) : 100}%`,
        statusTiming: '',
        statusRight: '',
      });
    } else {
      setStatus({ statusMode: 'NORMAL', statusFile: 'recall', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '', statusRight: '' });
    }
  }, [recallState, cursor, queue.length, score, setStatus]);

  useEffect(() => {
    if (isDone && (recallState === 'question' || recallState === 'revealed')) {
      setRecallState('done');
    }
  }, [isDone, recallState]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (recallState === 'question') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setRecallState('revealed');
        setCmdline({ type: 'info', text: '-- rate: 1 blackout  2 hard  3 good  4 easy' });
      } else if (e.key === 'Escape') {
        setRecallState('setup'); clearCmdline();
      }
    } else if (recallState === 'revealed') {
      const rating = parseInt(e.key) as 1 | 2 | 3 | 4;
      if ([1, 2, 3, 4].includes(rating)) {
        e.preventDefault();
        // Persist SRS for guest
        if (current) {
          const srs = getGuestSRS();
          const existing = srs.find(s => s.keymapId === current.id) ?? {
            keymapId: current.id, easeFactor: 2.5, interval: 0, dueDate: '', repetitions: 0,
          };
          updateGuestSRSEntry(sm2Next(existing, rating));
        }
        setScore(s => ({ rated: s.rated + 1, easy: s.easy + (rating >= 3 ? 1 : 0) }));
        clearCmdline();
        setCursor(c => c + 1);
        if (cursor + 1 >= queue.length) {
          setRecallState('done');
        } else {
          setRecallState('question');
        }
      } else if (e.key === 'Escape') {
        setRecallState('done'); clearCmdline();
      }
    }
  }, [recallState, current, cursor, queue.length, setCmdline, clearCmdline]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleStart = () => {
    // Prioritize due items from SRS, then fill with shuffled pack
    const all = getBuiltinPack('all');
    const srs  = getGuestSRS();
    const today = new Date().toISOString().slice(0, 10);
    const due   = all.filter(k => {
      const e = srs.find(s => s.keymapId === k.id);
      return !e || e.dueDate <= today;
    });
    const q = shufflePack(due.length > 0 ? due : all).slice(0, 20);
    setQueue(q);
    setCursor(0);
    setScore({ rated: 0, easy: 0 });
    setRecallState('question');
  };

  // ── Setup ──────────────────────────────────────────────────────────────
  if (recallState === 'setup') {
    const srs    = getGuestSRS();
    const today  = new Date().toISOString().slice(0, 10);
    const dueCount = getBuiltinPack('all').filter(k => {
      const e = srs.find(s => s.keymapId === k.id);
      return !e || e.dueDate <= today;
    }).length;

    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- recall mode · spaced repetition</span> },
      { num: 2, content: '' },
      { num: 3, content: 'Recall shows you a key sequence. Think of what it does,' },
      { num: 4, content: 'then reveal the answer. Rate your recall 1-4.' },
      { num: 5, content: '' },
      { num: 6, content: 'Ratings:' },
      { num: 7, content: '' },
      { num: 8, content: <span className="buf-dim">{'    '}<kbd className="setup-key">1</kbd> blackout  — complete blank</span> },
      { num: 9, content: <span className="buf-dim">{'    '}<kbd className="setup-key">2</kbd> hard      — wrong but recognized answer</span> },
      { num: 10, content: <span className="buf-dim">{'    '}<kbd className="setup-key">3</kbd> good      — correct with effort</span> },
      { num: 11, content: <span className="buf-dim">{'    '}<kbd className="setup-key">4</kbd> easy      — instant recall</span> },
      { num: 12, content: '' },
      { num: 13, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 14, content: '' },
      { num: 15, content: <span className="buf-dim">Due today: {dueCount} items</span> },
      { num: 16, content: '' },
      { num: 17, content: (
        <button className="setup-start" onClick={handleStart}>
          Press Enter to start
        </button>
      )},
    ];
    return (
      <div className="recall-shell">
        <BufferPane lines={lines} tildeStart={18} totalLines={35} />
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────
  if (recallState === 'done') {
    const pct = score.rated > 0 ? Math.round((score.easy / score.rated) * 100) : 0;
    const lines: BufferLine[] = [
      { num: 1,  content: <span className="buf-comment">-- recall complete</span> },
      { num: 2,  content: '' },
      { num: 3,  content: `reviewed    ${score.rated}` },
      { num: 4,  content: `easy/good   ${score.easy}` },
      { num: 5,  content: `recall rate ${pct}%` },
      { num: 6,  content: '' },
      { num: 7,  content: 'SRS intervals updated in local storage.' },
      { num: 8,  content: '' },
      { num: 9,  content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 10, content: '' },
      { num: 11, content: (
        <button className="setup-start" onClick={() => setRecallState('setup')}>
          review again
        </button>
      )},
    ];
    return (
      <div className="recall-shell">
        <BufferPane lines={lines} tildeStart={12} totalLines={35} />
      </div>
    );
  }

  // ── Question / Revealed ────────────────────────────────────────────────
  const isRevealed = recallState === 'revealed';

  const arenaLines: BufferLine[] = [
    { num: 1, content: <span className="buf-comment">-- recall · {cursor + 1}/{queue.length}</span> },
    { num: 2, content: '' },
    { num: 3, content: 'Key sequence:' },
    { num: 4, content: '' },
    { num: 5, content: (
      <span className="recall-prompt">
        {'    '}<span className="kb" style={{ fontSize: '15px' }}>{current?.keySequence}</span>
      </span>
    ), active: true },
    { num: 6, content: '' },
    { num: 7, content: isRevealed ? 'Description:' : <span className="buf-dim">Description: (hidden)</span> },
    { num: 8, content: '' },
    { num: 9, content: isRevealed
      ? <span className="recall-answer">{'    '}{current?.description}</span>
      : <span className="buf-dim">{'    '}Press Space to reveal</span>
    },
    { num: 10, content: '' },
    { num: 11, content: isRevealed
      ? <span className="buf-dim">{'    '}Rate recall: 1 blackout  2 hard  3 good  4 easy</span>
      : <span className="buf-dim">{'    '}Esc quit</span>
    },
  ];

  const infoSections = [
    { title: 'QUEUE', rows: [{ value: `${cursor + 1}/${queue.length}` }] },
    {
      title: 'RATING',
      rows: (Object.entries(RATING_LABELS) as Array<[string, string]>).map(([k, v]) => ({
        label: k,
        value: v,
      })),
    },
    { title: 'STATS', rows: [
      { label: 'reviewed', value: `${score.rated}` },
      { label: 'easy+',    value: `${score.easy}`, accent: score.easy > 0 },
    ]},
  ];

  return (
    <div className="recall-shell">
      <BufferPane lines={arenaLines} tildeStart={12} totalLines={35} />
      <PaneSep />
      <InfoPanel sections={infoSections} />
    </div>
  );
}
