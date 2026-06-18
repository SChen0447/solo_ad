import React, { useMemo, useState, useEffect } from 'react';
import { useQuizStore } from './store';
import { Question, QuestionType, AnswerRecord } from './types';

const AnalyticsDashboard: React.FC = () => {
  const { questions, currentResult, setViewMode, answers } = useQuizStore();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const result = useMemo(() => {
    if (currentResult) return currentResult;
    
    if (answers.length > 0 && answers.length === questions.length) {
      const correctCount = answers.filter(a => a.isCorrect).length;
      const totalScore = Math.round((correctCount / questions.length) * 100);
      const totalTime = answers.reduce((sum, a) => sum + a.timeSpent, 0);
      return {
        id: 'local',
        studentName: '当前答题',
        answers,
        totalScore,
        totalTime,
        createdAt: new Date().toISOString()
      };
    }
    return null;
  }, [currentResult, answers, questions]);

  const typeStats = useMemo(() => {
    const stats: Record<QuestionType, { total: number; correct: number }> = {
      choice: { total: 0, correct: 0 },
      fill: { total: 0, correct: 0 },
      sort: { total: 0, correct: 0 }
    };

    const questionMap = new Map<string, Question>();
    questions.forEach(q => questionMap.set(q.id, q));

    result?.answers.forEach(answer => {
      const question = questionMap.get(answer.questionId);
      if (question) {
        stats[question.type].total++;
        if (answer.isCorrect) {
          stats[question.type].correct++;
        }
      }
    });

    return stats;
  }, [result, questions]);

  const timePerQuestion = useMemo(() => {
    const questionMap = new Map<string, Question>();
    questions.forEach(q => questionMap.set(q.id, q));

    return (result?.answers || []).map((answer, index) => ({
      questionIndex: index,
      question: questionMap.get(answer.questionId),
      timeSpent: answer.timeSpent,
      isCorrect: answer.isCorrect
    }));
  }, [result, questions]);

  const getColorForPercentage = (percentage: number): string => {
    const r = Math.round(231 + (46 - 231) * (percentage / 100));
    const g = Math.round(76 + (204 - 76) * (percentage / 100));
    const b = Math.round(60 + (113 - 60) * (percentage / 100));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'choice': return '单选题';
      case 'fill': return '填空题';
      case 'sort': return '排序题';
    }
  };

  const getTypeColor = (type: QuestionType): string => {
    switch (type) {
      case 'choice': return '#3498db';
      case 'fill': return '#2ecc71';
      case 'sort': return '#e67e22';
    }
  };

  const maxTime = Math.max(...timePerQuestion.map(t => t.timeSpent), 1);

  if (!result) {
    return (
      <div className="analytics-dashboard">
        <div className="no-result">
          <h2>成绩分析</h2>
          <p>暂无答题记录，请先完成答题。</p>
          <button className="start-quiz-btn" onClick={() => setViewMode('answer')}>
            去答题
          </button>
        </div>
      </div>
    );
  }

  const CircularProgress: React.FC<{ percentage: number; label: string; color: string }> = ({ 
    percentage, 
    label, 
    color 
  }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animated ? percentage : 0) / 100 * circumference;

    return (
      <div className="circular-progress">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle
            className="progress-bg"
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="10"
          />
          <circle
            className="progress-bar"
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="progress-text">
          <span className="progress-percentage" style={{ color }}>
            {Math.round(percentage)}%
          </span>
          <span className="progress-label">{label}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-dashboard">
      <h2>成绩分析报告</h2>
      
      <div className="score-overview">
        <div className="total-score-card">
          <div className="score-label">总分</div>
          <div 
            className="score-value"
            style={{ color: getColorForPercentage(result.totalScore) }}
          >
            {result.totalScore}
            <span className="score-unit">分</span>
          </div>
          <div className="score-detail">
            共 {questions.length} 题，答对 {result.answers.filter(a => a.isCorrect).length} 题
          </div>
          <div className="total-time">
            总用时：{result.totalTime} 秒
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>各题型正确率</h3>
        <div className="type-stats">
          {(['choice', 'fill', 'sort'] as QuestionType[]).map(type => {
            const stat = typeStats[type];
            const percentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
            const color = getColorForPercentage(percentage);
            
            return (
              <div key={type} className="type-stat-card">
                <div 
                  className="type-indicator"
                  style={{ backgroundColor: getTypeColor(type) }}
                />
                <div className="type-stat-content">
                  <h4>{getTypeLabel(type)}</h4>
                  <p className="type-count">
                    {stat.correct} / {stat.total} 题正确
                  </p>
                  <CircularProgress 
                    percentage={percentage} 
                    label="正确率" 
                    color={color}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="stats-section">
        <h3>每道题用时</h3>
        <div className="time-chart">
          <div className="chart-bars">
            {timePerQuestion.map((item, index) => (
              <div key={index} className="bar-wrapper">
                <div 
                  className={`bar ${item.isCorrect ? 'correct-bar' : 'wrong-bar'}`}
                  style={{ 
                    height: animated ? `${(item.timeSpent / maxTime) * 100}%` : '0%',
                    transition: 'height 0.8s ease-out'
                  }}
                >
                  <div className="bar-tooltip">
                    {item.timeSpent} 秒
                  </div>
                </div>
                <div className="bar-label">第{index + 1}题</div>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-color correct-legend" />
              答对
            </span>
            <span className="legend-item">
              <span className="legend-color wrong-legend" />
              答错
            </span>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-btn secondary" onClick={() => setViewMode('editor')}>
          返回编辑器
        </button>
        <button className="action-btn primary" onClick={() => setViewMode('answer')}>
          再答一次
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
