import { useState, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { BookOpen, FilePlus, ClipboardList, BarChart3 } from 'lucide-react';
import QuestionBankPage from './pages/QuestionBankPage';
import CreatePaperPage from './pages/CreatePaperPage';
import ExamPage from './pages/ExamPage';
import ReportPage from './pages/ReportPage';
import type { Question, ExamResult } from './data/questionBank';

interface AppContextType {
  examQuestions: Question[];
  setExamQuestions: (q: Question[]) => void;
  examResult: ExamResult | null;
  setExamResult: (r: ExamResult | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

const navItems = [
  { path: '/question-bank', label: '题库管理', icon: BookOpen },
  { path: '/create-paper', label: '自动组卷', icon: FilePlus },
  { path: '/exam', label: '在线考试', icon: ClipboardList },
  { path: '/report', label: '成绩报告', icon: BarChart3 },
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">📚 考试管理系统</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function AppLayout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/question-bank" replace />} />
          <Route path="/question-bank" element={<QuestionBankPage />} />
          <Route path="/create-paper" element={<CreatePaperPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/question-bank" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  const contextValue: AppContextType = {
    examQuestions,
    setExamQuestions: useCallback((q) => setExamQuestions(q), []),
    examResult,
    setExamResult: useCallback((r) => setExamResult(r), []),
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AppContext.Provider>
  );
}
