import { useEffect } from 'react';
import { MembersBar } from './MembersBar';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { ThumbnailNav } from './ThumbnailNav';
import { useCanvasStore } from './store';
import { wsManager } from './websocket';
import type { User, DrawElement, StickyNoteElement, ImageElement } from './types';

export function App() {
  const {
    setCurrentUser,
    addUser,
    removeUser,
    setUsers,
    setElements,
    addOrUpdateStroke,
    addSticky,
    updateSticky,
    addImage,
    setIsConnected,
    loadCanvas,
  } = useCanvasStore();

  useEffect(() => {
    const unsubInit = wsManager.on('init', (data: { user: User; users: User[]; elements: any[] }) => {
      setCurrentUser(data.user);
      setUsers(data.users);
      if (data.elements && data.elements.length > 0) {
        setElements(data.elements);
      } else {
        loadCanvas();
      }
      setIsConnected(true);
    });

    const unsubJoined = wsManager.on('user_joined', (user: User) => {
      addUser(user);
    });

    const unsubLeft = wsManager.on('user_left', (userId: string) => {
      removeUser(userId);
    });

    const unsubStroke = wsManager.on('draw_stroke', (stroke: DrawElement) => {
      addOrUpdateStroke(stroke);
    });

    const unsubAddSticky = wsManager.on('add_sticky', (sticky: StickyNoteElement) => {
      addSticky(sticky);
    });

    const unsubUpdateSticky = wsManager.on('update_sticky', (sticky: StickyNoteElement) => {
      updateSticky(sticky);
    });

    const unsubAddImage = wsManager.on('add_image', (img: ImageElement) => {
      addImage(img);
    });

    const unsubSynced = wsManager.on('canvas_synced', (data: { elements: any[] }) => {
      setElements(data.elements);
    });

    wsManager.connect();

    return () => {
      unsubInit();
      unsubJoined();
      unsubLeft();
      unsubStroke();
      unsubAddSticky();
      unsubUpdateSticky();
      unsubAddImage();
      unsubSynced();
      wsManager.disconnect();
    };
  }, [setCurrentUser, addUser, removeUser, setUsers, setElements, addOrUpdateStroke, addSticky, updateSticky, addImage, setIsConnected, loadCanvas]);

  return (
    <div className="app">
      <MembersBar />
      <div className="main-content">
        <Toolbar />
        <Canvas />
      </div>
      <ThumbnailNav />
    </div>
  );
}
