import React from 'react';
import type { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType | null;
  onToolChange: (tool: ToolType | null) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  disabled?: boolean;
}

const COLORS = [
  '#6C63FF', '#A855F7', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#FFFFFF', '#000000',
];

const STROKE_WIDTHS = [2, 4, 6, 8, 12];

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  disabled = false,
}) => {
  const tools: { type: ToolType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'arrow',
      label: '箭头',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="19" x2="19" y2="5" />
          <polyline points="12 5 19 5 19 12" />
        </svg>
      ),
    },
    {
      type: 'rectangle',
      label: '矩形',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      type: 'text',
      label: '文字',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      ),
    },
    {
      type: 'brush',
      label: '画笔',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18.37 2.63L14 7l-3-3 4.37-4.37a2.5 2.5 0 0 1 3 0z" />
          <path d="M14 7L3 18l3 3 11-11" />
        </svg>
      ),
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.toolsSection}>
        {tools.map((tool) => (
          <button
            key={tool.type}
            style={{
              ...styles.toolButton,
              ...(currentTool === tool.type ? styles.toolButtonActive : {}),
            }}
            onClick={() => onToolChange(currentTool === tool.type ? null : tool.type)}
            disabled={disabled}
            title={tool.label}
          >
            <span style={styles.toolIcon}>{tool.icon}</span>
            <span style={styles.toolLabel}>{tool.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.colorSection}>
        <span style={styles.sectionLabel}>颜色</span>
        <div style={styles.colorPalette}>
          {COLORS.map((c) => (
            <button
              key={c}
              style={{
                ...styles.colorButton,
                backgroundColor: c,
                ...(color === c ? styles.colorButtonActive : {}),
              }}
              onClick={() => onColorChange(c)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.widthSection}>
        <span style={styles.sectionLabel}>粗细</span>
        <div style={styles.widthOptions}>
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              style={{
                ...styles.widthButton,
                ...(strokeWidth === w ? styles.widthButtonActive : {}),
              }}
              onClick={() => onStrokeWidthChange(w)}
              disabled={disabled}
            >
              <div style={{ ...styles.widthIndicator, width: w, height: w, backgroundColor: color }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 20px',
    backgroundColor: 'var(--card-background)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
  },
  toolsSection: {
    display: 'flex',
    gap: 8,
  },
  toolButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--border-radius)',
    border: '2px solid transparent',
    transition: 'var(--transition)',
    minWidth: 64,
  },
  toolButtonActive: {
    background: 'var(--primary-gradient)',
    color: 'var(--text-primary)',
    borderColor: 'var(--primary-color)',
    boxShadow: '0 0 20px rgba(108, 99, 255, 0.5)',
  },
  toolIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: 500,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'var(--border-color)',
  },
  colorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  colorPalette: {
    display: 'flex',
    gap: 6,
  },
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid transparent',
    transition: 'var(--transition)',
    cursor: 'pointer',
  },
  colorButtonActive: {
    borderColor: 'var(--text-primary)',
    transform: 'scale(1.2)',
    boxShadow: '0 0 10px currentColor',
  },
  widthSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  widthOptions: {
    display: 'flex',
    gap: 6,
  },
  widthButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 'var(--border-radius-sm)',
    border: '2px solid transparent',
    transition: 'var(--transition)',
  },
  widthButtonActive: {
    borderColor: 'var(--primary-color)',
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  widthIndicator: {
    borderRadius: '50%',
  },
};

export default Toolbar;
