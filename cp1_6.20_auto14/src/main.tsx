import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { GlobalStyles } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalStyles />
    <App />
  </React.StrictMode>
);
