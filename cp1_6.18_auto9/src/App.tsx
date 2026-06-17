import { useState } from 'react';
import { ExamPage } from './ExamPage';
import { WrongAnswerSidebar } from './WrongAnswerSidebar';

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <button
          className="navbar-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="打开菜单"
        >
          ☰
        </button>
        <span className="navbar-title">📝 技术练习平台</span>
        <div className="navbar-spacer" />
        <button
          className="navbar-sidebar-btn"
          onClick={() => setSidebarOpen(true)}
        >
          📚 错题本
        </button>
      </nav>

      <div className="app-layout">
        <main className="main-content">
          <ExamPage />
        </main>
      </div>

      <WrongAnswerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}
