import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import Navbar from './components/Navbar';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import Profile from './pages/Profile';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const { courses, fetchCourses, fetchEnrollments } = useStore();
  
  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
  }, [fetchCourses, fetchEnrollments]);
  
  return (
    <div className="app-container">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<CourseList courses={courses} />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<CourseList courses={courses} />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <AnimatedRoutes />
      </div>
    </Router>
  );
};

export default App;
