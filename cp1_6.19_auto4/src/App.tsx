import { useState } from 'react';
import { DocumentEditor } from './editor/DocumentEditor';
import { CommentPanel } from './comments/CommentPanel';
import { useDocumentStore } from './state/documentStore';
import { useWebSocket } from './hooks/useWebSocket';
import { exportToPDF } from './export/pdfExport';
import './App.css';

function App() {
  const { content, comments, isSidebarCollapsed, toggleSidebar } = useDocumentStore();
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const { currentUser, setCurrentUser } = useDocumentStore();

  useWebSocket();

  const handleJoin = () => {
    if (username.trim()) {
      setCurrentUser(username.trim());
      setIsJoined(true);
    }
  };

  const handleExportPDF = () => {
    exportToPDF(content, comments, 'RFP 需求建议书');
  };

  if (!isJoined) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>RFP 协作撰写平台</h1>
          <p>多人实时协作，高效完成文档评审</p>
          <input
            type="text"
            placeholder="请输入您的姓名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="username-input"
            autoFocus
          />
          <button className="join-btn" onClick={handleJoin} disabled={!username.trim()}>
            加入协作
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button
          className={`sidebar-toggle ${isSidebarCollapsed ? 'collapsed' : ''}`}
          onClick={toggleSidebar}
          aria-label="切换侧边栏"
        >
          ◀
        </button>
        <div className="header-title">
          <h1>项目需求建议书 (RFP)</h1>
        </div>
        <div className="header-actions">
          <span className="user-badge">{currentUser}</span>
          <button className="export-btn" onClick={handleExportPDF}>
            导出 PDF
          </button>
        </div>
      </header>

      <main className="main-content">
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {!isSidebarCollapsed && <CommentPanel />}
        </aside>

        <section className="editor-section">
          <DocumentEditor />
        </section>
      </main>
    </div>
  );
}

export default App;
