import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Judge from './pages/Judge';
import Score from './pages/Score';
import Rankings from './pages/Rankings';
import WorkDetail from './pages/WorkDetail';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/judge" element={<Judge />} />
            <Route path="/score/:id" element={<Score />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/work/:id" element={<WorkDetail />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
