import React, { useState, useEffect } from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import LoginPage from './LoginPage';
import Editor from './Editor';
import { User } from './types';
import { v4 as uuidv4 } from 'uuid';

interface RoomInfo {
  roomCode: string;
  user: User;
  initialContent: string;
  initialComments: any[];
  initialUsers: User[];
}

const App: React.FC = () => {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  const handleJoinRoom = async (nickname: string, color: string, roomCode?: string) => {
    const userId = uuidv4();
    const user: User = { id: userId, nickname, color };
    
    const endpoint = roomCode ? '/api/rooms/join' : '/api/rooms/create';
    const body = roomCode 
      ? { nickname, color, roomCode } 
      : { nickname, color };
    
    try {
      const response = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '加入房间失败');
      }
      
      const data = await response.json();
      setRoomInfo({
        roomCode: data.roomCode,
        user,
        initialContent: data.content,
        initialComments: data.comments,
        initialUsers: data.users
      });
    } catch (error) {
      throw error;
    }
  };

  const handleLeaveRoom = () => {
    setRoomInfo(null);
  };

  return (
    <WebSocketProvider>
      {!roomInfo ? (
        <LoginPage onJoin={handleJoinRoom} />
      ) : (
        <Editor
          roomCode={roomInfo.roomCode}
          user={roomInfo.user}
          initialContent={roomInfo.initialContent}
          initialComments={roomInfo.initialComments}
          initialUsers={roomInfo.initialUsers}
          onLeave={handleLeaveRoom}
        />
      )}
    </WebSocketProvider>
  );
};

export default App;
