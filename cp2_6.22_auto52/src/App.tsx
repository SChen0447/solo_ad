import React, { useState, useEffect } from 'react';
import type { Branch, Page } from './types';
import Login from './login';
import Rooms from './rooms';
import Orders from './orders';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('login');
  const [branch, setBranch] = useState<Branch>('seaview');
  const [username, setUsername] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (savedToken && savedUsername) {
      setUsername(savedUsername);
      setPage('rooms');
    }
  }, []);

  const handleAuthSuccess = (user: string) => {
    setUsername(user);
    setPage('rooms');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUsername(null);
    setPage('login');
  };

  const handleEnterOrder = (roomId: string) => {
    setSelectedRoomId(roomId);
    setPage('order');
  };

  const handleBackToRooms = () => {
    setPage('rooms');
  };

  if (page === 'login' || !username) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  if (page === 'order' && selectedRoomId) {
    return (
      <Orders
        roomId={selectedRoomId}
        branch={branch}
        onBack={handleBackToRooms}
        username={username}
      />
    );
  }

  return (
    <Rooms
      branch={branch}
      onBranchChange={setBranch}
      onEnterOrder={handleEnterOrder}
      onLogout={handleLogout}
      username={username}
    />
  );
};

export default App;
