import { forwardRef } from 'react';
import './BufferPane.css';

export interface BufferLine {
  num: number;
  content: React.ReactNode;
  active?: boolean;
  dim?: boolean;
}

interface BufferPaneProps {
  lines: BufferLine[];
  tildeStart?: number;
  totalLines?: number;
  className?: string;
}

export const BufferPane = forwardRef<HTMLDivElement, BufferPaneProps>(
  ({ lines, tildeStart, totalLines = 40, className = '' }, ref) => {
    const tildeCount = tildeStart != null
      ? Math.max(0, totalLines - (tildeStart - 1))
      : 0;

    return (
      <div className={`buf-pane ${className}`} ref={ref}>
        <div className="buf-gutter" aria-hidden="true">
          {lines.map(l => (
            <div key={`g${l.num}`} className={`buf-ln${l.active ? ' buf-ln--cur' : ''}`}>
              {l.num}
            </div>
          ))}
          {Array.from({ length: tildeCount }, (_, i) => (
            <div key={`gt${i}`} className="buf-ln buf-ln--tilde">&nbsp;</div>
          ))}
        </div>
        <div className="buf-content">
          {lines.map(l => (
            <div
              key={`c${l.num}`}
              className={`buf-line${l.active ? ' buf-line--active' : ''}${l.dim ? ' buf-line--dim' : ''}`}
            >
              {l.content}
            </div>
          ))}
          {Array.from({ length: tildeCount }, (_, i) => (
            <div key={`ct${i}`} className="buf-line buf-line--tilde">~</div>
          ))}
        </div>
      </div>
    );
  }
);
BufferPane.displayName = 'BufferPane';
