import { useEffect, useRef } from 'react';
import { useGameStore, type WeaponType, type SkillType } from '@/store/GameStore';
import { EditorCanvas } from './EditorCanvas';

const HAIR_STYLES = ['短发', '刺猬头', '长发', '莫西干', '马尾'];
const ARMOR_STYLES = ['普通', '胸甲', '锁子甲', '披风'];
const SHOE_STYLES = ['长靴', '运动鞋', '凉鞋', '重甲靴'];

const COLOR_PALETTE = [
  '#e94560', '#ff6b6b', '#ff9f43', '#feca57', '#ffcc00',
  '#1dd1a1', '#10ac84', '#00d2d3', '#54a0ff', '#2e86de',
  '#0f3460', '#16213e', '#5f27cd', '#9b59b6', '#ee5a6f',
  '#8b4513', '#636e72', '#b2bec3', '#dfe6e9', '#f5c6a0',
];

const WEAPON_ICONS: Record<WeaponType, { name: string; emoji: string; desc: string }> = {
  sword: { name: '剑', emoji: '⚔️', desc: '近战扇形判定' },
  bow: { name: '弓', emoji: '🏹', desc: '飞行箭矢' },
  staff: { name: '法杖', emoji: '🔮', desc: '追踪火球' },
};

const SKILL_ICONS: Record<SkillType, { name: string; emoji: string; desc: string }> = {
  fireball: { name: '火球术', emoji: '🔥', desc: '追踪大火球' },
  heal: { name: '治疗波', emoji: '💚', desc: '范围恢复生命' },
  blink: { name: '闪现', emoji: '⚡', desc: '短距瞬移' },
};

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<EditorCanvas | null>(null);
  const character = useGameStore((s) => s.character);
  const updateCharacter = useGameStore((s) => s.updateCharacter);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const resetBattle = useGameStore((s) => s.resetBattle);

  const pulse = () => {
    if (editorCanvasRef.current) editorCanvasRef.current.triggerPulse();
  };

  useEffect(() => {
    if (canvasRef.current && !editorCanvasRef.current) {
      editorCanvasRef.current = new EditorCanvas(canvasRef.current);
    }
    if (editorCanvasRef.current) {
      editorCanvasRef.current.render(character);
    }
  }, [character]);

  const handleStartBattle = () => {
    resetBattle();
    setGamePhase('battle');
  };

  return (
    <div className="editor-root">
      <div className="editor-container">
        <h1 className="editor-title">像素角色自定义</h1>

        <div className="editor-main">
          <div className="editor-preview-col">
            <div className="editor-preview-card">
              <h2 className="editor-section-title">角色预览</h2>
              <div className="editor-canvas-wrap">
                <canvas ref={canvasRef} className="editor-canvas" />
              </div>
              <div className="editor-preview-hint">
                8×8 像素块 · 20×20 格 · 160×160px
              </div>
            </div>
          </div>

          <div className="editor-controls-col">
            <div className="editor-card">
              <h2 className="editor-section-title">🎩 头部</h2>
              <div className="editor-control-row">
                <label className="editor-label">帽子颜色</label>
                <div className="editor-swatches">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      className={`editor-swatch ${character.head.hatColor === c ? 'editor-swatch-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => { pulse(); updateCharacter({ head: { ...character.head, hatColor: c } }); }}
                    />
                  ))}
                </div>
              </div>
              <div className="editor-control-row">
                <label className="editor-label">发型</label>
                <select
                  className="editor-select"
                  value={character.head.hairStyle}
                  onChange={(e) => { pulse(); updateCharacter({ head: { ...character.head, hairStyle: Number(e.target.value) } }); }}
                >
                  {HAIR_STYLES.map((s, i) => (
                    <option key={i} value={i}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="editor-card">
              <h2 className="editor-section-title">👕 身体</h2>
              <div className="editor-control-row">
                <label className="editor-label">上衣颜色</label>
                <div className="editor-swatches">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      className={`editor-swatch ${character.body.shirtColor === c ? 'editor-swatch-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => { pulse(); updateCharacter({ body: { ...character.body, shirtColor: c } }); }}
                    />
                  ))}
                </div>
              </div>
              <div className="editor-control-row">
                <label className="editor-label">护甲样式</label>
                <select
                  className="editor-select"
                  value={character.body.armorStyle}
                  onChange={(e) => { pulse(); updateCharacter({ body: { ...character.body, armorStyle: Number(e.target.value) } }); }}
                >
                  {ARMOR_STYLES.map((s, i) => (
                    <option key={i} value={i}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="editor-card">
              <h2 className="editor-section-title">👖 腿部</h2>
              <div className="editor-control-row">
                <label className="editor-label">裤子颜色</label>
                <div className="editor-swatches">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      className={`editor-swatch ${character.legs.pantsColor === c ? 'editor-swatch-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => { pulse(); updateCharacter({ legs: { ...character.legs, pantsColor: c } }); }}
                    />
                  ))}
                </div>
              </div>
              <div className="editor-control-row">
                <label className="editor-label">鞋子样式</label>
                <select
                  className="editor-select"
                  value={character.legs.shoeStyle}
                  onChange={(e) => { pulse(); updateCharacter({ legs: { ...character.legs, shoeStyle: Number(e.target.value) } }); }}
                >
                  {SHOE_STYLES.map((s, i) => (
                    <option key={i} value={i}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="editor-card">
              <h2 className="editor-section-title">⚔️ 主武器</h2>
              <div className="editor-bar-row">
                {(Object.keys(WEAPON_ICONS) as WeaponType[]).map((w) => {
                  const info = WEAPON_ICONS[w];
                  const active = character.weapon === w;
                  return (
                    <button
                      key={w}
                      className={`editor-bar-item ${active ? 'editor-bar-item-active' : ''}`}
                      onClick={() => { pulse(); updateCharacter({ weapon: w }); }}
                    >
                      <span className="editor-bar-icon">{info.emoji}</span>
                      <span className="editor-bar-name">{info.name}</span>
                      <span className="editor-bar-desc">{info.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="editor-card">
              <h2 className="editor-section-title">✨ 主动技能</h2>
              <div className="editor-bar-row">
                {(Object.keys(SKILL_ICONS) as SkillType[]).map((s) => {
                  const info = SKILL_ICONS[s];
                  const active = character.skill === s;
                  return (
                    <button
                      key={s}
                      className={`editor-bar-item ${active ? 'editor-bar-item-active' : ''}`}
                      onClick={() => { pulse(); updateCharacter({ skill: s }); }}
                    >
                      <span className="editor-bar-icon">{info.emoji}</span>
                      <span className="editor-bar-name">{info.name}</span>
                      <span className="editor-bar-desc">{info.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="editor-start-btn" onClick={handleStartBattle}>
              开始战斗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
