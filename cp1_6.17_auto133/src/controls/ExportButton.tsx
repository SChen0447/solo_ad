import React, { useState } from 'react';
import html2canvas from 'html2canvas';

interface ExportButtonProps {
  targetId: string;
  selectedDate: Date;
}

const LoadingOverlay: React.FC = () => {
  const ringSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6bb3ff" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#c8a0ff" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#ffd66b" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      <g>
        <circle cx="60" cy="60" r="52" fill="none" stroke="url(#ringGrad)" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="80 280"
          style="transform-origin: 60px 60px; animation: ringSpin 1.2s linear infinite;"/>
      </g>
      <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(180,200,255,0.25)" stroke-width="1" stroke-dasharray="4 6"/>
      <circle cx="60" cy="8" r="2.5" fill="#6bb3ff"/>
      <circle cx="110.5" cy="60" r="2" fill="#ffd66b"/>
      <circle cx="60" cy="112" r="2" fill="#c8a0ff"/>
      <circle cx="9.5" cy="60" r="2" fill="#ff9ec4"/>
    </svg>
  `;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(6, 8, 24, 0.82)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      gap: 24,
    }}>
      <div
        style={{ animation: 'ringGlow 2s ease-in-out infinite' }}
        dangerouslySetInnerHTML={{ __html: ringSvg }}
      />
      <div style={{
        fontFamily: '"Cinzel", "Noto Serif SC", serif',
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 3,
        fontWeight: 400,
      }}>
        GENERATING STAR MAP
      </div>
      <div style={{
        fontFamily: '"Noto Serif SC", serif',
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: 2,
      }}>
        正在生成星图海报...
      </div>
      <style>{`
        @keyframes ringSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ringGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(150, 180, 255, 0.6)); }
          50% { filter: drop-shadow(0 0 20px rgba(200, 180, 255, 0.85)); }
        }
      `}</style>
    </div>
  );
};

export const ExportButton: React.FC<ExportButtonProps> = ({ targetId, selectedDate }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      await new Promise(r => setTimeout(r, 800));

      const target = document.getElementById(targetId);
      if (!target) {
        setLoading(false);
        return;
      }

      const exportWidth = 1920;
      const exportHeight = 1080;

      const wrapper = document.createElement('div');
      Object.assign(wrapper.style, {
        position: 'fixed',
        left: '-99999px',
        top: '0',
        width: exportWidth + 'px',
        height: exportHeight + 'px',
        background: 'linear-gradient(180deg, #0b0e2a 0%, #1a2040 100%)',
        overflow: 'hidden',
      });
      document.body.appendChild(wrapper);

      const frame = document.createElement('div');
      Object.assign(frame.style, {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
      });
      wrapper.appendChild(frame);

      const frameInner = document.createElement('div');
      Object.assign(frameInner.style, {
        flex: '1',
        border: '2px solid rgba(255,255,255,0.12)',
        borderRadius: '18px',
        position: 'relative',
        overflow: 'hidden',
        background: 'transparent',
      });
      frame.appendChild(frameInner);

      const cloned = (target as HTMLElement).cloneNode(true) as HTMLElement;
      const canvas = cloned.querySelector('canvas');
      const origCanvas = target.querySelector('canvas');
      if (canvas && origCanvas) {
        const newCtx = (canvas as HTMLCanvasElement).getContext('2d');
        if (newCtx) {
          canvas.width = exportWidth;
          canvas.height = exportHeight;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          newCtx.drawImage(origCanvas as HTMLCanvasElement, 0, 0, exportWidth, exportHeight);
        }
      }
      cloned.style.width = '100%';
      cloned.style.height = '100%';
      cloned.style.position = 'absolute';
      cloned.style.inset = '0';
      frameInner.appendChild(cloned);

      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'absolute',
        left: '48px',
        top: '48px',
        right: '48px',
        bottom: '48px',
        border: '2px solid rgba(255,255,255,0.12)',
        borderRadius: '18px',
        pointerEvents: 'none',
      });

      const watermark = document.createElement('div');
      Object.assign(watermark.style, {
        position: 'absolute',
        bottom: '82px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: '"Cinzel", "Noto Serif SC", serif',
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '6px',
        fontSize: '16px',
        padding: '8px 32px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      });
      watermark.textContent = `Generated by StarTracer  ·  ${selectedDate.getFullYear()}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${String(selectedDate.getDate()).padStart(2, '0')}`;

      const header = document.createElement('div');
      Object.assign(header.style, {
        position: 'absolute',
        top: '82px',
        left: '82px',
        fontFamily: '"Cinzel", "Noto Serif SC", serif',
        color: 'rgba(255,255,255,0.9)',
      });
      header.innerHTML = `
        <div style="font-size: 11px; opacity: 0.4; letter-spacing: 4px; margin-bottom: 6px;">STAR MAP</div>
        <div style="font-size: 28px; letter-spacing: 2px; font-weight: 600;">繁星轨迹</div>
        <div style="font-size: 12px; opacity: 0.5; letter-spacing: 6px; margin-top: 4px;">STAR TRACER</div>
      `;

      wrapper.appendChild(overlay);
      wrapper.appendChild(watermark);
      wrapper.appendChild(header);

      await new Promise(r => setTimeout(r, 1200));

      const canvasOut = await html2canvas(wrapper, {
        backgroundColor: '#0b0e2a',
        width: exportWidth,
        height: exportHeight,
        scale: 1,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(wrapper);

      await new Promise(r => setTimeout(r, 1000));

      const link = document.createElement('a');
      const stamp = `${selectedDate.getFullYear()}${String(selectedDate.getMonth() + 1).padStart(2, '0')}${String(selectedDate.getDate()).padStart(2, '0')}`;
      link.download = `StarTracer_${stamp}.png`;
      link.href = canvasOut.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay />}
      <button
        onClick={handleExport}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          background: 'linear-gradient(135deg, rgba(107,179,255,0.25), rgba(200,160,255,0.25))',
          border: '1px solid rgba(180,200,255,0.4)',
          borderRadius: 10,
          color: '#e8efff',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 13,
          cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(107,179,255,0.4), rgba(200,160,255,0.4))';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(150, 180, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(107,179,255,0.25), rgba(200,160,255,0.25))';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        导出海报
      </button>
    </>
  );
};
