import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TopicPublic, RankedProposal } from '../types';

interface StatisticsChartProps {
  topic: TopicPublic | null;
  rankings: RankedProposal[];
}

const COLORS = [
  '#8F9E87',
  '#B8A88A',
  '#A8B5C0',
  '#D4A853',
  '#C07676',
  '#9E8FB2',
  '#7FB3A3',
  '#D4B896',
];

const truncate = (text: string, maxLen: number) => {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
};

export default function StatisticsChart({ topic, rankings }: StatisticsChartProps) {
  const totalVotes = useMemo(() => {
    if (!topic) return 0;
    return topic.proposals.reduce((sum, p) => sum + p.votes, 0);
  }, [topic]);

  const barData = useMemo(() => {
    if (!topic || rankings.length === 0) return [];
    return rankings.slice(0, 8).map((p) => ({
      name: truncate(p.content, 12),
      fullName: p.content,
      votes: p.votes,
      rank: p.rank,
      percentage: totalVotes > 0 ? Math.round((p.votes / totalVotes) * 100) : 0,
    }));
  }, [topic, rankings, totalVotes]);

  const pieData = useMemo(() => {
    if (!topic || rankings.length === 0) return [];
    return rankings.slice(0, 8).map((p) => ({
      name: truncate(p.content, 10),
      fullName: p.content,
      value: p.votes,
      rank: p.rank,
    }));
  }, [topic, rankings]);

  if (!topic) {
    return (
      <div className="statistics-chart-empty flex flex-col items-center justify-center h-full min-h-[300px]
                    bg-[#FDFBF7] rounded-2xl border border-dashed border-[#D4C9B8]">
        <div className="text-5xl mb-3">📊</div>
        <p className="text-[#8B7E6A]">选择话题后查看统计图表</p>
      </div>
    );
  }

  if (rankings.length === 0 || totalVotes === 0) {
    return (
      <div className="statistics-chart">
        <h3 className="text-lg font-bold text-[#3D352A] mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span> 投票统计
        </h3>
        <div className="bg-[#FDFBF7] rounded-2xl p-8 border border-dashed border-[#D4C9B8] text-center">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-[#8B7E6A]">暂无投票数据</p>
          {topic.status === 'active' && (
            <p className="text-sm text-[#B8A88A] mt-1">等待用户投票后将显示统计图表</p>
          )}
        </div>
      </div>
    );
  }

  const isEnded = topic.status === 'ended' || Date.now() >= topic.deadline;

  return (
    <div className="statistics-chart animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#3D352A] flex items-center gap-2">
          <span className="text-xl">📊</span> 投票统计
          {isEnded && (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#C07676]/10 text-[#C07676]">
              最终结果
            </span>
          )}
        </h3>
        <div className="text-sm text-[#8B7E6A]">
          共 <span className="font-bold text-[#8F9E87]">{totalVotes}</span> 票
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE7DB]">
          <h4 className="font-semibold text-[#5C5040] mb-4 flex items-center gap-2">
            <span>📊</span> 得票数对比（柱状图）
          </h4>
          <div className="h-64 sm:h-80 w-full chart-container animate-chartIn">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE7DB" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#8B7E6A', fontSize: 11 }}
                  axisLine={{ stroke: '#D4C9B8' }}
                  tickLine={{ stroke: '#D4C9B8' }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={90}
                  tick={{ fill: '#5C5040', fontSize: 11 }}
                  axisLine={{ stroke: '#D4C9B8' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FDFBF7',
                    border: '1px solid #D4C9B8',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(92, 80, 64, 0.1)',
                  }}
                  labelStyle={{ color: '#3D352A', fontWeight: 600 }}
                  formatter={(value: number, _name: string, props: { payload: { fullName: string; percentage: number; rank: number } }) => [
                    <div key="tooltip" className="text-sm">
                      <div style={{ color: '#5C5040' }}>{props.payload.fullName}</div>
                      <div style={{ color: '#8F9E87', fontWeight: 600, marginTop: 4 }}>
                        {value} 票 ({props.payload.percentage}%)
                      </div>
                      <div style={{ color: '#B8A88A', marginTop: 2 }}>排名 #{props.payload.rank}</div>
                    </div>,
                    '得票详情',
                  ]}
                />
                <Bar
                  dataKey="votes"
                  radius={[0, 8, 8, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {barData.map((_entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE7DB]">
          <h4 className="font-semibold text-[#5C5040] mb-4 flex items-center gap-2">
            <span>🥧</span> 得票占比（饼图）
          </h4>
          <div className="h-64 sm:h-80 w-full chart-container animate-chartIn" style={{ animationDelay: '200ms' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  innerRadius={35}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={1200}
                  animationEasing="ease-out"
                  style={{ fontSize: 11, fill: '#5C5040' }}
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FDFBF7',
                    border: '1px solid #D4C9B8',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(92, 80, 64, 0.1)',
                  }}
                  formatter={(value: number, _name: string, props: { payload: { fullName: string; rank: number } }) => [
                    <div key="pie-tooltip" className="text-sm">
                      <div style={{ color: '#5C5040' }}>{props.payload.fullName}</div>
                      <div style={{ color: '#8F9E87', fontWeight: 600, marginTop: 4 }}>
                        {value} 票 ({totalVotes > 0 ? Math.round((value / totalVotes) * 100) : 0}%)
                      </div>
                      <div style={{ color: '#B8A88A', marginTop: 2 }}>排名 #{props.payload.rank}</div>
                    </div>,
                    '得票详情',
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 11, color: '#6B5E4E' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-[#8F9E87] to-[#7A8972] rounded-xl p-4 text-white shadow-md animate-popIn">
          <p className="text-xs opacity-80 mb-1">总投票数</p>
          <p className="text-2xl font-bold">{totalVotes}</p>
        </div>
        <div className="bg-gradient-to-br from-[#B8A88A] to-[#A6977A] rounded-xl p-4 text-white shadow-md animate-popIn" style={{ animationDelay: '100ms' }}>
          <p className="text-xs opacity-80 mb-1">提案数量</p>
          <p className="text-2xl font-bold">{topic.proposals.length}</p>
        </div>
        <div className="bg-gradient-to-br from-[#A8B5C0] to-[#97A4AE] rounded-xl p-4 text-white shadow-md animate-popIn" style={{ animationDelay: '200ms' }}>
          <p className="text-xs opacity-80 mb-1">最高票数</p>
          <p className="text-2xl font-bold">{rankings[0]?.votes || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-[#D4A853] to-[#C39748] rounded-xl p-4 text-white shadow-md animate-popIn" style={{ animationDelay: '300ms' }}>
          <p className="text-xs opacity-80 mb-1">参与人数</p>
          <p className="text-2xl font-bold">{topic.totalVoters}</p>
        </div>
      </div>
    </div>
  );
}
