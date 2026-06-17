import { useState, useMemo } from 'react';
import { HSL, hslToString, hslToHex } from './colorTheory';

export type ThemeMode = 'dark' | 'light';
export type TemplateType = 'dashboard' | 'login' | 'settings';

interface UIPreviewProps {
  colors: HSL[];
  animationKey: number;
}

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  dashboard: '仪表盘',
  login: '登录页',
  settings: '设置页'
};

export default function UIPreview({ colors, animationKey }: UIPreviewProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [templateType, setTemplateType] = useState<TemplateType>('dashboard');

  const palette = useMemo(() => {
    const c = [...colors];
    while (c.length < 5) {
      c.push(c[c.length - 1] || { h: 0, s: 0, l: 50 });
    }
    return c;
  }, [colors]);

  const primary = palette[0];
  const secondary = palette[1] || primary;
  const accent = palette[2] || primary;
  const tertiary = palette[3] || secondary;
  const quaternary = palette[4] || accent;

  const surfaceBg = themeMode === 'dark' ? '#16213e' : '#f5f5f7';
  const cardBg = themeMode === 'dark' ? '#1f2a44' : '#ffffff';
  const textPrimary = themeMode === 'dark' ? '#e0e0e0' : '#1a1a2e';
  const textSecondary = themeMode === 'dark' ? '#8892b0' : '#5a5a7a';
  const borderColor = themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const transitionStyle: React.CSSProperties = {
    transition: 'all 300ms ease-in-out'
  };

  const renderDashboard = () => (
    <div className="template-content" key={`${animationKey}-dashboard`}>
      <div className="dash-header">
        <div className="dash-avatar" style={{ backgroundColor: hslToString(primary), ...transitionStyle }}>
          <i className="fa-solid fa-user" />
        </div>
        <div className="dash-user">
          <div style={{ color: textPrimary, ...transitionStyle }}>欢迎回来</div>
          <div style={{ color: textSecondary, fontSize: '12px', ...transitionStyle }}>管理员</div>
        </div>
        <div className="dash-bell" style={{ color: textSecondary, ...transitionStyle }}>
          <i className="fa-solid fa-bell" />
        </div>
      </div>
      <div className="dash-stats">
        <div className="stat-card" style={{ backgroundColor: hslToString({ ...primary, l: themeMode === 'dark' ? 30 : 85 }), ...transitionStyle }}>
          <i className="fa-solid fa-chart-line" style={{ color: hslToString(primary), ...transitionStyle }} />
          <div className="stat-num" style={{ color: textPrimary, ...transitionStyle }}>1,234</div>
          <div className="stat-label" style={{ color: textSecondary, ...transitionStyle }}>访问量</div>
        </div>
        <div className="stat-card" style={{ backgroundColor: hslToString({ ...secondary, l: themeMode === 'dark' ? 30 : 85 }), ...transitionStyle }}>
          <i className="fa-solid fa-users" style={{ color: hslToString(secondary), ...transitionStyle }} />
          <div className="stat-num" style={{ color: textPrimary, ...transitionStyle }}>567</div>
          <div className="stat-label" style={{ color: textSecondary, ...transitionStyle }}>用户数</div>
        </div>
      </div>
      <div className="dash-progress">
        <div style={{ color: textPrimary, fontSize: '14px', marginBottom: '8px', ...transitionStyle }}>项目进度</div>
        <div className="progress-bar-bg" style={{ backgroundColor: themeMode === 'dark' ? '#0f1629' : '#e8e8ee', ...transitionStyle }}>
          <div className="progress-bar-fill" style={{
            width: '68%',
            backgroundColor: hslToString(accent),
            ...transitionStyle
          }} />
        </div>
      </div>
      <div className="dash-actions">
        <button className="dash-primary-btn" style={{
          backgroundColor: hslToString(primary),
          color: primary.l > 50 ? '#1a1a2e' : '#ffffff',
          ...transitionStyle
        }}>
          <i className="fa-solid fa-plus" /> 新建项目
        </button>
        <button className="dash-secondary-btn" style={{
          borderColor: hslToString(secondary),
          color: hslToString(secondary),
          ...transitionStyle
        }}>
          <i className="fa-solid fa-gear" /> 配置
        </button>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="template-content" key={`${animationKey}-login`}>
      <div className="login-logo" style={{ color: hslToString(primary), ...transitionStyle }}>
        <i className="fa-solid fa-palette" />
      </div>
      <div className="login-title" style={{ color: textPrimary, ...transitionStyle }}>欢迎登录</div>
      <div className="login-subtitle" style={{ color: textSecondary, ...transitionStyle }}>请输入您的账户信息</div>
      <div className="login-fields">
        <div className="login-field" style={{ borderColor, ...transitionStyle }}>
          <i className="fa-solid fa-envelope" style={{ color: textSecondary, ...transitionStyle }} />
          <input placeholder="邮箱地址" style={{ color: textPrimary, ...transitionStyle }} />
        </div>
        <div className="login-field" style={{ borderColor, ...transitionStyle }}>
          <i className="fa-solid fa-lock" style={{ color: textSecondary, ...transitionStyle }} />
          <input type="password" placeholder="密码" style={{ color: textPrimary, ...transitionStyle }} />
        </div>
      </div>
      <div className="login-remember" style={{ color: textSecondary, ...transitionStyle }}>
        <label className="check-label">
          <input type="checkbox" />
          <span className="check-custom" style={{ borderColor: hslToString(tertiary), ...transitionStyle }}>
            <i className="fa-solid fa-check" />
          </span>
          记住我
        </label>
        <span style={{ color: hslToString(accent), ...transitionStyle }}>忘记密码?</span>
      </div>
      <button className="login-btn" style={{
        backgroundColor: hslToString(primary),
        color: primary.l > 50 ? '#1a1a2e' : '#ffffff',
        ...transitionStyle
      }}>
        立即登录
      </button>
      <div className="login-social">
        <div className="social-divider" style={{ backgroundColor: borderColor, ...transitionStyle }} />
        <span style={{ color: textSecondary, ...transitionStyle }}>或使用第三方登录</span>
        <div className="social-divider" style={{ backgroundColor: borderColor, ...transitionStyle }} />
      </div>
      <div className="login-social-btns">
        <button className="social-btn" style={{ borderColor: hslToString(secondary), color: hslToString(secondary), ...transitionStyle }}>
          <i className="fa-brands fa-google" />
        </button>
        <button className="social-btn" style={{ borderColor: hslToString(tertiary), color: hslToString(tertiary), ...transitionStyle }}>
          <i className="fa-brands fa-github" />
        </button>
        <button className="social-btn" style={{ borderColor: hslToString(quaternary), color: hslToString(quaternary), ...transitionStyle }}>
          <i className="fa-brands fa-weixin" />
        </button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="template-content" key={`${animationKey}-settings`}>
      <div className="settings-header">
        <div style={{ color: textPrimary, fontWeight: 600, fontSize: '18px', ...transitionStyle }}>系统设置</div>
        <i className="fa-solid fa-xmark" style={{ color: textSecondary, ...transitionStyle }} />
      </div>
      <div className="settings-tabs">
        {['通用', '外观', '通知'].map((tab, i) => (
          <div
            key={tab}
            className={`settings-tab ${i === 0 ? 'active' : ''}`}
            style={i === 0 ? {
              backgroundColor: hslToString(primary),
              color: primary.l > 50 ? '#1a1a2e' : '#ffffff',
              ...transitionStyle
            } : { color: textSecondary, ...transitionStyle }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div className="settings-items">
        <div className="settings-item" style={{ borderBottomColor: borderColor, ...transitionStyle }}>
          <div>
            <div style={{ color: textPrimary, fontSize: '14px', ...transitionStyle }}>深色模式</div>
            <div style={{ color: textSecondary, fontSize: '12px', ...transitionStyle }}>启用暗色主题</div>
          </div>
          <div className="toggle-switch" style={{
            backgroundColor: hslToString(secondary),
            ...transitionStyle
          }}>
            <div className="toggle-thumb" style={{ backgroundColor: '#ffffff' }} />
          </div>
        </div>
        <div className="settings-item" style={{ borderBottomColor: borderColor, ...transitionStyle }}>
          <div>
            <div style={{ color: textPrimary, fontSize: '14px', ...transitionStyle }}>主题色</div>
            <div style={{ color: textSecondary, fontSize: '12px', ...transitionStyle }}>当前: {hslToHex(primary)}</div>
          </div>
          <div className="color-dots">
            {palette.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="color-dot"
                style={{ backgroundColor: hslToString(c), ...transitionStyle }}
              />
            ))}
          </div>
        </div>
        <div className="settings-item" style={{ borderBottomColor: borderColor, ...transitionStyle }}>
          <div>
            <div style={{ color: textPrimary, fontSize: '14px', ...transitionStyle }}>自动更新</div>
            <div style={{ color: textSecondary, fontSize: '12px', ...transitionStyle }}>定期检查新版本</div>
          </div>
          <div className="toggle-switch off" style={{
            backgroundColor: themeMode === 'dark' ? '#2a3550' : '#d0d0da',
            ...transitionStyle
          }}>
            <div className="toggle-thumb" style={{ backgroundColor: '#ffffff' }} />
          </div>
        </div>
        <div className="settings-item" style={{ borderBottomColor: 'transparent' }}>
          <div>
            <div style={{ color: textPrimary, fontSize: '14px', ...transitionStyle }}>数据同步</div>
            <div style={{ color: textSecondary, fontSize: '12px', ...transitionStyle }}>云端自动备份</div>
          </div>
          <div className="toggle-switch" style={{
            backgroundColor: hslToString(accent),
            ...transitionStyle
          }}>
            <div className="toggle-thumb" style={{ backgroundColor: '#ffffff' }} />
          </div>
        </div>
      </div>
      <button className="settings-save-btn" style={{
        backgroundColor: hslToString(primary),
        color: primary.l > 50 ? '#1a1a2e' : '#ffffff',
        ...transitionStyle
      }}>
        <i className="fa-solid fa-floppy-disk" /> 保存设置
      </button>
    </div>
  );

  const renderTemplate = () => {
    switch (templateType) {
      case 'dashboard': return renderDashboard();
      case 'login': return renderLogin();
      case 'settings': return renderSettings();
    }
  };

  return (
    <div className="ui-preview-wrapper">
      <div className="preview-controls">
        <div className="theme-toggle">
          <button
            className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => setThemeMode('light')}
          >
            <i className="fa-solid fa-sun" />
          </button>
          <button
            className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => setThemeMode('dark')}
          >
            <i className="fa-solid fa-moon" />
          </button>
        </div>
        <div className="template-tabs">
          {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((t) => (
            <button
              key={t}
              className={`template-tab ${templateType === t ? 'active' : ''}`}
              onClick={() => setTemplateType(t)}
              style={templateType === t ? {
                borderColor: hslToString(primary),
                color: hslToString(primary),
                ...transitionStyle
              } : transitionStyle}
            >
              {TEMPLATE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="preview-frame" style={{
        backgroundColor: surfaceBg,
        borderColor,
        ...transitionStyle
      }}>
        <div className="preview-inner" style={{ backgroundColor: cardBg, ...transitionStyle }}>
          <div className="template-anim-wrap">
            {renderTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
}
