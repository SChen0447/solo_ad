import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import GiftsPage from './pages/GiftsPage';
import ExchangePage from './pages/ExchangePage';
import DetailPage from './pages/DetailPage';
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gifts" element={<GiftsPage />} />
            <Route path="/exchange" element={<ExchangePage />} />
            <Route path="/gift/:id" element={<DetailPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
