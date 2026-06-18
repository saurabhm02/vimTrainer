import './InfoPanel.css';

export interface InfoSection {
  title: string;
  rows: Array<{ label?: string; value: React.ReactNode; accent?: boolean }>;
}

interface InfoPanelProps {
  sections: InfoSection[];
}

export function InfoPanel({ sections }: InfoPanelProps) {
  return (
    <div className="info-panel">
      {sections.map((section, i) => (
        <div key={i} className="info-section">
          <div className="info-section__title">{section.title}</div>
          <div className="info-section__rule">{'─'.repeat(24)}</div>
          {section.rows.map((row, j) => (
            <div key={j} className="info-row">
              {row.label && <span className="info-row__label">{row.label}</span>}
              <span className={`info-row__value${row.accent ? ' info-row__value--accent' : ''}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
