import React, { useRef } from 'react';
import type { Tool } from './types';
import { BRUSH_COLORS, BRUSH_WIDTHS } from './types';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  brushWidth: 2 | 4 | 6;
  setBrushWidth: (w: 2 | 4 | 6) => void;
  onUploadImage: (file: File) => void;
  onAddText: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  onUploadImage,
  onAddText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    setActiveTool('image');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
      }
      if (!/image\/(jpeg|png)/.test(file.type)) {
        alert('仅支持 jpg/png 格式');
        return;
      }
      onUploadImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextClick = () => {
    setActiveTool('text');
    onAddText();
    setActiveTool('select');
  };

  const handleDrawingClick = () => {
    setActiveTool(activeTool === 'drawing' ? 'select' : 'drawing');
  };

  return (
    <>
      <div style={toolbarStyle}>
        <button
          title="上传图片"
          onClick={handleImageClick}
          style={{ ...toolBtnStyle, background: activeTool === 'image' ? '#2c2c3e' : 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2c2c3e')}
          onMouseLeave={(e) => (e.currentTarget.style.background = activeTool === 'image' ? '#2c2c3e' : 'transparent')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTool === 'image' ? '#e0aaff' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <button
          title="添加文本"
          onClick={handleTextClick}
          style={{ ...toolBtnStyle, background: activeTool === 'text' ? '#2c2c3e' : 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2c2c3e')}
          onMouseLeave={(e) => (e.currentTarget.style.background = activeTool === 'text' ? '#2c2c3e' : 'transparent')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTool === 'text' ? '#e0aaff' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
        <button
          title="手绘涂鸦"
          onClick={handleDrawingClick}
          style={{ ...toolBtnStyle, background: activeTool === 'drawing' ? '#2c2c3e' : 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2c2c3e')}
          onMouseLeave={(e) => (e.currentTarget.style.background = activeTool === 'drawing' ? '#2c2c3e' : 'transparent')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTool === 'drawing' ? '#e0aaff' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>

        {activeTool === 'drawing' && (
          <div style={subPanelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <div style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>粗细</div>
              {BRUSH_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => setBrushWidth(w)}
                  style={{
                    width: 36,
                    height: 28,
                    background: brushWidth === w ? 'rgba(224,170,255,0.2)' : 'transparent',
                    border: brushWidth === w ? '1px solid #e0aaff' : '1px solid #444',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: w * 2, height: w * 2, background: brushColor, borderRadius: '50%' }} />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>颜色</div>
              {BRUSH_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  style={{
                    width: 36,
                    height: 36,
                    background: c,
                    border: brushColor === c ? '2px solid #e0aaff' : '2px solid transparent',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </>
  );
};

const toolbarStyle: React.CSSProperties = {
  position: 'fixed',
  left: 20,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 64,
  background: 'rgba(30,30,40,0.8)',
  backdropFilter: 'blur(8px)',
  borderRadius: 12,
  padding: '12px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  zIndex: 1000,
  transition: 'background 0.2s',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
};

const toolBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
  padding: 0,
};

const subPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 74,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(30,30,40,0.95)',
  borderRadius: 10,
  padding: 14,
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
};
