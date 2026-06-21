import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BookProvider } from './BookContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BookProvider>
      <App />
    </BookProvider>
  </React.StrictMode>
);
