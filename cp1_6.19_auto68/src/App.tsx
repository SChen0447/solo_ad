import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useStoryStore } from './store/storyStore';

const HomePage = lazy(() => import('./pages/HomePage'));
const CreateStory = lazy(() => import('./pages/CreateStory'));
const StoryDetail = lazy(() => import('./pages/StoryDetail'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#E0E0E0' }}>
      <div className="pulse-loader" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const nickname = useStoryStore((s) => s.userNickname);
  const setNickname = useStoryStore((s) => s.setNickname);
  const [showNickModal, setShowNickModal] = React.useState(false);
  const [nickInput, setNickInput] = React.useState('');

  React.useEffect(() => {
    if (!nickname) {
      setShowNickModal(true);
    }
  }, [nickname]);

  const handleNickSubmit = () => {
    const trimmed = nickInput.trim();
    if (isValidNickname(trimmed)) {
      setNickname(trimmed);
      setShowNickModal(false);
    }
  };

  function isValidNickname(name: string): boolean {
    if (name.length < 2 || name.length > 16) return false;
    const cn = name.match(/[\u4e00-\u9fa5]/g);
    const cnCount = cn ? cn.length : 0;
    if (cnCount > 0) {
      return cnCount >= 2 && cnCount <= 8 && name.replace(/[\u4e00-\u9fa5]/g, '').length === 0;
    }
    return /^[a-zA-Z0-9_]{4,16}$/.test(name);
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="logo-link">
            <span className="logo-icon">📖</span>
            <span className="logo-text">微小说共创</span>
          </Link>
        </div>
        <div className="navbar-right">
          {nickname ? (
            <div className="user-avatar" title={nickname}>
              {nickname.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button className="btn-login" onClick={() => setShowNickModal(true)}>登录</button>
          )}
        </div>
      </nav>

      <main className="main-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateStory />} />
            <Route path="/story/:code" element={<StoryDetail />} />
          </Routes>
        </Suspense>
      </main>

      {showNickModal && (
        <div className="modal-overlay" onClick={() => { if (nickname) setShowNickModal(false); }}>
          <div className="modal-content nickname-modal" onClick={(e) => e.stopPropagation()}>
            <h3>设置你的昵称</h3>
            <p className="modal-hint">2-8个中文字符 或 4-16个英文/数字字符</p>
            <input
              className="nick-input"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNickSubmit()}
              placeholder="输入昵称..."
              autoFocus
            />
            <button className="btn-primary btn-confirm-nick" onClick={handleNickSubmit} disabled={!isValidNickname(nickInput.trim())}>
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
