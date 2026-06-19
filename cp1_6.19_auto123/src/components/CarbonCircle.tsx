import { useMemo, useRef, useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { CommuteRecord, TransportType } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_COLORS } from '../mockApi';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CarbonCircleProps {
  records: CommuteRecord[];
  target?: number;
}

const MONTHLY_TARGET = 200000;

export default function CarbonCircle({ records, target = MONTHLY_TARGET }: CarbonCircleProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRef = useRef<ChartJS<'doughnut'>>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const { monthlyTotal, breakdown } = useMemo(() => {
    const monthRecords = records.filter((r) => {
      const date = new Date(r.timestamp);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const total = monthRecords.reduce((sum, r) => sum + r.emission, 0);

    const breakdown: Record<TransportType, number> = {
      walk: 0,
      bicycle: 0,
      electric: 0,
      bus: 0,
      metro: 0,
      car: 0,
      carpool: 0,
    };

    monthRecords.forEach((r) => {
      breakdown[r.transport] += r.emission;
    });

    return { monthlyTotal: total, breakdown };
  }, [records, currentMonth, currentYear]);

  const chartData = useMemo(() => {
    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    Object.entries(breakdown).forEach(([type, value]) => {
      if (value > 0) {
        labels.push(TRANSPORT_LABELS[type as TransportType]);
        data.push(value);
        colors.push(TRANSPORT_COLORS[type as TransportType]);
      }
    });

    if (data.length === 0) {
      labels.push('暂无数据');
      data.push(1);
      colors.push('#E0E0E0');
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10,
          spacing: 2,
        },
      ],
    };
  }, [breakdown]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    animation: {
      duration: 800,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const kg = (value / 1000).toFixed(2);
            const percentage = monthlyTotal > 0
              ? ((value / monthlyTotal) * 100).toFixed(1)
              : '0';
            return `${context.label}: ${kg} kg (${percentage}%)`;
          },
        },
      },
    },
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setActiveIndex(activeIndex === index ? null : index);
      }
    },
  }), [monthlyTotal, activeIndex]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const meta = chart.getDatasetMeta(0);
    if (!meta.data) return;

    meta.data.forEach((slice, index) => {
      if (activeIndex !== null && index === activeIndex) {
        slice.outerRadius = chart.chartArea.width / 2 + 15;
      } else {
        slice.outerRadius = chart.chartArea.width / 2 - 5;
      }
    });
    chart.update('none');
  }, [activeIndex]);

  const totalKg = (monthlyTotal / 1000).toFixed(1);
  const targetKg = (target / 1000).toFixed(0);
  const isOverTarget = monthlyTotal > target;
  const isOnTrack = monthlyTotal <= target;
  const percentage = Math.min((monthlyTotal / target) * 100, 100).toFixed(0);

  const circleClass = isOverTarget
    ? 'pulse-danger'
    : isOnTrack && monthlyTotal > 0
    ? 'breath-success'
    : '';

  return (
    <div className="card">
      <h2 className="card-title">🌍 本月碳排放</h2>

      <div className={`circle-container ${circleClass}`}>
        <Doughnut data={chartData} options={options} ref={chartRef} />
        <div className="circle-center">
          <div className="total-label">总排放</div>
          <div className="total-value" style={{
            color: isOverTarget ? 'var(--danger)' : isOnTrack ? 'var(--success)' : undefined,
          }}>
            {totalKg}
          </div>
          <div className="total-unit">kg CO₂</div>
          <div className="target">
            目标 {targetKg} kg · {percentage}%
          </div>
        </div>
      </div>

      <div className="legend">
        {Object.entries(breakdown).map(([type, value]) => {
          if (value <= 0) return null;
          const transportType = type as TransportType;
          return (
            <div
              key={type}
              className="legend-item"
              style={{
                fontWeight: activeIndex !== null &&
                  chartData.labels.indexOf(TRANSPORT_LABELS[transportType]) === activeIndex
                    ? '600'
                    : 'normal',
              }}
            >
              <span
                className="legend-color"
                style={{ backgroundColor: TRANSPORT_COLORS[transportType] }}
              />
              {TRANSPORT_LABELS[transportType]} {activeIndex !== null &&
                chartData.labels.indexOf(TRANSPORT_LABELS[transportType]) === activeIndex &&
                `(${(value / 1000).toFixed(2)} kg)`}
            </div>
          );
        })}
      </div>

      {isOverTarget && (
        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(239, 83, 80, 0.1)',
          borderRadius: '8px',
          color: 'var(--danger)',
          fontSize: '14px',
        }}>
          ⚠️ 已超过月度目标，建议选择更低碳的出行方式
        </div>
      )}

      {!isOverTarget && monthlyTotal > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(102, 187, 106, 0.1)',
          borderRadius: '8px',
          color: 'var(--success)',
          fontSize: '14px',
        }}>
          🎉 保持得不错！继续低碳出行
        </div>
      )}
    </div>
  );
}
