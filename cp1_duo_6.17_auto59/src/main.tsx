import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

declare global {
  interface Window {
    __mountReactApp: () => void;
    __APP_STARTED__: boolean;
    __reactRoot: ReactDOM.Root | null;
  }
}

function mountApp() {
  if (window.__reactRoot) {
    return;
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element #root not found');
    return;
  }

  window.__APP_STARTED__ = true;

  const root = ReactDOM.createRoot(rootElement);
  window.__reactRoot = root;

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );

  console.log('[CSS Conflict Analyzer] React application mounted successfully');
}

window.__mountReactApp = mountApp;

if (window.__APP_STARTED__) {
  mountApp();
}
