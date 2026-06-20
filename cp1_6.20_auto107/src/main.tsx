import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

const userId = localStorage.getItem('user_id') || Math.random().toString(36).substring(2, 15);
localStorage.setItem('user_id', userId);

const userName = localStorage.getItem('user_name') || `用户${Math.floor(Math.random() * 10000)}`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App userId={userId} userName={userName} />
    </BrowserRouter>
  </React.StrictMode>
);
