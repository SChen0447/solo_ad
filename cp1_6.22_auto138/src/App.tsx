import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { User } from './types';
import BoardList from './pages/BoardList';
import BoardEditor from './pages/BoardEditor';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initUser = async () => {
      let savedUser = localStorage.getItem('whiteboard-user');
      
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
      } else {
        try {
          const response = await fetch('/api/users', { method: 'POST' });
          const newUser = await response.json() as User;
          localStorage.setItem('whiteboard-user', JSON.stringify(newUser));
          setUser(newUser);
        } catch (error) {
          console.error('Failed to create user:', error);
        }
      }
      setIsLoading(false);
    };

    initUser();
  }, []);

  const updateUserName = async (newName: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        const updatedUser = await response.json() as User;
        localStorage.setItem('whiteboard-user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user name:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <BoardList 
              user={user!} 
              onUpdateName={updateUserName}
              navigate={navigate}
            />
          } 
        />
        <Route 
          path="/board/:id" 
          element={
            <BoardEditor 
              user={user!} 
              onUpdateName={updateUserName}
              navigate={navigate}
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
