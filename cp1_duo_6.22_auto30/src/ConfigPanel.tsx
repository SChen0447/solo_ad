import React, { useState, useRef } from 'react';
import { EnemyConfig, BulletPattern, BulletColor, PathPoint } from './EnemyEngine';

interface ConfigPanelProps {
  enemyConfigs: EnemyConfig[];
  selectedEnemyId: string | null;
  selectedPointIndex: number | null;
  onSelectEnemy: (id: string | null) => void;
  onSelectPoint: (enemyId: string, pointIndex: number | null) => void;
  onUpdateEnemy: (id: string, config: Partial<EnemyConfig>) => void;
  onUpdatePoint: (enemyId: string, pointIndex: number, point: Partial<PathPoint>) => void;
  onAddPoint: (enemyId: string, x: number, y: number) => void;
  onDeletePoint: (enemyId: string, pointIndex: number) => void;
  onAddEnemy: () => void;
  onDeleteEnemy: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

const bulletPatterns: { value: BulletPattern; label: string }[] = [
  { value: 'linear', label: '直线' },
  { value: 'fan', label: '扇形' },
  { value: 'spiral', label: '螺旋' },
];

const bulletColors: { value: BulletColor; label: string }[] = [
  { value: 'red', label: '红色' },
  { value: 'blue', label: '蓝色' },
  { value: 'yellow', label: '黄色' },
  { value: 'white', label: '白色' },
];

const enemyColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#a8e6cf'];

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({ label, value, min, max, step, onChange, unit = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ color: '#c9d1d9', fontSize: '13px' }}>{label}</span>
        <span
          style={{
            color: '#58a6ff',
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(88, 166, 255, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div ref={sliderRef} style={{ position: 'relative' }}>
        <div
          style={{
            height: '4px',
            backgroundColor: '#30363d',
            borderRadius: '2px',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: '#58a6ff',
              borderRadius: '2px',
              transition: isDragging ? 'none' : 'width 0.1s ease',
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            transform: 'translateY(-50%)',
            opacity: 0,
            cursor: 'pointer',
            height: '20px',
            margin: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${percentage}% - 8px)`,
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            backgroundColor: '#58a6ff',
            borderRadius: '50%',
            boxShadow: isDragging ? '0 0 0 4px rgba(88, 166, 255, 0.3)' : 'none',
            pointerEvents: 'none',
            transition: isDragging ? 'none' : 'left 0.1s ease, box-shadow 0.2s ease',
          }}
        />
      </div>
    </div>
  );
};

interface SelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, value, options, onChange }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ color: '#c9d1d9', fontSize: '13px', marginBottom: '6px' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 32px 8px 12px',
            backgroundColor: '#21262d',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            appearance: 'none',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#58a6ff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#30363d';
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#8b949e',
            fontSize: '10px',
          }}
        >
          ▼
        </div>
      </div>
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'secondary', disabled = false, style }) => {
  const [pressed, setPressed] = useState(false);

  const getBgColor = () => {
    if (disabled) return '#30363d';
    switch (variant) {
      case 'primary':
        return '#58a6ff';
      case 'danger':
        return '#f85149';
      default:
        return '#21262d';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#484f58';
    switch (variant) {
      case 'primary':
        return '#ffffff';
      case 'danger':
        return '#ffffff';
      default:
        return '#c9d1d9';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        padding: '8px 16px',
        backgroundColor: getBgColor(),
        color: getTextColor(),
        border: variant === 'secondary' ? '1px solid #30363d' : 'none',
        borderRadius: '8px',
        fontSize: '13px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.1s ease, background-color 0.2s ease',
        userSelect: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  enemyConfigs,
  selectedEnemyId,
  selectedPointIndex,
  onSelectEnemy,
  onSelectPoint,
  onUpdateEnemy,
  onUpdatePoint,
  onAddPoint,
  onDeletePoint,
  onAddEnemy,
  onDeleteEnemy,
  isPlaying,
  onTogglePlay,
  onReset,
  onExport,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedEnemy = enemyConfigs.find((c) => c.id === selectedEnemyId);
  const selectedPoint =
    selectedEnemy && selectedPointIndex !== null ? selectedEnemy.pathPoints[selectedPointIndex] : null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onImport(content);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const SectionHeader: React.FC<{ title: string; sectionKey: string }> = ({ title, sectionKey }) => (
    <div
      onClick={() => toggleSection(sectionKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        cursor: 'pointer',
        borderBottom: '1px solid #21262d',
      }}
    >
      <span style={{ color: '#e6edf3', fontWeight: 600, fontSize: '14px' }}>{title}</span>
      <span style={{ color: '#8b949e', fontSize: '12px' }}>
        {collapsedSections[sectionKey] ? '▼' : '▲'}
      </span>
    </div>
  );

  return (
    <div
      style={{
        width: '30%',
        minWidth: '320px',
        maxWidth: '400px',
        backgroundColor: '#161b22',
        borderLeft: '1px solid #30363d',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #30363d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ color: '#e6edf3', fontSize: '18px', fontWeight: 600 }}>弹幕编辑器</h2>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px',
        }}
      >
        <div>
          <SectionHeader title="编队控制" sectionKey="controls" />
          {!collapsedSections['controls'] && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <Button variant="primary" onClick={onTogglePlay} style={{ flex: 1 }}>
                  {isPlaying ? '⏸ 暂停' : '▶ 开始'}
                </Button>
                <Button onClick={onReset} style={{ flex: 1 }}>
                  ↻ 重置
                </Button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={onExport} style={{ flex: 1 }}>
                  ↓ 导出
                </Button>
                <Button onClick={handleImportClick} style={{ flex: 1 }}>
                  ↑ 导入
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="敌机列表" sectionKey="enemies" />
          {!collapsedSections['enemies'] && (
            <div style={{ padding: '12px 0' }}>
              <div style={{ marginBottom: '12px' }}>
                <Button variant="primary" onClick={onAddEnemy} disabled={enemyConfigs.length >= 5} style={{ width: '100%' }}>
                  + 添加敌机 ({enemyConfigs.length}/5)
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {enemyConfigs.map((config, index) => (
                  <div
                    key={config.id}
                    onClick={() => onSelectEnemy(config.id === selectedEnemyId ? null : config.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: config.id === selectedEnemyId ? 'rgba(88, 166, 255, 0.1)' : '#21262d',
                      border: `1px solid ${config.id === selectedEnemyId ? '#58a6ff' : '#30363d'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: enemyColors[index % enemyColors.length],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: '#c9d1d9', fontSize: '13px', flex: 1 }}>敌机 {index + 1}</span>
                    <label style={{ position: 'relative', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={config.active}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateEnemy(config.id, { active: e.target.checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%',
                        }}
                      />
                      <div
                        style={{
                          width: '36px',
                          height: '20px',
                          backgroundColor: config.active ? '#58a6ff' : '#30363d',
                          borderRadius: '10px',
                          position: 'relative',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: config.active ? '18px' : '2px',
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: 'left 0.2s ease',
                          }}
                        />
                      </div>
                    </label>
                    {enemyConfigs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEnemy(config.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#484f58',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '2px 4px',
                          transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.color = '#f85149';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.color = '#484f58';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedEnemy && (
          <div>
            <SectionHeader title="路径关键点" sectionKey="path" />
            {!collapsedSections['path'] && (
              <div style={{ padding: '12px 0' }}>
                <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '10px' }}>
                  双击画布添加关键点（{selectedEnemy.pathPoints.length}/20）
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {selectedEnemy.pathPoints.map((point, index) => (
                    <div
                      key={index}
                      onClick={() => onSelectPoint(selectedEnemy.id, index === selectedPointIndex ? null : index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        backgroundColor: index === selectedPointIndex ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
                        border: `1px solid ${index === selectedPointIndex ? '#58a6ff' : '#30363d'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#58a6ff',
                          color: '#0d1117',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span style={{ color: '#c9d1d9', flex: 1, fontFamily: 'monospace' }}>
                        ({Math.round(point.x)}, {Math.round(point.y)})
                      </span>
                      <span style={{ color: '#8b949e', fontSize: '11px' }}>{point.stayTime.toFixed(1)}s</span>
                      {selectedEnemy.pathPoints.length > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePoint(selectedEnemy.id, index);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#484f58',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '0 2px',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.color = '#f85149';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.color = '#484f58';
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedPoint && selectedPointIndex !== null && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#0d1117', borderRadius: '8px' }}>
                    <div style={{ color: '#58a6ff', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
                      关键点 {selectedPointIndex + 1} 设置
                    </div>
                    <SliderInput
                      label="停留时间"
                      value={selectedPoint.stayTime}
                      min={0}
                      max={3}
                      step={0.1}
                      unit="秒"
                      onChange={(val) => onUpdatePoint(selectedEnemy.id, selectedPointIndex, { stayTime: val })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedEnemy && (
          <div>
            <SectionHeader title="弹幕参数" sectionKey="bullet" />
            {!collapsedSections['bullet'] && (
              <div style={{ padding: '12px 0' }}>
                <SelectInput
                  label="弹道类型"
                  value={selectedEnemy.bulletConfig.pattern}
                  options={bulletPatterns}
                  onChange={(val) =>
                    onUpdateEnemy(selectedEnemy.id, {
                      bulletConfig: { ...selectedEnemy.bulletConfig, pattern: val as BulletPattern },
                    })
                  }
                />
                <SliderInput
                  label="子弹速度"
                  value={selectedEnemy.bulletConfig.speed}
                  min={200}
                  max={800}
                  step={10}
                  unit="px/s"
                  onChange={(val) =>
                    onUpdateEnemy(selectedEnemy.id, {
                      bulletConfig: { ...selectedEnemy.bulletConfig, speed: val },
                    })
                  }
                />
                <SliderInput
                  label="发射间隔"
                  value={selectedEnemy.bulletConfig.fireInterval}
                  min={0.1}
                  max={2}
                  step={0.05}
                  unit="秒"
                  onChange={(val) =>
                    onUpdateEnemy(selectedEnemy.id, {
                      bulletConfig: { ...selectedEnemy.bulletConfig, fireInterval: val },
                    })
                  }
                />
                <SelectInput
                  label="子弹颜色"
                  value={selectedEnemy.bulletConfig.color}
                  options={bulletColors}
                  onChange={(val) =>
                    onUpdateEnemy(selectedEnemy.id, {
                      bulletConfig: { ...selectedEnemy.bulletConfig, color: val as BulletColor },
                    })
                  }
                />
                <SliderInput
                  label="弹道偏移"
                  value={selectedEnemy.bulletConfig.offsetAngle}
                  min={-45}
                  max={45}
                  step={1}
                  unit="°"
                  onChange={(val) =>
                    onUpdateEnemy(selectedEnemy.id, {
                      bulletConfig: { ...selectedEnemy.bulletConfig, offsetAngle: val },
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {!selectedEnemy && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#484f58', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✦</div>
            选择一个敌机开始编辑
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #30363d',
          color: '#484f58',
          fontSize: '11px',
          textAlign: 'center',
        }}
      >
        提示：双击画布添加路径点，拖拽调整位置
      </div>
    </div>
  );
};

export default ConfigPanel;
