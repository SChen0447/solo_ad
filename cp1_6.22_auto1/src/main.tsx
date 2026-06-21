import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDatabase } from './utils/database';
import './styles/global.css';

async function bootstrap() {
  try {
    await initDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
