import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const playerId = localStorage.getItem('playerId') || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem('playerId', playerId);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
