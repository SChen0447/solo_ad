import React from 'react'
import type { GameElement } from '../types'
import { COLORS } from '../types'

interface PropPanelProps {
  element: GameElement | null
  onUpdate: (id: string, updates: Partial<GameElement>) => void
}

const Slider: React.FC<{
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}> = ({ label, value, min, max, step = 1, onChange }) => (
  <div style={styles.field}>
    <label style={styles.label}>{label}</label>
    <div style={styles.sliderRow}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={styles.numberInput}
      />
    </div>
  </div>
)

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={styles.group}>
    <div style={styles.groupTitle}>{title}</div>
    {children}
  </div>
)

const PropPanel: React.FC<PropPanelProps> = ({ element, onUpdate }) => {
  if (!element) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>属性</span>
        </div>
        <div style={styles.empty}>
          选择一个元素<br />查看其属性
        </div>
      </div>
    )
  }

  const update = (updates: Partial<GameElement>) => onUpdate(element.id, updates)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>属性</span>
      </div>

      <div style={styles.content}>
        <Group title="基本信息">
          <div style={styles.field}>
            <label style={styles.label}>名称</label>
            <input
              type="text"
              value={element.name}
              onChange={(e) => update({ name: e.target.value })}
              style={styles.textInput}
            />
          </div>
        </Group>

        <Group title="变换">
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>X</label>
              <input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => update({ x: parseFloat(e.target.value) || 0 })}
                style={styles.textInput}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Y</label>
              <input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => update({ y: parseFloat(e.target.value) || 0 })}
                style={styles.textInput}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>宽</label>
              <input
                type="number"
                value={Math.round(element.width)}
                onChange={(e) => update({ width: parseFloat(e.target.value) || 0 })}
                style={styles.textInput}
                disabled={element.type === 'circle'}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>高</label>
              <input
                type="number"
                value={Math.round(element.height)}
                onChange={(e) => update({ height: parseFloat(e.target.value) || 0 })}
                style={styles.textInput}
                disabled={element.type === 'circle'}
              />
            </div>
          </div>
          {element.type === 'circle' && (
            <div style={styles.field}>
              <label style={styles.label}>半径</label>
              <input
                type="number"
                value={element.radius || 20}
                onChange={(e) => {
                  const r = parseFloat(e.target.value) || 0
                  update({ radius: r, width: r * 2, height: r * 2 })
                }}
                style={styles.textInput}
              />
            </div>
          )}
          <Slider
            label="旋转角度"
            value={element.rotation}
            min={0}
            max={360}
            onChange={(v) => update({ rotation: v })}
          />
        </Group>

        <Group title="外观">
          <div style={styles.field}>
            <label style={styles.label}>颜色</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={element.color}
                onChange={(e) => update({ color: e.target.value })}
                style={styles.colorPicker}
              />
              <input
                type="text"
                value={element.color}
                onChange={(e) => update({ color: e.target.value })}
                style={{ ...styles.textInput, flex: 1 }}
              />
            </div>
            <div style={styles.colorPalette}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ color: c })}
                  style={{
                    ...styles.colorSwatch,
                    background: c,
                    border: element.color === c ? '2px solid #fff' : '2px solid transparent'
                  }}
                />
              ))}
            </div>
          </div>
          {element.type === 'text' && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>文字内容</label>
                <input
                  type="text"
                  value={element.text || ''}
                  onChange={(e) => update({ text: e.target.value })}
                  style={styles.textInput}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>字号</label>
                <input
                  type="number"
                  value={element.fontSize || 24}
                  onChange={(e) => update({ fontSize: parseFloat(e.target.value) || 24 })}
                  style={styles.textInput}
                />
              </div>
            </>
          )}
        </Group>

        <Group title="物理属性">
          <div style={styles.field}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={element.physics.isStatic}
                onChange={(e) =>
                  update({ physics: { ...element.physics, isStatic: e.target.checked } })
                }
                style={styles.checkbox}
              />
              静态物体
            </label>
          </div>
          <Slider
            label="重力"
            value={element.physics.gravity}
            min={0}
            max={2000}
            step={10}
            onChange={(v) => update({ physics: { ...element.physics, gravity: v } })}
          />
          <Slider
            label="弹力"
            value={element.physics.bounciness}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update({ physics: { ...element.physics, bounciness: v } })}
          />
          <Slider
            label="摩擦系数"
            value={element.physics.friction}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update({ physics: { ...element.physics, friction: v } })}
          />
        </Group>

        <Group title="自定义脚本">
          <div style={styles.field}>
            <label style={styles.label}>每帧执行 (JS)</label>
            <textarea
              value={element.script}
              onChange={(e) => update({ script: e.target.value })}
              style={styles.codeArea}
              placeholder={`// 可用参数: element, state, keys, dt, engine
// 例如:
// if (keys.has('ArrowRight')) element.x += 200 * dt;
// element.rotation += 60 * dt;`}
            />
          </div>
        </Group>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    background: '#1E1E1E',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
    overflow: 'hidden'
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #2A2A2A'
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px'
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
    lineHeight: 1.8,
    padding: '20px'
  },
  group: {
    marginBottom: '16px'
  },
  groupTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px',
    paddingBottom: '6px',
    borderBottom: '1px solid #2A2A2A'
  },
  field: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#bbb',
    marginBottom: '6px'
  },
  textInput: {
    width: '100%',
    padding: '8px 10px',
    background: '#2A2A2A',
    border: '1px solid #3A3A3A',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none'
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  slider: {
    flex: 1,
    height: '4px',
    appearance: 'none',
    background: '#3A3A3A',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer'
  },
  numberInput: {
    width: '50px',
    padding: '6px 8px',
    background: '#2A2A2A',
    border: '1px solid #3A3A3A',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'center',
    outline: 'none'
  },
  colorPicker: {
    width: '36px',
    height: '32px',
    border: '1px solid #3A3A3A',
    borderRadius: '4px',
    background: 'transparent',
    cursor: 'pointer',
    padding: '2px'
  },
  colorPalette: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  colorSwatch: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: 0
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#4A90D9'
  },
  codeArea: {
    width: '100%',
    minHeight: '120px',
    padding: '10px',
    background: '#0D0D0D',
    border: '1px solid #3A3A3A',
    borderRadius: '4px',
    color: '#ddd',
    fontSize: '12px',
    fontFamily: 'Consolas, Monaco, monospace',
    lineHeight: 1.5,
    resize: 'vertical',
    outline: 'none'
  }
}

export default PropPanel
