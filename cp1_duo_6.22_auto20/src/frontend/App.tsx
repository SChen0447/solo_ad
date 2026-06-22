import React, { useState, useEffect, useCallback } from 'react';
import QuizPanel from './components/QuizPanel';
import AnswerSheet from './components/AnswerSheet';
import QuestionBank from './components/QuestionBank';
import HistoryPanel from './components/HistoryPanel';
import { Question, QuizRecord, ScoreResult, PageType, UserRole } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('generate');
  const [userRole, setUserRole] = useState<UserRole>('teacher');
  const [currentQuiz, setCurrentQuiz] = useState<Question[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizRecords, setQuizRecords] = useState<QuizRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<QuizRecord | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('quizforge_records');
    if (saved) {
      try {
        setQuizRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load records:', e);
      }
    }
  }, []);

  const saveRecords = useCallback((records: QuizRecord[]) => {
    localStorage.setItem('quizforge_records', JSON.stringify(records));
    setQuizRecords(records);
  }, []);

  const handleQuizGenerated = (questions: Question[]) => {
    setCurrentQuiz(questions);
  };

  const handleQuizSubmitted = (
    questions: Question[],
    answers: Record<string, string | string[] | null>,
    scoreResult: ScoreResult
  ) => {
    const newRecord: QuizRecord = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      questions,
      answers,
      scoreResult,
      title: `试卷 ${new Date().toLocaleDateString('zh-CN')}`,
    };
    const updated = [newRecord, ...quizRecords].slice(0, 50);
    saveRecords(updated);
  };

  const handleViewRecord = (record: QuizRecord) => {
    setSelectedRecord(record);
    setCurrentQuiz(record.questions);
    setCurrentPage('answer');
  };

  const navItems = [
    { key: 'bank', label: '题库管理', icon: '📚', roles: ['teacher', 'student'] as UserRole[] },
    { key: 'generate', label: '智能组卷', icon: '📝', roles: ['teacher'] as UserRole[] },
    { key: 'answer', label: '答题练习', icon: '✏️', roles: ['student', 'teacher'] as UserRole[] },
    { key: 'history', label: '历史记录', icon: '📊', roles: ['teacher', 'student'] as UserRole[] },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  const renderPage = () => {
    switch (currentPage) {
      case 'bank':
        return <QuestionBank />;
      case 'generate':
        return <QuizPanel onQuizGenerated={handleQuizGenerated} />;
      case 'answer':
        return (
          <AnswerSheet
            questions={currentQuiz}
            onSubmit={handleQuizSubmitted}
            initialAnswers={selectedRecord?.answers}
            initialScoreResult={selectedRecord?.scoreResult}
            readonly={!!selectedRecord}
          />
        );
      case 'history':
        return <HistoryPanel records={quizRecords} onViewRecord={handleViewRecord} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <h1 className="app-title">QuizForge</h1>
        <div className="user-info">
          <span className="user-role">{userRole === 'teacher' ? '👨‍🏫 教师' : '👨‍🎓 学生'}</span>
          <button
            className="role-switch-btn"
            onClick={() => {
              setUserRole(userRole === 'teacher' ? 'student' : 'teacher');
              setSelectedRecord(null);
            }}
          >
            切换身份
          </button>
        </div>
      </header>

      <div className="main-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="nav-menu">
            {filteredNavItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(item.key as PageType);
                  setSelectedRecord(null);
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-content">
          <div className="page-content">{renderPage()}</div>
        </main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default App;
