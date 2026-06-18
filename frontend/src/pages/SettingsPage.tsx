import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsApi, userApi, authApi } from '../services/api';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useTerminalStore } from '../stores/terminalStore';
import { BufferPane } from '../components/terminal/BufferPane/BufferPane';
import type { BufferLine } from '../components/terminal/BufferPane/BufferPane';
import { Modal } from '../components/ui/Modal/Modal';
import { Button } from '../components/ui/Button/Button';

export default function SettingsPage() {
  const navigate = useNavigate();
  const addToast = useUIStore(s => s.addToast);
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);
  const { setStatus } = useTerminalStore();
  const {
    sessionLength, practiceSounds, showKeyHints, reducedMotion,
    updateSetting, syncFromServer,
  } = useSettingsStore();

  const [displayName,    setDisplayName]    = useState(user?.displayName ?? '');
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [currentPwd,     setCurrentPwd]     = useState('');
  const [newPwd,         setNewPwd]         = useState('');
  const [savingPwd,      setSavingPwd]      = useState(false);
  const [deleteOpen,     setDeleteOpen]     = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => {
    setStatus({ statusMode: 'NORMAL', statusFile: 'settings', statusCategory: '', statusProgress: '', statusAccuracy: '', statusTiming: '', statusRight: '' });
    settingsApi.get().then(r => syncFromServer(r.data.data)).catch(() => {});
  }, [setStatus, syncFromServer]);

  const savePrefs = async () => {
    try {
      await settingsApi.update({
        session_length: sessionLength, practice_sounds: practiceSounds,
        show_key_hints: showKeyHints, reduced_motion: reducedMotion,
      });
      addToast({ type: 'success', message: 'Preferences saved.' });
    } catch {
      addToast({ type: 'error', message: 'Could not save preferences.' });
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      await userApi.updateMe({ display_name: displayName });
      addToast({ type: 'success', message: 'Profile updated.' });
    } catch {
      addToast({ type: 'error', message: 'Could not update profile.' });
    } finally { setSavingProfile(false); }
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPwd(true);
    try {
      await userApi.changePassword({ current_password: currentPwd, new_password: newPwd });
      addToast({ type: 'success', message: 'Password changed.' });
      setCurrentPwd(''); setNewPwd('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      addToast({ type: 'error', message: axiosErr.response?.data?.error?.message ?? 'Could not change password.' });
    } finally { setSavingPwd(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await userApi.deleteMe();
      await authApi.logout().catch(() => {});
      logout(); navigate('/');
    } catch {
      addToast({ type: 'error', message: 'Could not delete account.' });
    } finally { setDeleting(false); setDeleteOpen(false); }
  };

  const isLoggedIn = user && !user.isGuest;

  let lineNum = 1;
  const lines: BufferLine[] = [
    { num: lineNum++, content: <span className="buf-comment">-- settings</span> },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: 'PREFERENCES' },
    { num: lineNum++, content: '' },
    { num: lineNum++, content: (
      <span className="settings-row">
        {'    '}session length{'  '}
        {([10, 20, 30] as const).map(n => (
          <span
            key={n}
            className={`settings-opt${sessionLength === n ? ' settings-opt--active' : ''}`}
            onClick={() => updateSetting('sessionLength', n)}
          >
            <kbd className="setup-key">{n}</kbd>{' '}
          </span>
        ))}
      </span>
    )},
    { num: lineNum++, content: (
      <span className="settings-row">
        {'    '}practice sounds{'  '}
        <span
          className={`settings-toggle-btn${practiceSounds ? ' settings-toggle-btn--on' : ''}`}
          onClick={() => updateSetting('practiceSounds', !practiceSounds)}
        >
          {practiceSounds ? '[on ]' : '[off]'}
        </span>
      </span>
    )},
    { num: lineNum++, content: (
      <span className="settings-row">
        {'    '}show key hints{'  '}
        <span
          className={`settings-toggle-btn${showKeyHints ? ' settings-toggle-btn--on' : ''}`}
          onClick={() => updateSetting('showKeyHints', !showKeyHints)}
        >
          {showKeyHints ? '[on ]' : '[off]'}
        </span>
      </span>
    )},
    { num: lineNum++, content: (
      <span className="settings-row">
        {'    '}reduced motion{'  '}
        <span
          className={`settings-toggle-btn${reducedMotion ? ' settings-toggle-btn--on' : ''}`}
          onClick={() => updateSetting('reducedMotion', !reducedMotion)}
        >
          {reducedMotion ? '[on ]' : '[off]'}
        </span>
      </span>
    )},
    { num: lineNum++, content: '' },
    { num: lineNum++, content: (
      <button className="setup-start" onClick={savePrefs}>save preferences</button>
    )},
    { num: lineNum++, content: '' },
  ];

  if (isLoggedIn) {
    lines.push(
      { num: lineNum++, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: 'ACCOUNT' },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: (
        <form className="settings-inline-form" onSubmit={saveProfile}>
          <span className="buf-dim">{'    '}display name  </span>
          <input
            className="settings-inline-input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="your name"
          />
          {'  '}
          <button type="submit" className="setup-start" disabled={savingProfile}>
            {savingProfile ? 'saving…' : 'save'}
          </button>
        </form>
      )},
      { num: lineNum++, content: '' },
      { num: lineNum++, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: 'CHANGE PASSWORD' },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: (
        <form className="settings-inline-form" onSubmit={changePwd}>
          <span className="buf-dim">{'    '}current  </span>
          <input
            className="settings-inline-input"
            type="password"
            value={currentPwd}
            onChange={e => setCurrentPwd(e.target.value)}
            required
          />
        </form>
      )},
      { num: lineNum++, content: (
        <form className="settings-inline-form" onSubmit={changePwd}>
          <span className="buf-dim">{'    '}new      </span>
          <input
            className="settings-inline-input"
            type="password"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            minLength={8}
            required
          />
          {'  '}
          <button type="submit" className="setup-start" disabled={savingPwd}>
            {savingPwd ? 'saving…' : 'change'}
          </button>
        </form>
      )},
      { num: lineNum++, content: '' },
      { num: lineNum++, content: <span className="buf-sep-line">{'─'.repeat(50)}</span> },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: 'DANGER ZONE' },
      { num: lineNum++, content: '' },
      { num: lineNum++, content: (
        <button
          className="setup-start"
          style={{ color: 'var(--red)' }}
          onClick={() => setDeleteOpen(true)}
        >
          delete account
        </button>
      )},
      { num: lineNum++, content: '' },
    );
  }

  return (
    <div className="settings-shell">
      <BufferPane lines={lines} tildeStart={lineNum} totalLines={Math.max(35, lineNum + 5)} />

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Account">
        <p className="modal-confirm__text">
          Permanently delete your account? All history and keymaps will be lost.
        </p>
        <div className="modal-confirm__actions">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={deleteAccount}>
            Yes, delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
