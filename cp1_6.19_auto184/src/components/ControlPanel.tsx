import React, { useRef } from 'react';
import { VisualizerMode, ColorTheme } from 'src/scene/GeometryGroup';

interface ControlPanelProps {
  fileName: string | null;
  isPlaying: boolean;
  hasAudio: boolean;
  currentMode: VisualizerMode;
  currentTheme: ColorTheme;
  onFileUpload: (file: File) => void;
  onPlayPause: () => void;
  onModeChange: (mode: VisualizerMode) => void;
  onThemeChange: (theme: ColorTheme) => void;
}

const modeOptions: { mode: VisualizerMode; label: string; icon: string }[] = [
  { mode: 'bars', label: '柱状图', icon: '📊' },
  { mode: 'particles', label: '粒子流', icon: '✨' },
  { mode: 'wave', label: '波浪面', icon: '🌊' }
];

const themeOptions: { theme: ColorTheme; label: string; colors: string[] }[] = [
  { theme: 'cyberpunk', label: '霓虹赛博', colors: ['#00ffff', '#ff00ff', '#0000ff'] },
  { theme: 'aurora', label: '极光冰蓝', colors: ['#00ffaa', '#00aaff', '#aa00ff'] },
  { theme: 'sunset', label: '日落暖橙', colors: ['#ff6600', '#ffaa00', '#ff3366'] }
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  fileName,
  isPlaying,
  hasAudio,
  currentMode,
  currentTheme,
  onFileUpload,
  onPlayPause,
  onModeChange,
  onThemeChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="control-panel">
      <h2 className="panel-title">音频可视化控制台</h2>

      <div className="panel-section">
        <h3 className="section-title">音频文件</h3>
        <div className="upload-section">
          <button
            className="btn btn-primary upload-btn"
            onClick={handleUploadClick}
          >
            <span className="btn-icon">📁</span>
            选择音频文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {fileName && (
            <span className="file-name" title={fileName}>
              {fileName}
            </span>
          )}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">播放控制</h3>
        <div className="playback-controls">
          <button
            className={`btn btn-large ${isPlaying ? 'btn-pause' : 'btn-play'}`}
            onClick={onPlayPause}
            disabled={!hasAudio}
          >
            <span className="btn-icon">
              {isPlaying ? '⏸' : '▶'}
            </span>
            {isPlaying ? '暂停' : '播放'}
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">可视化模式</h3>
        <div className="mode-selector">
          {modeOptions.map((option) => (
            <button
              key={option.mode}
              className={`mode-btn ${currentMode === option.mode ? 'active' : ''}`}
              onClick={() => onModeChange(option.mode)}
            >
              <span className="mode-icon">{option.icon}</span>
              <span className="mode-label">{option.label}</span>
              <span className="mode-underline"></span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">颜色主题</h3>
        <div className="theme-selector">
          {themeOptions.map((option) => (
            <button
              key={option.theme}
              className={`theme-btn ${currentTheme === option.theme ? 'active' : ''}`}
              onClick={() => onThemeChange(option.theme)}
            >
              <div className="theme-colors">
                {option.colors.map((color, i) => (
                  <span
                    key={i}
                    className="theme-color-dot"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="theme-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-footer">
        <p className="hint-text">
          支持 MP3 和 WAV 格式
        </p>
      </div>

      <style>{`
        .control-panel {
          width: 22rem;
          height: 100%;
          background: rgba(20, 20, 40, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(100, 100, 200, 0.2);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          color: #e0e0ff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .panel-title {
          font-size: 1.25rem;
          font-weight: 600;
          background: linear-gradient(135deg, #668cff, #aa66ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          text-align: center;
        }

        .panel-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #a0a0c0;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .upload-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .btn {
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #4466cc, #8844dd);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
        }

        .btn-primary:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(100, 100, 255, 0.4);
        }

        .btn-icon {
          font-size: 1rem;
        }

        .upload-btn {
          width: 100%;
        }

        .file-name {
          font-size: 0.75rem;
          color: #8888aa;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 100%;
          text-align: center;
        }

        .playback-controls {
          display: flex;
          justify-content: center;
        }

        .btn-large {
          padding: 1rem 2rem;
          border-radius: 0.75rem;
          font-size: 1rem;
          min-width: 8rem;
        }

        .btn-play {
          background: linear-gradient(135deg, #33cc66, #33aa55);
          color: white;
        }

        .btn-play:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(50, 200, 100, 0.4);
        }

        .btn-pause {
          background: linear-gradient(135deg, #ff6666, #dd4444);
          color: white;
        }

        .btn-pause:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 100, 100, 0.4);
        }

        .mode-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .mode-btn {
          position: relative;
          background: rgba(60, 60, 100, 0.5);
          border: 1px solid rgba(100, 100, 150, 0.3);
          color: #b0b0d0;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .mode-btn:hover {
          background: rgba(80, 80, 130, 0.6);
          transform: translateY(-1px);
        }

        .mode-btn.active {
          background: rgba(100, 100, 200, 0.3);
          color: #ffffff;
          border-color: rgba(150, 150, 255, 0.5);
        }

        .mode-icon {
          font-size: 1.25rem;
        }

        .mode-label {
          flex: 1;
          text-align: left;
        }

        .mode-underline {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #668cff, #aa66ff);
          border-radius: 1px;
          transition: width 0.3s ease;
        }

        .mode-btn.active .mode-underline {
          width: 60%;
        }

        .theme-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .theme-btn {
          background: rgba(60, 60, 100, 0.5);
          border: 1px solid rgba(100, 100, 150, 0.3);
          color: #b0b0d0;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .theme-btn:hover {
          background: rgba(80, 80, 130, 0.6);
          transform: translateY(-1px);
        }

        .theme-btn.active {
          background: rgba(100, 100, 200, 0.3);
          color: #ffffff;
          border-color: rgba(150, 150, 255, 0.5);
        }

        .theme-colors {
          display: flex;
          gap: 0.25rem;
        }

        .theme-color-dot {
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }

        .theme-label {
          flex: 1;
          text-align: left;
        }

        .panel-footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid rgba(100, 100, 150, 0.2);
        }

        .hint-text {
          font-size: 0.75rem;
          color: #666688;
          margin: 0;
          text-align: center;
        }

        @media (max-width: 1366px) {
          .control-panel {
            width: 18rem;
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};
