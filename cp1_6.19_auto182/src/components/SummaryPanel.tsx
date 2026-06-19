import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import type { WeeklySummary } from '../types';

interface SummaryPanelProps {
  weeklySummary: WeeklySummary | null;
  selectedDate: string;
}

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-orange-100">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-orange-600">
          {payload[0].value} kcal
        </p>
      </div>
    );
  }
  return null;
}

function SummaryPanel({ weeklySummary, selectedDate }: SummaryPanelProps) {
  const chartData = useMemo(() => {
    if (!weeklySummary) return [];
    
    return weeklySummary.dailyCalories.map((item, index) => ({
      ...item,
      weekday: WEEKDAY_LABELS[index],
      dateLabel: `${new Date(item.date).getMonth() + 1}/${new Date(item.date).getDate()}`,
    }));
  }, [weeklySummary]);

  const getWeekRange = () => {
    if (!weeklySummary || weeklySummary.dailyCalories.length === 0) return '';
    const start = weeklySummary.dailyCalories[0].date;
    const end = weeklySummary.dailyCalories[weeklySummary.dailyCalories.length - 1].date;
    return `${new Date(start).getMonth() + 1}月${new Date(start).getDate()}日 - ${new Date(end).getMonth() + 1}月${new Date(end).getDate()}日`;
  };

  const totalCalories = useMemo(() => {
    if (!weeklySummary) return 0;
    return weeklySummary.dailyCalories.reduce((sum, d) => sum + d.calories, 0);
  }, [weeklySummary]);

  const avgCalories = useMemo(() => {
    if (!weeklySummary || weeklySummary.dailyCalories.length === 0) return 0;
    return Math.round(totalCalories / weeklySummary.dailyCalories.length);
  }, [weeklySummary, totalCalories]);

  const gradientId = 'colorCalories';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="p-4 border-b border-orange-100 bg-gradient-to-r from-green-50 to-cream-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-serif font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              本周热量趋势
            </h3>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {getWeekRange()}
          </p>
        </div>

        <div className="p-4">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB380" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#FFB380" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#FFE8D6" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#FFE8D6' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FFB380', strokeWidth: 1, strokeDasharray: '5 5' }} />
                <Area
                  type="monotone"
                  dataKey="calories"
                  stroke="#FFA94D"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={{ fill: '#FFA94D', strokeWidth: 2, r: 3, stroke: '#FFF' }}
                  activeDot={{ fill: '#FF922B', strokeWidth: 2, r: 5, stroke: '#FFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-orange-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{totalCalories.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">本周总热量 (kcal)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{avgCalories}</p>
              <p className="text-xs text-gray-500 mt-1">日均热量 (kcal)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-cream-50">
          <h3 className="text-base font-serif font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            健康小建议
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {weeklySummary?.tips.map((tip, index) => (
            <div
              key={tip.id}
              className="tip-item flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-cream-50 to-white border border-orange-100"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                tip.type === 'positive' ? 'bg-green-100' : 'bg-orange-100'
              }`}>
                {tip.type === 'positive' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}
              </div>
              <p className={`text-sm leading-relaxed ${
                tip.type === 'positive' ? 'text-green-700' : 'text-orange-600'
              }`}>
                {tip.content}
              </p>
            </div>
          ))}

          {(!weeklySummary || weeklySummary.tips.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">暂无建议，开始记录饮食吧！</p>
            </div>
          )}
        </div>
      </div>

      {weeklySummary && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">本周平均均衡度</p>
              <p className="text-2xl font-bold text-gray-800">
                {weeklySummary.averageBalance}
                <span className="text-sm text-gray-400 ml-1">分</span>
              </p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#FFE8D6"
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={weeklySummary.averageBalance >= 70 ? '#51CF66' : weeklySummary.averageBalance >= 50 ? '#FFA94D' : '#FF6B6B'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(weeklySummary.averageBalance / 100) * 176} 176`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${
                  weeklySummary.averageBalance >= 70 ? 'text-green-600' : weeklySummary.averageBalance >= 50 ? 'text-orange-500' : 'text-red-500'
                }`}>
                  {weeklySummary.averageBalance >= 70 ? '优秀' : weeklySummary.averageBalance >= 50 ? '良好' : '需改善'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryPanel;
