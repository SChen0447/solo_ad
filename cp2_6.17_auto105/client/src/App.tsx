import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import TagManager from './components/TagManager';
import StarChart from './components/StarChart';
import InspirationDetail from './components/InspirationDetail';

const App: React.FC = () => {
  return (
    <div className="app">
      <Navigation />
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tags" element={<TagManager />} />
          <Route path="/star-chart" element={<StarChart />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <InspirationDetail />
    </div>
  );
};

export default App;
