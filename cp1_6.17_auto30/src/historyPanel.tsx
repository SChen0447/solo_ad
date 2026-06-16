import type { HistoryItem } from './types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;

    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${hh}:${mm}`;
  } catch {
    return '';
  }
}

function HistoryPanel({ history, onLoadHistory }: HistoryPanelProps) {
  return (
    <div className="history-section">
      <div className="history-header">📜 历史记录（最近 10 条）</div>
      {history.length === 0 ? (
        <div className="empty-history">暂无历史记录，生成测试后将显示在此处</div>
      ) : (
        <div className="history-list">
          {history.map((item) => {
            const fnNames = item.functions?.map((f) => f.name).join(', ') || '';
            const title = fnNames || (item.code.split('\n')[0]?.slice(0, 20) || '未命名');
            return (
              <div
                key={item.id}
                className="history-card"
                onClick={() => onLoadHistory(item)}
                title="点击重新加载"
              >
                <div className="history-card-title">{title}</div>
                <div className="history-card-time">{formatTime(item.timestamp)}</div>
                <div className="history-card-preview">
                  {item.code.slice(0, 80)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;
