import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { WebSocketManager } from './WebSocketManager';
import { ServerMessage, Room, Line, User } from './types';
import Stage from './components/Stage';
import SceneControls from './components/SceneControls';

function App() {
  const setRoom = useAppStore((s) => s.setRoom);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setWs = useAppStore((s) => s.setWs);
  const setDisplayedScenePrompt = useAppStore((s) => s.setDisplayedScenePrompt);
  const addLine = useAppStore((s) => s.addLine);
  const setCurrentTurn = useAppStore((s) => s.setCurrentTurn);
  const setPhase = useAppStore((s) => s.setPhase);
  const updateCountdown = useAppStore((s) => s.updateCountdown);
  const room = useAppStore((s) => s.room);
  const ws = useAppStore((s) => s.ws);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:4000/ws`;
    const manager = new WebSocketManager(wsUrl);

    const unsub = manager.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case 'room_state': {
          const roomData = msg.payload as Room;
          setRoom(roomData);
          break;
        }
        case 'user_joined': {
          const user = msg.payload.user as User;
          const roomId = msg.payload.roomId as string;
          const currentRoom = useAppStore.getState().room;
          if (currentRoom && currentRoom.id === roomId) {
            const exists = currentRoom.users.find((u) => u.id === user.id);
            if (!exists) {
              setRoom({
                ...currentRoom,
                users: [...currentRoom.users, user],
              });
            }
          }
          break;
        }
        case 'user_left': {
          const leftUserId = msg.payload.userId as string;
          const leftRoomId = msg.payload.roomId as string;
          const curRoom = useAppStore.getState().room;
          if (curRoom && curRoom.id === leftRoomId) {
            setRoom({
              ...curRoom,
              users: curRoom.users.filter((u) => u.id !== leftUserId),
            });
          }
          break;
        }
        case 'new_turn': {
          const { userId, round, turnIndex, countdown } = msg.payload as {
            userId: string;
            round: number;
            turnIndex: number;
            countdown: number;
          };
          setCurrentTurn(userId, round, turnIndex);
          updateCountdown(countdown);
          break;
        }
        case 'line_added': {
          const line = msg.payload as Line;
          addLine(line);
          break;
        }
        case 'countdown_tick': {
          const tickValue = msg.payload.value as number;
          updateCountdown(tickValue);
          break;
        }
        case 'game_finished': {
          setPhase('finished');
          break;
        }
        case 'error': {
          console.error('Server error:', msg.payload.message);
          break;
        }
      }
    });

    manager.connect();
    setWs(manager);

    return () => {
      unsub();
      manager.disconnect();
    };
  }, []);

  useEffect(() => {
    if (room && room.scenePrompt && !useAppStore.getState().displayedScenePrompt) {
      setDisplayedScenePrompt(room.scenePrompt);
    }
  }, [room?.scenePrompt]);

  const handleCreateRoom = (nickname: string, emoji: string, avatarColor: string) => {
    if (!ws) return;
    const userId = crypto.randomUUID();
    setCurrentUser({
      id: userId,
      nickname,
      emoji,
      avatarColor,
      isHost: true,
      isOnline: true,
    });
    ws.send({
      type: 'create_room',
      payload: { userId, nickname, emoji, avatarColor },
    });
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Stage />
      <SceneControls />
    </div>
  );
}

export default App;
