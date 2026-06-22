import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';

const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const PlanBuilderPage = lazy(() => import('./pages/PlanBuilderPage'));

const App: React.FC = () => {
  return (
    <Router>
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>💪</span>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                FitPlan
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <NavLink
                to="/"
                end
                style={({ isActive }) => ({
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                  background: isActive
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'transparent',
                  color: isActive ? '#3b82f6' : '#94a3b8',
                  border: isActive
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : '1px solid transparent',
                })}
              >
                📚 动作库
              </NavLink>
              <NavLink
                to="/builder"
                style={({ isActive }) => ({
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                  background: isActive
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'transparent',
                  color: isActive ? '#10b981' : '#94a3b8',
                  border: isActive
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid transparent',
                })}
              >
                🛠️ 计划构建
              </NavLink>
            </div>
          </div>
        </nav>

        <main>
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60vh',
                  color: '#94a3b8',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid rgba(59, 130, 246, 0.2)',
                      borderTopColor: '#3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px',
                    }}
                  />
                  <p>加载中...</p>
                </div>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<LibraryPage />} />
              <Route path="/builder" element={<PlanBuilderPage />} />
            </Routes>
          </Suspense>
        </main>

        <footer
          style={{
            textAlign: 'center',
            padding: '24px',
            color: '#64748b',
            fontSize: '13px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '40px',
          }}
        >
          <p>💪 坚持训练，成就更好的自己</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
