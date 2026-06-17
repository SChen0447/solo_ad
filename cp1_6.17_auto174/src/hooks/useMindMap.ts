import { useState, useCallback } from 'react';
import {
  MindMapState,
  MindMapNode,
  HistoryState,
  MAX_HISTORY,
  NODE_WIDTH,
  NODE_HEIGHT,
  generateId,
} from '../types';

const initialState: MindMapState = {
  nodes: {},
  rootIds: [],
  selectedNodeId: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const initialHistory: HistoryState = {
  past: [],
  present: initialState,
  future: [],
};

export function useMindMap() {
  const [history, setHistory] = useState<HistoryState>(initialHistory);

  const present = history.present;

  const pushHistory = useCallback((newState: MindMapState) => {
    setHistory((prev) => {
      const newPast = [...prev.past, prev.present];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }
      return {
        past: newPast,
        present: newState,
        future: [],
      };
    });
  }, []);

  const updatePresent = useCallback((updater: (state: MindMapState) => MindMapState) => {
    setHistory((prev) => {
      const newState = updater(prev.present);
      const newPast = [...prev.past, prev.present];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }
      return {
        past: newPast,
        present: newState,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const previous = newPast.pop()!;
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const next = newFuture.shift()!;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const addRootNode = useCallback((x: number, y: number) => {
    updatePresent((state) => {
      const id = generateId();
      const node: MindMapNode = {
        id,
        text: '新想法',
        x,
        y,
        parentId: null,
        children: [],
        collapsed: false,
        level: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
      return {
        ...state,
        nodes: { ...state.nodes, [id]: node },
        rootIds: [...state.rootIds, id],
        selectedNodeId: id,
      };
    });
  }, [updatePresent]);

  const addChildNode = useCallback((parentId: string) => {
    updatePresent((state) => {
      const parent = state.nodes[parentId];
      if (!parent) return state;

      const id = generateId();
      const childCount = parent.children.length;
      const angle = (childCount * 40 - 60) * (Math.PI / 180);
      const distance = 180;
      const x = parent.x + Math.cos(angle) * distance;
      const y = parent.y + Math.sin(angle) * distance + 100;

      const node: MindMapNode = {
        id,
        text: '新想法',
        x,
        y,
        parentId,
        children: [],
        collapsed: false,
        level: parent.level + 1,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [id]: node,
          [parentId]: {
            ...parent,
            children: [...parent.children, id],
            collapsed: false,
          },
        },
        selectedNodeId: id,
      };
    });
  }, [updatePresent]);

  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        nodes: {
          ...prev.present.nodes,
          [id]: {
            ...prev.present.nodes[id],
            x,
            y,
          },
        },
      },
    }));
  }, []);

  const updateNodeText = useCallback((id: string, text: string) => {
    updatePresent((state) => ({
      ...state,
      nodes: {
        ...state.nodes,
        [id]: {
          ...state.nodes[id],
          text,
        },
      },
    }));
  }, [updatePresent]);

  const deleteNode = useCallback((id: string) => {
    updatePresent((state) => {
      const node = state.nodes[id];
      if (!node) return state;

      const nodesToDelete = new Set<string>();
      const collectChildren = (nodeId: string) => {
        nodesToDelete.add(nodeId);
        const n = state.nodes[nodeId];
        if (n) {
          n.children.forEach(collectChildren);
        }
      };
      collectChildren(id);

      const newNodes = { ...state.nodes };
      nodesToDelete.forEach((nid) => {
        delete newNodes[nid];
      });

      let newRootIds = state.rootIds.filter((rid) => rid !== id);

      if (node.parentId && newNodes[node.parentId]) {
        newNodes[node.parentId] = {
          ...newNodes[node.parentId],
          children: newNodes[node.parentId].children.filter((cid) => cid !== id),
        };
      }

      return {
        ...state,
        nodes: newNodes,
        rootIds: newRootIds,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
  }, [updatePresent]);

  const toggleCollapse = useCallback((id: string) => {
    updatePresent((state) => {
      const node = state.nodes[id];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [id]: {
            ...node,
            collapsed: !node.collapsed,
          },
        },
      };
    });
  }, [updatePresent]);

  const selectNode = useCallback((id: string | null) => {
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        selectedNodeId: id,
      },
    }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        scale,
      },
    }));
  }, []);

  const setOffset = useCallback((offsetX: number, offsetY: number) => {
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        offsetX,
        offsetY,
      },
    }));
  }, []);

  const saveSnapshot = useCallback(() => {
    setHistory((prev) => {
      const snapshot = {
        ...prev.present,
        nodes: { ...prev.present.nodes },
        rootIds: [...prev.present.rootIds],
      };
      const newPast = [...prev.past, snapshot];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }
      return {
        past: newPast,
        present: prev.present,
        future: [],
      };
    });
  }, []);

  const getVisibleNodes = useCallback((): MindMapNode[] => {
    const visible: MindMapNode[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = present.nodes[nodeId];
      if (!node) return;
      visible.push(node);
      if (!node.collapsed) {
        node.children.forEach(traverse);
      }
    };

    present.rootIds.forEach(traverse);
    return visible;
  }, [present]);

  const isNodeVisible = useCallback(
    (nodeId: string): boolean => {
      const node = present.nodes[nodeId];
      if (!node) return false;
      if (node.parentId === null) return true;

      let current: string | null = node.parentId;
      while (current) {
        const parent: MindMapNode | undefined = present.nodes[current];
        if (!parent) return false;
        if (parent.collapsed) return false;
        current = parent.parentId;
      }
      return true;
    },
    [present]
  );

  return {
    state: present,
    addRootNode,
    addChildNode,
    updateNodePosition,
    updateNodeText,
    deleteNode,
    toggleCollapse,
    selectNode,
    setScale,
    setOffset,
    getVisibleNodes,
    isNodeVisible,
    undo,
    redo,
    saveSnapshot,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
