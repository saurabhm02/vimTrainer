import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { KeyChip } from '../components/ui/KeyChip/KeyChip';

// ── Built-in keymaps for the homepage arena (no API call needed) ──────────────
interface Km { seq: string; desc: string; cat: string }

const BUILTIN_KMS: Km[] = [
  { seq: 'gg',       desc: 'Go to first line',         cat: 'motion'    },
  { seq: 'G',        desc: 'Go to last line',           cat: 'motion'    },
  { seq: 'ciw',      desc: 'Change inner word',         cat: 'editing'   },
  { seq: 'daw',      desc: 'Delete around word',        cat: 'editing'   },
  { seq: 'yiw',      desc: 'Yank inner word',           cat: 'editing'   },
  { seq: 'dd',       desc: 'Delete line',               cat: 'editing'   },
  { seq: 'yy',       desc: 'Yank line',                 cat: 'editing'   },
  { seq: '<C-d>',    desc: 'Scroll down half-page',     cat: 'motion'    },
  { seq: '<C-u>',    desc: 'Scroll up half-page',       cat: 'motion'    },
  { seq: 'zz',       desc: 'Center line in window',     cat: 'motion'    },
  { seq: '%',        desc: 'Jump to matching bracket',  cat: 'motion'    },
  { seq: '*',        desc: 'Search word under cursor',  cat: 'motion'    },
  { seq: 'gd',       desc: 'Go to definition',          cat: 'lsp'       },
  { seq: 'K',        desc: 'Show documentation',        cat: 'lsp'       },
  { seq: '.',        desc: 'Repeat last change',        cat: 'editing'   },
  { seq: '<C-o>',    desc: 'Jump to previous location', cat: 'motion'    },
  { seq: '<C-r>',    desc: 'Redo',                      cat: 'editing'   },
  { seq: 'J',        desc: 'Join lines',                cat: 'editing'   },
  { seq: 'A',        desc: 'Append at end of line',     cat: 'editing'   },
  { seq: 'I',        desc: 'Insert at start of line',   cat: 'editing'   },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function normalizeKey(e: KeyboardEvent): string | null {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && !['c', 'd', 'u', 'r', 'o', 'f', 'b'].includes(e.key.toLowerCase())) return null;
  if (ctrl) { e.preventDefault(); return `<C-${e.key.toLowerCase()}>`; }
  switch (e.key) {
    case 'Escape':    return '<Esc>';
    case 'Enter':     return '<CR>';
    case 'Backspace': return null; // handle as clear
    case 'Tab':       e.preventDefault(); return '<Tab>';
    case ' ':         return '<Space>';
    case 'ArrowUp':   return '<Up>';
    case 'ArrowDown': return '<Down>';
    case 'ArrowLeft': return '<Left>';
    case 'ArrowRight':return '<Right>';
    default:
      if (e.key.length === 1) return e.key;
      return null;
  }
}

type Feedback = 'idle' | 'correct' | 'incorrect';

const QUEUE_SIZE = 15;

export function LandingPage() {
  const [queue]       = useState<Km[]>(() => shuffle(BUILTIN_KMS).slice(0, QUEUE_SIZE));
  const [idx, setIdx]         = useState(0);
  const [typed, setTyped]     = useState<string[]>([]);
  const [feedback, setFb]     = useState<Feedback>('idle');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal]     = useState(0);
  const [done, setDone]       = useState(false);
  const processing = useRef(false);

  const current = queue[idx];

  const advance = useCallback(() => {
    processing.current = false;
    setTyped([]);
    setFb('idle');
    if (idx + 1 >= queue.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, queue.length]);

  const restart = () => {
    setIdx(0); setTyped([]); setFb('idle');
    setCorrect(0); setTotal(0); setDone(false);
    processing.current = false;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || feedback !== 'idle' || processing.current || !current) return;
      if (e.key === 'Backspace') { setTyped((t) => t.slice(0, -1)); return; }
      const key = normalizeKey(e);
      if (!key || key === '<Esc>') return;

      const next = [...typed, key];
      const target = current.seq;
      const joined = next.join('');

      setTyped(next);

      if (joined === target) {
        processing.current = true;
        setFb('correct');
        setTotal((n) => n + 1);
        setCorrect((n) => n + 1);
        setTimeout(advance, 900);
      } else if (!target.startsWith(joined)) {
        processing.current = true;
        setFb('incorrect');
        setTotal((n) => n + 1);
        setTimeout(advance, 1400);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, feedback, current, typed, advance]);

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
  const progress = (idx / queue.length) * 100;

  return (
    <div className="home">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="home__nav">
        <span className="home__logo">vim<span className="home__logo-accent">trainer</span></span>
        <nav className="home__nav-links">
          <a
            href="https://github.com/vimtrainer/vimtrainer"
            target="_blank"
            rel="noopener noreferrer"
            className="home__nav-link"
          >
            GitHub
          </a>
          <Link to="/auth/login" className="home__nav-link">Sign in</Link>
        </nav>
      </header>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="home__progress-track" aria-hidden="true">
        <div className="home__progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Arena ────────────────────────────────────────────────────── */}
      <main className="home__arena" tabIndex={-1}>
        {done ? (
          /* ── Results ─────────────────────────────────────────────── */
          <div className="home__results">
            <div className="home__results-stats">
              <div className="home__stat">
                <span className="home__stat-value">{accuracy}<span className="home__stat-unit">%</span></span>
                <span className="home__stat-label">accuracy</span>
              </div>
              <div className="home__stat">
                <span className="home__stat-value">{correct}<span className="home__stat-unit">/{total}</span></span>
                <span className="home__stat-label">correct</span>
              </div>
            </div>

            <div className="home__results-actions">
              <button className="home__restart-btn" onClick={restart} autoFocus>
                <kbd className="home__hint-key">Tab</kbd> restart
              </button>
            </div>

            <p className="home__cta-text">
              <Link to="/auth/register" className="home__cta-link">Create account</Link>
              {' '}to track progress and practice your own keymaps
            </p>
          </div>
        ) : current ? (
          /* ── Challenge ───────────────────────────────────────────── */
          <div className={`home__challenge home__challenge--${feedback}`}>
            <p className="home__prompt">{current.desc}</p>

            <div className="home__answer" aria-label={`Answer: ${current.seq}`}>
              <KeyChip keyStr={current.seq} size="lg" />
            </div>

            <div className="home__typed" aria-live="polite" aria-label="Typed so far">
              {typed.length > 0 ? (
                <span className="home__typed-keys">
                  {typed.map((k, i) => <KeyChip key={i} keyStr={k} size="md" />)}
                  {feedback === 'idle' && <span className="home__cursor" />}
                </span>
              ) : (
                feedback === 'idle' && (
                  <span className="home__placeholder">start typing…</span>
                )
              )}

              {feedback === 'correct' && (
                <span className="home__fb home__fb--ok">correct</span>
              )}
              {feedback === 'incorrect' && (
                <span className="home__fb home__fb--err">
                  <KeyChip keyStr={current.seq} size="sm" />
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Bottom meta ──────────────────────────────────────────── */}
        {!done && (
          <div className="home__meta">
            <span className="home__meta-item">{idx + 1} / {queue.length}</span>
            <span className="home__meta-sep">·</span>
            <span className="home__meta-item">{accuracy}%</span>
            <span className="home__meta-sep">·</span>
            <span className="home__meta-item home__meta-hint">
              <kbd className="home__hint-key">Esc</kbd> skip
            </span>
          </div>
        )}
      </main>

      {/* ── Foot nudge ────────────────────────────────────────────────── */}
      {!done && (
        <footer className="home__foot">
          <Link to="/auth/register" className="home__foot-link">Create account</Link>
          <span className="home__foot-sep">to save progress · import your keymaps · unlock SRS</span>
        </footer>
      )}
    </div>
  );
}
