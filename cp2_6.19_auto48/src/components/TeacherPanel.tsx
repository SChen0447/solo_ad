import React, { useState } from 'react';
import RoomInfo from './RoomInfo';
import ThemeSelector from './ThemeSelector';
import type { Theme } from '../types';

interface TeacherPanelProps {
  roomId: string;
  onlineCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClear: () => void;
  onExport: () => void;
  isExporting: boolean;
}

const TeacherPanel: React.FC<TeacherPanelProps> = ({
  roomId,
  onlineCount,
  theme,
  onThemeChange,
  onClear,
  onExport,
  isExporting
}) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; btnId: string }[]>([]);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>, btnId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples((prev) => [...prev, { id, x, y, btnId }]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 300);
  };

  return (
    <div className="control-panel" style={{ backgroundColor: theme.panelBgColor, color: theme.textColor }}>
      <RoomInfo roomId={roomId} onlineCount={onlineCount} />
      
      <ThemeSelector selectedTheme={theme} onThemeChange={onThemeChange} />
      
      <div className="action-buttons">
        <button
          className="btn btn-secondary btn-ripple"
          onClick={(e) => {
            handleRipple(e, 'clear');
            onClear();
          }}
        >
          清空词云
          {ripples
            .filter((r) => r.btnId === 'clear')
            .map((ripple) => (
              <span
                key={ripple.id}
                className="ripple"
                style={{ left: ripple.x, top: ripple.y }}
              />
            ))}
        </button>
        <button
          className="btn btn-primary btn-ripple"
          onClick={(e) => {
            handleRipple(e, 'export');
            onExport();
          }}
          disabled={isExporting}
        >
          {isExporting ? (
            <span className="btn-loading">
              <span className="spinner" />
              导出中
            </span>
          ) : (
            '导出PNG'
          )}
          {ripples
            .filter((r) => r.btnId === 'export')
            .map((ripple) => (
              <span
                key={ripple.id}
                className="ripple"
                style={{ left: ripple.x, top: ripple.y }}
              />
            ))}
        </button>
      </div>
    </div>
  );
};

export default TeacherPanel;
