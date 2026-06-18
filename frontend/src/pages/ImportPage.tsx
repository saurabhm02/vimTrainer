import { useState, useEffect } from 'react';
import { keymapApi } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useTerminalStore } from '../stores/terminalStore';
import { BufferPane } from '../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../components/terminal/BufferPane/BufferPane';
import { PaneSep } from '../components/terminal/PaneSep/PaneSep';
import { InfoPanel } from '../components/terminal/InfoPanel/InfoPanel';

interface KeymapSource {
  id: string;
  source_name: string;
  keymap_count: number;
  parsed_at: string;
  source_type: string;
}

export default function ImportPage() {
  const addToast = useUIStore(s => s.addToast);
  const isGuest  = useAuthStore(s => s.isGuest);
  const { setStatus } = useTerminalStore();

  const [content,        setContent]        = useState('');
  const [sourceName,     setSourceName]     = useState('');
  const [importing,      setImporting]      = useState(false);
  const [sources,        setSources]        = useState<KeymapSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);

  useEffect(() => {
    setStatus({ statusMode: 'NORMAL', statusFile: 'import', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '', statusRight: '' });
  }, [setStatus]);

  const loadSources = async () => {
    if (isGuest) { setLoadingSources(false); setSources([]); return; }
    setLoadingSources(true);
    try {
      const res = await keymapApi.listSources();
      setSources((res.data.data as KeymapSource[]) ?? []);
    } catch { /* ignore */ } finally { setLoadingSources(false); }
  };

  useEffect(() => { loadSources(); }, [isGuest]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { addToast({ type: 'error', message: 'Paste your config content first.' }); return; }
    setImporting(true);
    try {
      const res = await keymapApi.upload({ content, source_name: sourceName || 'My Config' });
      const { keymap_count } = res.data.data as { keymap_count: number };
      addToast({ type: 'success', message: `Imported ${keymap_count} keymaps.` });
      setContent(''); setSourceName(''); loadSources();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      addToast({ type: 'error', message: axiosErr.response?.data?.error?.message ?? 'Import failed.' });
    } finally { setImporting(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await keymapApi.deleteSource(id);
      addToast({ type: 'success', message: 'Source deleted.' });
      setSources(prev => prev.filter(s => s.id !== id));
    } catch {
      addToast({ type: 'error', message: 'Could not delete source.' });
    } finally { setDeletingId(null); }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setContent(ev.target?.result as string ?? '');
      if (!sourceName) setSourceName(file.name.replace(/\.(lua|vim)$/, ''));
    };
    reader.readAsText(file);
  };

  let lineNum = 1;
  const lines: BufferLine[] = [
    { num: lineNum++, content: <span className="buf-comment">-- import · paste init.lua or init.vim</span> },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: (
      <span className="settings-row">
        {'    '}source name{'  '}
        <input
          className="settings-inline-input"
          value={sourceName}
          onChange={e => setSourceName(e.target.value)}
          placeholder="My Neovim Config"
        />
      </span>
    )},
    { num: lineNum++, content: '' },
    { num: lineNum++, content: <span className="buf-dim">{'    '}Config content (paste below, or drag & drop a .lua/.vim file):</span> },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: (
      <div className="import-buf-area">
        <textarea
          className="import-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          rows={8}
          spellCheck={false}
          placeholder={'-- vim.keymap.set("n", "<leader>ff", ":Telescope find_files<CR>", { desc = "Find files" })'}
        />
      </div>
    )},
    { num: lineNum++, content: '' },
    { num: lineNum++, content: (
      <form onSubmit={handleImport} style={{ display: 'inline' }}>
        <button type="submit" className="setup-start" disabled={importing}>
          {importing ? 'importing…' : 'import keymaps'}
        </button>
      </form>
    )},
    { num: lineNum++, content: '' },
    { num: lineNum++, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: 'YOUR SOURCES' },
    { num: lineNum++, content: '' },
  ];

  if (loadingSources) {
    lines.push({ num: lineNum++, content: <span className="buf-dim">{'    '}loading…</span> });
  } else if (sources.length === 0) {
    lines.push({ num: lineNum++, content: <span className="buf-dim">{'    '}no sources yet</span> });
  } else {
    sources.forEach(src => {
      const date = new Date(src.parsed_at).toLocaleDateString();
      lines.push({
        num: lineNum++,
        content: (
          <span className="import-source-row">
            {'    '}<span className="import-source-name">{src.source_name}</span>
            {'  '}<span className="buf-dim">{src.keymap_count} keymaps  {date}</span>
            {'  '}
            <button
              className="import-delete-btn"
              disabled={deletingId === src.id}
              onClick={() => handleDelete(src.id)}
            >
              {deletingId === src.id ? 'deleting…' : '[delete]'}
            </button>
          </span>
        ),
      });
    });
  }

  const infoSections = [
    { title: 'FORMATS', rows: [
      { value: 'init.lua' },
      { value: 'init.vim' },
      { value: 'keymaps.lua' },
    ]},
    { title: 'SOURCES', rows: [{ value: `${sources.length} imported` }] },
  ];

  return (
    <div className="import-shell">
      <BufferPane lines={lines} tildeStart={lineNum} totalLines={Math.max(35, lineNum + 5)} />
      <PaneSep />
      <InfoPanel sections={infoSections} />
    </div>
  );
}
