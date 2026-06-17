import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ToolPanelProps {
  color: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, v];
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPublish,
  isPublishing = false,
}) => {
  const [hsv, setHsv] = useState(() => {
    const [r, g, b] = hexToRgb(color);
    return rgbToHsv(r, g, b);
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const wheelRef = useRef<HTMLCanvasElement>(null);
  const svRef = useRef<HTMLCanvasElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const size = 220;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    const outer = size / 2 - 6;
    const inner = outer - 22;

    for (let angle = 0; angle < 360; angle += 1) {
      const start = (angle - 1.2) * Math.PI / 180;
      const end = (angle + 1.2) * Math.PI / 180;
      const [r, g, b] = hsvToRgb(angle, 1, 1);
      ctx.beginPath();
      ctx.arc(cx, cy, outer, start, end);
      ctx.arc(cx, cy, inner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();
    }

    const [hr, hg, hb] = hsvToRgb(hsv[0], 1, 1);
    ctx.strokeStyle = `rgb(${hr},${hg},${hb})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, (inner + outer) / 2, 0, Math.PI * 2);
    ctx.stroke();

    const selAngle = hsv[0] * Math.PI / 180;
    const selR = (inner + outer) / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(selAngle) * selR, cy + Math.sin(selAngle) * selR, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }, [hsv]);

  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const w = 200, h = 160;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const [hr, hg, hb] = hsvToRgb(hsv[0], 1, 1);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, `rgb(${hr},${hg},${hb})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const vgrad = ctx.createLinearGradient(0, 0, 0, h);
    vgrad.addColorStop(0, 'rgba(0,0,0,0)');
    vgrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = vgrad;
    ctx.fillRect(0, 0, w, h);

    const sx = hsv[1] * w;
    const sy = (1 - hsv[2]) * h;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    const [cr, cg, cb] = hsvToRgb(hsv[0], hsv[1], hsv[2]);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv]);

  useEffect(() => {
    const [r, g, b] = hexToRgb(color);
    const [nh, ns, nv] = rgbToHsv(r, g, b);
    setHsv((prev) => {
      if (Math.abs(prev[0] - nh) < 0.1 && Math.abs(prev[1] - ns) < 0.001 && Math.abs(prev[2] - nv) < 0.001) {
        return prev;
      }
      return [nh, ns, nv];
    });
  }, [color]);

  const applyHsv = useCallback((nh: number, ns: number, nv: number) => {
    setHsv([nh, ns, nv]);
    const [r, g, b] = hsvToRgb(nh, ns, nv);
    onColorChange(rgbToHex(r, g, b));
  }, [onColorChange]);

  const onWheelClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.hypot(dx, dy);
    const outer = canvas.width / 2 - 6;
    const inner = outer - 22;
    if (dist >= inner && dist <= outer) {
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      applyHsv(angle, hsv[1], hsv[2]);
    }
  }, [applyHsv, hsv]);

  const onSVClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = svRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const s = Math.max(0, Math.min(1, x / canvas.width));
    const v = Math.max(0, Math.min(1, 1 - y / canvas.height));
    applyHsv(hsv[0], s, v);
  }, [applyHsv, hsv]);

  const pressBtn = (name: string) => setPressedBtn(name);
  const releaseBtn = () => setPressedBtn(null);

  const brushGradient = (() => {
    const progress = (brushSize - 1) / 49;
    const [r, g, b] = hexToRgb(color);
    return `linear-gradient(to right, rgba(${r},${g},${b},0.25) 0%, rgba(${r},${g},${b},0.85) ${progress * 100}%, rgba(0,0,0,0.08) ${progress * 100}%, rgba(0,0,0,0.08) 100%)`;
  })();

  const currentHex = (() => {
    const [r, g, b] = hsvToRgb(hsv[0], hsv[1], hsv[2]);
    return rgbToHex(r, g, b);
  })();

  const panelContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      padding: '18px',
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#5a4a3a' }}>颜色</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${currentHex} 0%, ${currentHex}dd 100%)`,
              border: '2px solid rgba(139,90,43,0.2)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }} />
            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{currentHex.toUpperCase()}</span>
          </div>
        </div>

        <div
          ref={pickerRef}
          style={{
            maxHeight: pickerOpen ? '420px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.2s ease, margin 0.2s ease',
            margin: pickerOpen ? '0 0 12px 0' : '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <canvas
            ref={wheelRef}
            onMouseDown={onWheelClick}
            style={{ cursor: 'pointer', width: '200px', height: '200px' }}
          />
          <canvas
            ref={svRef}
            onMouseDown={onSVClick}
            style={{ cursor: 'pointer', width: '200px', height: '160px', borderRadius: '8px' }}
          />
        </div>

        <button
          onClick={() => setPickerOpen((o) => !o)}
          onMouseDown={() => pressBtn('picker')}
          onMouseUp={releaseBtn}
          onMouseLeave={releaseBtn}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(139,90,43,0.2)',
            background: pickerOpen
              ? 'linear-gradient(135deg, rgba(180,130,70,0.15), rgba(139,90,43,0.1))'
              : 'rgba(255,255,255,0.6)',
            color: '#5a4a3a',
            cursor: 'pointer',
            transform: pressedBtn === 'picker' ? 'scale(0.97) translateY(1px)' : 'scale(1)',
            boxShadow: pressedBtn === 'picker'
              ? 'inset 0 2px 4px rgba(0,0,0,0.1)'
              : '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'transform 0.08s, box-shadow 0.08s, background 0.15s',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 500,
          }}
        >
          <span>{pickerOpen ? '收起色环' : '展开色环选择'}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: `rotate(${pickerOpen ? 180 : 0}deg)`, transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#5a4a3a' }}>笔刷大小</span>
          <span style={{
            fontSize: '12px', color: '#888', fontFamily: 'monospace'
          }}>{brushSize}px</span>
        </div>

        <div
          style={{
            height: '70px',
            marginBottom: '12px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(139,90,43,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '60%',
              height: '2px',
              left: '20%',
              top: '50%',
              transform: 'translateY(-50%)',
              background: `linear-gradient(to right, ${color}22 0%, ${color}88 35%, ${color} 50%, ${color}aa 65%, ${color}22 100%)`,
              borderRadius: '1px',
              filter: 'blur(0.3px)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '22%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: Math.max(4, brushSize * 0.5),
              height: Math.max(4, brushSize * 0.5),
              borderRadius: '50%',
              background: `${color}44`,
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '48%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: Math.max(8, brushSize * 1.3),
              height: Math.max(8, brushSize * 1.3),
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${brushSize * 0.3}px ${color}66`,
              transition: 'all 0.15s ease',
            }}
          />

          <div
            style={{
              position: 'absolute',
              right: '22%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: Math.max(3, brushSize * 0.4),
              height: Math.max(3, brushSize * 0.4),
              borderRadius: '50%',
              background: `${color}33`,
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#aaa', marginBottom: '6px', padding: '0 2px' }}>
          <span>轻 · 淡</span>
          <span>重 · 浓</span>
        </div>

        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: brushGradient,
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            border: 2px solid ${color};
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.18);
            transition: transform 0.1s;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            border: 2px solid ${color};
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.18);
          }
        `}</style>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          onMouseDown={() => canUndo && pressBtn('undo')}
          onMouseUp={releaseBtn}
          onMouseLeave={releaseBtn}
          style={{
            padding: '10px 12px',
            fontSize: '13px',
            borderRadius: '10px',
            border: '1px solid rgba(139,90,43,0.18)',
            background: canUndo ? 'rgba(255,255,255,0.75)' : 'rgba(240,240,240,0.4)',
            color: canUndo ? '#5a4a3a' : '#bbb',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transform: pressedBtn === 'undo' ? 'scale(0.95) translateY(2px)' : 'scale(1)',
            boxShadow: pressedBtn === 'undo'
              ? 'inset 0 2px 5px rgba(0,0,0,0.12)'
              : canUndo ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
            transition: 'transform 0.08s, box-shadow 0.08s, background 0.2s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
          </svg>
          撤销
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          onMouseDown={() => canRedo && pressBtn('redo')}
          onMouseUp={releaseBtn}
          onMouseLeave={releaseBtn}
          style={{
            padding: '10px 12px',
            fontSize: '13px',
            borderRadius: '10px',
            border: '1px solid rgba(139,90,43,0.18)',
            background: canRedo ? 'rgba(255,255,255,0.75)' : 'rgba(240,240,240,0.4)',
            color: canRedo ? '#5a4a3a' : '#bbb',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transform: pressedBtn === 'redo' ? 'scale(0.95) translateY(2px)' : 'scale(1)',
            boxShadow: pressedBtn === 'redo'
              ? 'inset 0 2px 5px rgba(0,0,0,0.12)'
              : canRedo ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
            transition: 'transform 0.08s, box-shadow 0.08s, background 0.2s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
          </svg>
          重做
        </button>
      </div>

      <button
        onClick={onPublish}
        disabled={isPublishing}
        onMouseDown={() => !isPublishing && pressBtn('publish')}
        onMouseUp={releaseBtn}
        style={{
          padding: '13px 16px',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '12px',
          border: 'none',
          background: isPublishing
            ? 'linear-gradient(135deg, #c8a87c, #b49060)'
            : 'linear-gradient(135deg, #a67c52, #8B5A2B)',
          color: '#fff',
          cursor: isPublishing ? 'wait' : 'pointer',
          transform: pressedBtn === 'publish' ? 'scale(0.97) translateY(2px)' : 'scale(1)',
          boxShadow: pressedBtn === 'publish'
            ? 'inset 0 3px 8px rgba(0,0,0,0.25)'
            : '0 5px 16px rgba(139,90,43,0.3)',
          transition: 'transform 0.1s, box-shadow 0.1s, filter 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          letterSpacing: '0.5px',
        }}
        onMouseEnter={(e) => {
          if (!isPublishing && pressedBtn !== 'publish') {
            e.currentTarget.style.filter = 'brightness(1.08)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 7px 20px rgba(139,90,43,0.38)';
          }
        }}
        onMouseLeave={(e) => {
          releaseBtn();
          e.currentTarget.style.filter = 'brightness(1)';
          if (pressedBtn !== 'publish') e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = pressedBtn === 'publish'
            ? 'inset 0 3px 8px rgba(0,0,0,0.25)'
            : '0 5px 16px rgba(139,90,43,0.3)';
        }}
      >
        {isPublishing ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
              <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
            </svg>
            发布中...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            发布到公共画布
          </>
        )}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {!mobileCollapsed && (
          <div
            onClick={() => setMobileCollapsed(true)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
              zIndex: 99, transition: 'opacity 0.2s',
            }}
          />
        )}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: 'rgba(245, 240, 232, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(139,90,43,0.12)',
            boxShadow: '0 -6px 28px rgba(0,0,0,0.1)',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            transform: mobileCollapsed ? 'translateY(calc(100% - 56px))' : 'translateY(0)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={() => setMobileCollapsed((c) => !c)}
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: mobileCollapsed ? 'none' : '1px solid rgba(139,90,43,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '22px', height: '4px', background: 'rgba(139,90,43,0.4)', borderRadius: '2px' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#5a4a3a' }}>绘画工具</span>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5A2B" strokeWidth="2"
              style={{ transform: `rotate(${mobileCollapsed ? 0 : 180}deg)`, transition: 'transform 0.25s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '260px',
        background: 'rgba(250, 246, 238, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(139,90,43,0.12)',
        borderRadius: '18px',
        boxShadow: '0 12px 40px rgba(80, 50, 20, 0.12)',
        zIndex: 50,
      }}
    >
      {panelContent}
    </div>
  );
};

export default ToolPanel;
