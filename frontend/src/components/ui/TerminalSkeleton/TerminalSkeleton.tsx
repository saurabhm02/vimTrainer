export function TerminalSkeleton() {
  return (
    <div className="buf-pane" aria-busy="true" aria-label="Loading">
      <div className="buf-gutter">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="buf-ln">{i + 1}</div>
        ))}
      </div>
      <div className="buf-content">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="buf-line" />
        ))}
      </div>
    </div>
  );
}
