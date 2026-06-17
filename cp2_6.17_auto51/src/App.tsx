import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import ConfigPanel from './components/ConfigPanel';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
  const { state } = useAppContext();

  return (
    <div className="app-container">
      {state.isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      <ConfigPanel />
      <Dashboard />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
