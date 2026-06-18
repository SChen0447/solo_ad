import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentQuiz from './pages/StudentQuiz';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentQuiz />} />
        <Route path="/" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
