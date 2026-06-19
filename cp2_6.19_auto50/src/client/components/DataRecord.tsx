import React, { useState, useRef } from 'react';
import type { Step, DataRecord as DataRecordType, RecordType } from '../../types';

interface LineChartProps {
  records: DataRecordType[];
}

function LineChart({ records }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: string; time: string } | null>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  const numericRecords = records.filter(r => r.type === 'numeric');
  if (numericRecords.length < 2) {
    return (
      <div style={{
        background: 'var(--color-card-light)',
        borderRadius: '8px',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '13px'
      }}>
        添加至少2条数值型数据后显示折线图
      </div>
    );
  }

  const width = Math.max(containerWidth, 400);
  const height = 300;
  const padding = { top: 40, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = numericRecords.map(r => parseFloat(r.value));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const yTicks = 5;

  const points = numericRecords.map((r, i) => {
    const x = padding.left + (i / (numericRecords.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((parseFloat(r.value) - minVal) / range) * chartHeight;
    return { x, y, value: r.value, time: r.timestamp };
  });

  let pathD = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) {
      pathD += `M ${p.x} ${p.y}`;
    } else {
      const prev = points[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = p.x - (p.x - prev.x) / 3;
      const cp2y = p.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
    }
  }

  const areaD = pathD +
    ` L ${points[points.length - 1].x} ${padding.top + chartHeight}` +
    ` L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFB300" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFB300" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padding.top + (i / yTicks) * chartHeight;
          const val = maxVal - (i / yTicks) * range;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#3D3572"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                fill="#B0A8D8"
                fontSize="11"
                textAnchor="end"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          if (i % Math.max(1, Math.floor(points.length / 6)) !== 0 && i !== points.length - 1) return null;
          const time = new Date(p.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          return (
            <text
              key={i}
              x={p.x}
              y={height - padding.bottom + 20}
              fill="#B0A8D8"
              fontSize="11"
              textAnchor="middle"
            >
              {time}
            </text>
          );
        })}

        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#5A4F9A"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#5A4F9A"
          strokeWidth="2"
        />

        <path d={areaD} fill="url(#lineGradient2)" />
        <path
          d={pathD}
          fill="none"
          stroke="#FFB300"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="6"
            fill="#FFB300"
            stroke="#2F2860"
            strokeWidth="2"
            onMouseEnter={() => setHoveredPoint(p)}
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ cursor: 'pointer', transition: 'r 0.2s' }}
          />
        ))}

        <text
          x={width / 2}
          y={22}
          fill="#E0E0E0"
          fontSize="14"
          fontWeight="600"
          textAnchor="middle"
        >
          数值趋势图
        </text>
      </svg>

      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: hoveredPoint.x + 10,
          top: hoveredPoint.y - 40,
          background: 'rgba(42, 35, 85, 0.95)',
          border: '1px solid var(--color-secondary)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          zIndex: 10,
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>
            {hoveredPoint.value}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
            {new Date(hoveredPoint.time).toLocaleString('zh-CN')}
          </div>
        </div>
      )}
    </div>
  );
}

interface DataRecordProps {
  step: Step;
  records: DataRecordType[];
  onAddRecord: (type: RecordType, value: string, enumOptions?: string[]) => void;
  onDeleteRecord: (id: string) => void;
}

export default function DataRecord({ step, records, onAddRecord, onDeleteRecord }: DataRecordProps) {
  const [recordType, setRecordType] = useState<RecordType>('numeric');
  const [recordValue, setRecordValue] = useState('');
  const [enumOptions, setEnumOptions] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);

  React.useEffect(() => {
    setIsTransitioning(true);
    const timer1 = setTimeout(() => {
      setKey(prev => prev + 1);
    }, 100);
    const timer2 = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [step.id]);

  const typeColors: Record<RecordType, string> = {
    numeric: '#4CAF50',
    text: '#2196F3',
    boolean: '#FF9800',
    enum: '#9C27B0'
  };

  const typeLabels: Record<RecordType, string> = {
    numeric: '数值型',
    text: '文本型',
    boolean: '布尔型',
    enum: '枚举型'
  };

  const handleAddRecord = () => {
    if (!recordValue.trim()) return;
    const options = recordType === 'enum'
      ? enumOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;
    onAddRecord(recordType, recordValue, options);
    setRecordValue('');
    setEnumOptions('');
  };

  const displayValue = (r: DataRecordType) => {
    if (r.type === 'boolean') {
      return r.value === 'true' ? '✓ 是' : '✗ 否';
    }
    return r.value;
  };

  const numericRecords = records.filter(r => r.type === 'numeric');
  const timelineRecords = records.filter(r => r.type !== 'numeric');

  return (
    <div style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.2s ease-out' }} key={key}>
      <div style={{
        background: 'var(--color-card)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        animation: 'slideUpIn 0.3s ease-out'
      }}>
        <h3 style={{ fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>
          📊 数据记录 - {step.name}
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
          在此步骤下记录实验数据，支持数值型、文本型、布尔型和枚举型数据
        </p>
      </div>

      <div style={{
        background: 'var(--color-card)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        animation: 'slideUpIn 0.3s ease-out 0.05s both'
      }}>
        <h4 style={{ fontSize: '14px', color: 'var(--color-secondary)', marginBottom: '16px' }}>
          添加新数据记录
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              数据类型
            </label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as RecordType)}
              style={{ width: '100%' }}
            >
              <option value="numeric">数值型</option>
              <option value="text">文本型</option>
              <option value="boolean">布尔型</option>
              <option value="enum">枚举型</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              数据值
            </label>
            {recordType === 'boolean' ? (
              <select
                value={recordValue}
                onChange={(e) => setRecordValue(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">请选择</option>
                <option value="true">是 (True)</option>
                <option value="false">否 (False)</option>
              </select>
            ) : recordType === 'enum' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={recordValue}
                  onChange={(e) => setRecordValue(e.target.value)}
                  placeholder="输入枚举值..."
                  style={{ flex: '1' }}
                />
              </div>
            ) : (
              <input
                type={recordType === 'numeric' ? 'number' : 'text'}
                value={recordValue}
                onChange={(e) => setRecordValue(e.target.value)}
                placeholder={`请输入${typeLabels[recordType]}数据...`}
                style={{ width: '100%' }}
              />
            )}
          </div>
        </div>
        {recordType === 'enum' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              枚举选项 (用逗号分隔)
            </label>
            <input
              type="text"
              value={enumOptions}
              onChange={(e) => setEnumOptions(e.target.value)}
              placeholder="例如: 优,良,中,差"
              style={{ width: '100%' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleAddRecord}
            disabled={!recordValue.trim()}
            style={{
              padding: '8px 24px',
              background: 'var(--color-secondary)',
              color: '#1A1535',
              borderRadius: '8px',
              fontWeight: '600',
              opacity: recordValue.trim() ? 1 : 0.5,
              cursor: recordValue.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            添加记录
          </button>
        </div>
      </div>

      {numericRecords.length > 0 && (
        <div style={{
          background: 'var(--color-card)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          animation: 'slideUpIn 0.3s ease-out 0.1s both'
        }}>
          <LineChart records={records} />
        </div>
      )}

      {records.length > 0 && (
        <div style={{
          background: 'var(--color-card)',
          borderRadius: '12px',
          padding: '24px',
          animation: 'slideUpIn 0.3s ease-out 0.15s both'
        }}>
          <h4 style={{ fontSize: '14px', color: 'var(--color-secondary)', marginBottom: '16px' }}>
            所有数据记录 ({records.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...records].reverse().map((record, index) => (
              <div
                key={record.id}
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                style={{
                  background: 'var(--color-card-light)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  borderLeft: `4px solid ${typeColors[record.type]}`
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: `${typeColors[record.type]}20`,
                      color: typeColors[record.type]
                    }}>
                      {typeLabels[record.type]}
                    </span>
                    <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                      {displayValue(record)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </span>
                    <span style={{
                      color: 'var(--color-text-muted)',
                      transition: 'transform 0.3s',
                      transform: expandedId === record.id ? 'rotate(180deg)' : 'rotate(0)'
                    }}>
                      ▼
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这条记录吗？')) {
                          onDeleteRecord(record.id);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        color: 'var(--color-text-muted)',
                        fontSize: '11px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--color-danger)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div style={{
                  maxHeight: expandedId === record.id ? '500px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease-out',
                  padding: expandedId === record.id ? '0 16px 16px 16px' : '0 16px'
                }}>
                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    fontSize: '13px',
                    animation: expandedId === record.id ? 'fadeIn 0.3s ease-out 0.15s both' : undefined
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <strong style={{ color: 'var(--color-text)' }}>记录ID:</strong> {record.id}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--color-text)' }}>数据类型:</strong> {typeLabels[record.type]}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--color-text)' }}>记录时间:</strong> {new Date(record.timestamp).toLocaleString('zh-CN')}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--color-text)' }}>数据值:</strong> {displayValue(record)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
