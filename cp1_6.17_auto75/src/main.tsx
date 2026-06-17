import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { socketManager, MindmapNode, Task, RoomState } from './socket';
import Mindmap from './components/Mindmap';
import Board from './components/Board';
import axios from 'axios';
import './App.css';

function generateUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 9);
}

function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || 'default';
}

function App() {
  const [roomId, setRoomId] = useState(getRoomIdFromUrl());
  const [userId] = useState(generateUserId());
  const [nodes, setNodes] = useState<Record<string, MindmapNode>>({});
  const [tasks, setTasks] = useState<{
    todo: Task[];
    'in-progress': Task[];
    done: Task[];
  }>({ todo: [], 'in-progress': [], done: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initRoom = async () => {
      try {
        const response = await axios.get(`/api/rooms/${roomId}`);
        const data: RoomState = response.data;
        setNodes(data.nodes || {});
        setTasks(data.tasks || { todo: [], 'in-progress': [], done: [] });
      } catch (e) {
        console.error('Failed to load room data:', e);
      }
    };
    initRoom();
  }, [roomId]);

  useEffect(() => {
    socketManager.connect(roomId, userId);

    const unsubRoomState = socketManager.on('room_state', (state: RoomState) => {
      setNodes(state.nodes || {});
      setTasks(state.tasks || { todo: [], 'in-progress': [], done: [] });
      setIsConnected(true);
    });

    const unsubNodeCreated = socketManager.on('node_created', (data: { node: MindmapNode }) => {
      setNodes(prev => ({ ...prev, [data.node.id]: data.node }));
    });

    const unsubNodeUpdated = socketManager.on('node_updated', (data: { node_id: string; updates: Partial<MindmapNode> }) => {
      setNodes(prev => {
        if (!prev[data.node_id]) return prev;
        return { ...prev, [data.node_id]: { ...prev[data.node_id], ...data.updates } };
      });
    });

    const unsubNodeDeleted = socketManager.on('node_deleted', (data: { node_id: string }) => {
      setNodes(prev => {
        const next = { ...prev };
        delete next[data.node_id];
        return next;
      });
    });

    const unsubNodeMerged = socketManager.on('node_merged', (data: {
      primary_node_id: string;
      merged_node_ids: string[];
      new_text: string;
    }) => {
      setNodes(prev => {
        const next = { ...prev };
        data.merged_node_ids.forEach(id => delete next[id]);
        if (next[data.primary_node_id]) {
          next[data.primary_node_id] = { ...next[data.primary_node_id], text: data.new_text };
        }
        return next;
      });
    });

    const unsubTaskCreated = socketManager.on('task_created', (data: { task: Task }) => {
      setTasks(prev => ({
        ...prev,
        [data.task.status]: [...prev[data.task.status as keyof typeof prev], data.task]
      }));
    });

    const unsubTaskUpdated = socketManager.on('task_updated', (data: { task_id: string; task: Task }) => {
      setTasks(prev => {
        const next = {
          todo: prev.todo.filter(t => t.id !== data.task_id),
          'in-progress': prev['in-progress'].filter(t => t.id !== data.task_id),
          done: prev.done.filter(t => t.id !== data.task_id),
        };
        const status = data.task.status as keyof typeof next;
        next[status] = [...next[status], data.task];
        return next;
      });
    });

    const unsubTaskDeleted = socketManager.on('task_deleted', (data: { task_id: string }) => {
      setTasks(prev => ({
        todo: prev.todo.filter(t => t.id !== data.task_id),
        'in-progress': prev['in-progress'].filter(t => t.id !== data.task_id),
        done: prev.done.filter(t => t.id !== data.task_id),
      }));
    });

    return () => {
      unsubRoomState();
      unsubNodeCreated();
      unsubNodeUpdated();
      unsubNodeDeleted();
      unsubNodeMerged();
      unsubTaskCreated();
      unsubTaskUpdated();
      unsubTaskDeleted();
      socketManager.disconnect();
    };
  }, [roomId, userId]);

  const handleNodeCreate = useCallback((node: MindmapNode) => {
    socketManager.createNode(node);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<MindmapNode>) => {
    socketManager.updateNode(nodeId, updates);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    socketManager.deleteNode(nodeId);
  }, []);

  const handleNodesMerge = useCallback((nodeIds: string[], primaryNodeId: string, newText: string) => {
    socketManager.mergeNodes(nodeIds, primaryNodeId, newText);
  }, []);

  const handleCreateTask = useCallback((nodeId: string) => {
    socketManager.createTask(nodeId, userId);
  }, [userId]);

  const handleTaskUpdate = useCallback((taskId: string, newStatus: string, newIndex: number) => {
    socketManager.updateTask(taskId, newStatus, newIndex);
  }, []);

  const handleTaskDelete = useCallback((taskId: string) => {
    socketManager.deleteTask(taskId);
  }, []);

  const createNewRoom = async () => {
    try {
      const response = await axios.post('/api/rooms');
      const newRoomId = response.data.room_id;
      setRoomId(newRoomId);
      window.history.replaceState({}, '', `?room=${newRoomId}`);
    } catch (e) {
      console.error('Failed to create room:', e);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🧠 协作思维导图 & 任务看板</h1>
        <div className="header-right">
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● 已连接' : '○ 连接中...'}
          </span>
          <span className="room-id">房间: {roomId}</span>
          <button className="btn-primary" onClick={createNewRoom}>
            新建房间
          </button>
          {isMobile && (
            <button className="btn-secondary" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
              {isDrawerOpen ? '收起看板' : '打开看板'}
            </button>
          )}
        </div>
      </header>

      <div className="main-content">
        <div className="mindmap-section">
          <Mindmap
            nodes={nodes}
            userId={userId}
            onNodeCreate={handleNodeCreate}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onNodesMerge={handleNodesMerge}
            onCreateTask={handleCreateTask}
          />
        </div>

        {!isMobile && (
          <div className="board-section">
            <Board
              tasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        )}
      </div>

      {isMobile && (
        <div className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}>
          <div className={`drawer-panel ${isDrawerOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" onClick={() => setIsDrawerOpen(false)}></div>
            <Board
              tasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
