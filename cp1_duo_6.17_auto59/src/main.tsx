import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const APP_MOUNT_EVENT = 'css-analyzer:mount';

function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element #root not found');
    return;
  }

  if (rootElement.dataset.reactMounted === 'true') {
    return;
  }
  rootElement.dataset.reactMounted = 'true';

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );

  console.log('[CSS Conflict Analyzer] React application mounted successfully');
}

document.addEventListener(APP_MOUNT_EVENT, mountApp, { once: true });

function checkAutoMount() {
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement.dataset.pendingMount === 'true') {
    document.dispatchEvent(new CustomEvent(APP_MOUNT_EVENT));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAutoMount);
} else {
  checkAutoMount();
}
