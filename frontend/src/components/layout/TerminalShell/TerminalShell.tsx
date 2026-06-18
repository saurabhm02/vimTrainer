import { Outlet } from 'react-router-dom';
import { Tabline } from '../Tabline/Tabline';
import { Statusline } from '../Statusline/Statusline';
import { Cmdline } from '../Cmdline/Cmdline';
import './TerminalShell.css';

export function TerminalShell() {
  return (
    <div className="terminal-shell">
      <Tabline />
      <div className="terminal-shell__body">
        <Outlet />
      </div>
      <Statusline />
      <Cmdline />
    </div>
  );
}
