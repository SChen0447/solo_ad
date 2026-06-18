import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import {
  fetchMemberDetail,
  type MemberDetail as MemberDetailType,
  type DailyStats,
} from '@/api';

function getBarColor(hours: number): string {
  if (hours > 12) return '#fca5a5';
  if (hours > 8) return '#fcd34d';
  if (hours >= 4) return '#6ee7b7';
  if (hours > 0) return '#93c5fd';
  return '#e5e7eb';
}

function BarChart({ data }: { data: DailyStats[] }) {
  const width = 900;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = 20;
  const gap = (chartWidth - barWidth * data.length) / (data.length - 1);

  const maxHours = Math.max(...data.map((d) => d.hours), 16);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        {[0, 4, 8, 12, 16].map((value, i) => {
          const y = padding.top + chartHeight - (value / maxHours) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                fill="#9ca3af"
                fontSize="11"
                textAnchor="end"
              >
                {value}h
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = padding.left + i * (barWidth + gap);
          const barHeight = (d.hours / maxHours) * chartHeight;
          const y = padding.top + chartHeight - barHeight;
          const color = getBarColor(d.hours);

          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              >
                <title>
                  {formatFullDate(d.date)}: {d.hours}小时
                </title>
              </rect>
              {i % 3 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height - 20}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {formatDate(d.date)}
                </text>
              )}
            </g>
          );
        })}

        <text
          x={padding.left / 2}
          y={height / 2}
          fill="#6b7280"
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90, ${padding.left / 2}, ${height / 2})`}
        >
          工时（小时）
        </text>
        <text
          x={width / 2}
          y={height - 5}
          fill="#6b7280"
          fontSize="11"
          textAnchor="middle"
        >
          日期
        </text>
      </svg>
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<MemberDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      try {
        const data = await fetchMemberDetail(id);
        setDetail(data);
      } catch (error) {
        console.error('加载成员详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12 text-gray-500">未找到该成员信息</div>
    );
  }

  const { member, last30Days, anomalies } = detail;
  const initial = member.name.charAt(0);
  const totalHours = last30Days.reduce((sum, d) => sum + d.hours, 0);
  const avgHours = totalHours / 30;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: member.avatarColor }}
          >
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{member.name}</h1>
            <p className="text-gray-500 mt-1">
              近30天总工时: {totalHours.toFixed(1)}小时 | 日均: {avgHours.toFixed(1)}小时
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          近30天工时分布
        </h2>
        <div className="flex gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#93c5fd' }} />
            <span className="text-sm text-gray-600">&lt;4小时</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6ee7b7' }} />
            <span className="text-sm text-gray-600">4-8小时</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fcd34d' }} />
            <span className="text-sm text-gray-600">8-12小时</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fca5a5' }} />
            <span className="text-sm text-gray-600">&gt;12小时</span>
          </div>
        </div>
        <BarChart data={last30Days} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          异常记录
          {anomalies.length > 0 && (
            <span className="bg-red-100 text-red-600 text-sm px-2 py-0.5 rounded-full">
              {anomalies.length}
            </span>
          )}
        </h2>
        {anomalies.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">暂无异常记录</p>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">
                      {anomaly.date}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {anomaly.reason}
                    </p>
                  </div>
                  <span className="text-red-600 font-semibold">
                    {anomaly.hours}小时
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
