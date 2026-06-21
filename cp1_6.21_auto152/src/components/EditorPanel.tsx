import { useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { templateList, alignOptions } from '../templates/templateConfig';
import type { AlignType } from '../templates/templateConfig';
import '../styles/EditorPanel.css';

function ColorPicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="color-picker-field">
      <label>{label}</label>
      <div className="color-picker-wrapper">
        <label className="color-circle" style={{ backgroundColor: value }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <input
          type="text"
          className="color-hex-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function CollapsibleCard({
  title,
  defaultOpen = true,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="editor-card">
      <div className="editor-card-header" onClick={() => setOpen(!open)}>
        <span className="editor-card-title">{title}</span>
        <span className={`arrow ${open ? 'arrow-up' : 'arrow-down'}`}>▼</span>
      </div>
      {open && <div className="editor-card-body">{children}</div>}
    </div>
  );
}

function AlignGrid({ value, onChange }: { value: AlignType; onChange: (a: AlignType) => void }) {
  const rows: AlignType[][] = [
    ['top-left', 'top-center', 'top-right'],
    ['center-left', 'center-center', 'center-right'],
    ['bottom-left', 'bottom-center', 'bottom-right']
  ];
  return (
    <div className="align-grid">
      {rows.map((row, ri) => (
        <div className="align-row" key={ri}>
          {row.map((cell) => (
            <button
              key={cell}
              className={`align-cell ${value === cell ? 'active' : ''}`}
              onClick={() => onChange(cell)}
              title={alignOptions.find((o) => o.value === cell)?.label}
            >
              {value === cell && <span className="align-dot" />}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  unit = '',
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="slider-field">
      <div className="slider-label-row">
        <label>{label}</label>
        <span className="slider-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`range-slider ${dragging ? 'dragging' : ''}`}
      />
    </div>
  );
}

function HistoryButton({
  direction,
  disabled,
  onClick,
  tooltip
}: {
  direction: 'undo' | 'redo';
  disabled: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const [shaking, setShaking] = useState(false);

  const handleClick = () => {
    if (disabled) {
      setShaking(true);
      setTimeout(() => setShaking(false), 200);
      return;
    }
    onClick();
  };

  return (
    <div className="history-btn-wrapper">
      <button
        className={`history-btn ${shaking ? 'shake' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        disabled={disabled}
      >
        {direction === 'undo' ? '↶' : '↷'}
      </button>
      <span className="history-tooltip">{tooltip}</span>
    </div>
  );
}

export default function EditorPanel() {
  const {
    selectedTemplateId,
    currentTemplate,
    setSelectedTemplate,
    setTitle,
    setSubtitle,
    setButtonText,
    setButtonLink,
    setButtonBgColor,
    setButtonTextColor,
    setGradientStart,
    setGradientEnd,
    setTextColor,
    setAlign,
    setWidth,
    setHeight,
    setZIndex,
    setCouponCode,
    setCountdownEndTime,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditorStore();

  const [exportTooltip, setExportTooltip] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [btnPulse, setBtnPulse] = useState('');

  const pulse = (key: string) => {
    setBtnPulse(key);
    setTimeout(() => setBtnPulse(''), 100);
  };

  const handleExport = async () => {
    pulse('export');
    const t = currentTemplate;
    const code = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>促销弹窗</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .popup-mask {
    position: fixed; inset: 0; z-index: ${t.zIndex};
    background: rgba(0,0,0,0.55);
    display: flex;
    justify-content: ${t.align.includes('left') ? 'flex-start' : t.align.includes('right') ? 'flex-end' : 'center'};
    align-items: ${t.align.startsWith('top') ? 'flex-start' : t.align.startsWith('bottom') ? 'flex-end' : 'center'};
    padding: 24px;
  }
  .popup-box {
    width: ${t.width}px;
    min-height: ${t.height}px;
    border-radius: 16px;
    background: linear-gradient(135deg, ${t.gradientStart} 0%, ${t.gradientEnd} 100%);
    color: ${t.textColor};
    padding: 32px 28px;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: all 0.3s ease;
  }
  .popup-title { font-size: 28px; font-weight: 700; margin-bottom: 12px; }
  .popup-subtitle { font-size: 15px; opacity: 0.92; line-height: 1.6; margin-bottom: 24px; white-space: pre-line; }
  .popup-btn {
    padding: 12px 40px; border: none; border-radius: 999px; cursor: pointer;
    background: ${t.button.bgColor}; color: ${t.button.textColor};
    font-size: 16px; font-weight: 600; transition: transform 0.15s;
  }
  .popup-btn:hover { transform: translateY(-2px); }
  .popup-close {
    position: absolute; top: 16px; right: 16px;
    width: 32px; height: 32px; border-radius: 50%;
    border: none; background: rgba(255,255,255,0.25);
    color: ${t.textColor}; font-size: 18px; cursor: pointer;
  }
  .popup-coupon {
    background: rgba(255,255,255,0.18); padding: 10px 20px; border-radius: 8px;
    margin-bottom: 18px; font-family: monospace; font-size: 16px; letter-spacing: 2px;
  }
  .popup-countdown { display: flex; gap: 8px; margin-bottom: 20px; }
  .popup-countdown .cell {
    background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 6px;
    font-weight: 700; font-size: 18px; min-width: 44px;
  }
  .popup-tiers { width: 100%; margin-bottom: 20px; }
  .popup-tier {
    background: rgba(255,255,255,0.15); padding: 10px 14px; border-radius: 8px;
    margin-bottom: 8px; font-size: 14px; display: flex; justify-content: space-between;
  }
</style>
</head>
<body>
<div class="popup-mask" id="popupMask">
  <div class="popup-close" onclick="closePopup()">×</div>
  <div class="popup-box">
    <div class="popup-title">${t.title}</div>
    <div class="popup-subtitle">${t.subtitle}</div>
    ${t.couponCode ? `<div class="popup-coupon">券码: ${t.couponCode}</div>` : ''}
    ${t.countdownEnabled ? `<div class="popup-countdown" id="countdown"></div>` : ''}
    ${t.tiers ? `<div class="popup-tiers">${t.tiers.map(tier => `<div class="popup-tier"><span>${tier.label}</span><strong>省¥${tier.discount}</strong></div>`).join('')}</div>` : ''}
    <button class="popup-btn" onclick="handleBtn()">${t.button.text}</button>
  </div>
</div>
<script>
  function closePopup(){ document.getElementById('popupMask').style.display='none'; }
  function handleBtn(){ window.location.href='${t.button.link}'; }
  ${t.countdownEnabled ? `
  (function(){
    var end=new Date('${t.countdownEndTime}').getTime();
    function tick(){
      var diff=Math.max(0,end-Date.now());
      var d=Math.floor(diff/86400000);
      var h=Math.floor(diff/3600000)%24;
      var m=Math.floor(diff/60000)%60;
      var s=Math.floor(diff/1000)%60;
      document.getElementById('countdown').innerHTML=
        '<div class="cell">'+String(d).padStart(2,'0')+'天</div>'+
        '<div class="cell">'+String(h).padStart(2,'0')+'时</div>'+
        '<div class="cell">'+String(m).padStart(2,'0')+'分</div>'+
        '<div class="cell">'+String(s).padStart(2,'0')+'秒</div>';
    }
    tick(); setInterval(tick,1000);
  })();` : ''}
</script>
</body>
</html>`;
    try {
      await navigator.clipboard.writeText(code);
      setExportTooltip({ type: 'success', msg: '已复制！' });
    } catch {
      setExportTooltip({ type: 'error', msg: '复制失败，请手动复制' });
    }
    setTimeout(() => setExportTooltip(null), 2000);
  };

  return (
    <aside className="editor-panel">
      <div className="editor-header">
        <h2>促销弹窗编辑器</h2>
        <div className="history-group">
          <HistoryButton direction="undo" disabled={!canUndo} onClick={undo} tooltip="撤销 (Ctrl+Z)" />
          <HistoryButton direction="redo" disabled={!canRedo} onClick={redo} tooltip="重做 (Ctrl+Y)" />
        </div>
      </div>

      <div className="editor-scroll">
        <CollapsibleCard title="模板选择">
          <div className="form-field">
            <label>选择模板</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="form-select"
            >
              {templateList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="文字设置">
          <div className="form-field">
            <label>标题文案</label>
            <input type="text" value={currentTemplate.title} onChange={(e) => setTitle(e.target.value)} className="form-input" />
          </div>
          <div className="form-field">
            <label>副标题</label>
            <textarea value={currentTemplate.subtitle} onChange={(e) => setSubtitle(e.target.value)} className="form-textarea" rows={3} />
          </div>
          <div className="form-field">
            <label>按钮文案</label>
            <input type="text" value={currentTemplate.button.text} onChange={(e) => setButtonText(e.target.value)} className="form-input" />
          </div>
          <div className="form-field">
            <label>按钮链接</label>
            <input type="text" value={currentTemplate.button.link} onChange={(e) => setButtonLink(e.target.value)} className="form-input" />
          </div>
          {currentTemplate.couponCode !== undefined && (
            <div className="form-field">
              <label>优惠券码</label>
              <input type="text" value={currentTemplate.couponCode} onChange={(e) => setCouponCode(e.target.value)} className="form-input" />
            </div>
          )}
          {currentTemplate.countdownEndTime !== undefined && (
            <div className="form-field">
              <label>倒计时结束时间</label>
              <input type="datetime-local" value={currentTemplate.countdownEndTime} onChange={(e) => setCountdownEndTime(e.target.value)} className="form-input" />
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="颜色设置">
          <div
            className="gradient-preview-bar"
            style={{
              background: `linear-gradient(135deg, ${currentTemplate.gradientStart} 0%, ${currentTemplate.gradientEnd} 100%)`
            }}
          />
          <ColorPicker label="渐变起始色" value={currentTemplate.gradientStart} onChange={setGradientStart} />
          <ColorPicker label="渐变结束色" value={currentTemplate.gradientEnd} onChange={setGradientEnd} />
          <ColorPicker label="文字颜色" value={currentTemplate.textColor} onChange={setTextColor} />
          <ColorPicker label="按钮背景" value={currentTemplate.button.bgColor} onChange={setButtonBgColor} />
          <ColorPicker label="按钮文字" value={currentTemplate.button.textColor} onChange={setButtonTextColor} />
        </CollapsibleCard>

        <CollapsibleCard title="尺寸及对齐">
          <RangeSlider label="弹窗宽度" value={currentTemplate.width} min={200} max={600} unit="px" onChange={setWidth} />
          <RangeSlider label="弹窗高度" value={currentTemplate.height} min={200} max={700} unit="px" onChange={setHeight} />
          <RangeSlider label="z-index" value={currentTemplate.zIndex} min={100} max={99999} onChange={setZIndex} />
          <div className="form-field">
            <label>对齐方式</label>
            <AlignGrid value={currentTemplate.align} onChange={setAlign} />
          </div>
        </CollapsibleCard>
      </div>

      <div className="editor-footer">
        <div className={`export-btn-wrapper ${btnPulse === 'export' ? 'pulse' : ''}`}>
          <button className="export-btn" onClick={handleExport}>
            导出代码
          </button>
          {exportTooltip && (
            <span className={`export-tooltip ${exportTooltip.type}`}>{exportTooltip.msg}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
