import React, { useState } from 'react';

interface OnlineUser {
  id: string;
  color: string;
}

interface ControlPanelProps {
  brushColor: string;
  brushThickness: number;
  onlineUsers: OnlineUser[];
  colors: string[];
  colorNames: string[];
  thicknesses: number[];
  undoCount: number;
  isNarrow: boolean;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onSync: () => void;
  onClear: () => void;
  onUndo: () => void;
  onSavePng: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  brushColor,
  brushThickness,
  onlineUsers,
  colors,
  colorNames,
  thicknesses,
  undoCount,
  isNarrow,
  onColorChange,
  onThicknessChange,
  onSync,
  onClear,
  onUndo,
  onSavePng,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearClick = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    onClear();
  };

  const btnHover = (e: React.MouseEvent, bg: string) => {
    (e.currentTarget as HTMLElement).style.backgroundColor = bg;
  };
  const btnScale = (e: React.MouseEvent, scale: string) => {
    (e.currentTarget as HTMLElement).style.transform = `scale(${scale})`;
  };

  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'sync' | 'action' | 'danger',
    disabled = false,
  ) => {
    const isSync = variant === 'sync';
    const isDanger = variant === 'danger';
    const baseStyle: React.CSSProperties = {
      width: '100%',
      padding: '10px 16px',
      border: isSync ? 'none' : '1px solid #E0E0E0',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      userSelect: 'none',
      backgroundColor: isSync
        ? '#4A90D9'
        : isDanger && confirmClear
          ? '#FFF3F3'
          : '#FFFFFF',
      color: isSync ? '#FFFFFF' : isDanger && confirmClear ? '#E53E3E' : '#333',
      opacity: disabled ? 0.5 : 1,
    };
    return (
      <button
        style={baseStyle}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={e => {
          if (!disabled) btnHover(e, isSync ? '#5BA3E6' : '#F0F0F0');
        }}
        onMouseLeave={e => {
          if (isSync) btnHover(e, '#4A90D9');
          else if (isDanger && confirmClear) btnHover(e, '#FFF3F3');
          else btnHover(e, '#FFFFFF');
        }}
        onMouseDown={e => { if (!disabled) btnScale(e, '0.95'); }}
        onMouseUp={e => { btnScale(e, '1'); }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      maxWidth: isNarrow ? '100%' : 280,
      backgroundColor: '#F5F5F5',
      border: '2px solid #E0E0E0',
      borderRadius: 2,
      padding: isNarrow ? '12px 16px' : '20px 16px',
      display: 'flex',
      flexDirection: isNarrow ? 'row' : 'column',
      flexWrap: isNarrow ? 'wrap' : 'nowrap',
      gap: isNarrow ? 8 : 12,
      justifyContent: 'center',
      alignItems: isNarrow ? 'center' : 'stretch',
      boxSizing: 'border-box',
      overflow: 'auto',
    }}>
      {!isNarrow && (
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>协作画板</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4A90D9' }} />
            <span style={{ fontSize: 12, color: '#888' }}>{onlineUsers.length} 在线</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!isNarrow && <div style={{ fontSize: 13, color: '#888', width: '100%', marginBottom: 4 }}>画笔颜色</div>}
        {colors.map((color, idx) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: color,
              border: brushColor === color ? '3px solid #4A90D9' : '2px solid #DDD',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: brushColor === color ? 'scale(1.1)' : 'scale(1)',
              outline: 'none',
            }}
            title={colorNames[idx]}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!isNarrow && <div style={{ fontSize: 13, color: '#888', width: '100%', marginBottom: 4 }}>画笔粗细</div>}
        {thicknesses.map(t => (
          <button
            key={t}
            onClick={() => onThicknessChange(t)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: brushThickness === t ? '#4A90D9' : '#FFFFFF',
              border: brushThickness === t ? '2px solid #4A90D9' : '1px solid #E0E0E0',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              color: brushThickness === t ? '#FFF' : '#333',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {t}px
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: isNarrow ? 8 : 12,
        flexDirection: isNarrow ? 'row' : 'column',
        flex: isNarrow ? '1 1 100%' : 'none',
      }}>
        {renderButton('同步', onSync, 'sync')}
        {renderButton(confirmClear ? '确认清空？' : '清空画板', handleClearClick, 'danger')}
        {renderButton(`撤销${undoCount > 0 ? ` (${undoCount})` : ''}`, onUndo, 'action', undoCount === 0)}
        {renderButton('保存到本地', onSavePng, 'action')}
      </div>
    </div>
  );
};

export default ControlPanel;
