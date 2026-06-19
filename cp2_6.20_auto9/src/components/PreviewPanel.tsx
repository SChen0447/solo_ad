import { ColorPalette as Palette, ThemeMode } from '../colorSystem/colorTypes';

interface PreviewPanelProps {
  palette: Palette;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

function CardContent({
  palette,
  isDark,
}: {
  palette: Palette;
  isDark: boolean;
}) {
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDark ? '#cbd5e1' : '#475569';
  const titleColor = isDark ? '#f8fafc' : '#0f172a';
  const neutralBg = isDark ? palette.neutral[7]?.hex : palette.neutral[50]?.hex;

  return (
    <div
      className="preview-card"
      style={{
        background: isDark ? '#334155' : '#ffffff',
      }}
    >
      <div className="preview-card-header">
        <div>
          <div
            className="preview-card-title"
            style={{ color: titleColor }}
          >
            产品迭代更新 v2.3
          </div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2, color: subTextColor }}>
            设计师团队 · 2 小时前
          </div>
        </div>
        <div className="preview-card-avatar">JS</div>
      </div>

      <div
        className="preview-card-body"
        style={{ color: textColor, opacity: 0.85 }}
      >
        全新的色彩系统已上线，包含主色、辅色及完整中性色色阶。
        所有设计令牌可一键导出为 CSS、JSON 和 Tailwind 配置格式。
      </div>

      <div className="preview-card-tags">
        <span
          className="preview-tag preview-tag-primary"
        >
          设计系统
        </span>
        <span
          className="preview-tag preview-tag-secondary"
        >
          色彩令牌
        </span>
        <span
          className="preview-tag preview-tag-neutral"
          style={{ background: neutralBg, color: textColor }}
        >
          v2.3.0
        </span>
      </div>

      <div className="preview-card-footer">
        <button
          className="preview-btn preview-btn-primary"
          style={{ background: palette.primary[5]?.hex }}
        >
          查看详情
        </button>
        <button
          className="preview-btn preview-btn-outline"
          style={{
            borderColor: palette.primary[5]?.hex,
            color: palette.primary[5]?.hex,
          }}
        >
          稍后阅读
        </button>
      </div>
    </div>
  );
}

export default function PreviewPanel({
  palette,
  themeMode,
  onToggleTheme,
}: PreviewPanelProps) {
  return (
    <section className="glass-panel fade-in-up" style={{ animationDelay: '0.08s' }}>
      <div className="flex justify-between items-center mb-5">
        <h2 className="section-title" style={{ margin: 0 }}>
          实时组件预览
        </h2>
        <div className="btn-group">
          <button
            className={`btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => themeMode !== 'light' && onToggleTheme()}
          >
            ☀ 亮色
          </button>
          <button
            className={`btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => themeMode !== 'dark' && onToggleTheme()}
          >
            ☾ 暗色
          </button>
        </div>
      </div>

      <div className="preview-panels">
        <div className="preview-mode light">
          <h4>
            ☀ 亮色模式
            <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>
              Light Theme
            </span>
          </h4>
          <CardContent palette={palette} isDark={false} />
        </div>
        <div className="preview-mode dark">
          <h4>
            ☾ 暗色模式
            <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>
              Dark Theme
            </span>
          </h4>
          <CardContent palette={palette} isDark={true} />
        </div>
      </div>
    </section>
  );
}
