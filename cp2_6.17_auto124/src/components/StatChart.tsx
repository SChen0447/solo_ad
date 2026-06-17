import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import type { Question, SurveyResponse } from '../types';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PIE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
];

function getRandomColor(i: number): string {
  return PIE_COLORS[i % PIE_COLORS.length];
}

interface StatChartProps {
  question: Question;
  responses: SurveyResponse[];
}

export default function StatChart({ question, responses }: StatChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const answerCount = responses.filter((r) =>
    r.answers.some((a) => a.questionId === question.id)
  ).length;

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (question.type === 'scale') {
      const counts = [0, 0, 0, 0, 0];
      responses.forEach((r) => {
        const ans = r.answers.find((a) => a.questionId === question.id);
        if (ans && typeof ans.value === 'string') {
          const v = parseInt(ans.value, 10);
          if (v >= 1 && v <= 5) counts[v - 1] += 1;
        }
      });

      const gradient = ctx.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, '#818cf8');
      gradient.addColorStop(1, '#6366f1');

      const data: ChartData<'bar'> = {
        labels: ['1分', '2分', '3分', '4分', '5分'],
        datasets: [
          {
            label: '回答人数',
            data: counts,
            backgroundColor: gradient,
            borderRadius: 4,
          },
        ],
      };

      const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      };

      chartRef.current = new ChartJS(ctx, {
        type: 'bar',
        data,
        options,
      });
    } else {
      const optionCounts: Record<string, number> = {};
      const labels: string[] = [];

      if (question.options) {
        question.options.forEach((opt) => {
          optionCounts[opt.value] = 0;
          labels.push(opt.label);
        });
      }

      responses.forEach((r) => {
        const ans = r.answers.find((a) => a.questionId === question.id);
        if (!ans) return;
        if (Array.isArray(ans.value)) {
          ans.value.forEach((v) => {
            if (v in optionCounts) optionCounts[v] += 1;
          });
        } else if (typeof ans.value === 'string' && ans.value in optionCounts) {
          optionCounts[ans.value] += 1;
        }
      });

      const dataArr = question.options
        ? question.options.map((opt) => optionCounts[opt.value])
        : [];

      const bgColors = question.options
        ? question.options.map((_, i) => getRandomColor(i))
        : [];

      const data: ChartData<'pie'> = {
        labels,
        datasets: [
          {
            data: dataArr,
            backgroundColor: bgColors,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      };

      const options: ChartOptions<'pie'> = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { padding: 12, boxWidth: 14 },
          },
        },
      };

      chartRef.current = new ChartJS(ctx, {
        type: 'pie',
        data,
        options,
      });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [question, responses]);

  const typeLabel =
    question.type === 'single'
      ? '单选题'
      : question.type === 'multiple'
      ? '多选题'
      : '量表题';

  return (
    <div className="stat-card mb-6">
      <div className="mb-3">
        <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-600 mr-2">
          {typeLabel}
        </span>
        <span className="text-base font-medium text-slate-800">
          {question.required && <span className="required-star">*</span>}
          {question.title}
        </span>
      </div>
      <div className="chart-container">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-center text-sm text-slate-500 mt-3">
        共 {answerCount} 人回答
      </p>
    </div>
  );
}
