import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MindMapData {
  id: string;
  nodes: Record<string, MindMapNode>;
  createdAt: number;
  updatedAt: number;
}

export interface EditingUser {
  socketId: string;
  userId: string;
  color: string;
  userName: string;
  nodeId: string | null;
}

interface HistoryEntry {
  type: 'add' | 'update' | 'delete' | 'move' | 'edit';
  snapshot: Record<string, MindMapNode>;
}

const MAX_HISTORY = 20;
const NODE_SIZE = 80;
const SNAP_DISTANCE = 10;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<Record<string, MindMapNode>>({});
  const [mapId, setMapId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<EditingUser | null>(null);
  const [editingUsers, setEditingUsers] = useState<EditingUser[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const historyRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const nodesRef = useRef<Record<string, MindMapNode>>({});
  const mapIdRef = useRef<string>('');
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const applyFromRemoteRef = useRef(false);

  const snapshot = useCallback((): Record<string, MindMapNode> => {
    return JSON.parse(JSON.stringify(nodesRef.current));
  }, []);

  const pushHistory = useCallback((type: HistoryEntry['type']) => {
    if (applyFromRemoteRef.current) return;
    historyRef.current.push({ type, snapshot: snapshot() });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    redoStackRef.current = [];
  }, [snapshot]);

  const applySnapshot = useCallback((snap: Record<string, MindMapNode>) => {
    applyFromRemoteRef.current = true;
    nodesRef.current = snap;
    setNodes({ ...snap });

    const skt = socketRef.current;
    const mid = mapIdRef.current;
    if (skt && mid) {
      Object.values(snap).forEach(node => {
        skt.emit('update-node', {
          mapId: mid,
          nodeId: node.id,
          updates: {
            text: node.text,
            x: node.x,
            y: node.y,
            color: node.color,
            parentId: node.parentId,
          },
        });
      });
    }
    setTimeout(() => { applyFromRemoteRef.current = false; }, 50);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const current = snapshot();
    const prev = historyRef.current.pop()!;
    redoStackRef.current.push({ type: prev.type, snapshot: current });
    applySnapshot(prev.snapshot);
  }, [snapshot, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const current = snapshot();
    const next = redoStackRef.current.pop()!;
    historyRef.current.push({ type: next.type, snapshot: current });
    applySnapshot(next.snapshot);
  }, [snapshot, applySnapshot]);

  const updateLocalNode = useCallback((id: string, updates: Partial<MindMapNode>, pushHist = true, histType: HistoryEntry['type'] = 'update') => {
    if (pushHist) pushHistory(histType);
    const updated = { ...nodesRef.current[id], ...updates };
    nodesRef.current = { ...nodesRef.current, [id]: updated };
    setNodes({ ...nodesRef.current });
  }, [pushHistory]);

  const handleAddNode = useCallback(() => {
    const newId = uuidv4();
    const parentId = selectedNodeId || Object.keys(nodesRef.current)[0] || null;
    const parent = parentId ? nodesRef.current[parentId] : null;

    const siblings = parent
      ? Object.values(nodesRef.current).filter(n => n.parentId === parentId)
      : Object.values(nodesRef.current);

    const offsetX = parent ? NODE_SIZE * 1.8 : 0;
    const offsetY = parent ? (siblings.length - 1) * NODE_SIZE * 1.2 : 0;

    const newNode: MindMapNode = {
      id: newId,
      text: '新节点',
      x: parent ? parent.x + offsetX : 0,
      y: parent ? parent.y + offsetY - (siblings.length > 1 ? NODE_SIZE * 0.6 : 0) : 0,
      color: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'][Math.floor(Math.random() * 8)],
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    pushHistory('add');
    nodesRef.current = { ...nodesRef.current, [newId]: newNode };
    setNodes({ ...nodesRef.current });
    setSelectedNodeId(newId);
    setEditingNodeId(newId);

    if (socketRef.current && mapIdRef.current) {
      socketRef.current.emit('add-node', {
        mapId: mapIdRef.current,
        parentId,
        x: newNode.x,
        y: newNode.y,
        color: newNode.color,
        text: newNode.text,
      });
    }
  }, [selectedNodeId, pushHistory]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!nodesRef.current[nodeId]) return;

    pushHistory('delete');

    const deleteRecursive = (id: string) => {
      Object.values(nodesRef.current).forEach(n => {
        if (n.parentId === id) deleteRecursive(n.id);
      });
      delete nodesRef.current[id];
    };
    deleteRecursive(nodeId);

    setNodes({ ...nodesRef.current });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (editingNodeId === nodeId) setEditingNodeId(null);

    if (socketRef.current && mapIdRef.current) {
      socketRef.current.emit('delete-node', { mapId: mapIdRef.current, nodeId });
    }
  }, [pushHistory, selectedNodeId, editingNodeId]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) handleDeleteNode(selectedNodeId);
  }, [selectedNodeId, handleDeleteNode]);

  const handleNodeMove = useCallback((nodeId: string, rawX: number, rawY: number, isEnd: boolean) => {
    const allNodes = Object.values(nodesRef.current);
    let x = rawX;
    let y = rawY;
    let snapV: number | null = null;
    let snapH: number | null = null;

    for (const n of allNodes) {
      if (n.id === nodeId) continue;
      const dx = Math.abs(n.x - x);
      const dy = Math.abs(n.y - y);
      if (dx < SNAP_DISTANCE && (snapH === null || dx < Math.abs(snapH - x))) {
        snapH = n.x;
      }
      if (dy < SNAP_DISTANCE && (snapV === null || dy < Math.abs(snapV - y))) {
        snapV = n.y;
      }
    }

    if (snapH !== null) x = snapH;
    if (snapV !== null) y = snapV;

    if (!isEnd) {
      applyFromRemoteRef.current = true;
      nodesRef.current = {
        ...nodesRef.current,
        [nodeId]: { ...nodesRef.current[nodeId], x, y },
      };
      setNodes({ ...nodesRef.current });
      setTimeout(() => { applyFromRemoteRef.current = false; }, 0);
    } else {
      updateLocalNode(nodeId, { x, y }, true, 'move');
    }

    if (socketRef.current && mapIdRef.current) {
      socketRef.current.emit('update-node', {
        mapId: mapIdRef.current,
        nodeId,
        updates: { x, y },
      });
    }

    return { x, y, snapH, snapV };
  }, [updateLocalNode]);

  const handleNodeTextChange = useCallback((nodeId: string, text: string) => {
    updateLocalNode(nodeId, { text }, true, 'edit');
    if (socketRef.current && mapIdRef.current) {
      socketRef.current.emit('update-node', {
        mapId: mapIdRef.current,
        nodeId,
        updates: { text },
      });
    }
  }, [updateLocalNode]);

  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    updateLocalNode(nodeId, { color }, true, 'update');
    if (socketRef.current && mapIdRef.current) {
      socketRef.current.emit('update-node', {
        mapId: mapIdRef.current,
        nodeId,
        updates: { color },
      });
    }
  }, [updateLocalNode]);

  const handleFocusNode = useCallback((nodeId: string | null) => {
    if (socketRef.current && mapIdRef.current) {
      socketRef.current.emit('focus-node', { mapId: mapIdRef.current, nodeId });
    }
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#1a1a2e',
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出PNG失败:', err);
    }
  }, []);

  useEffect(() => {
    const newSocket: Socket = io('/', { path: '/socket.io' });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      fetch('/api/maps')
        .then(r => r.json())
        .then(data => {
          const mid = data.id;
          setMapId(mid);
          mapIdRef.current = mid;
          newSocket.emit('join-map', { mapId: mid });
        })
        .catch(() => {
          const mid = 'default-' + uuidv4().slice(0, 8);
          setMapId(mid);
          mapIdRef.current = mid;
        });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('map-data', (data: MindMapData) => {
      applyFromRemoteRef.current = true;
      nodesRef.current = { ...data.nodes };
      setNodes({ ...data.nodes });
      setTimeout(() => { applyFromRemoteRef.current = false; }, 100);
    });

    newSocket.on('current-user', (user: EditingUser) => {
      setCurrentUser(user);
    });

    newSocket.on('users-update', (users: EditingUser[]) => {
      setEditingUsers(users);
    });

    newSocket.on('node-added', ({ node }: { node: MindMapNode }) => {
      if (applyFromRemoteRef.current) return;
      applyFromRemoteRef.current = true;
      nodesRef.current = { ...nodesRef.current, [node.id]: node };
      setNodes({ ...nodesRef.current });
      setTimeout(() => { applyFromRemoteRef.current = false; }, 50);
    });

    newSocket.on('node-updated', ({ nodeId, updates }: { nodeId: string; updates: Partial<MindMapNode> }) => {
      if (applyFromRemoteRef.current) return;
      if (!nodesRef.current[nodeId]) return;
      applyFromRemoteRef.current = true;
      nodesRef.current = {
        ...nodesRef.current,
        [nodeId]: { ...nodesRef.current[nodeId], ...updates },
      };
      setNodes({ ...nodesRef.current });
      setTimeout(() => { applyFromRemoteRef.current = false; }, 50);
    });

    newSocket.on('node-deleted', ({ nodeId }: { nodeId: string }) => {
      if (applyFromRemoteRef.current) return;
      applyFromRemoteRef.current = true;
      const deleteRecursive = (id: string) => {
        Object.values(nodesRef.current).forEach(n => {
          if (n.parentId === id) deleteRecursive(n.id);
        });
        delete nodesRef.current[id];
      };
      deleteRecursive(nodeId);
      setNodes({ ...nodesRef.current });
      setTimeout(() => { applyFromRemoteRef.current = false; }, 50);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  return {
    socket,
    nodes,
    mapId,
    currentUser,
    editingUsers,
    selectedNodeId,
    setSelectedNodeId,
    editingNodeId,
    setEditingNodeId,
    isConnected,
    handleAddNode,
    handleDeleteNode,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
    handleNodeMove,
    handleNodeTextChange,
    handleNodeColorChange,
    handleFocusNode,
    handleExportPNG,
    canUndo: historyRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    canvasRef,
    NODE_SIZE,
    SNAP_DISTANCE,
  };
}

export type SocketHookReturn = ReturnType<typeof useSocket>;
