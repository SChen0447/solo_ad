import { useAppStore } from '@/store/useAppStore';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export default function TickerBar() {
  const { operationLogs } = useAppStore();
  const recentLogs = operationLogs.slice(0, 10);

  if (recentLogs.length === 0) return null;

  const tickerText = recentLogs.map(log =>
    `【${formatTime(log.timestamp)}】${log.operatorName} ${log.action}《${log.targetName}》`
  );

  return (
    <div className="ticker-bar">
      <span className="ticker-label">📋 最新动态</span>
      <div className="ticker-content">
        <div className="ticker-track">
          {[...tickerText, ...tickerText].map((text, idx) => (
            <span key={idx} className="ticker-item">{text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
