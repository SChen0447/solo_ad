import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import QuizPage from './components/QuizPage';
import ResultsPage from './components/ResultsPage';
import AdminDashboard from './components/AdminDashboard';
import './styles/global.css';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('quiz');

  return (
    <Router>
      <div className="app">
        <nav className="app-nav">
          <div className="nav-container">
            <div className="nav-brand">自适应知识测验</div>
            <div className="nav-links">
              <Link to="/" className="nav-link" onClick={() => setCurrentPage('quiz')}>
                开始测验
              </Link>
              <Link to="/results" className="nav-link" onClick={() => setCurrentPage('results')}>
                错题复盘
              </Link>
              <Link to="/admin" className="nav-link" onClick={() => setCurrentPage('admin')}>
                管理员看板
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<QuizPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
