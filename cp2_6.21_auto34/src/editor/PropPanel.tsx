import React from 'react';
import type { GameElement } from '../types';
import { COLOR_PALETTE } from '../utils/helpers';

interface PropPanelProps {
  element: GameElement | null;
  onUpdate: (id: string, props: Partial<GameElement>) => void;
}

export const PropPanel: React.FC<PropPanelProps> = ({ element, onUpdate }) => {
  if (!element) {
    return (
      <div className="prop-panel">
        <div className="panel-header">属性</div>
        <div className="empty-hint">请选择一个元素查看属性</div>
      </div>
    );
  }

  const update = (props: Partial<GameElement>) => onUpdate(element.id, props);

  const updatePhysics = (props: Partial<GameElement['physics']>) => {
    update({ physics: { ...element.physics, ...props } });
  };

  return (
    <div className="prop-panel">
      <div className="panel-header">属性</div>
      <div className="prop-content">
        <div className="prop-group">
          <div className="group-title">基本信息</div>
          <div className="prop-row">
            <label>名称</label>
            <input
              type="text"
              value={element.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="prop-row">
            <label>类型</label>
            <span className="type-label">{element.type}</span>
          </div>
        </div>

        <div className="prop-group">
          <div className="group-title">位置与变换</div>
          <div className="prop-row">
            <label>X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => update({ x: Number(e.target.value) })}
            />
            <label>Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => update({ y: Number(e.target.value) })}
            />
          </div>
          {element.type === 'rect' && (
            <div className="prop-row">
              <label>宽度</label>
              <input
                type="number"
                value={Math.round(element.width)}
                min={1}
                onChange={(e) => update({ width: Number(e.target.value) })}
              />
              <label>高度</label>
              <input
                type="number"
                value={Math.round(element.height)}
                min={1}
                onChange={(e) => update({ height: Number(e.target.value) })}
              />
            </div>
          )}
          {element.type === 'circle' && (
            <div className="prop-row">
              <label>半径</label>
              <input
                type="number"
                value={Math.round(element.radius)}
                min={1}
                onChange={(e) => update({ radius: Number(e.target.value) })}
              />
            </div>
          )}
          {element.type === 'text' && (
            <>
              <div className="prop-row">
                <label>文字</label>
                <input
                  type="text"
                  value={element.textContent || ''}
                  onChange={(e) => update({ textContent: e.target.value })}
                />
              </div>
              <div className="prop-row">
                <label>字号</label>
                <input
                  type="number"
                  value={element.fontSize || 24}
                  min={8}
                  onChange={(e) => update({ fontSize: Number(e.target.value) })}
                />
              </div>
            </>
          )}
          <div className="prop-row">
            <label>旋转</label>
            <input
              type="number"
              value={Math.round(element.rotation)}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
            />
            <span className="unit">°</span>
          </div>
          <div className="prop-row">
            <label>层级</label>
            <input
              type="number"
              value={element.zIndex}
              onChange={(e) => update({ zIndex: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="prop-group">
          <div className="group-title">颜色</div>
          <div className="prop-row">
            <label>色值</label>
            <input
              type="color"
              value={element.color}
              onChange={(e) => update({ color: e.target.value })}
            />
            <input
              type="text"
              className="hex-input"
              value={element.color}
              onChange={(e) => update({ color: e.target.value })}
            />
          </div>
          <div className="color-palette">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                className={`color-swatch ${element.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => update({ color: c })}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="prop-group">
          <div className="group-title">物理属性</div>
          <div className="prop-row toggle-row">
            <label>启用物理</label>
            <input
              type="checkbox"
              checked={element.physics.enabled}
              onChange={(e) => updatePhysics({ enabled: e.target.checked })}
            />
          </div>
          <div className="prop-row toggle-row">
            <label>静态物体</label>
            <input
              type="checkbox"
              checked={element.physics.isStatic}
              onChange={(e) => updatePhysics({ isStatic: e.target.checked })}
            />
          </div>
          <div className="prop-row slider-row">
            <label>重力</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={element.physics.gravity}
              onChange={(e) => updatePhysics({ gravity: Number(e.target.value) })}
            />
            <input
              type="number"
              className="slider-num"
              step="0.1"
              value={element.physics.gravity}
              onChange={(e) => updatePhysics({ gravity: Number(e.target.value) })}
            />
          </div>
          <div className="prop-row slider-row">
            <label>弹力</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={element.physics.bounciness}
              onChange={(e) => updatePhysics({ bounciness: Number(e.target.value) })}
            />
            <input
              type="number"
              className="slider-num"
              step="0.05"
              min="0"
              max="1"
              value={element.physics.bounciness}
              onChange={(e) => updatePhysics({ bounciness: Number(e.target.value) })}
            />
          </div>
          <div className="prop-row slider-row">
            <label>摩擦</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={element.physics.friction}
              onChange={(e) => updatePhysics({ friction: Number(e.target.value) })}
            />
            <input
              type="number"
              className="slider-num"
              step="0.05"
              min="0"
              max="1"
              value={element.physics.friction}
              onChange={(e) => updatePhysics({ friction: Number(e.target.value) })}
            />
          </div>
          <div className="prop-row">
            <label>初速VX</label>
            <input
              type="number"
              step="0.5"
              value={element.physics.vx}
              onChange={(e) => updatePhysics({ vx: Number(e.target.value) })}
            />
            <label>初速VY</label>
            <input
              type="number"
              step="0.5"
              value={element.physics.vy}
              onChange={(e) => updatePhysics({ vy: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="prop-group">
          <div className="group-title">自定义脚本</div>
          <div className="script-hint">
            每帧执行，可用变量：element（当前元素）、ctx（持久上下文）、engine（游戏API）、delta（帧时间）
          </div>
          <textarea
            className="script-editor"
            value={element.script}
            onChange={(e) => update({ script: e.target.value })}
            placeholder="// 例如：让元素循环移动\nelement.x = engine.canvasWidth/2 + Math.sin(ctx.t*2)*100;"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
