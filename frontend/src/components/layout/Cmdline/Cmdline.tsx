import { useTerminalStore } from '../../../stores/terminalStore';
import './Cmdline.css';

export function Cmdline() {
  const { cmdlineMsg } = useTerminalStore();

  return (
    <div className={`cmdline cmdline--${cmdlineMsg.type}`} role="log" aria-live="assertive">
      {cmdlineMsg.text && <span className="cmdline__text">{cmdlineMsg.text}</span>}
    </div>
  );
}
