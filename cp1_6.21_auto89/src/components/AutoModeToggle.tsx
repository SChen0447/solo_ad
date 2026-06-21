interface AutoModeToggleProps {
  enabled: boolean;
  interval: number;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  themeColor: string;
}

export default function AutoModeToggle({
  enabled,
  interval,
  onToggle,
  onIntervalChange,
  themeColor,
}: AutoModeToggleProps) {
  return (
    <div
      className="auto-mode-toggle"
      style={{
        borderColor: enabled ? `${themeColor}66` : 'var(--border-color)',
        boxShadow: enabled
          ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px ${themeColor}22`
          : 'var(--shadow-lg)',
      }}
    >
      <div className="toggle-row">
        <span className="toggle-label">自动演示</span>
        <div
          className={`toggle-switch ${enabled ? 'active' : ''}`}
          onClick={() => onToggle(!enabled)}
          style={{
            background: enabled ? themeColor : undefined,
            borderColor: enabled ? themeColor : undefined,
          }}
        />
      </div>

      <div className="interval-control">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="interval-label">切换间隔</span>
          <span className="interval-value">{interval}秒</span>
        </div>
        <input
          type="range"
          min="3"
          max="15"
          step="1"
          value={interval}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '4px',
            background: `linear-gradient(to right, ${themeColor} ${((interval - 3) / 12) * 100}%, var(--bg-secondary) ${((interval - 3) / 12) * 100}%)`,
            borderRadius: '2px',
            appearance: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>3s</span>
          <span>15s</span>
        </div>
      </div>
    </div>
  );
}
