import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface NodeData {
  id: string;
  mindmap_id: string;
  parent_id: string | null;
  text: string;
  x: number;
  y: number;
  level: number;
  bg_color: string | null;
  border_width: number;
  font_bold: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MindMapData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  share_token: string | null;
}

export interface OnlineUser {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  editingNodeId: string | null;
}

export interface UseSocketOptions {
  mindmapId?: string;
  shareToken?: string;
  userName?: string;
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [mindmap, setMindmap] = useState<MindMapData | null>(null);
  const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map());
  const [readOnly, setReadOnly] = useState(false);
  const nodesRef = useRef<Map<string, NodeData>>(new Map());
  const [history, setHistory] = useState<Array<{ type: string; payload: any; snapshot: Map<string, NodeData> }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  nodesRef.current = nodes;

  const snapshot = useCallback(() => {
    return new Map(nodesRef.current);
  }, []);

  const pushHistory = useCallback((type: string, payload: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ type, payload, snapshot: snapshot() });
      return newHistory.length > 50 ? newHistory.slice(newHistory.length - 50) : newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, snapshot]);

  const undo = useCallback(() => {
    if (historyIndex <= 0 || readOnly) return;
    const target = history[historyIndex - 1];
    if (target) {
      const newMap = new Map(target.snapshot);
      setNodes(newMap);
      const updates: Array<{ id: string; updates: Partial<NodeData> }> = [];
      const deletes: string[] = [];
      const creates: NodeData[] = [];
      const current = nodesRef.current;
      newMap.forEach((node, id) => {
        if (!current.has(id)) {
          creates.push(node);
        } else {
          updates.push({ id, updates: node });
        }
      });
      current.forEach((_node, id) => {
        if (!newMap.has(id)) deletes.push(id);
      });
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, readOnly]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || readOnly) return;
    const target = history[historyIndex + 1];
    if (target) {
      setNodes(new Map(target.snapshot));
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex, readOnly]);

  useEffect(() => {
    if (!options.mindmapId && !options.shareToken) return;

    const socket: Socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (options.shareToken) {
        socket.emit('room:join-share', { token: options.shareToken });
      } else if (options.mindmapId) {
        socket.emit('room:join', { mindmapId: options.mindmapId, userName: options.userName });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('user:init', ({ user, readOnly: ro }: { user: OnlineUser; readOnly?: boolean }) => {
      setCurrentUser(user);
      if (ro) setReadOnly(true);
    });

    socket.on('room:users', ({ users: u }: { users: OnlineUser[] }) => {
      setUsers(u);
    });

    socket.on('cursor:update', ({ user }: { user: OnlineUser }) => {
      setUsers(prev => {
        const existing = prev.find(u => u.id === user.id);
        if (!existing) return [...prev, user];
        return prev.map(u => (u.id === user.id ? user : u));
      });
    });

    socket.on('map:init', ({ map, nodes: nodeList, readOnly: ro }: { map: MindMapData; nodes: NodeData[]; readOnly?: boolean }) => {
      setMindmap(map);
      const mapData = new Map<string, NodeData>();
      nodeList.forEach(n => mapData.set(n.id, n));
      setNodes(mapData);
      if (ro) setReadOnly(true);
    });

    socket.on('node:created', ({ node }: { node: NodeData; own?: boolean }) => {
      setNodes(prev => {
        const next = new Map(prev);
        next.set(node.id, node);
        return next;
      });
    });

    socket.on('node:updated', ({ node }: { node: NodeData; own?: boolean }) => {
      setNodes(prev => {
        const next = new Map(prev);
        next.set(node.id, node);
        return next;
      });
    });

    socket.on('node:deleted', ({ id }: { id: string; own?: boolean }) => {
      setNodes(prev => {
        const next = new Map(prev);
        next.delete(id);
        const toDelete: string[] = [];
        next.forEach((n) => {
          if (n.parent_id === id) toDelete.push(n.id);
        });
        toDelete.forEach(did => next.delete(did));
        return next;
      });
    });

    socket.on('mindmap:deleted', () => {
      window.location.href = '/';
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setUsers([]);
      setCurrentUser(null);
    };
  }, [options.mindmapId, options.shareToken, options.userName]);

  const createNode = useCallback((nodeData: Omit<NodeData, 'created_at' | 'updated_at'>) => {
    if (readOnly || !socketRef.current) return;
    pushHistory('create', nodeData);
    socketRef.current.emit('node:create', nodeData);
  }, [readOnly, pushHistory]);

  const updateNode = useCallback((id: string, updates: Partial<NodeData>) => {
    if (readOnly || !socketRef.current) return;
    pushHistory('update', { id, updates });
    socketRef.current.emit('node:update', { id, updates });
  }, [readOnly, pushHistory]);

  const deleteNode = useCallback((id: string) => {
    if (readOnly || !socketRef.current) return;
    pushHistory('delete', { id });
    socketRef.current.emit('node:delete', { id });
  }, [readOnly, pushHistory]);

  const moveCursor = useCallback((x: number, y: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('cursor:move', { x, y });
  }, []);

  const setEditingNode = useCallback((nodeId: string | null) => {
    if (!socketRef.current) return;
    socketRef.current.emit('node:editing', { nodeId });
  }, []);

  return {
    connected,
    currentUser,
    users,
    mindmap,
    nodes,
    readOnly,
    createNode,
    updateNode,
    deleteNode,
    moveCursor,
    setEditingNode,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
}
