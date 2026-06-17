import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0b0e2a;
    font-family: "Noto Serif SC", "Cinzel", serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #root { width: 100%; height: 100%; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.15);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
  ::selection {
    background: rgba(140, 200, 255, 0.3);
    color: #fff;
  }
  input, button { font-family: inherit; }
`;
document.head.appendChild(style);
