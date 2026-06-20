import React, { useState, Suspense, lazy } from 'react';
import PlantForm from './components/PlantForm';

const Feed = lazy(() => import('./components/Feed'));

type Page = 'feed' | 'submit';

const LeafLogo: React.FC = () => (
  <svg className="leaf-logo" viewBox="0 0 40 40" fill="none">
    <path
      d="M20 4 C10 14, 6 24, 12 34 C20 30, 28 30, 28 34 C34 24, 30 14, 20 4 Z"
      fill="#FAF0E6"
    />
    <path
      d="M20 12 L20 34"
      stroke="#3a4a1f"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('feed');

  const goToFeed = () => setCurrentPage('feed');
  const goToSubmit = () => setCurrentPage('submit');

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <LeafLogo />
          <span>植物健康社区</span>
        </div>
        <div className="navbar-nav">
          <button
            className={currentPage === 'feed' ? 'active' : ''}
            onClick={goToFeed}
          >
            社区动态
          </button>
          <button
            className={currentPage === 'submit' ? 'active' : ''}
            onClick={goToSubmit}
          >
            提交病历
          </button>
        </div>
      </nav>

      <main className="main-container">
        {currentPage === 'feed' && (
          <Suspense fallback={<div className="loading-more">加载中...</div>}>
            <Feed />
          </Suspense>
        )}
        {currentPage === 'submit' && <PlantForm onSubmitted={goToFeed} />}
      </main>

      {currentPage === 'feed' && (
        <button className="fab" onClick={goToSubmit} title="提交病历">
          +
        </button>
      )}
    </>
  );
};

export default App;
