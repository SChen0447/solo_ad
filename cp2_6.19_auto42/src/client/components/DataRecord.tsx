import React, { useState, useMemo } from 'react';
import { RecordInfo } from '../App';

interface Props {
  stepId: string;
  stepName: string;
  records: RecordInfo[];
  onRecordsChange: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  numeric: '#FFB300',
  text: '#42A5F5',
  boolean: '#66BB6A',
  enum: '#AB47BC',
};

function bezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`;
    return d;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function LineChart({ data }: { data: { time: string; value: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 480;
  const H = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 45 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: pad.top + plotH - ((d.value - minV) / rangeV) * plotH,
  }));

  const pathD = bezierPath(points);

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minV + (rangeV / (yTicks - 1)) * i);

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {yTickValues.map((v, i) => {
        const y = pad.top + plotH - ((v - minV) / rangeV) * plotH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#6B6590" fontSize={10}>{v.toFixed(1)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = pad.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
        return (
          <g key={i}>
            <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="rgba(255,255,255,0.03)" />
            <text x={x} y={H - 6} textAnchor="middle" fill="#6B6590" fontSize={9}>
              {new Date(d.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </text>
          </g>
        );
      })}
      {pathD && <path d={pathD} fill="none" stroke="#FFB300" strokeWidth={2} />}
      {pathD && (
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${pad.top + plotH} L ${points[0].x} ${pad.top + plotH} Z`}
          fill="url(#chartGradient)" opacity={0.15}
        />
      )}
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB300" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#FFB300" stopOpacity={0} />
        </linearGradient>
      </defs>
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 3}
          fill="#FFB300" stroke="#1A1535" strokeWidth={2}
          style={{ cursor: 'pointer', transition: 'r 0.15s' }}
          onMouseEnter={() => setHoverIdx(i)}
          onMouseLeave={() => setHoverIdx(null)}
        />
      ))}
      {hoverIdx !== null && data[hoverIdx] && (
        <g>
          <rect
            x={points[hoverIdx].x - 70} y={points[hoverIdx].y - 38}
            width={140} height={28} rx={4}
            fill="rgba(26,21,53,0.92)" stroke="rgba(255,179,0,0.3)"
          />
          <text
            x={points[hoverIdx].x} y={points[hoverIdx].y - 20}
            textAnchor="middle" fill="#E0E0E0" fontSize={10}
          >
            {new Date(data[hoverIdx].time).toLocaleString('zh-CN')} | {data[hoverIdx].value}
          </text>
        </g>
      )}
    </svg>
  );
}

function TimelineCard({ record, onDelete }: { record: RecordInfo; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[record.type] || '#8884A8';

  return (
    <div style={{
      display: 'flex', gap: 0, marginBottom: 8,
      animation: 'fadeInUp 0.2s ease-out',
    }}>
      <div style={{
        width: 4, borderRadius: 2, background: color,
        flexShrink: 0, transition: 'background 0.2s',
      }} />
      <div style={{
        flex: 1, marginLeft: 8, background: '#2F2860',
        borderRadius: 8, overflow: 'hidden',
        cursor: 'pointer',
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 3,
              background: `${color}22`, color, fontWeight: 600,
            }}>
              {record.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: '#E0E0E0' }}>{record.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#6B6590' }}>
              {new Date(record.recordedAt).toLocaleString('zh-CN')}
            </span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
              background: 'transparent', border: 'none', color: '#E53935',
              fontSize: 11, cursor: 'pointer', opacity: 0.5, padding: 2,
            }}>✕</button>
          </div>
        </div>
        <div style={{
          maxHeight: expanded ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-out',
        }}>
          <div style={{ padding: '0 14px 10px', fontSize: 12, color: '#B0AAC8' }}>
            <div>值: <span style={{ color: '#E0E0E0' }}>{record.value || '(空)'}</span></div>
            {record.type === 'boolean' && (
              <div style={{ marginTop: 4 }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                  background: record.value === 'true' ? 'rgba(76,175,80,0.15)' : 'rgba(229,57,53,0.15)',
                  color: record.value === 'true' ? '#66BB6A' : '#E53935',
                  fontSize: 11,
                }}>
                  {record.value === 'true' ? 'TRUE' : 'FALSE'}
                </span>
              </div>
            )}
            {record.enumOptions && record.enumOptions.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {record.enumOptions.map((opt, i) => (
                  <span key={i} style={{
                    padding: '2px 6px', borderRadius: 3, fontSize: 10,
                    background: opt === record.value ? 'rgba(171,71,188,0.2)' : 'rgba(255,255,255,0.05)',
                    color: opt === record.value ? '#AB47BC' : '#6B6590',
                  }}>{opt}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataRecord({ stepId, stepName, records, onRecordsChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [formType, setFormType] = useState<'numeric' | 'text' | 'boolean' | 'enum'>('numeric');
  const [formLabel, setFormLabel] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formEnumOpts, setFormEnumOpts] = useState('');
  const [fadeKey, setFadeKey] = useState(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel) return;
    try {
      const body: Record<string, unknown> = {
        type: formType,
        label: formLabel,
        value: formValue,
      };
      if (formType === 'enum' && formEnumOpts) {
        body.enumOptions = formEnumOpts.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (formType === 'boolean') {
        body.value = formValue;
      }
      await fetch(`/api/steps/${stepId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setFormLabel('');
      setFormValue('');
      setFormEnumOpts('');
      setShowAdd(false);
      setFadeKey((k) => k + 1);
      onRecordsChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/records/${id}`, { method: 'DELETE' });
    onRecordsChange();
  };

  const numericRecords = useMemo(
    () => records.filter((r) => r.type === 'numeric' && r.value !== ''),
    [records]
  );

  const numericChartData = useMemo(() => {
    return numericRecords
      .map((r) => ({ time: r.recordedAt, value: parseFloat(r.value) || 0 }))
      .filter((d) => !isNaN(d.value));
  }, [numericRecords]);

  const otherRecords = useMemo(
    () => records.filter((r) => r.type !== 'numeric'),
    [records]
  );

  return (
    <div key={fadeKey} style={{
      background: '#2F2860', borderRadius: 12, padding: 24,
      border: '1px solid rgba(255,255,255,0.05)',
      animation: 'fadeInUp 0.2s ease-out',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#B0AAC8', fontWeight: 600 }}>
          数据记录 — {stepName}
        </h3>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '6px 14px', borderRadius: 6,
          background: '#FFB300', color: '#1A1535', border: 'none',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >{showAdd ? '取消' : '+ 添加记录'}</button>
      </div>

      {showAdd && (
        <div style={{
          background: '#3A3570', borderRadius: 10, padding: 16,
          marginBottom: 16, border: '1px solid rgba(255,179,0,0.15)',
          animation: 'slideInBottom 0.35s ease-out',
        }}>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>标签 *</label>
                <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ width: 120 }}>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>数据类型</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value as 'numeric' | 'text' | 'boolean' | 'enum')} style={inputStyle}>
                  <option value="numeric">数值型</option>
                  <option value="text">文本型</option>
                  <option value="boolean">布尔型</option>
                  <option value="enum">枚举型</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>
                {formType === 'numeric' ? '数值' : formType === 'boolean' ? '布尔值' : formType === 'enum' ? '当前选项' : '文本内容'}
              </label>
              {formType === 'boolean' ? (
                <select value={formValue} onChange={(e) => setFormValue(e.target.value)} style={inputStyle}>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  type={formType === 'numeric' ? 'number' : 'text'}
                  style={inputStyle}
                  placeholder={formType === 'numeric' ? '输入数值' : formType === 'enum' ? '当前选择的选项' : '输入文本'}
                />
              )}
            </div>
            {formType === 'enum' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>可选选项（逗号分隔）</label>
                <input value={formEnumOpts} onChange={(e) => setFormEnumOpts(e.target.value)} style={inputStyle} placeholder="选项1, 选项2, 选项3" />
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <button type="submit" style={{
                padding: '6px 16px', borderRadius: 6,
                background: '#FFB300', color: '#1A1535', border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>添加</button>
            </div>
          </form>
        </div>
      )}

      {numericChartData.length >= 2 && (
        <div style={{
          marginBottom: 16, padding: 16, background: '#1A1535',
          borderRadius: 8, overflow: 'auto',
        }}>
          <div style={{ fontSize: 12, color: '#8884A8', marginBottom: 8 }}>数值型数据趋势</div>
          <LineChart data={numericChartData} />
        </div>
      )}

      {numericChartData.length === 1 && (
        <div style={{
          marginBottom: 16, padding: 12, background: '#1A1535',
          borderRadius: 8, fontSize: 12, color: '#B0AAC8',
        }}>
          当前数值: <span style={{ color: '#FFB300', fontWeight: 600 }}>{numericChartData[0].value}</span>
          <span style={{ color: '#6B6590', marginLeft: 8 }}>（需至少2条记录才显示折线图）</span>
        </div>
      )}

      {otherRecords.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#8884A8', marginBottom: 8 }}>文本 / 布尔 / 枚举记录</div>
          {otherRecords.map((r) => (
            <TimelineCard key={r.id} record={r} onDelete={() => handleDelete(r.id)} />
          ))}
        </div>
      )}

      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#6B6590', fontSize: 12 }}>
          暂无数据记录，点击上方按钮添加
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 6,
  background: '#2A2355', border: '1px solid #4A3F80', color: '#E0E0E0',
  fontSize: 12, outline: 'none',
};
