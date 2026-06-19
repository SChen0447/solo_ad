import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Book, Note, MonthlyStats, GenreStats, BookGenre } from '@/types';
import {
  calculateMonthlyStats,
  calculateGenreStats,
  getCompletedBooksCount,
  getTotalPagesRead,
  getTotalNotesCount,
  getQuoteNotes,
} from '@/utils/statsCalculator';

const GENRE_COLORS: Record<BookGenre, string> = {
  小说: '#8D6E63',
  非虚构: '#A1887F',
  传记: '#BCAAA4',
  科幻: '#FF8A65',
  历史: '#6D4C41',
  哲学: '#5D4037',
  诗歌: '#FFAB91',
  其他: '#D7CCC8',
};

interface StatsPanelProps {
  books: Book[];
  notes: Note[];
  onGenreFilter: (genre: BookGenre) => void;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: JSX.Element }> = ({
  label,
  value,
  icon,
}) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ books, notes, onGenreFilter }) => {
  const monthlyData: MonthlyStats[] = useMemo(
    () => calculateMonthlyStats(books, notes),
    [books, notes],
  );
  const genreData: GenreStats[] = useMemo(
    () => calculateGenreStats(books),
    [books],
  );
  const [selectedGenre, setSelectedGenre] = useState<BookGenre | null>(null);

  const completedCount = getCompletedBooksCount(books);
  const totalPages = getTotalPagesRead(books);
  const noteCount = getTotalNotesCount(notes);
  const quoteNotes = getQuoteNotes(notes);

  const handlePieClick = (data: { name: BookGenre }) => {
    setSelectedGenre((prev) => (prev === data.name ? null : data.name));
  };

  const handleJumpToShelf = () => {
    if (selectedGenre) {
      onGenreFilter(selectedGenre);
    }
  };

  return (
    <div className="stats-panel page-fade-in">
      <div className="stats-header">
        <h1 className="page-title">
          <svg className="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3v18h18" />
            <path d="M7 16V9M12 16V5M17 16v-6" />
          </svg>
          阅读统计
        </h1>
        <p className="page-subtitle">洞察你的阅读习惯</p>
      </div>

      <div className="stats-cards-grid">
        <StatCard
          label="已完成书籍"
          value={`${completedCount} / ${books.length}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          }
        />
        <StatCard
          label="累计阅读页数"
          value={totalPages.toLocaleString()}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          }
        />
        <StatCard
          label="笔记总数"
          value={noteCount}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          }
        />
        <StatCard
          label="摘抄精句"
          value={quoteNotes.length}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
          }
        />
      </div>

      <div className="chart-container chart-animate">
        <div className="chart-header">
          <h2 className="chart-title">月度阅读量</h2>
          <p className="chart-subtitle">近12个月阅读页数趋势</p>
        </div>
        <div className="chart-wrapper line-chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FF8A65" />
                  <stop offset="100%" stopColor="#8D6E63" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#8D6E63"
                tick={{ fontSize: 12, fill: '#8D6E63' }}
                tickFormatter={(val: string) => val.slice(5)}
                axisLine={{ stroke: '#D7CCC8' }}
              />
              <YAxis
                stroke="#8D6E63"
                tick={{ fontSize: 12, fill: '#8D6E63' }}
                axisLine={{ stroke: '#D7CCC8' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFF8E1',
                  border: '1px solid #D7CCC8',
                  borderRadius: '8px',
                  color: '#4E342E',
                  fontFamily: 'Noto Sans SC',
                }}
                formatter={(value: number) => [`${value} 页`, '阅读页数']}
                labelFormatter={(label) => `${label}`}
              />
              <Line
                type="monotone"
                dataKey="pages"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={{ r: 5, fill: '#FF8A65', stroke: '#FFF8E1', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#4E342E' }}
                animationDuration={2000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container chart-animate" style={{ animationDelay: '150ms' }}>
        <div className="chart-header">
          <h2 className="chart-title">书籍类型分布</h2>
          <p className="chart-subtitle">点击色块查看该类型书籍</p>
        </div>
        <div className="chart-wrapper pie-chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={genreData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                onClick={handlePieClick}
                animationDuration={1500}
                animationEasing="ease-out"
                label={({ name, percent }) =>
                  selectedGenre && selectedGenre !== name
                    ? ''
                    : `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: '#8D6E63' }}
              >
                {genreData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={GENRE_COLORS[entry.name]}
                    opacity={!selectedGenre || selectedGenre === entry.name ? 1 : 0.3}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFF8E1',
                  border: '1px solid #D7CCC8',
                  borderRadius: '8px',
                  color: '#4E342E',
                }}
                formatter={(value: number) => [`${value} 本`, '数量']}
              />
              {selectedGenre && (
                <text x="50%" y="45%" textAnchor="middle" className="pie-center-label" fill="#4E342E">
                  <tspan x="50%" dy="-8" fontSize="14" fill="#8D6E63">
                    当前选中
                  </tspan>
                  <tspan x="50%" dy="28" fontSize="20" fontWeight="700" fontFamily="Noto Serif SC">
                    {selectedGenre}
                  </tspan>
                </text>
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        {selectedGenre && (
          <div className="genre-filter-cta">
            <button className="btn-primary" onClick={handleJumpToShelf}>
              查看「{selectedGenre}」的全部书籍
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;
