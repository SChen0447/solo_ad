import { useState, useEffect, useCallback } from 'react';
import Login from '@components/Auth/Login';
import Canvas from '@components/MindMap/Canvas';
import NodeEditor from '@components/MindMap/NodeEditor';
import Toolbar from '@components/MindMap/Toolbar';
import UserList from '@components/MindMap/UserList';
import socketService from '@services/socket';
import { createRoom, joinRoom } from '@services/api';
import {
  MindMapData,
  MindMapNode,
  UserCursor,
  OperationNotification,
} from '@typeDefs/index';
import {
  addNode,
  deleteNode,
  updateNode,
  moveNode,
  createInitialMindMap,
  layoutMindMap,
} from '@utils/mindmap';
import './styles/App.css';

interface AppState {
  isLoggedIn: boolean;
  token: string;
  user: { id: string; nickname: string; avatar: string } | null;
  roomId: string;
  roomName: string;
  mindMapData: MindMapData | null;
  selectedNodeId: string | null;
  cursors: UserCursor[];
  notifications: OperationNotification[];
  users: any[];
}

const App = () => {
  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    token: '',
    user: null,
    roomId: '',
    roomName: '',
    mindMapData: null,
    selectedNodeId: null,
    cursors: [],
    notifications: [],
    users: [],
  });

  const [showEditor, setShowEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!state.isLoggedIn || !state.roomId) return;

    const socket = socketService.connect(state.token, state.roomId);

    socket.on('connect', () => {
      console.log('Connected to socket');
    });

    socket.on('mindmap_update', (data: MindMapData) => {
      setState((prev) => ({ ...prev, mindMapData: layoutMindMap(data) }));
    });

    socket.on('cursors_update', (cursors: UserCursor[]) => {
      setState((prev) => ({ ...prev, cursors }));
    });

    socket.on('operation', (notification: OperationNotification) => {
      setState((prev) => ({
        ...prev,
        notifications: [...prev.notifications, notification],
      }));

      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter(
            (n) => n.id !== notification.id
          ),
        }));
      }, 3000);
    });

    socket.on('user_joined', (user: any) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.some(u => u.id === user.id) ? prev.users : [...prev.users, user],
      }));
    });

    socket.on('user_left', (userId: string) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
      }));
    });

    return () => {
      socketService.disconnect();
    };
  }, [state.isLoggedIn, state.roomId, state.token]);

  const handleCreateRoom = useCallback(
    async (nickname: string, roomName: string) => {
      setIsLoading(true);
      try {
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname }),
        });
        const loginData = await loginRes.json();

        const roomRes = await createRoom(loginData.token, roomName);
        const initialData = createInitialMindMap(roomName);

        setState((prev) => ({
          ...prev,
          isLoggedIn: true,
          token: loginData.token,
          user: loginData.user,
          roomId: roomRes.roomId,
          roomName: roomRes.roomName,
          mindMapData: initialData,
        }));
      } catch (error) {
        console.error('Create room failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleJoinRoom = useCallback(
    async (nickname: string, roomId: string) => {
      setIsLoading(true);
      try {
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname }),
        });
        const loginData = await loginRes.json();

        const roomRes = await joinRoom(loginData.token, roomId);

        setState((prev) => ({
          ...prev,
          isLoggedIn: true,
          token: loginData.token,
          user: loginData.user,
          roomId: roomRes.roomId,
          roomName: roomRes.roomName,
        }));
      } catch (error) {
        console.error('Join room failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleAddNode = useCallback(
    (parentId: string) => {
      if (!state.mindMapData) return;
      const result = addNode(state.mindMapData, parentId);
      setState((prev) => ({ ...prev, mindMapData: result.data }));
      socketService.sendMindMapUpdate(result.data, 'add', result.newNodeId);
    },
    [state.mindMapData]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!state.mindMapData) return;
      const newData = deleteNode(state.mindMapData, nodeId);
      setState((prev) => ({
        ...prev,
        mindMapData: newData,
        selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
      }));
      socketService.sendMindMapUpdate(newData, 'delete', nodeId);
    },
    [state.mindMapData]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<MindMapNode>) => {
      if (!state.mindMapData) return;
      const newData = updateNode(state.mindMapData, nodeId, updates);
      setState((prev) => ({ ...prev, mindMapData: newData }));
      socketService.sendMindMapUpdate(newData, 'edit', nodeId);
    },
    [state.mindMapData]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, newParentId: string) => {
      if (!state.mindMapData) return;
      const newData = moveNode(state.mindMapData, nodeId, newParentId);
      setState((prev) => ({ ...prev, mindMapData: newData }));
      socketService.sendMindMapUpdate(newData, 'move', nodeId);
    },
    [state.mindMapData]
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setState((prev) => ({ ...prev, selectedNodeId: nodeId }));
    if (nodeId) {
      setShowEditor(true);
    }
  }, []);

  const handleCursorMove = useCallback((x: number, y: number) => {
    socketService.sendCursorPosition(x, y);
  }, []);

  if (!state.isLoggedIn || !state.roomId) {
    return (
      <Login
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="app-container">
      <Toolbar
        roomId={state.roomId}
        roomName={state.roomName}
        mindMapData={state.mindMapData}
        user={state.user}
      />
      <div className="main-content">
        <UserList users={state.users} currentUserId={state.user?.id || ''} />
        <div className="canvas-wrapper">
          {state.mindMapData && (
            <Canvas
              data={state.mindMapData}
              selectedNodeId={state.selectedNodeId}
              cursors={state.cursors}
              notifications={state.notifications}
              onSelectNode={handleSelectNode}
              onAddNode={handleAddNode}
              onDeleteNode={handleDeleteNode}
              onMoveNode={handleMoveNode}
              onCursorMove={handleCursorMove}
            />
          )}
        </div>
      </div>
      {showEditor && state.selectedNodeId && state.mindMapData && (
        <NodeEditor
          node={state.mindMapData.nodes[state.selectedNodeId]}
          onUpdate={(updates) =>
            handleUpdateNode(state.selectedNodeId!, updates)
          }
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
};

export default App;
