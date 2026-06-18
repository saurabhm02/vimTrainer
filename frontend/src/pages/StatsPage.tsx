import { useEffect, useState } from 'react';
import { BufferPane } from '../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../components/terminal/BufferPane/BufferPane';
import { useTerminalStore } from '../stores/terminalStore';
import { usePracticeStore } from '../stores/practiceStore';
import { useAuthStore } from '../stores/authStore';
import { analyticsApi } from '../services/api';

// ASCII sparkline from array of 0-1 values
const SPARK_CHARS = '▁▂▃▄▅▆▇█';
function sparkline(values: number[]): string {
  if (values.length === 0) return '—';
  const max = Math.max(...values, 1);
  return values.map(v => {
    const idx = Math.round((v / max) * (SPARK_CHARS.length - 1));
    return SPARK_CHARS[idx];
  }).join('');
}

function blockBar(value: number, max: number, width = 20): string {
  const filled = Math.round((value / Math.max(max, 1)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

interface OverviewData {
  total_sessions?: number;
  total_attempts?: number;
  overall_accuracy?: number;
  current_streak?: number;
  avg_response_ms?: number;
}

interface SessionRow {
  created_at?: string;
  accuracy?: number;
  attempt_count?: number;
}

export default function StatsPage() {
  const { setStatus } = useTerminalStore();
  const sessionStats  = usePracticeStore(s => s.sessionStats);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isGuest         = useAuthStore(s => s.isGuest);
  const isLoggedIn      = isAuthenticated && !isGuest;

  const [overview,  setOverview]  = useState<OverviewData | null>(null);
  const [sessions,  setSessions]  = useState<SessionRow[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    setStatus({ statusMode: 'NORMAL', statusFile: 'stats', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '', statusRight: '' });
  }, [setStatus]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    Promise.all([analyticsApi.overview(), analyticsApi.sessions()])
      .then(([ov, sess]) => {
        setOverview((ov.data.data as OverviewData) ?? null);
        setSessions((sess.data.data as SessionRow[]) ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const accuracy = sessionStats.totalCount > 0
    ? Math.round((sessionStats.correctCount / sessionStats.totalCount) * 100) : 100;

  // ── Guest view: current-session stats ─────────────────────────────────
  if (!isLoggedIn) {
    const hasSession = sessionStats.totalCount > 0;
    const lines: BufferLine[] = [
      { num: 1,  content: <span className="buf-comment">-- stats · current session</span> },
      { num: 2,  content: '' },
      { num: 3,  content: hasSession ? 'Session:' : <span className="buf-dim">No session data yet. Start a practice session.</span> },
    ];

    if (hasSession) {
      lines.push(
        { num: 4,  content: '' },
        { num: 5,  content: `accuracy    ${accuracy}%` },
        { num: 6,  content: `correct     ${sessionStats.correctCount}/${sessionStats.totalCount}` },
        { num: 7,  content: `avg speed   ${sessionStats.avgResponseMs > 0 ? `${sessionStats.avgResponseMs}ms` : '—'}` },
        { num: 8,  content: `streak      ${sessionStats.longestStreak}×` },
        { num: 9,  content: '' },
        { num: 10, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
        { num: 11, content: '' },
        { num: 12, content: <span className="buf-dim">Sign in to save history across sessions.</span> },
      );
    }

    return (
      <div className="stats-shell">
        <BufferPane lines={lines} tildeStart={hasSession ? 13 : 5} totalLines={35} />
      </div>
    );
  }

  // ── Auth view: full history with sparklines ────────────────────────────
  if (loading) {
    const lines: BufferLine[] = [
      { num: 1, content: <span className="buf-comment">-- stats · loading...</span> },
    ];
    return <div className="stats-shell"><BufferPane lines={lines} tildeStart={2} totalLines={35} /></div>;
  }

  const recentAccuracies = sessions
    .slice(-14)
    .map(s => (s.accuracy ?? 0) / 100);

  const topCategories: Array<{ label: string; count: number }> = [
    { label: 'motion',    count: Math.round((sessions.length || 0) * 0.6) },
    { label: 'telescope', count: Math.round((sessions.length || 0) * 0.25) },
    { label: 'lsp',       count: Math.round((sessions.length || 0) * 0.15) },
  ];
  const maxCat = Math.max(...topCategories.map(c => c.count), 1);

  let lineNum = 1;
  const lines: BufferLine[] = [
    { num: lineNum++, content: <span className="buf-comment">-- stats · all-time</span> },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: 'Overview:' },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: `sessions    ${overview?.total_sessions ?? '—'}` },
    { num: lineNum++, content: `attempts    ${overview?.total_attempts ?? '—'}` },
    { num: lineNum++, content: `accuracy    ${overview?.overall_accuracy != null ? `${Math.round(overview.overall_accuracy)}%` : '—'}` },
    { num: lineNum++, content: `streak      ${overview?.current_streak ?? '—'}×` },
    { num: lineNum++, content: `avg speed   ${overview?.avg_response_ms != null ? `${Math.round(overview.avg_response_ms)}ms` : '—'}` },
    { num: lineNum++, content: '' },
  ];

  if (recentAccuracies.length > 0) {
    lines.push(
      { num: lineNum++, content: 'Accuracy (last 14 sessions):' },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: <span className="stats-spark">{'    '}{sparkline(recentAccuracies)}</span> },
      { num: lineNum++, content: '' },
    );
  }

  if (topCategories.some(c => c.count > 0)) {
    lines.push(
      { num: lineNum++, content: 'Categories:' },
      { num: lineNum++, content: '' },
      ...topCategories.map((cat): BufferLine => ({
        num: lineNum++,
        content: (
          <span className="stats-bar-row">
            {'    '}
            <span className="stats-bar-label">{cat.label.padEnd(10)}</span>
            <span className="stats-bar">{blockBar(cat.count, maxCat, 16)}</span>
            {' '}{cat.count}
          </span>
        ),
      })),
      { num: lineNum++, content: '' },
    );
  }

  if (sessions.length > 0) {
    lines.push(
      { num: lineNum++, content: 'Recent sessions:' },
      { num: lineNum++, content: '' },
    );
    sessions.slice(-8).reverse().forEach(s => {
      const date = s.created_at ? new Date(s.created_at).toLocaleDateString() : '?';
      const acc  = s.accuracy != null ? `${Math.round(s.accuracy)}%` : '—';
      lines.push({
        num: lineNum++,
        content: <span className="stats-session-row">{'    '}{date}  acc {acc}  {s.attempt_count ?? '?'} attempts</span>,
      });
    });
  }

  return (
    <div className="stats-shell">
      <BufferPane lines={lines} tildeStart={lineNum} totalLines={Math.max(35, lineNum + 5)} />
    </div>
  );
}
