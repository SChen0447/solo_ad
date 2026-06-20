import React, { useState, useEffect } from 'react';
import FeedbackForm from './components/FeedbackForm';
import FeedbackList from './components/FeedbackList';
import TrendChart from './components/TrendChart';
import { initSocket } from './utils/socket';
import type { Feedback } from './utils/api';

const App: React.FC = () => {
  const [emotionFilter, setEmotionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    initSocket();
  }, []);

  const handleSubmitSuccess = (_feedback: Feedback) => {
  };

  const filterOptions = [
    { value: 'all', label: '全部' },
    { value: 'positive', label: '积极' },
    { value: 'neutral', label: '中性' },
    { value: 'negative', label: '消极' },
  ];

  const sortOptions = [
    { value: 'latest', label: '最新' },
    { value: 'hottest', label: '最热' },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">💬</span>
          实时反馈与情感趋势分析平台
        </h1>
        <p className="app-subtitle">收集真实反馈，洞察情感变化</p>
      </header>

      <main className="app-main">
        <div className="main-layout">
          <div className="left-section">
            <FeedbackForm onSubmitSuccess={handleSubmitSuccess} />
            <div className="filter-section">
              <div className="filter-group">
                <label className="filter-label">情感筛选</label>
                <div className="filter-buttons">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`filter-btn ${emotionFilter === option.value ? 'active' : ''}`}
                      onClick={() => setEmotionFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">排序方式</label>
                <div className="filter-buttons">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`filter-btn sort-btn ${sortBy === option.value ? 'active' : ''}`}
                      onClick={() => setSortBy(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="right-section">
            <div className="chart-section">
              <TrendChart />
            </div>
            <div className="list-section">
              <FeedbackList
                emotionFilter={emotionFilter}
                sortBy={sortBy}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2024 实时反馈与情感趋势分析平台 | 数据实时更新</p>
      </footer>
    </div>
  );
};

export default App;
