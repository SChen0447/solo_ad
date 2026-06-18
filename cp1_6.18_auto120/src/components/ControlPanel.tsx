import React from 'react';
import { useAcousticStore } from '../store';
import { PresetType } from '../simulation/roomModel';

const presetLabels: Record<PresetType, string> = {
  livingRoom: '空旷客厅',
  trapezoidStudio: '梯形录音室',
  lShapedTheater: 'L形家庭影院',
};

const ControlPanel: React.FC = () => {
  const {
    sources,
    selectedSourceId,
    isSimulating,
    updateSource,
    removeSource,
    startSimulation,
    stopSimulation,
    loadPreset,
    resetRoom,
    walls,
  } = useAcousticStore();

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedSource) {
      updateSource(selectedSource.id, { frequency: Number(e.target.value) });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedSource) {
      updateSource(selectedSource.id, { volume: Number(e.target.value) });
    }
  };

  const handleTypeChange = (type: 'point' | 'line') => {
    if (selectedSource) {
      updateSource(selectedSource.id, { type });
    }
  };

  const handlePresetClick = (preset: PresetType) => {
    loadPreset(preset);
  };

  const handleExportSVG = () => {
    const state = useAcousticStore.getState();
    const { walls, sources, reflectionPaths, canvasWidth, canvasHeight } = state;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`;
    svg += `<rect width="${canvasWidth}" height="${canvasHeight}" fill="#16213e"/>`;

    for (const wall of walls) {
      svg += `<line x1="${wall.start.x}" y1="${wall.start.y}" x2="${wall.end.x}" y2="${wall.end.y}" stroke="#00bcd4" stroke-width="3"/>`;
      if (wall.label) {
        const mx = (wall.start.x + wall.end.x) / 2;
        const my = (wall.start.y + wall.end.y) / 2;
        svg += `<text x="${mx}" y="${my - 10}" fill="#00bcd4" font-size="11" text-anchor="middle" opacity="0.6">${wall.label}</text>`;
      }
    }

    for (const source of sources) {
      const t = Math.min(1, Math.max(0, (source.frequency - 100) / 4900));
      const r = Math.round(255 * (1 - t));
      const g = Math.round(100 * (1 - Math.abs(t - 0.5) * 2));
      const b = Math.round(255 * t);
      svg += `<circle cx="${source.position.x}" cy="${source.position.y}" r="6" fill="rgb(${r},${g},${b})"/>`;
      svg += `<text x="${source.position.x}" y="${source.position.y + 18}" fill="#e0e0e0" font-size="10" text-anchor="middle">${source.frequency}Hz ${source.volume}dB</text>`;
    }

    const step = Math.max(1, Math.floor(reflectionPaths.length / 72));
    for (let i = 0; i < reflectionPaths.length; i += step) {
      const path = reflectionPaths[i];
      for (const seg of path.segments) {
        let opacity = seg.reflectionOrder === 0 ? 0.3 : seg.reflectionOrder === 1 ? 0.6 : seg.reflectionOrder === 2 ? 0.4 : Math.max(0.05, 0.3 - seg.reflectionOrder * 0.05);
        let color = seg.reflectionOrder === 0 ? path.color : seg.reflectionOrder === 1 ? '#ffffff' : seg.reflectionOrder === 2 ? '#aaaaaa' : '#888888';
        svg += `<line x1="${seg.start.x}" y1="${seg.start.y}" x2="${seg.end.x}" y2="${seg.end.y}" stroke="${color}" stroke-width="${seg.reflectionOrder === 1 ? 1.5 : 0.5}" opacity="${opacity}"/>`;
        if (seg.reflectionOrder >= 1 && seg.reflectionOrder <= 3) {
          svg += `<text x="${seg.end.x + 5}" y="${seg.end.y - 3}" fill="#cccccc" font-size="9" opacity="${opacity}">${seg.splAtEnd}dB</text>`;
        }
      }
    }

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acoustic-simulation.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔊 声源参数</h3>
        {selectedSource ? (
          <div style={styles.paramGroup}>
            <div style={styles.paramRow}>
              <label style={styles.label}>声源类型</label>
              <div style={styles.typeButtons}>
                <button
                  style={{
                    ...styles.typeBtn,
                    ...(selectedSource.type === 'point' ? styles.typeBtnActive : {}),
                  }}
                  onClick={() => handleTypeChange('point')}
                >
                  点声源
                </button>
                <button
                  style={{
                    ...styles.typeBtn,
                    ...(selectedSource.type === 'line' ? styles.typeBtnActive : {}),
                  }}
                  onClick={() => handleTypeChange('line')}
                >
                  线声源
                </button>
              </div>
            </div>

            <div style={styles.paramRow}>
              <label style={styles.label}>
                频率: <span style={styles.valueDisplay}>{selectedSource.frequency}Hz</span>
              </label>
              <input
                type="range"
                min={100}
                max={5000}
                step={10}
                value={selectedSource.frequency}
                onChange={handleFrequencyChange}
                style={styles.slider}
              />
              <div style={styles.sliderMarks}>
                <span>100</span>
                <span>1500</span>
                <span>3000</span>
                <span>5000</span>
              </div>
            </div>

            <div style={styles.paramRow}>
              <label style={styles.label}>
                音量: <span style={styles.valueDisplay}>{selectedSource.volume}dB</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={selectedSource.volume}
                onChange={handleVolumeChange}
                style={styles.slider}
              />
              <div style={styles.sliderMarks}>
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            <button
              style={styles.deleteBtn}
              onClick={() => removeSource(selectedSource.id)}
            >
              删除声源
            </button>
          </div>
        ) : (
          <div style={styles.emptyHint}>
            {sources.length === 0
              ? '请放置声源以调整参数'
              : '点击声源以选中并调整参数'}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏠 预设场景</h3>
        <div style={styles.presetGroup}>
          {(Object.keys(presetLabels) as PresetType[]).map((preset) => (
            <button
              key={preset}
              style={styles.presetBtn}
              onClick={() => handlePresetClick(preset)}
            >
              {presetLabels[preset]}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⚙️ 模拟控制</h3>
        <button
          style={{
            ...styles.simBtn,
            ...(isSimulating ? styles.simBtnActive : {}),
          }}
          onClick={isSimulating ? stopSimulation : startSimulation}
          disabled={walls.length < 3 || sources.length === 0}
        >
          {isSimulating ? '⏹ 停止模拟' : '▶ 开始模拟'}
        </button>
        {walls.length < 3 && (
          <div style={styles.warning}>请先绘制房间（至少3面墙）</div>
        )}
        {walls.length >= 3 && sources.length === 0 && (
          <div style={styles.warning}>请放置至少一个声源</div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📥 导出</h3>
        <button style={styles.exportBtn} onClick={handleExportSVG}>
          导出 SVG 图像
        </button>
      </div>

      <div style={styles.section}>
        <button style={styles.resetBtn} onClick={resetRoom}>
          🔄 重置房间
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'rgba(22, 33, 62, 0.7)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    border: '1px solid rgba(0,188,212,0.15)',
    height: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#00bcd4',
    margin: 0,
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(0,188,212,0.2)',
  },
  paramGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  paramRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#b0b0b0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueDisplay: {
    color: '#00e5ff',
    fontWeight: 600,
    fontSize: '13px',
  },
  slider: {
    width: '100%',
    marginTop: '4px',
  },
  sliderMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9px',
    color: '#666',
    marginTop: '2px',
  },
  typeButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  typeBtn: {
    flex: 1,
    padding: '6px 0',
    borderRadius: '8px',
    border: '1px solid rgba(0,188,212,0.3)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  typeBtnActive: {
    background: 'rgba(0,188,212,0.15)',
    color: '#00e5ff',
    borderColor: '#00bcd4',
  },
  deleteBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(244,67,54,0.4)',
    background: 'rgba(244,67,54,0.1)',
    color: '#f44336',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  emptyHint: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
    padding: '10px 0',
  },
  presetGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  presetBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0,188,212,0.3)',
    background: 'rgba(0,188,212,0.05)',
    color: '#b0b0b0',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
    textAlign: 'left' as const,
  },
  simBtn: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid #00bcd4',
    background: 'rgba(0,188,212,0.1)',
    color: '#00bcd4',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  simBtnActive: {
    background: 'rgba(0,188,212,0.3)',
    color: '#00e5ff',
    borderColor: '#00e5ff',
  },
  exportBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0,188,212,0.3)',
    background: 'rgba(0,188,212,0.05)',
    color: '#00bcd4',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  resetBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  warning: {
    fontSize: '11px',
    color: '#ff9800',
    marginTop: '4px',
  },
};

export default ControlPanel;
