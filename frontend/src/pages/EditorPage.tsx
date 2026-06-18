import { useState, useEffect, useCallback, useRef } from 'react';
import { BufferPane } from '../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../components/terminal/BufferPane/BufferPane';
import { InfoPanel } from '../components/terminal/InfoPanel/InfoPanel';
import { PaneSep } from '../components/terminal/PaneSep/PaneSep';
import { useTerminalStore } from '../stores/terminalStore';
import { EDITOR_TASKS, getTasksByLanguage } from '../data/editorTasks';
import { ALL_KEYMAPS } from '../utils/builtinPacks';
import type { EditorTask } from '../data/editorTasks';
import { createSimulator, normalizeEditorKey } from '../utils/vimSimulator';

type EditorState = 'menu' | 'active' | 'complete';

const LANGUAGES = ['all', 'go', 'lua', 'typescript', 'python'] as const;
type Lang = (typeof LANGUAGES)[number];

const LANG_KEYS: Record<Lang, string> = {
  all: '1', go: '2', lua: '3', typescript: '4', python: '5',
};

const SESSION_LENGTHS = [20, 30, 50] as const;
type SessionLen = (typeof SESSION_LENGTHS)[number];

function buildTaskQueue(lang: Lang, count: number): EditorTask[] {
  const pool = lang === 'all' ? EDITOR_TASKS : getTasksByLanguage(lang as Exclude<Lang, 'all'>);
  if (pool.length === 0) return [];
  // Shuffle pool, then repeat to fill count
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result: EditorTask[] = [];
  while (result.length < count) {
    result.push(...shuffled);
  }
  return result.slice(0, count);
}

export default function EditorPage() {
  const { setStatus, setCmdline, clearCmdline } = useTerminalStore();

  const [editorState, setEditorState] = useState<EditorState>('menu');
  const [lang, setLang]               = useState<Lang>('all');
  const [sessionLen, setSessionLen]   = useState<SessionLen>(20);
  const [tasks, setTasks]             = useState<EditorTask[]>([]);
  const [cursor, setCursor]           = useState(0);
  const [showHint, setShowHint]       = useState(false);
  const [score, setScore]             = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback]       = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [typedStr, setTypedStr]       = useState('');

  const simulatorRef = useRef(createSimulator([]));
  const processingRef = useRef(false);

  const current = tasks[cursor];
  const isDone  = cursor >= tasks.length && tasks.length > 0;

  // Statusline
  useEffect(() => {
    if (editorState === 'active') {
      setStatus({
        statusMode: 'EDITOR',
        statusFile: current ? `${current.language}/${current.id}` : 'editor',
        statusCategory: lang,
        statusProgress: `${cursor + 1}/${tasks.length}`,
        statusAccuracy: `${tasks.length > 0 ? Math.round((score.correct / Math.max(1, score.total)) * 100) : 100}%`,
        statusTiming: '',
        statusRight: showHint ? 'hint:on' : '',
      });
    } else {
      setStatus({ statusMode: 'NORMAL', statusFile: 'editor', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '', statusRight: '' });
    }
  }, [editorState, current, lang, cursor, tasks.length, score, showHint, setStatus]);

  useEffect(() => {
    if (isDone && editorState === 'active') {
      setEditorState('complete');
    }
  }, [isDone, editorState]);

  // Rebuild simulator when task changes
  useEffect(() => {
    if (current) {
      simulatorRef.current = createSimulator(current.acceptedCommands);
      setTypedStr('');
      setFeedback('idle');
      processingRef.current = false;
    }
  }, [current]);

  const handleStart = useCallback(() => {
    const t = buildTaskQueue(lang, sessionLen);
    setTasks(t);
    setCursor(0);
    setScore({ correct: 0, total: 0 });
    setShowHint(false);
    setFeedback('idle');
    setTypedStr('');
    setEditorState('active');
  }, [lang, sessionLen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Setup screen keyboard navigation
    if (editorState === 'menu') {
      const k = e.key;
      if (k === 'Enter') { handleStart(); return; }
      const langByKey: Record<string, Lang> = { '1': 'all', '2': 'go', '3': 'lua', '4': 'typescript', '5': 'python' };
      if (langByKey[k]) { setLang(langByKey[k]); return; }
      if (k === '[') { setSessionLen(l => l === 20 ? 50 : l === 30 ? 20 : 30); return; }
      if (k === ']') { setSessionLen(l => l === 20 ? 30 : l === 30 ? 50 : 20); return; }
      return;
    }

    if (editorState !== 'active' || processingRef.current) return;

    const key = normalizeEditorKey(e);
    if (!key) return;
    if (e.ctrlKey || e.metaKey) e.preventDefault();

    if (key === '<Esc>') {
      setEditorState('menu'); clearCmdline(); return;
    }
    if (key === '?') {
      setShowHint(h => !h); return;
    }
    if (key === '<Tab>') {
      setCursor(c => c + 1); setTypedStr(''); clearCmdline(); return;
    }

    const sim = simulatorRef.current;
    const state = sim.feed(key);
    setTypedStr(state.typed.join(''));

    if (state.complete) {
      processingRef.current = true;
      setFeedback('correct');
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      setCmdline({ type: 'correct', text: `-- correct: ${state.matchedCommand}` });
      setTimeout(() => {
        processingRef.current = false;
        setFeedback('idle');
        setCursor(c => c + 1);
        clearCmdline();
      }, 900);
    } else if (state.mismatch) {
      processingRef.current = true;
      setFeedback('incorrect');
      setScore(s => ({ ...s, total: s.total + 1 }));
      setCmdline({ type: 'incorrect', text: `-- expected one of: ${current?.acceptedCommands.join('  ')}` });
      setTimeout(() => {
        processingRef.current = false;
        setFeedback('idle');
        simulatorRef.current.reset();
        setTypedStr('');
        clearCmdline();
      }, 2000);
    }
  }, [editorState, current, handleStart, setCmdline, clearCmdline]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Menu ───────────────────────────────────────────────────────────────
  if (editorState === 'menu') {
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- editor mode · task-based challenges</span> },
      { num: 2, content: '' },
      { num: 3, content: 'Real code buffer. Type the vim command that completes the task.' },
      { num: 4, content: 'Hint toggle: ?    Skip: Tab    Quit: Esc    [ ] cycle length' },
      { num: 5, content: '' },
      { num: 6, content: 'Language:' },
      { num: 7, content: '' },
      ...LANGUAGES.map((l, i): BufferLine => ({
        num: 8 + i,
        content: (
          <span
            className={`setup-opt${lang === l ? ' setup-opt--active' : ''}`}
            onClick={() => setLang(l)}
          >
            {'    '}<kbd className="setup-key">{LANG_KEYS[l]}</kbd>{' '}
            {l}
          </span>
        ),
      })),
      { num: 8 + LANGUAGES.length, content: '' },
      { num: 9 + LANGUAGES.length, content: 'Session length:' },
      { num: 10 + LANGUAGES.length, content: '' },
      { num: 11 + LANGUAGES.length, content: (
        <span className="setup-lengths">
          {'    '}
          {SESSION_LENGTHS.map(n => (
            <span
              key={n}
              className={`setup-opt${sessionLen === n ? ' setup-opt--active' : ''}`}
              onClick={() => setSessionLen(n)}
            >
              <kbd className="setup-key">{n}</kbd>{' '}
            </span>
          ))}
        </span>
      )},
      { num: 12 + LANGUAGES.length, content: '' },
      { num: 13 + LANGUAGES.length, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 14 + LANGUAGES.length, content: '' },
      { num: 15 + LANGUAGES.length, content: (
        <button className="setup-start" onClick={handleStart}>
          Press Enter to start
        </button>
      )},
    ];
    const tilde = 16 + LANGUAGES.length;
    return (
      <div className="editor-shell">
        <BufferPane lines={lines} tildeStart={tilde} totalLines={Math.max(35, tilde + 3)} />
      </div>
    );
  }

  // ── Complete ───────────────────────────────────────────────────────────
  if (editorState === 'complete') {
    const accuracy = tasks.length > 0
      ? Math.round((score.correct / Math.max(1, score.total)) * 100) : 100;
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- editor complete · {lang}</span> },
      { num: 2, content: '' },
      { num: 3, content: `correct     ${score.correct}/${tasks.length}` },
      { num: 4, content: `accuracy    ${accuracy}%` },
      { num: 5, content: '' },
      { num: 6, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: 7, content: '' },
      { num: 8, content: (
        <button className="setup-start" onClick={() => setEditorState('menu')}>
          back to menu
        </button>
      )},
    ];
    return (
      <div className="editor-shell">
        <BufferPane lines={lines} tildeStart={9} totalLines={35} />
      </div>
    );
  }

  // ── Active task ────────────────────────────────────────────────────────
  const bufLines = current?.initialBuffer ?? [];
  const activeLineIdx = Math.floor(bufLines.length / 2); // cursor line hint

  const editorLines: BufferLine[] = [
    // Header comment
    { num: 1, content: (
      <span className="buf-comment">
        -- {current?.language} · {current?.title} · {cursor + 1}/{tasks.length}
      </span>
    )},
    { num: 2, content: '' },
    // Task instruction
    { num: 3, content: <span className="editor-instruction">{current?.instruction}</span> },
    { num: 4, content: '' },
    // Separator
    { num: 5, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
    { num: 6, content: '' },
    // Buffer preview
    ...bufLines.map((line, i): BufferLine => ({
      num: 7 + i,
      content: (
        <span className={i === activeLineIdx ? 'editor-cur-line' : ''}>
          {line || ' '}
          {i === activeLineIdx && <span className="buf-cursor" />}
        </span>
      ),
      active: i === activeLineIdx,
    })),
    { num: 7 + bufLines.length, content: '' },
    { num: 8 + bufLines.length, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
    { num: 9 + bufLines.length, content: '' },
    // Typed display
    {
      num: 10 + bufLines.length,
      content: (
        <span className="editor-typed">
          {'    '}
          {feedback === 'idle' ? (
            <><span className="kb">{typedStr}</span>{!typedStr && <span className="buf-cursor" />}</>
          ) : feedback === 'correct' ? (
            <span style={{ color: 'var(--green)' }}>{typedStr} ✓</span>
          ) : (
            <span style={{ color: 'var(--red)' }}>{typedStr} ✗</span>
          )}
        </span>
      ),
    },
    { num: 11 + bufLines.length, content: '' },
    { num: 12 + bufLines.length, content: (
      <span className="buf-dim">{'    '}Esc quit  Tab skip  ? hint</span>
    )},
  ];

  const infoSections = [
    { title: 'TASK', rows: [
      { label: 'lang',  value: current?.language ?? '—' },
      { label: 'score', value: `${score.correct}/${score.total}`, accent: score.correct > 0 },
      { label: 'cmds',  value: (current?.acceptedCommands ?? []).join('  ') },
    ]},
    ...(showHint && current?.hint ? [{
      title: 'HINT',
      rows: [{ value: current.hint, accent: true }],
    }] : []),
    {
      title: 'KEYMAPS',
      rows: ALL_KEYMAPS.map(k => ({
        label: k.keySequence,
        value: k.description.length > 16 ? k.description.slice(0, 15) + '…' : k.description,
      })),
    },
  ];

  const tildeStart = 13 + bufLines.length;
  return (
    <div className="editor-shell">
      <BufferPane lines={editorLines} tildeStart={tildeStart} totalLines={Math.max(35, tildeStart + 5)} />
      <PaneSep />
      <InfoPanel sections={infoSections} />
    </div>
  );
}
