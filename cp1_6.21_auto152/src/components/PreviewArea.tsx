import { useEffect, useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import type { TemplateConfig, AlignType } from '../templates/templateConfig';
import '../styles/PreviewArea.css';

interface DeviceConfig {
  key: string;
  type: 'mobile' | 'desktop';
  label: string;
  viewportWidth: number;
  viewportHeight: number;
}

const devices: DeviceConfig[] = [
  { key: 'mobile-1', type: 'mobile', label: 'Mobile', viewportWidth: 375, viewportHeight: 812 },
  { key: 'mobile-2', type: 'mobile', label: 'Mobile', viewportWidth: 375, viewportHeight: 812 },
  { key: 'desktop-1', type: 'desktop', label: 'Desktop', viewportWidth: 1280, viewportHeight: 720 },
  { key: 'desktop-2', type: 'desktop', label: 'Desktop', viewportWidth: 1280, viewportHeight: 720 }
];

function getAlignStyles(align: AlignType): React.CSSProperties {
  const justifyContent = align.includes('left')
    ? 'flex-start'
    : align.includes('right')
    ? 'flex-end'
    : 'center';
  const alignItems = align.startsWith('top')
    ? 'flex-start'
    : align.startsWith('bottom')
    ? 'flex-end'
    : 'center';
  return { justifyContent, alignItems };
}

function PopupContent({ template }: { template: TemplateConfig }) {
  const {
    title,
    subtitle,
    button,
    textColor,
    gradientStart,
    gradientEnd,
    width,
    height,
    couponCode,
    countdownEnabled,
    countdownEndTime,
    tiers
  } = template;

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!countdownEnabled || !countdownEndTime) return;
    const endTime = new Date(countdownEndTime).getTime();
    const update = () => {
      const diff = Math.max(0, endTime - Date.now());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor(diff / 3600000) % 24,
        minutes: Math.floor(diff / 60000) % 60,
        seconds: Math.floor(diff / 1000) % 60
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [countdownEnabled, countdownEndTime]);

  const popupStyle: React.CSSProperties = {
    width: `${width}px`,
    minHeight: `${height}px`,
    background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
    color: textColor
  };

  return (
    <div className="mock-popup" style={popupStyle}>
      <div className="mock-popup-title">{title}</div>
      <div className="mock-popup-subtitle" style={{ whiteSpace: 'pre-line' }}>
        {subtitle}
      </div>
      {couponCode && <div className="mock-popup-coupon">券码: {couponCode}</div>}
      {countdownEnabled && countdownEndTime && (
        <div className="mock-popup-countdown">
          <div className="countdown-cell">{String(countdown.days).padStart(2, '0')}天</div>
          <div className="countdown-cell">{String(countdown.hours).padStart(2, '0')}时</div>
          <div className="countdown-cell">{String(countdown.minutes).padStart(2, '0')}分</div>
          <div className="countdown-cell">{String(countdown.seconds).padStart(2, '0')}秒</div>
        </div>
      )}
      {tiers && tiers.length > 0 && (
        <div className="mock-popup-tiers">
          {tiers.map((tier, idx) => (
            <div key={idx} className="mock-popup-tier">
              <span>{tier.label}</span>
              <strong>省¥{tier.discount}</strong>
            </div>
          ))}
        </div>
      )}
      <button
        className="mock-popup-btn"
        style={{ backgroundColor: button.bgColor, color: button.textColor }}
      >
        {button.text}
      </button>
    </div>
  );
}

function DeviceFrame({
  device,
  template
}: {
  device: DeviceConfig;
  template: TemplateConfig;
}) {
  const { previewVisible, togglePreview } = useEditorStore();
  const visible = previewVisible[device.key] ?? true;

  const scale =
    device.type === 'mobile'
      ? Math.min(240 / device.viewportWidth, 360 / device.viewportHeight)
      : Math.min(480 / device.viewportWidth, 320 / device.viewportHeight);

  const containerStyle: React.CSSProperties = {
    width: device.viewportWidth * scale,
    height: device.viewportHeight * scale
  };

  const innerStyle: React.CSSProperties = {
    width: device.viewportWidth,
    height: device.viewportHeight,
    transform: `scale(${scale})`
  };

  const alignStyles = getAlignStyles(template.align);

  const handleMaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      togglePreview(device.key);
    }
  };

  return (
    <div className="device-wrapper">
      <div className={`device-frame ${device.type}`}>
        {device.type === 'mobile' && (
          <>
            <div className="mobile-notch" />
            <div className="mobile-home-indicator" />
          </>
        )}
        {device.type === 'desktop' && (
          <div className="desktop-browser-bar">
            <div className="browser-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="browser-address-bar" />
          </div>
        )}
        <div className="device-viewport" style={containerStyle}>
          <div className="device-inner" style={innerStyle}>
            <div className="mock-page">
              <div className="mock-page-header" />
              <div className="mock-page-content">
                <div className="mock-page-block wide" />
                <div className="mock-page-row">
                  <div className="mock-page-block" />
                  <div className="mock-page-block" />
                </div>
                <div className="mock-page-block wide tall" />
                <div className="mock-page-row">
                  <div className="mock-page-block" />
                  <div className="mock-page-block" />
                </div>
              </div>
            </div>
            {visible && (
              <div
                className="popup-mask"
                onClick={handleMaskClick}
                style={alignStyles}
              >
                <button
                  className="mock-popup-close"
                  onClick={() => togglePreview(device.key)}
                  style={{ color: template.textColor }}
                >
                  ×
                </button>
                <PopupContent template={template} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="device-label">{device.label}</div>
    </div>
  );
}

export default function PreviewArea() {
  const currentTemplate = useEditorStore((s) => s.currentTemplate);

  return (
    <main className="preview-area">
      <div className="preview-header">
        <h2>实时预览</h2>
        <span className="preview-hint">点击弹窗外部可关闭预览</span>
      </div>
      <div className="preview-grid">
        {devices.map((device) => (
          <DeviceFrame key={device.key} device={device} template={currentTemplate} />
        ))}
      </div>
    </main>
  );
}
