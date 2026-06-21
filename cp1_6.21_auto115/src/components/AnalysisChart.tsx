import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { BrewRecord } from '../types';
import { COFFEE_COLORS, ROAST_LABELS, FLAVOR_TAG_LABELS } from '../types';

interface AnalysisChartProps {
  records: BrewRecord[];
}

const getCoffeeColor = (name: string): string => {
  return COFFEE_COLORS[name] || COFFEE_COLORS.default;
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const record = payload[0].payload.record as BrewRecord;

  return (
    <div
      style={{
        background: 'rgba(30, 20, 10, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        padding: '16px',
        color: '#fff',
        minWidth: '220px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
        #{record.recordNumber} {record.coffeeName}
      </div>
      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '12px' }}>
        {ROAST_LABELS[record.roastLevel]} ·{' '}
        {format(new Date(record.createdAt), 'MM月dd日 HH:mm', { locale: zhCN })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          fontSize: '12px',
          marginBottom: '12px',
        }}
      >
        <div>研磨度: {record.grindSize}</div>
        <div>水温: {record.waterTemp}°C</div>
        <div>粉水比: 1:{record.ratio}</div>
        <div>注水: {record.totalTime}s</div>
      </div>
      {record.flavorEval && (
        <>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.2)',
              paddingTop: '10px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                marginBottom: '8px',
              }}
            >
              <span>酸度: {record.flavorEval.acidity}</span>
              <span>甜度: {record.flavorEval.sweetness}</span>
              <span>苦度: {record.flavorEval.bitterness}</span>
              <span>醇厚: {record.flavorEval.body}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {record.flavorEval.flavorTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                  }}
                >
                  {FLAVOR_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#D4A574' }}>
            综合评分: {record.flavorEval.overallScore.toFixed(1)}
          </div>
        </>
      )}
    </div>
  );
};

const AnalysisChart: React.FC<AnalysisChartProps> = ({ records }) => {
  const [hiddenCoffees, setHiddenCoffees] = useState<Set<string>>(new Set());

  const coffeeNames = useMemo(() => {
    const names = new Set<string>();
    records.forEach((r) => names.add(r.coffeeName));
    return Array.from(names);
  }, [records]);

  const chartData = useMemo(() => {
    return [...records]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .filter((r) => !hiddenCoffees.has(r.coffeeName))
      .map((record) => ({
        date: format(new Date(record.createdAt), 'MM/dd', { locale: zhCN }),
        fullDate: record.createdAt,
        score: record.flavorEval?.overallScore || null,
        coffeeName: record.coffeeName,
        color: getCoffeeColor(record.coffeeName),
        record,
      }));
  }, [records, hiddenCoffees]);

  const toggleCoffee = (name: string) => {
    setHiddenCoffees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '16px',
        }}
      >
        {coffeeNames.map((name) => (
          <div
            key={name}
            onClick={() => toggleCoffee(name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              opacity: hiddenCoffees.has(name) ? 0.4 : 1,
              transition: 'opacity 200ms ease',
              fontSize: '13px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getCoffeeColor(name),
              }}
            />
            <span style={{ color: '#5D4037' }}>{name}</span>
          </div>
        ))}
      </div>
    );
  };

  if (records.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          color: '#8B5E3C',
          fontSize: '16px',
        }}
      >
        暂无记录，快去创建第一杯咖啡吧！
      </div>
    );
  }

  const evaluatedRecords = records.filter((r) => r.flavorEval);
  if (evaluatedRecords.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          color: '#8B5E3C',
          fontSize: '16px',
        }}
      >
        请先对咖啡进行风味评价，即可查看分析图表
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#FAFAF7',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(139, 94, 60, 0.1)',
      }}
    >
      <div
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#5D4037',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        冲泡参数与评分趋势
      </div>
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
            <XAxis
              dataKey="date"
              stroke="#8B5E3C"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#D4A574' }}
            />
            <YAxis
              domain={[0, 5]}
              stroke="#8B5E3C"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#D4A574' }}
              label={{
                value: '综合评分',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#8B5E3C', fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#D4A574', strokeWidth: 1 }} />
            <Legend content={renderLegend} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#D4A574"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill={payload.color}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{
                      cursor: 'pointer',
                      transition: 'r 200ms ease',
                    }}
                  />
                );
              }}
              activeDot={{ r: 10, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalysisChart;
