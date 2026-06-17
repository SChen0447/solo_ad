import React from 'react';
import ReactDOM from 'react-dom/client';
import LiveDashboard from './pages/LiveDashboard';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiveDashboard />
  </React.StrictMode>
);
