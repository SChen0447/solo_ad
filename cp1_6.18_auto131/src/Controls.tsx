import React, { useState, useCallback } from 'react';
import {
  AudioWaveform,
  Sparkles,
  Layers,
  Camera,
  Video,
  Mic,
  MicOff,
  Palette,
  CircleDot,
  Activity,
} from 'lucide-react';
import type { VisualizerMode, RenderParams } from './renderer';
import styles from './Controls.module.css';

interface ControlsProps {
  isRecording: boolean;
  mode: VisualizerMode;
  params: RenderParams;
  isRecordingScreen: boolean;
  onToggleRecording: () => void;
  onModeChange: (mode: VisualizerMode) => void;
  onParamsChange: (params: Partial<RenderParams>) => void;
  onScreenshot: () => void;
  onRecordScreen: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  icon: React.ReactNode;
}

const Slider: React.FC<SliderProps> = ({ label, value, onChange, min = 0, max = 100, icon }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderLabel}>
        <span className={styles.sliderName}>
          {icon}
          <span style={{ marginLeft: '8px' }}>{label}</span>
        </span>
        <span className={`${styles.sliderValue} ${isDragging ? styles.sliderValueActive : ''}`}>
          <span className={styles.sliderValueBubble}>{value}</span>
        </span>
      </div>
      <div className={styles.sliderContainer}>
        <div className={styles.sliderFill} style={{ width: `${fillPercent}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className={styles.slider}
        />
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({
  isRecording,
  mode,
  params,
  isRecordingScreen,
  onToggleRecording,
  onModeChange,
  onParamsChange,
  onScreenshot,
  onRecordScreen,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const handleModeClick = (newMode: VisualizerMode) => {
    setPulseKey(prev => prev + 1);
    onModeChange(newMode);
  };

  const modes: { mode: VisualizerMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'wave', label: '波形', icon: <Activity size={16} /> },
    { mode: 'particle', label: '粒子', icon: <Sparkles size={16} /> },
    { mode: 'mix', label: '混合', icon: <Layers size={16} /> },
  ];

  return (
    <>
      {isRecording && (
        <div className={styles.recordingIndicator}>
          <span className={styles.recDot} />
          <span>REC</span>
        </div>
      )}

      <div className={`${styles.controls} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.header}>
          <AudioWaveform className={styles.icon} />
          <h2 className={styles.title}>声纹可视化</h2>
        </div>

        <button
          className={`${styles.recordButton} ${isRecording ? styles.recordButtonRecording : ''}`}
          onClick={onToggleRecording}
        >
          {isRecording && <div className={styles.ring} />
          {isRecording ? (
            <>
              <MicOff size={18} />
              <span>停止录制</span>
            </>
          ) : (
            <>
              <Mic size={18} />
              <span>开始录制</span>
            </>
          )}
        </button>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>可视化模式</h3>
          <div className={styles.modeButtons}>
            {modes.map(({ mode: m, label, icon }) => (
              <button
                key={`${m}-${pulseKey}`}
                className={`${styles.modeButton} ${mode === m ? styles.modeButtonActive : ''}`}
                onClick={() => handleModeClick(m)}
              >
                {icon}
                <span style={{ marginLeft: '6px' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>参数调节</h3>
          <Slider
            label="颜色敏感度"
            value={params.colorSensitivity}
            onChange={(v) => onParamsChange({ colorSensitivity: v })}
            icon={<Palette size={14} style={{ verticalAlign: 'middle' }} />}
          />
          <Slider
            label="粒子密度"
            value={params.particleDensity}
            onChange={(v) => onParamsChange({ particleDensity: v })}
            icon={<CircleDot size={14} style={{ verticalAlign: 'middle' }} />}
          />
          <Slider
            label="波形粗细"
            value={params.waveThickness}
            onChange={(v) => onParamsChange({ waveThickness: v })}
            icon={<Activity size={14} style={{ verticalAlign: 'middle' }} />}
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>导出功能</h3>
          <div className={styles.actionButtons}>
            <button className={styles.actionButton} onClick={onScreenshot}>
              <Camera size={16} />
              截图
            </button>
            <button
              className={styles.actionButton}
              onClick={onRecordScreen}
              style={{
                borderColor: isRecordingScreen ? '#ff3c3c' : undefined,
                color: isRecordingScreen ? '#ff3c3c' : undefined,
              }}
            >
              <Video size={16} />
              {isRecordingScreen ? '录制中' : '录屏'}
            </button>
          </div>
        </div>
      </div>

      <button
        className={styles.mobileToggle}
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="切换控制面板"
      >
        <AudioWaveform size={24} style={{ color: '#00d4ff' }} />
      </button>
    </>
  );
};

export default Controls;
