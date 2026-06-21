import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { PetDetailPage } from './pages/PetDetailPage';
import './App.css';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pets/:id" element={<PetDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
};
