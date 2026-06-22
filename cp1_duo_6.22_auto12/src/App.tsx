import React, { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import ProposalPage from './pages/ProposalPage';

type Route = { page: 'home' } | { page: 'proposal'; id: string };

const getRouteFromHash = (): Route => {
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('/proposal/')) {
    const id = hash.replace('/proposal/', '');
    return { page: 'proposal', id };
  }
  return { page: 'home' };
};

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    window.scrollTo(0, 0);
  };

  const goHome = () => navigate('/');
  const goToProposal = (id: string) => navigate(`/proposal/${id}`);
  const handleCreateNew = () => {
    alert('新建提案功能开发中...');
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar">
        <div className="navbar-logo" onClick={goHome}>
          <div className="navbar-logo-icon">📋</div>
          <span>提案管家</span>
        </div>
        <div className="navbar-actions">
          {route.page === 'home' && (
            <button className="btn-pill btn-pill-outline" onClick={handleCreateNew}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建
            </button>
          )}
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {route.page === 'home' && (
          <HomePage
            onSelectProposal={goToProposal}
            onCreateNew={handleCreateNew}
          />
        )}
        {route.page === 'proposal' && (
          <ProposalPage
            proposalId={route.id}
            onBack={goHome}
          />
        )}
      </main>
    </div>
  );
};

export default App;
