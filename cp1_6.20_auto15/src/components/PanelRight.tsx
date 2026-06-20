import type { Storyboard } from '../services/api';

interface PanelRightProps {
  panel: Storyboard | null;
  totalPanels: number;
}

function CharacterIcon({ facing }: { facing: 'left' | 'right' }) {
  const emoji = facing === 'left' ? '🧑‍🎨' : '🧑‍🎨';
  return (
    <div
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        fontSize: 32,
        display: 'inline-block',
      }}
    >
      {emoji}
    </div>
  );
}

export default function PanelRight({ panel, totalPanels }: PanelRightProps) {
  if (!panel) {
    return (
      <section className="panel panel-right">
        <header className="panel-header">
          <h2 className="panel-title">
            <span>👁️</span> 实时预览
          </h2>
        </header>
        <div className="panel-body">
          <div className="preview-container">
            <div className="preview-empty">
              <div className="preview-empty-icon">🖼️</div>
              <div className="preview-empty-text">
                选择左侧分镜
                <br />
                即可在此查看实时排版效果
                <br />
                <br />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>
                  所有内容修改会立即同步显示
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel panel-right">
      <header className="panel-header">
        <h2 className="panel-title">
          <span>👁️</span> 实时预览
        </h2>
        <span style={{ fontSize: 12, color: '#7A7A7A' }}>
          CSS 渲染
        </span>
      </header>
      <div className="panel-body">
        <div className="preview-container">
          <div className="preview-page" style={{ position: 'relative' }}>
            <div className="comic-frame">
              <div className="comic-grid">
                <div className="comic-cell main-cell">
                  <div className="shot-angle-badge">📐 {panel.shotAngle}</div>

                  <div className="scene-bg">
                    <div className="scene-title">场景</div>
                    <div className="scene-desc">{panel.sceneDescription}</div>
                  </div>

                  {panel.characters.map((char, ci) => (
                    <div
                      key={ci}
                      className="comic-character"
                      style={{
                        left: `${char.position.x}%`,
                        top: `${char.position.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <CharacterIcon facing={char.facing} />
                      <div className="comic-char-label">{char.name}</div>
                    </div>
                  ))}

                  {panel.dialogue.text && (
                    <div className={`speech-bubble ${panel.dialogue.position}`}>
                      <div className="bubble-speaker">{panel.dialogue.speaker}</div>
                      <div>{panel.dialogue.text}</div>
                    </div>
                  )}

                  <div className="camera-note">
                    <strong style={{ color: '#D4A574' }}>🎥</strong> {panel.cameraDescription}
                  </div>
                </div>

                <div className="comic-cell">
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    fontSize: 9,
                    color: '#7A7A7A',
                    fontWeight: 600,
                  }}>
                    PANEL A
                  </div>
                  <div style={{ fontSize: 18, opacity: 0.2 }}>🎬</div>
                </div>

                <div className="comic-cell">
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    fontSize: 9,
                    color: '#7A7A7A',
                    fontWeight: 600,
                  }}>
                    PANEL B
                  </div>
                  <div style={{ fontSize: 18, opacity: 0.2 }}>✨</div>
                </div>

                <div className="comic-cell">
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    fontSize: 9,
                    color: '#7A7A7A',
                    fontWeight: 600,
                  }}>
                    PANEL C
                  </div>
                  <div style={{ fontSize: 18, opacity: 0.2 }}>💫</div>
                </div>

                <div className="comic-cell">
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    fontSize: 9,
                    color: '#7A7A7A',
                    fontWeight: 600,
                  }}>
                    PANEL D
                  </div>
                  <div style={{ fontSize: 18, opacity: 0.2 }}>🌟</div>
                </div>
              </div>

              <div className="preview-page-number">
                P.{panel.pageNumber} / {totalPanels}
              </div>
            </div>
          </div>

          <div className="preview-info">
            <div className="preview-info-row" style={{ marginBottom: 8 }}>
              <span>
                <span className="preview-info-label">分镜编号：</span>
                #{panel.pageNumber}
              </span>
              <span>
                <span className="preview-info-label">镜头：</span>
                {panel.shotAngle}
              </span>
            </div>
            <div className="preview-info-row">
              <span>
                <span className="preview-info-label">角色数：</span>
                {panel.characters.length}
              </span>
              <span>
                <span className="preview-info-label">对话：</span>
                {panel.dialogue.text ? '有' : '无'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="app-footer" style={{ border: 'none' }}>
        <div className="footer-bar">
          <span className="footer-text">
            总页数 <strong>{totalPanels}</strong> · 当前 <strong>第 {panel.pageNumber} 页</strong>
          </span>
          <span className="footer-hint">
            📏 3:4 标准漫画比例
          </span>
        </div>
      </div>
    </section>
  );
}
