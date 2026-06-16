import React from 'react';
import MatchPage from './pages/MatchPage';

const App: React.FC = () => {
  return (
    <div className="app" style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <MatchPage />
    </div>
  );
};

export default App;
