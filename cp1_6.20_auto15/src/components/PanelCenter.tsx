import type { Storyboard, Character, Dialogue } from '../services/api';

interface PanelCenterProps {
  panel: Storyboard | null;
  onUpdate: (id: string, updates: Partial<Storyboard>) => void;
}

const SHOT_ANGLES = [
  '远景', '全景', '中景', '近景', '特写', '大特写',
  '俯视', '仰视', '平视', '倾斜镜头', '过肩镜头', '主观镜头',
];

const FACING_OPTIONS = [
  { value: 'left', label: '← 朝左' },
  { value: 'right', label: '朝右 →' },
];

export default function PanelCenter({ panel, onUpdate }: PanelCenterProps) {
  if (!panel) {
    return (
      <section className="panel panel-center">
        <header className="panel-header">
          <h2 className="panel-title">
            <span>✏️</span> 编辑区
          </h2>
        </header>
        <div className="panel-body">
          <div className="editor-empty">
            <div style={{ fontSize: 56, opacity: 0.3 }}>📝</div>
            <div style={{ fontSize: 15, color: '#7A7A7A', lineHeight: 1.8, textAlign: 'center' }}>
              请从左侧选择一个分镜
              <br />
              或生成新的分镜草稿
            </div>
          </div>
        </div>
      </section>
    );
  }

  const updateScene = (value: string) => {
    onUpdate(panel.id, { sceneDescription: value });
  };

  const updateCharacter = (charIndex: number, updates: Partial<Character>) => {
    const newChars = panel.characters.map((c, i) =>
      i === charIndex ? { ...c, ...updates } : c
    );
    onUpdate(panel.id, { characters: newChars });
  };

  const updateDialogue = (updates: Partial<Dialogue>) => {
    onUpdate(panel.id, {
      dialogue: { ...panel.dialogue, ...updates },
    });
  };

  const updateShotAngle = (value: string) => {
    onUpdate(panel.id, { shotAngle: value });
  };

  const updateCamera = (value: string) => {
    onUpdate(panel.id, { cameraDescription: value });
  };

  return (
    <section className="panel panel-center">
      <header className="panel-header">
        <h2 className="panel-title">
          <span>✏️</span> 编辑区 · 第 {panel.pageNumber} 页
        </h2>
      </header>
      <div className="panel-body">
        <div className="editor-form">
          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">🏞️</span>
              场景描述
            </label>
            <textarea
              className="form-textarea"
              value={panel.sceneDescription}
              onChange={(e) => updateScene(e.target.value)}
              rows={4}
              placeholder="描述这个场景的环境、氛围、时间..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">👥</span>
              角色标记 ({panel.characters.length})
            </label>
            <div className="characters-list">
              {panel.characters.map((char, ci) => (
                <div key={ci} className="character-item">
                  <div className="character-header">
                    <span className="character-name-label">角色 #{ci + 1}</span>
                    <input
                      className="form-input"
                      style={{
                        padding: '6px 12px',
                        width: 140,
                        fontSize: 13,
                        lineHeight: '20px',
                      }}
                      value={char.name}
                      onChange={(e) => updateCharacter(ci, { name: e.target.value })}
                      placeholder="角色名"
                    />
                  </div>
                  <div className="position-row">
                    <div className="slider-wrap">
                      <span className="slider-label">水平位置: {char.position.x}%</span>
                      <input
                        type="range"
                        className="position-slider"
                        min={5}
                        max={95}
                        value={char.position.x}
                        onChange={(e) =>
                          updateCharacter(ci, {
                            position: { ...char.position, x: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="slider-wrap">
                      <span className="slider-label">垂直位置: {char.position.y}%</span>
                      <input
                        type="range"
                        className="position-slider"
                        min={10}
                        max={90}
                        value={char.position.y}
                        onChange={(e) =>
                          updateCharacter(ci, {
                            position: { ...char.position, y: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <select
                      className="facing-select"
                      value={char.facing}
                      onChange={(e) =>
                        updateCharacter(ci, {
                          facing: e.target.value as 'left' | 'right',
                        })
                      }
                    >
                      {FACING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">💬</span>
              对话气泡
            </label>
            <div className="dialogue-section">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 12,
              }}>
                <div>
                  <span style={{
                    fontSize: 11,
                    color: '#7A7A7A',
                    fontWeight: 600,
                    marginBottom: 4,
                    display: 'block',
                  }}>说话人</span>
                  <select
                    className="form-select"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                    value={panel.dialogue.speaker}
                    onChange={(e) => updateDialogue({ speaker: e.target.value })}
                  >
                    {panel.characters.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="旁白">旁白</option>
                  </select>
                </div>
                <div>
                  <span style={{
                    fontSize: 11,
                    color: '#7A7A7A',
                    fontWeight: 600,
                    marginBottom: 4,
                    display: 'block',
                  }}>气泡位置</span>
                  <select
                    className="form-select"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                    value={panel.dialogue.position}
                    onChange={(e) =>
                      updateDialogue({
                        position: e.target.value as 'left' | 'right',
                      })
                    }
                  >
                    <option value="left">← 左侧</option>
                    <option value="right">右侧 →</option>
                  </select>
                </div>
              </div>
              <textarea
                className="form-textarea"
                style={{ minHeight: 70 }}
                value={panel.dialogue.text}
                onChange={(e) => updateDialogue({ text: e.target.value })}
                rows={2}
                placeholder="输入对话内容..."
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">📐</span>
              镜头角度
            </label>
            <div className="shot-options">
              {SHOT_ANGLES.map((angle) => (
                <button
                  key={angle}
                  type="button"
                  className={`shot-option ${panel.shotAngle === angle ? 'active' : ''}`}
                  onClick={() => updateShotAngle(angle)}
                >
                  {angle}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">🎥</span>
              镜头运动说明
            </label>
            <textarea
              className="form-textarea"
              value={panel.cameraDescription}
              onChange={(e) => updateCamera(e.target.value)}
              rows={3}
              placeholder="描述镜头的运动方式、拍摄技巧..."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
