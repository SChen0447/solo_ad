import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import WorkDetailPage from './pages/WorkDetailPage';
import OrdersPage from './pages/OrdersPage';
import { ToastProvider } from './components/Toast';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/works/:id" element={<WorkDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </div>
    </ToastProvider>
  );
};

export default App;
