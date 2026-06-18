import { Link } from 'react-router-dom';
import { BufferPane } from '../BufferPane/BufferPane';
import type { BufferLine } from '../BufferPane/BufferPane';
import './AuthPrompt.css';

export function AuthPrompt() {
  const lines: BufferLine[] = [
    { num: 1,  content: <span className="buf-comment">-- this section requires an account</span> },
    { num: 2,  content: '' },
    { num: 3,  content: 'sign in to unlock:' },
    { num: 4,  content: '' },
    { num: 5,  content: <span className="buf-dim">    · import your keymaps</span> },
    { num: 6,  content: <span className="buf-dim">    · session history &amp; analytics</span> },
    { num: 7,  content: <span className="buf-dim">    · daily training queue</span> },
    { num: 8,  content: <span className="buf-dim">    · cross-device sync &amp; streaks</span> },
    { num: 9,  content: '' },
    { num: 10, content: <span className="buf-sep-line">{'─'.repeat(44)}</span> },
    { num: 11, content: '' },
    { num: 12, content: (
        <span className="auth-prompt__actions">
          <Link to="/auth/login" className="auth-prompt__btn">sign in</Link>
          <Link to="/auth/register" className="auth-prompt__btn">create account</Link>
        </span>
      ),
    },
  ];

  return (
    <div className="auth-prompt-wrap">
      <BufferPane lines={lines} tildeStart={13} totalLines={30} />
    </div>
  );
}
