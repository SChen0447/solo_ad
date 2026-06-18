import React, { useEffect } from 'react';
import { useQuizStore } from './store';
import QuizEditor from './QuizEditor';
import AnswerPanel from './AnswerPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import { ViewMode } from './types';

const App: React.FC = () => {
  const { viewMode, setViewMode, setQuestions, questions } = useQuizStore();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.log('无法连接到服务端，使用空题库');
    }
  };

  const navItems: { mode: ViewMode; label: string; icon: string }[] = [
    { mode: 'editor', label: '题目编辑', icon: '✏️' },
    { mode: 'answer', label: '开始答题', icon: '📝' },
    { mode: 'analytics', label: '成绩分析', icon: '📊' }
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">Quiz Creator</span>
        </div>
        
        <nav className="nav-menu">
          {navItems.map(item => (
            <button
              key={item.mode}
              className={`nav-item ${viewMode === item.mode ? 'active' : ''}`}
              onClick={() => setViewMode(item.mode)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="stat-item">
            <span className="stat-value">{questions.length}</span>
            <span className="stat-label">题目总数</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {viewMode === 'editor' && <QuizEditor />}
        {viewMode === 'answer' && <AnswerPanel />}
        {viewMode === 'analytics' && <AnalyticsDashboard />}
      </main>
    </div>
  );
};

export default App;
