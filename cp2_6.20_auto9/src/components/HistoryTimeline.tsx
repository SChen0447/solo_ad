import { HistorySnapshot } from '../colorSystem/colorTypes';

interface HistoryTimelineProps {
  history: HistorySnapshot[];
  activeId: string | null;
  onRestore: (snapshot: HistorySnapshot) => void;
  onClear: (snapshot: HistorySnapshot) => void;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return `今天 ${formatTime(timestamp)}`;
  }
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${mm}-${dd} ${formatTime(timestamp)}`;
}

export default function HistoryTimeline({
  history,
  activeId,
  onRestore,
}: HistoryTimelineProps) {
  return (
    <aside className="glass-panel history-sidebar fade-in-up" style={{ animationDelay: '0.12s' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title" style={{ margin: 0 }}>
          历史记录
        </h2>
        <span
          style={{
            fontSize: 12,
            padding: '3px 9px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.06)',
            fontFamily: "'SF Mono', Monaco, monospace",
            fontWeight: 600,
          }}
        >
          {history.length}/10
        </span>
      </div>

      {history.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            opacity: 0.55,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏱</div>
          暂无历史记录
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
            调整主色或辅色后，
            <br />
            将自动保存快照
          </div>
        </div>
      ) : (
        <div className="timeline">
          {history.map((snap, index) => (
            <div
              key={snap.id}
              className={`timeline-item ${activeId === snap.id ? 'active' : ''}`}
              onClick={() => onRestore(snap)}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="timeline-time">{formatDate(snap.timestamp)}</div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "'SF Mono', Monaco, monospace",
                  opacity: 0.8,
                  marginBottom: 8,
                }}
              >
                主色: {snap.primaryBase} · 辅色: {snap.secondaryBase}
              </div>
              <div className="timeline-colors">
                {[50, 200, 400, 500, 600, 800, 900].map((lvl) => {
                  const s = snap.palette.primary.find((x) => x.level === lvl);
                  return (
                    <div
                      key={lvl}
                      className="timeline-color"
                      style={{ background: s?.hex || '#ccc' }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
