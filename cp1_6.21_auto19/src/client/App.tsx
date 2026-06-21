import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { AuthProvider } from './AuthContext';
import Navbar from './Navbar';
import HomePage from './HomePage';
import RecipeDetail from './RecipeDetail';
import AuthPage from './AuthPage';
import ProfilePage from './ProfilePage';
import CreateRecipePage from './CreateRecipePage';
import './App.css';

function AppContent() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="app">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage socket={socket} />} />
          <Route path="/recipe/:id" element={<RecipeDetail socket={socket} />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/create-recipe" element={<CreateRecipePage />} />
          <Route path="/edit-recipe/:id" element={<CreateRecipePage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="container">
          <p>🍳 美食分享 - 在线食谱分享与烹饪协作平台</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
