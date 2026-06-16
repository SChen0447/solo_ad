import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import type {
  Annotation,
  BarData,
  ChartConfig,
  ChartType,
  HistogramData,
  LineData,
  RadarData,
  ScatterData,
  StudentScore,
} from '@/types';

interface ChartCardProps {
  config: ChartConfig;
  data: StudentScore[];
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

const GRADIENT_COLORS = [
  '#60A5FA',
  '#818CF8',
  '#A78BFA',
  '#C084FC',
  '#E879F9',
  '#F472B6',
];

const getGradientColor = (index: number): string => {
  return GRADIENT_COLORS[index % GRADIENT_COLORS.length];
};

const buildHistogramData = (data: StudentScore[]): HistogramData[] => {
  const ranges = [
    { label: '0-59', min: 0, max: 59 },
    { label: '60-69', min: 60, max: 69 },
    { label: '70-79', min: 70, max: 79 },
    { label: '80-89', min: 80, max: 89 },
    { label: '90-100', min: 90, max: 100 },
  ];
  return ranges.map((r) => ({
    range: r.label,
    count: data.filter((d) => d.score >= r.min && d.score <= r.max).length,
  }));
};

const buildLineData = (data: StudentScore[], subject?: string): LineData[] => {
  const filtered = subject ? data.filter((d) => d.subject === subject) : data;
  const grouped = new Map<string, number[]>();
  filtered.forEach((d) => {
    if (!grouped.has(d.date)) grouped.set(d.date, []);
    grouped.get(d.date)!.push(d.score);
  });
  return Array.from(grouped.entries())
    .map(([date, scores]) => ({
      date,
      score: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length * 100
      ) / 100,
      subject,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const buildBarData = (data: StudentScore[]): BarData[] => {
  const grouped = new Map<string, number[]>();
  data.forEach((d) => {
    if (!grouped.has(d.subject)) grouped.set(d.subject, []);
    grouped.get(d.subject)!.push(d.score);
  });
  return Array.from(grouped.entries()).map(([subject, scores]) => ({
    subject,
    average: Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length * 100
    ) / 100,
  }));
};

const buildRadarData = (data: StudentScore[]): RadarData[] => {
  const barData = buildBarData(data);
  return barData.map((d) => ({
    subject: d.subject,
    score: d.average,
    fullMark: 100,
  }));
};

const buildScatterData = (
  data: StudentScore[],
  subject?: string
): ScatterData[] => {
  const filtered = subject ? data.filter((d) => d.subject === subject) : data;
  return filtered.slice(0, 200).map((d, i) => ({
    score: d.score,
    studentIndex: i + 1,
    subject: d.subject,
    studentName: d.studentName,
  }));
};

interface AnnotationModalState {
  chartId: string;
  dataPointKey: string;
  offsetX: number;
  offsetY: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  config,
  data,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onDelete,
  isDragging = false,
}) => {
  const [modal, setModal] = useState<AnnotationModalState | null>(null);
  const [annotationInput, setAnnotationInput] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(
    null
  );
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const chartData = useMemo(() => {
    switch (config.type) {
      case 'histogram':
        return buildHistogramData(data);
      case 'line':
        return buildLineData(data, config.subject);
      case 'bar':
        return buildBarData(data);
      case 'radar':
        return buildRadarData(data);
      case 'scatter':
        return buildScatterData(data, config.subject);
      default:
        return [];
    }
  }, [config.type, config.subject, data]);

  const chartAnnotations = useMemo(
    () => annotations.filter((a) => a.chartId === config.id),
    [annotations, config.id]
  );

  const handleDoubleClick = useCallback(
    (chartType: ChartType, dataPoint: unknown, event: React.MouseEvent) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let key = '';
      if (chartType === 'histogram') {
        const dp = dataPoint as HistogramData;
        key = `histogram-${dp.range}`;
      } else if (chartType === 'line') {
        const dp = dataPoint as LineData;
        key = `line-${dp.date}`;
      } else if (chartType === 'bar') {
        const dp = dataPoint as BarData;
        key = `bar-${dp.subject}`;
      } else if (chartType === 'radar') {
        const dp = dataPoint as RadarData;
        key = `radar-${dp.subject}`;
      } else if (chartType === 'scatter') {
        const dp = dataPoint as ScatterData;
        key = `scatter-${dp.studentIndex}-${dp.subject}`;
      }

      setModal({
        chartId: config.id,
        dataPointKey: key,
        offsetX: x,
        offsetY: y - 60,
      });
      setAnnotationInput('');
    },
    [config.id]
  );

  const handleConfirmAnnotation = useCallback(() => {
    if (!modal || !annotationInput.trim()) {
      setModal(null);
      return;
    }
    onAddAnnotation({
      chartId: modal.chartId,
      dataPointKey: modal.dataPointKey,
      content: annotationInput.trim(),
      offsetX: modal.offsetX,
      offsetY: modal.offsetY,
    });
    setModal(null);
    setAnnotationInput('');
  }, [modal, annotationInput, onAddAnnotation]);

  useEffect(() => {
    if (!modal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
      if (e.key === 'Enter') handleConfirmAnnotation();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal, handleConfirmAnnotation]);

  const startAnnotationDrag = useCallback(
    (e: React.MouseEvent, annotationId: string) => {
      e.stopPropagation();
      const annotation = chartAnnotations.find((a) => a.id === annotationId);
      if (!annotation || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - rect.left - annotation.offsetX,
        y: e.clientY - rect.top - annotation.offsetY,
      };
      setDraggingAnnotationId(annotationId);
    },
    [chartAnnotations]
  );

  useEffect(() => {
    if (!draggingAnnotationId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffsetRef.current.x;
      const newY = e.clientY - rect.top - dragOffsetRef.current.y;
      onUpdateAnnotation(draggingAnnotationId, {
        offsetX: Math.max(0, Math.min(newX, rect.width - 80)),
        offsetY: Math.max(0, Math.min(newY, rect.height - 40)),
      });
    };

    const handleMouseUp = () => {
      setDraggingAnnotationId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingAnnotationId, onUpdateAnnotation]);

  const getChartTypeLabel = (type: ChartType): string => {
    const labels: Record<ChartType, string> = {
      histogram: '分数分布直方图',
      line: '成绩趋势折线图',
      bar: '平均分对比柱状图',
      radar: '多科能力雷达图',
      scatter: '成绩散点分布图',
    };
    return labels[type];
  };

  const renderChart = () => {
    const commonProps = {
      width: '100%',
      height: '100%',
    };

    if (chartData.length === 0) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
            fontSize: 14,
          }}
        >
          暂无数据
        </div>
      );
    }

    switch (config.type) {
      case 'histogram':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A52" />
              <XAxis dataKey="range" stroke="#A0A0B8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#A0A0B8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2A2A40',
                  border: '1px solid #3A3A52',
                  borderRadius: 8,
                  color: '#E0E0E0',
                }}
              />
              <Bar
                dataKey="count"
                name="人数"
                onDoubleClick={(dp, _, e) => handleDoubleClick('histogram', dp, e)}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={getGradientColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A52" />
              <XAxis dataKey="date" stroke="#A0A0B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#A0A0B8" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2A2A40',
                  border: '1px solid #3A3A52',
                  borderRadius: 8,
                  color: '#E0E0E0',
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name="平均分"
                stroke="#7C3AED"
                strokeWidth={3}
                dot={{ fill: '#A78BFA', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: '#F472B6' }}
                onDoubleClick={(dp, _, e) => handleDoubleClick('line', dp, e)}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A52" />
              <XAxis dataKey="subject" stroke="#A0A0B8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#A0A0B8" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2A2A40',
                  border: '1px solid #3A3A52',
                  borderRadius: 8,
                  color: '#E0E0E0',
                }}
              />
              <Legend wrapperStyle={{ color: '#A0A0B8', fontSize: 12 }} />
              <Bar
                dataKey="average"
                name="平均分"
                onDoubleClick={(dp, _, e) => handleDoubleClick('bar', dp, e)}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={getGradientColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer {...commonProps}>
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#3A3A52" />
              <PolarAngleAxis dataKey="subject" stroke="#A0A0B8" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                stroke="#A0A0B8"
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="平均分"
                dataKey="score"
                stroke="#7C3AED"
                fill="#8B5CF6"
                fillOpacity={0.5}
                onDoubleClick={(dp, _, e) => handleDoubleClick('radar', dp, e)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2A2A40',
                  border: '1px solid #3A3A52',
                  borderRadius: 8,
                  color: '#E0E0E0',
                }}
              />
              <Legend wrapperStyle={{ color: '#A0A0B8', fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A52" />
              <XAxis
                type="number"
                dataKey="studentIndex"
                name="学生序号"
                stroke="#A0A0B8"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="score"
                name="分数"
                domain={[0, 100]}
                stroke="#A0A0B8"
                tick={{ fontSize: 12 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#2A2A40',
                  border: '1px solid #3A3A52',
                  borderRadius: 8,
                  color: '#E0E0E0',
                }}
              />
              <Scatter
                name="成绩"
                data={chartData}
                onDoubleClick={(dp, _, e) => handleDoubleClick('scatter', dp, e)}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={getGradientColor(i % GRADIENT_COLORS.length)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={cardRef}
      className={`chart-card ${isDragging ? 'dragging' : ''}`}
      style={{ width: '100%', height: '100%' }}
    >
      <div className="card-header">
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#E0E0E0',
          }}
        >
          {config.title || getChartTypeLabel(config.type)}
        </span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#EF4444';
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7280';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="card-body">
        {renderChart()}
        {chartAnnotations.map((a) => (
          <div
            key={a.id}
            className="annotation-bubble"
            style={{
              left: a.offsetX,
              top: a.offsetY,
              cursor: draggingAnnotationId === a.id ? 'grabbing' : 'grab',
              transform: draggingAnnotationId === a.id ? 'scale(1.02)' : 'none',
              zIndex: draggingAnnotationId === a.id ? 200 : 100,
            }}
            onMouseDown={(e) => startAnnotationDrag(e, a.id)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ flex: 1 }}>{a.content}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(a.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '0 2px',
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="resize-handle" />

      {modal && (
        <div
          className="modal-overlay"
          onClick={() => setModal(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#E0E0E0',
                marginBottom: 16,
              }}
            >
              添加注释
            </h3>
            <input
              className="input-styled"
              type="text"
              placeholder="请输入注释内容..."
              value={annotationInput}
              onChange={(e) => setAnnotationInput(e.target.value)}
              autoFocus
            />
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 20,
              }}
            >
              <button className="btn-secondary" onClick={() => setModal(null)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmAnnotation}
                disabled={!annotationInput.trim()}
                style={{
                  opacity: annotationInput.trim() ? 1 : 0.5,
                  cursor: annotationInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartCard;
