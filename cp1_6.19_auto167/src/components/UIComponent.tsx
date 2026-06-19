import React from 'react';
import type { FieldType, PhysicsData, ForceField, Level } from 'src/types';
import { FIELD_COLORS, FIELD_RANGES, FIELD_LABELS } from 'src/types';
import { LEVELS } from 'src/data/levels';

interface UIComponentProps {
  selectedFieldType: FieldType | null;
  onSelectFieldType: (type: FieldType | null) => void;
  selectedField: ForceField | null;
  onFieldStrengthChange: (strength: number) => void;
  onFieldAngleChange: (angle: number) => void;
  onDeleteField: () => void;
  isRunning: boolean;
  onLaunch: () => void;
  onReset: () => void;
  physicsData: PhysicsData;
  currentLevelId: number;
  onLevelChange: (id: number) => void;
}

const AnimatedNumber: React.FC<{ value: number; decimals?: number }> = ({
  value,
  decimals = 1,
}) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    setAnimating(true);
    setDisplayValue(value);
    const timer = setTimeout(() => setAnimating(false), 200);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span
      className={`animated-number ${animating ? 'bounce' : ''}`}
      style={{ fontFamily: 'Consolas, Monaco, monospace' }}
    >
      {displayValue.toFixed(decimals)}
    </span>
  );
};

const ForceArrow: React.FC<{ fx: number; fy: number; magnitude: number }> = ({
  fx,
  fy,
  magnitude,
}) => {
  const size = 120;
  const center = size / 2;
  const maxLen = 45;
  const scale = Math.min(magnitude / 200, 1);
  const len = maxLen * scale;
  const angle = Math.atan2(fy, fx);
  const ex = center + Math.cos(angle) * len;
  const ey = center + Math.sin(angle) * len;

  return (
    <svg width={size} height={size} className="force-arrow-svg">
      <circle
        cx={center}
        cy={center}
        r={3}
        fill="#88aaff"
      />
      {magnitude > 0.1 && (
        <>
          <line
            x1={center}
            y1={center}
            x2={ex}
            y2={ey}
            stroke="#ffaa55"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polygon
            points={`${ex},${ey} ${ex - 8 * Math.cos(angle - 0.4)},${ey - 8 * Math.sin(angle - 0.4)} ${ex - 8 * Math.cos(angle + 0.4)},${ey - 8 * Math.sin(angle + 0.4)}`}
            fill="#ffaa55"
          />
        </>
      )}
      <text
        x={center}
        y={size - 8}
        textAnchor="middle"
        fill="#88aaff"
        fontSize="10"
        fontFamily="Consolas, monospace"
      >
        {magnitude.toFixed(1)} N
      </text>
    </svg>
  );
};

export const UIComponent: React.FC<UIComponentProps> = ({
  selectedFieldType,
  onSelectFieldType,
  selectedField,
  onFieldStrengthChange,
  onFieldAngleChange,
  onDeleteField,
  isRunning,
  onLaunch,
  onReset,
  physicsData,
  currentLevelId,
  onLevelChange,
}) => {
  const fieldTypes: FieldType[] = ['gravity', 'magnetic', 'elastic'];
  const currentRange = selectedField
    ? FIELD_RANGES[selectedField.type]
    : null;

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-title">力场实验室</div>

        <div className="toolbar-section">
          <div className="section-label">关卡选择</div>
          <select
            className="level-select"
            value={currentLevelId}
            onChange={(e) => onLevelChange(Number(e.target.value))}
            disabled={isRunning}
          >
            {LEVELS.map((lv: Level) => (
              <option key={lv.id} value={lv.id}>
                {lv.name}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-section">
          <div className="section-label">选择力场</div>
          <div className="field-buttons">
            {fieldTypes.map((type) => {
              const colors = FIELD_COLORS[type];
              const isSelected = selectedFieldType === type;
              return (
                <button
                  key={type}
                  className={`field-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient[0].replace('0.35', '0.7')}, ${colors.gradient[1].replace('0.15', '0.5')})`,
                    borderColor: colors.border,
                  }}
                  onClick={() =>
                    onSelectFieldType(isSelected ? null : type)
                  }
                  disabled={isRunning}
                >
                  <span className="field-btn-icon">
                    {type === 'gravity' ? '⬇' : type === 'magnetic' ? '⊕' : '⟷'}
                  </span>
                  <span>{FIELD_LABELS[type]}</span>
                </button>
              );
            })}
          </div>
          <div className="toolbar-hint">
            {selectedFieldType
              ? '点击场景空白处放置力场'
              : '选择力场类型后放置'}
          </div>
        </div>

        {selectedField && currentRange && (
          <div className="toolbar-section">
            <div className="section-label">
              调整：{FIELD_LABELS[selectedField.type]}
            </div>
            <div className="slider-group">
              <label>
                强度 ({currentRange.unit})
                <span className="slider-value">
                  <AnimatedNumber value={selectedField.strength} decimals={0} />
                </span>
              </label>
              <input
                type="range"
                min={currentRange.min}
                max={currentRange.max}
                step={1}
                value={selectedField.strength}
                onChange={(e) => onFieldStrengthChange(Number(e.target.value))}
                className="param-slider"
              />
            </div>
            <div className="slider-group">
              <label>
                方向 (°)
                <span className="slider-value">
                  <AnimatedNumber value={selectedField.angle} decimals={0} />
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={selectedField.angle}
                onChange={(e) => onFieldAngleChange(Number(e.target.value))}
                className="param-slider angle-slider"
              />
            </div>
            <button
              className="delete-btn"
              onClick={onDeleteField}
              disabled={isRunning}
            >
              删除此力场
            </button>
          </div>
        )}

        <div className="toolbar-section control-section">
          <button
            className={`launch-btn ${isRunning ? 'running' : ''}`}
            onClick={onLaunch}
            disabled={isRunning}
          >
            {isRunning ? '运行中...' : '▶ 发射小球'}
          </button>
          <button className="reset-btn" onClick={onReset}>
            ↻ 重置场景
          </button>
        </div>
      </div>

      <div className="data-panel">
        <div className="panel-title">实时物理参数</div>

        <div className="data-card">
          <div className="data-label">瞬时速度</div>
          <div className="data-value-row">
            <AnimatedNumber value={physicsData.velocity} decimals={1} />
            <span className="data-unit">m/s</span>
          </div>
        </div>

        <div className="data-card">
          <div className="data-label">加速度</div>
          <div className="data-value-row">
            <AnimatedNumber value={physicsData.acceleration} decimals={1} />
            <span className="data-unit">m/s²</span>
          </div>
          <div className="accel-bar-container">
            <div
              className="accel-bar"
              style={{
                width: `${Math.min((physicsData.acceleration / 50) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="data-card">
          <div className="data-label">所受合力</div>
          <div className="force-arrow-container">
            <ForceArrow
              fx={physicsData.netForce.x}
              fy={physicsData.netForce.y}
              magnitude={physicsData.forceMagnitude}
            />
          </div>
        </div>
      </div>
    </>
  );
};
