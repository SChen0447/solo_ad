import React from 'react';
import { DataProvider } from './context/DataContext';
import Dashboard from './Dashboard';

const App: React.FC = () => {
  return (
    <DataProvider>
      <Dashboard />
    </DataProvider>
  );
};

export default App;
