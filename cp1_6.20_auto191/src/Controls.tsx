import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatrixRainConfig } from './MatrixRain';
import { THEMES, COLORS, SIZES, ANIMATION, type Theme } from './theme';

interface ControlsProps {
  config: MatrixRainConfig;
  onConfigChange: (config: Partial<MatrixRainConfig>) => void;
  onExportPNG: () => void;
  onExportGIF: () => void;
  isExportingGIF: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  themeColor: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit = '', onChange, themeColor }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        }}
      >
        <span style={{ fontSize: SIZES.labelFontSize, color: COLORS.text }}>{label}</span>
        <span
          style={{
            fontSize: SIZES.labelFontSize,
            color: themeColor,
            fontWeight: 600,
            fontFamily: 'monospace'
          }}
        >
          {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: COLORS.sliderTrack,
            borderRadius: 4
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 8,
            width: `${percentage}%`,
            background: themeColor,
            borderRadius: 4,
            transition: `background ${ANIMATION.colorTransition.duration}s`
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: -4,
            left: 0,
            width: '100%',
            height: 16,
            opacity: 0,
            cursor: 'pointer',
            margin: 0
          }}
        />
        <motion.div
          animate={{ left: `calc(${percentage}% - 8px)` }}
          transition={ANIMATION.colorTransition}
          style={{
            position: 'absolute',
            top: -4,
            width: 16,
            height: 16,
            background: themeColor,
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: `0 0 10px ${themeColor}66`,
            transition: `background ${ANIMATION.colorTransition.duration}s`
          }}
        />
      </div>
    </div>
  );
};

interface ToggleButtonProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  themeColor: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ label, value, onChange, themeColor }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}
    >
      <span style={{ fontSize: SIZES.labelFontSize, color: COLORS.text }}>{label}</span>
      <motion.div
        onClick={() => onChange(!value)}
        animate={{ background: value ? themeColor : COLORS.sliderTrack }}
        transition={ANIMATION.colorTransition}
        style={{
          width: 48,
          height: 24,
          borderRadius: 12,
          position: 'relative',
          cursor: 'pointer',
          padding: 2
        }}
      >
        <motion.div
          animate={{ x: value ? 24 : 0 }}
          transition={ANIMATION.colorTransition}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: COLORS.white
          }}
        />
      </motion.div>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  themeColor: string;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, themeColor, disabled }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { filter: 'brightness(1.15)', scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      transition={ANIMATION.buttonHover}
      style={{
        width: SIZES.buttonWidth,
        height: SIZES.buttonHeight,
        borderRadius: SIZES.buttonRadius,
        border: 'none',
        background: themeColor,
        color: '#000',
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `filter ${ANIMATION.buttonHover.duration}s, background ${ANIMATION.colorTransition.duration}s`
      }}
    >
      {label}
    </motion.button>
  );
};

const Controls: React.FC<ControlsProps> = ({
  config,
  onConfigChange,
  onExportPNG,
  onExportGIF,
  isExportingGIF,
  isCollapsed,
  onToggleCollapse,
  isMobile
}) => {
  const themeColor = config.colorTheme.hex;

  const desktopPanelStyle: React.CSSProperties = isMobile
    ? {}
    : {
        position: 'fixed',
        top: 20,
        right: isCollapsed ? -SIZES.panelWidth + 40 : 20,
        width: SIZES.panelWidth,
        maxHeight: 'calc(100vh - 40px)',
        background: COLORS.panelBg,
        borderRadius: SIZES.borderRadius,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden'
      };

  const mobilePanelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: isCollapsed ? -SIZES.panelHeight + 40 : 0,
        left: 0,
        right: 0,
        height: SIZES.panelHeight,
        background: COLORS.panelBg,
        borderTopLeftRadius: SIZES.borderRadius,
        borderTopRightRadius: SIZES.borderRadius,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        overflowX: 'auto',
        overflowY: 'hidden'
      }
    : {};

  const toggleButtonStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 40,
        height: 24,
        background: COLORS.panelBg,
        border: 'none',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.text,
        fontSize: 16
      }
    : {
        position: 'absolute',
        left: 0,
        top: 20,
        width: 24,
        height: 40,
        background: COLORS.panelBg,
        border: 'none',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.text,
        fontSize: 16,
        transform: 'translateX(-100%)'
      };

  const contentStyle: React.CSSProperties = isMobile
    ? {
        padding: '20px 16px',
        display: 'flex',
        gap: 24,
        height: '100%',
        minWidth: 'max-content'
      }
    : {
        padding: 24,
        paddingTop: 16
      };

  const sectionStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 200
      }
    : {
        marginBottom: 20
      };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.textMuted,
    marginBottom: 12,
    fontWeight: 600
  };

  const themeButtonStyle = (theme: Theme, isActive: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 6,
    border: isActive ? `2px solid ${theme.hex}` : '2px solid transparent',
    background: isActive ? `${theme.hex}22` : 'rgba(255,255,255,0.05)',
    color: isActive ? theme.hex : COLORS.text,
    fontSize: 12,
    cursor: 'pointer',
    transition: `all ${ANIMATION.colorTransition.duration}s`,
    whiteSpace: 'nowrap'
  });

  return (
    <motion.div
      animate={isMobile ? {} : { right: isCollapsed ? -SIZES.panelWidth + 40 : 20 }}
      initial={false}
      transition={ANIMATION.panelTransition}
      style={{ ...desktopPanelStyle, ...mobilePanelStyle }}
    >
      <button onClick={onToggleCollapse} style={toggleButtonStyle}>
        {isCollapsed ? (isMobile ? '▲' : '◀') : isMobile ? '▼' : '▶'}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
            style={contentStyle}
          >
            {!isMobile && (
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: themeColor,
                    letterSpacing: 2,
                    transition: `color ${ANIMATION.colorTransition.duration}s`
                  }}
                >
                  矩阵特效
                </h2>
                <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                  Matrix Rain Generator
                </p>
              </div>
            )}

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>动画参数</h3>
              <Slider
                label="下落速度"
                value={config.speedMultiplier}
                min={0.5}
                max={3}
                step={0.1}
                unit="x"
                onChange={(v) => onConfigChange({ speedMultiplier: v })}
                themeColor={themeColor}
              />
              <Slider
                label="字符大小"
                value={config.fontSize}
                min={8}
                max={32}
                step={2}
                unit="px"
                onChange={(v) => onConfigChange({ fontSize: v })}
                themeColor={themeColor}
              />
              <Slider
                label="字符密度"
                value={config.columnSpacing}
                min={10}
                max={60}
                step={5}
                unit="px"
                onChange={(v) => onConfigChange({ columnSpacing: v })}
                themeColor={themeColor}
              />
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>视觉效果</h3>
              <Slider
                label="背景透明"
                value={config.backgroundOpacity}
                min={0.1}
                max={1}
                step={0.1}
                onChange={(v) => onConfigChange({ backgroundOpacity: v })}
                themeColor={themeColor}
              />

              <div style={{ marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: SIZES.labelFontSize,
                    color: COLORS.text,
                    display: 'block',
                    marginBottom: 8
                  }}
                >
                  帧率目标
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([30, 60] as const).map((fps) => (
                    <motion.button
                      key={fps}
                      onClick={() => onConfigChange({ fps })}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        background: config.fps === fps ? themeColor : 'rgba(255,255,255,0.1)',
                        color: config.fps === fps ? '#000' : COLORS.text
                      }}
                      transition={ANIMATION.colorTransition}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {fps} FPS
                    </motion.button>
                  ))}
                </div>
              </div>

              <ToggleButton
                label="字符闪烁"
                value={config.enableBlink}
                onChange={(v) => onConfigChange({ enableBlink: v })}
                themeColor={themeColor}
              />
              <ToggleButton
                label="拖尾效果"
                value={config.enableTrail}
                onChange={(v) => onConfigChange({ enableTrail: v })}
                themeColor={themeColor}
              />
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>颜色主题</h3>
              <div
                style={{
                  display: isMobile ? 'flex' : 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  marginBottom: 16
                }}
              >
                {THEMES.map((theme) => (
                  <motion.button
                    key={theme.name}
                    onClick={() => onConfigChange({ colorTheme: theme })}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={themeButtonStyle(theme, config.colorTheme.name === theme.name)}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: theme.hex,
                        marginRight: 6
                      }}
                    />
                    {theme.name}
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>导出</h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  gap: 12
                }}
              >
                <ActionButton
                  label="导出 PNG"
                  onClick={onExportPNG}
                  themeColor={themeColor}
                />
                <ActionButton
                  label={isExportingGIF ? '导出中...' : '导出 GIF'}
                  onClick={onExportGIF}
                  themeColor={themeColor}
                  disabled={isExportingGIF}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Controls;
