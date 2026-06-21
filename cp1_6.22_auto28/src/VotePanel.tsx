import React, { useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { StickyNote as StickyNoteType } from './types';
import './VotePanel.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VotePanelProps {
  stickies: StickyNoteType[];
  votedStickyIds: Set<string>;
  onVoteSticky: (id: string) => void;
  boardId: string;
  isMobile?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const VotePanel: React.FC<VotePanelProps> = ({
  stickies,
  votedStickyIds,
  onVoteSticky,
  boardId,
  isMobile = false,
  isExpanded = true,
  onToggleExpand,
}) => {
  const [showReport, setShowReport] = useState(false);
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const sortedStickies = [...stickies].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.content.localeCompare(b.content);
  });

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handleExportPNG = () => {
    const chart = chartRef.current;
    if (!chart) return;

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `brainstorm-report-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = url;
    link.click();
  };

  const chartData = {
    labels: sortedStickies.map((s, i) => `#${i + 1}`),
    datasets: [
      {
        label: '得票数',
        data: sortedStickies.map(s => s.votes),
        backgroundColor: sortedStickies.map(s => s.color),
        borderColor: sortedStickies.map(s => s.color),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '点子得票分布',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#333',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const index = context.dataIndex;
            const sticky = sortedStickies[index];
            return [
              truncateText(sticky.content, 30),
              `票数: ${sticky.votes}`
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        grid: {
          color: '#f0f0f0',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <>
      <div className={`vote-panel ${isMobile ? 'mobile' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {isMobile && (
          <div className="panel-drag-handle" onClick={onToggleExpand}>
            <div className="drag-indicator" />
          </div>
        )}
        
        <div className="panel-header">
          <h2 className="panel-title">点子排序</h2>
          <span className="sticky-count">{stickies.length} 个点子</span>
        </div>

        <div className="sticky-list">
          {sortedStickies.length === 0 ? (
            <div className="empty-state">
              <p>还没有点子</p>
              <p className="empty-hint">双击白板创建第一个便签吧！</p>
            </div>
          ) : (
            sortedStickies.map((sticky, index) => (
              <div
                key={sticky.id}
                className={`sticky-item ${votedStickyIds.has(sticky.id) ? 'voted' : ''}`}
                onClick={() => onVoteSticky(sticky.id)}
              >
                <div className="rank-badge">{index + 1}</div>
                <div
                  className="color-tag"
                  style={{ backgroundColor: sticky.color }}
                />
                <div className="sticky-info">
                  <p className="sticky-summary">
                    {truncateText(sticky.content || '空白便签')}
                  </p>
                </div>
                <div className="vote-info">
                  <span className={`thumb-small ${votedStickyIds.has(sticky.id) ? 'voted' : ''}`}>
                    👍
                  </span>
                  <span className="vote-number">{sticky.votes}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="panel-footer">
          <button
            className="generate-report-btn"
            onClick={handleGenerateReport}
            disabled={stickies.length === 0}
          >
            生成报告
          </button>
        </div>
      </div>

      {showReport && (
        <div className="report-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>投票报告</h3>
              <button className="close-btn" onClick={() => setShowReport(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="report-stats">
                <div className="stat-item">
                  <span className="stat-number">{stickies.length}</span>
                  <span className="stat-label">总点子数</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {stickies.reduce((sum, s) => sum + s.votes, 0)}
                  </span>
                  <span className="stat-label">总投票数</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {sortedStickies[0]?.votes || 0}
                  </span>
                  <span className="stat-label">最高票数</span>
                </div>
              </div>

              <div className="chart-container">
                <Bar ref={chartRef} data={chartData} options={chartOptions} />
              </div>

              <div className="ranking-list">
                <h4>排行榜</h4>
                {sortedStickies.slice(0, 5).map((sticky, index) => (
                  <div key={sticky.id} className="ranking-item">
                    <span className={`ranking-rank rank-${index + 1}`}>{index + 1}</span>
                    <div
                      className="ranking-color"
                      style={{ backgroundColor: sticky.color }}
                    />
                    <span className="ranking-text">
                      {truncateText(sticky.content || '空白便签', 30)}
                    </span>
                    <span className="ranking-votes">{sticky.votes} 票</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="export-btn" onClick={handleExportPNG}>
                导出为 PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VotePanel;
