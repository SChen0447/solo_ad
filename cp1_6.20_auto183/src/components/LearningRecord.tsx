import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './LearningRecord.css';

interface TrainingRecord {
  id: string;
  date: string;
  sceneId: string;
  sceneName: string;
  totalTurns: number;
  passedTurns: number;
  avgResponseTime: number;
  grammarErrorCount: number;
  score: number;
}

const STORAGE_KEY = 'linguaflow_records';
const ITEMS_PER_PAGE = 10;

const getScoreColor = (score: number): string => {
  const ratio = score / 100;
  const r = Math.round(255 * (1 - ratio) + 81 * ratio);
  const g = Math.round(107 * (1 - ratio) + 207 * ratio);
  const b = Math.round(107 * (1 - ratio) + 102 * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const LearningRecord: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecords(parsed);
      }
    } catch (e) {
      console.error('加载记录失败:', e);
    }
  };

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const recentRecords = records.slice(0, 15).reverse();
    if (recentRecords.length === 0) {
      ctx.fillStyle = '#c0c4cc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据，开始练习后将显示成绩趋势', width / 2, height / 2);
      return;
    }

    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      ctx.fillStyle = '#909399';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 20}%`, padding.left - 10, y + 4);
    }

    const points = recentRecords.map((record, index) => {
      const x = padding.left + (chartWidth / (recentRecords.length - 1 || 1)) * index;
      const y = padding.top + chartHeight - (chartHeight * record.score) / 100;
      return { x, y, score: record.score };
    });

    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, '#51cf66');
      gradient.addColorStop(1, '#ff6b6b');

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      areaGradient.addColorStop(0, 'rgba(81, 207, 102, 0.2)');
      areaGradient.addColorStop(1, 'rgba(255, 107, 107, 0.05)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      ctx.lineTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = areaGradient;
      ctx.fill();
    }

    points.forEach((point, index) => {
      const color = getScoreColor(point.score);
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (index % 3 === 0 || index === points.length - 1) {
        const date = recentRecords[index].date.slice(5);
        ctx.fillStyle = '#909399';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(date, point.x, padding.top + chartHeight + 20);
      }
    });

    ctx.fillStyle = '#606266';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('最近15次训练成绩', width / 2, 14);
  }, [records]);

  useEffect(() => {
    drawChart();
    
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const currentRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const formatDate = (dateStr: string): string => {
    return dateStr;
  };

  const getScoreBadge = (score: number) => {
    const color = getScoreColor(score);
    return (
      <span className="score-badge" style={{ backgroundColor: color + '20', color: color }}>
        {score}分
      </span>
    );
  };

  const totalStats = {
    totalSessions: records.length,
    avgScore: records.length > 0 
      ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length) 
      : 0,
    totalPassed: records.reduce((sum, r) => sum + r.passedTurns, 0),
    totalErrors: records.reduce((sum, r) => sum + r.grammarErrorCount, 0),
  };

  return (
    <div className="learning-record-page">
      <header className="page-header">
        <motion.button
          className="back-button"
          onClick={handleGoBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
        >
          ← 返回首页
        </motion.button>
        <h1 className="page-title">📊 学习记录</h1>
        <div className="header-spacer" />
      </header>

      <main className="record-main">
        <div className="stats-cards">
          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <span className="stat-number">{totalStats.totalSessions}</span>
              <span className="stat-label">总训练次数</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <span className="stat-number">{totalStats.avgScore}%</span>
              <span className="stat-label">平均通过率</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-number">{totalStats.totalPassed}</span>
              <span className="stat-label">通过轮数</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <span className="stat-number">{totalStats.totalErrors}</span>
              <span className="stat-label">语法错误</span>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="card-title">成绩趋势</h3>
          <div className="chart-container">
            <canvas ref={canvasRef} className="trend-chart" />
          </div>
        </motion.div>

        <motion.div 
          className="table-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="card-title">详细记录</h3>
          
          {records.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>暂无训练记录</p>
              <p className="empty-hint">开始练习后，你的成绩会记录在这里</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>场景</th>
                      <th>总轮次</th>
                      <th>通过轮次</th>
                      <th>评分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((record, index) => (
                      <tr key={record.id} className="table-row">
                        <td>{formatDate(record.date)}</td>
                        <td>{record.sceneName}</td>
                        <td>{record.totalTurns}</td>
                        <td>{record.passedTurns}</td>
                        <td>{getScoreBadge(record.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </button>
                  
                  <span className="page-info">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  
                  <button
                    className="page-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default LearningRecord;
