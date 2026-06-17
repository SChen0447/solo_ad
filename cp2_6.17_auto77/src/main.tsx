import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ItemDetailPage from './pages/ItemDetailPage';
import MyFavoritesPage from './pages/MyFavoritesPage';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/favorites" element={<MyFavoritesPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
