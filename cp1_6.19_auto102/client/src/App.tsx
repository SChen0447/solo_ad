import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import RecipeEditor from './pages/RecipeEditor';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main style={{ paddingTop: 'var(--nav-height)' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/recipe/:id" element={<RecipeDetail />} />
                <Route path="/editor" element={<RecipeEditor />} />
                <Route path="/editor/:id" element={<RecipeEditor />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;
