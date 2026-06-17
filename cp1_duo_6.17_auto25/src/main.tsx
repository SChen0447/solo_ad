import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { GraphProvider } from './context/GraphContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GraphProvider>
        <App />
      </GraphProvider>
    </BrowserRouter>
  </React.StrictMode>
);
