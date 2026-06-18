import React from 'react';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';

const App: React.FC = () => {
  return (
    <div className="app">
      <Dashboard />
      <UploadModal />
    </div>
  );
};

export default App;
