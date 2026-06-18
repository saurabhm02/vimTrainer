import { useTerminalStore } from '../../../stores/terminalStore';
import './Statusline.css';

export function Statusline() {
  const {
    statusMode,
    statusFile,
    statusCategory,
    statusProgress,
    statusAccuracy,
    statusTiming,
    statusRight,
  } = useTerminalStore();

  const accNum = parseInt(statusAccuracy ?? '0');
  const accuracyClass = statusAccuracy
    ? accNum >= 90 ? 'sl-acc--green'
      : accNum >= 70 ? 'sl-acc--yellow'
      : 'sl-acc--red'
    : '';

  return (
    <div className="statusline" role="status" aria-live="polite">
      <span className={`sl-mode sl-mode--${statusMode.toLowerCase()}`}>
        {statusMode}
      </span>
      <span className="sl-sep">│</span>
      <span className="sl-file">{statusFile}</span>
      {statusCategory && (
        <>
          <span className="sl-sep">│</span>
          <span className="sl-category">{statusCategory}</span>
        </>
      )}
      {statusProgress && (
        <>
          <span className="sl-sep">│</span>
          <span className="sl-progress">{statusProgress}</span>
        </>
      )}
      {statusAccuracy && (
        <>
          <span className="sl-sep">│</span>
          <span className={`sl-accuracy ${accuracyClass}`}>{statusAccuracy}</span>
        </>
      )}
      {statusTiming && (
        <>
          <span className="sl-sep">│</span>
          <span className="sl-timing">{statusTiming}</span>
        </>
      )}
      <span className="sl-spacer" />
      {statusRight && <span className="sl-right">{statusRight}</span>}
    </div>
  );
}
