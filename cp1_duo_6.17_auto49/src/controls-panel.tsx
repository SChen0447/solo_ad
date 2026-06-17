import { useState } from 'react';
import { InputSource, AudioFileInfo } from './audio-engine';
import { ViewType, ViewConfig, PresetType, presets } from './visualizations';

interface ControlsPanelProps {
  currentSource: InputSource;
  fileInfo: AudioFileInfo | null;
  isPanelOpen: boolean;
  activeSettings: ViewType | null;
  activePreset: PresetType;
  onTogglePanel: () => void;
  onSelectMicrophone: () => void;
  onFileUpload: (file: File) => void;
  onStop: () => void;
  viewConfigs: Record<ViewType, ViewConfig>;
  onConfigChange: (viewType: ViewType, config: Partial<ViewConfig>) => void;
  onOpenSettings: (viewType: ViewType | null) => void;
  onPresetChange: (presetId: PresetType) => void;
}

interface SettingsModalProps {
  viewType: ViewType;
  config: ViewConfig;
  onClose: () => void;
  onChange: (config: Partial<ViewConfig>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ viewType, config, onClose, onChange }) => {
  const viewNames: Record<ViewType, string> = {
    waveform: '波形图',
    spectrum: '频谱图',
    waterfall: '3D瀑布图'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{viewNames[viewType]}设置</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>缩放范围: {config.scale.toFixed(1)}x</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={config.scale}
              onChange={e => onChange({ scale: parseFloat(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>刷新率: {config.refreshRate}fps</label>
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={config.refreshRate}
              onChange={e => onChange({ refreshRate: parseInt(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>颜色映射</label>
            <select
              value={config.colorMap}
              onChange={e => onChange({ colorMap: e.target.value })}
            >
              <option value="cyan-blue">青色→蓝色</option>
              <option value="purple-red">紫色→红色</option>
              <option value="green-yellow">绿色→黄色</option>
              <option value="rainbow">彩虹</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  currentSource,
  fileInfo,
  isPanelOpen,
  activeSettings,
  activePreset,
  onTogglePanel,
  onSelectMicrophone,
  onFileUpload,
  onStop,
  viewConfigs,
  onConfigChange,
  onOpenSettings,
  onPresetChange
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.mp3', '.wav', '.flac'];
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      if (isValid) {
        onFileUpload(file);
      } else {
        alert('请上传 .mp3, .wav 或 .flac 格式的音频文件');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const validExtensions = ['.mp3', '.wav', '.flac'];
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      if (isValid) {
        onFileUpload(file);
      } else {
        alert('请上传 .mp3, .wav 或 .flac 格式的音频文件');
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSettingsGear = (viewType: ViewType) => (
    <button
      className="settings-gear"
      onClick={() => onOpenSettings(viewType)}
      title={`${viewType}设置`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );

  return (
    <>
      <button className="hamburger-btn" onClick={onTogglePanel}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`controls-panel ${isPanelOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>控制面板</h2>
          <button className="panel-close" onClick={onTogglePanel}>×</button>
        </div>

        <div className="panel-section">
          <h3>输入源</h3>
          <div className="source-buttons">
            <button
              className={`source-btn ${currentSource === 'microphone' ? 'active' : ''}`}
              onClick={onSelectMicrophone}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              麦克风
            </button>
            <label className={`source-btn ${currentSource === 'file' ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              上传文件
              <input type="file" accept=".mp3,.wav,.flac" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>

          {currentSource !== 'none' && (
            <button className="stop-btn" onClick={onStop}>
              停止
            </button>
          )}
        </div>

        <div className="panel-section">
          <h3>预设场景</h3>
          <div className="preset-buttons">
            {presets.map(preset => (
              <button
                key={preset.id}
                className={`preset-btn ${activePreset === preset.id ? 'active' : ''}`}
                onClick={() => onPresetChange(preset.id)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>拖拽音频文件到此处</p>
          <p className="drop-hint">支持 .mp3 .wav .flac</p>
        </div>

        {fileInfo && (
          <div className="file-info">
            <h4>文件信息</h4>
            <p><span>文件名:</span> {fileInfo.name}</p>
            <p><span>时长:</span> {formatDuration(fileInfo.duration)}</p>
            <p><span>采样率:</span> {fileInfo.sampleRate} Hz</p>
          </div>
        )}

        <div className="panel-section">
          <h3>视图设置</h3>
          <div className="view-settings-list">
            {(['waveform', 'spectrum', 'waterfall'] as ViewType[]).map(viewType => (
              <div key={viewType} className="view-settings-item" data-view={viewType}>
                <span>{viewType === 'waveform' ? '波形图' : viewType === 'spectrum' ? '频谱图' : '3D瀑布图'}</span>
                {renderSettingsGear(viewType)}
              </div>
            ))}
          </div>
        </div>

        <div className="panel-footer">
          <p className="version">音律实验台 v1.0</p>
        </div>
      </div>

      {activeSettings && (
        <SettingsModal
          viewType={activeSettings}
          config={viewConfigs[activeSettings]}
          onClose={() => onOpenSettings(null)}
          onChange={(config) => onConfigChange(activeSettings, config)}
        />
      )}
    </>
  );
};
