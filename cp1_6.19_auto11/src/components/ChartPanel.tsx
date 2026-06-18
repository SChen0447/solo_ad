import React, { useRef, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { useChartData, ChartConfig } from '../hooks/useChartData';
import { useDashboardStore } from '../store/dashboardStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartPanelProps {
  config: ChartConfig;
  isFullscreen?: boolean;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ config, isFullscreen = false }) => {
  const { data, removeChart, updateChart, setFullscreenChartId } = useDashboardStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { chartData, options } = useChartData(data, config);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeChart(config.id);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFullscreenChartId(config.id);
  };

  const handleCloseFullscreen = () => {
    setFullscreenChartId(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFullscreen) {
      setFullscreenChartId(config.id);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateChart(config.id, { title: e.target.value });
  };

  const ChartComponent = useMemo(() => {
    switch (config.type) {
      case 'line':
        return Line;
      case 'bar':
        return Bar;
      case 'pie':
        return Pie;
      default:
        return Line;
    }
  }, [config.type]);

  const content = (
    <div
      className={`chart-panel ${isFullscreen ? 'fullscreen' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className="chart-header">
        <input
          ref={titleInputRef}
          type="text"
          className="chart-title-input"
          value={config.title}
          onChange={handleTitleChange}
          onClick={(e) => e.stopPropagation()}
          placeholder="图表标题"
        />
        <div className="chart-actions">
          {!isFullscreen && (
            <button
              className="action-btn fullscreen-btn"
              onClick={handleFullscreen}
              title="全屏"
            >
              ⛶
            </button>
          )}
          <button
            className="action-btn delete-btn"
            onClick={handleDelete}
            title="删除"
          >
            ×
          </button>
        </div>
      </div>
      <div className="chart-body">
        <ChartComponent data={chartData as any} options={options as any} />
      </div>

      <style>{`
        .chart-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #2a2a3e;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: move;
        }

        .chart-panel:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }

        .chart-panel.fullscreen {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90vw;
          height: 90vh;
          max-width: 1200px;
          max-height: 800px;
          z-index: 2000;
          cursor: default;
        }

        .chart-panel.fullscreen:hover {
          transform: translate(-50%, -50%);
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        .chart-title-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #e0e0e0;
          font-size: 16px;
          font-weight: 600;
          outline: none;
          cursor: text;
          font-family: Inter, sans-serif;
        }

        .chart-title-input::placeholder {
          color: #666;
        }

        .chart-title-input:focus {
          border-bottom: 2px solid #4f46e5;
        }

        .chart-actions {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: #e0e0e0;
          cursor: pointer;
          border-radius: 6px;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .action-btn:active {
          transform: scale(0.9);
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .fullscreen-btn:hover {
          background: rgba(79, 70, 229, 0.3);
          color: #4f46e5;
        }

        .chart-body {
          flex: 1;
          padding: 16px;
          min-height: 0;
          position: relative;
        }
      `}</style>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fullscreen-overlay" onClick={handleCloseFullscreen}>
        {content}
        <style>{`
          .fullscreen-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #00000060;
            z-index: 1999;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    );
  }

  return content;
};

export default ChartPanel;
