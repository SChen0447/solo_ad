import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import debounce from 'lodash.debounce';
import {
  StoryState,
  StoryAction,
  Story,
  StoryNode,
  HistorySnapshot,
  AppMode,
  NodeColor,
  NODE_COLORS,
} from '@/types';
import {
  saveStory,
  loadStory,
  saveSnapshot,
  loadSnapshots,
  MAX_HISTORY_SNAPSHOTS,
} from '@/utils/storage';

const generateId = () => Math.random().toString(36).substring(2, 11);

const createEmptyStory = (): Story => ({
  id: generateId(),
  title: '未命名故事',
  themeColor: '#5A67D8',
  nodes: [],
  relationships: [],
  updatedAt: Date.now(),
});

const initialState: StoryState = {
  story: createEmptyStory(),
  selectedNodeId: null,
  mode: 'edit',
  historySnapshots: [],
};

function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'ADD_NODE': {
      const nodes = [...state.story.nodes, action.payload].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      return {
        ...state,
        story: {
          ...state.story,
          nodes,
          updatedAt: Date.now(),
        },
        selectedNodeId: action.payload.id,
      };
    }
    case 'UPDATE_NODE': {
      const nodes = state.story.nodes
        .map((node) =>
          node.id === action.payload.id ? { ...node, ...action.payload.updates } : node
        )
        .sort((a, b) => a.timestamp - b.timestamp);
      return {
        ...state,
        story: {
          ...state.story,
          nodes,
          updatedAt: Date.now(),
        },
      };
    }
    case 'DELETE_NODE': {
      const nodes = state.story.nodes.filter((n) => n.id !== action.payload);
      const relationships = state.story.relationships.filter(
        (r) => r.fromNodeId !== action.payload && r.toNodeId !== action.payload
      );
      return {
        ...state,
        story: {
          ...state.story,
          nodes,
          relationships,
          updatedAt: Date.now(),
        },
        selectedNodeId: state.selectedNodeId === action.payload ? null : state.selectedNodeId,
      };
    }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };
    case 'ADD_RELATIONSHIP':
      return {
        ...state,
        story: {
          ...state.story,
          relationships: [...state.story.relationships, action.payload],
          updatedAt: Date.now(),
        },
      };
    case 'DELETE_RELATIONSHIP':
      return {
        ...state,
        story: {
          ...state.story,
          relationships: state.story.relationships.filter((r) => r.id !== action.payload),
          updatedAt: Date.now(),
        },
      };
    case 'UPDATE_STORY_TITLE':
      return {
        ...state,
        story: {
          ...state.story,
          title: action.payload,
          updatedAt: Date.now(),
        },
      };
    case 'UPDATE_THEME_COLOR':
      return {
        ...state,
        story: {
          ...state.story,
          themeColor: action.payload,
          updatedAt: Date.now(),
        },
      };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'LOAD_STORY':
      return {
        ...state,
        story: action.payload,
        selectedNodeId: null,
      };
    case 'SAVE_SNAPSHOT': {
      const snapshots = [action.payload, ...state.historySnapshots].slice(
        0,
        MAX_HISTORY_SNAPSHOTS
      );
      return { ...state, historySnapshots: snapshots };
    }
    case 'LOAD_SNAPSHOTS':
      return { ...state, historySnapshots: action.payload };
    case 'RESTORE_SNAPSHOT':
      return {
        ...state,
        story: { ...action.payload, updatedAt: Date.now() },
        selectedNodeId: null,
      };
    default:
      return state;
  }
}

interface StoryContextType extends StoryState {
  dispatch: React.Dispatch<StoryAction>;
  addNode: (node?: Partial<StoryNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNode: (id: string, updates: Partial<StoryNode>) => void;
  setMode: (mode: AppMode) => void;
  updateStoryTitle: (title: string) => void;
  updateThemeColor: (color: NodeColor) => void;
  addRelationship: (fromId: string, toId: string, type: 'causal' | 'parallel') => void;
  createShareLink: () => string;
  restoreSnapshot: (snapshot: HistorySnapshot) => void;
  calculateNodePositions: () => StoryNode[];
}

const StoryContext = createContext<StoryContextType | null>(null);

export const StoryProvider: React.FC<{ children: React.ReactNode; initialStory?: Story }> = ({
  children,
  initialStory,
}) => {
  const [state, dispatch] = useReducer(storyReducer, {
    ...initialState,
    story: initialStory || initialState.story,
  });

  const saveTimeoutRef = useRef<number | null>(null);

  const debouncedSave = useCallback(
    debounce(async (story: Story) => {
      await saveStory(story);
    }, 15000),
    []
  );

  const debouncedSnapshot = useCallback(
    debounce(async (story: Story) => {
      const snapshot: HistorySnapshot = {
        id: generateId(),
        timestamp: Date.now(),
        story: JSON.parse(JSON.stringify(story)),
      };
      await saveSnapshot(snapshot);
      dispatch({ type: 'SAVE_SNAPSHOT', payload: snapshot });
    }, 30000),
    []
  );

  useEffect(() => {
    if (state.mode === 'edit') {
      debouncedSave(state.story);
      debouncedSnapshot(state.story);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.story, state.mode, debouncedSave, debouncedSnapshot]);

  useEffect(() => {
    const loadData = async () => {
      if (!initialStory) {
        const saved = await loadStory();
        if (saved) {
          dispatch({ type: 'LOAD_STORY', payload: saved });
        }
      }
      const snapshots = await loadSnapshots();
      if (snapshots.length > 0) {
        dispatch({ type: 'LOAD_SNAPSHOTS', payload: snapshots });
      }
    };
    loadData();
  }, [initialStory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && state.selectedNodeId && state.mode === 'edit') {
        dispatch({ type: 'DELETE_NODE', payload: state.selectedNodeId });
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT_NODE', payload: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedNodeId, state.mode]);

  const addNode = useCallback(
    (nodeData?: Partial<StoryNode>) => {
      const newNode: StoryNode = {
        id: generateId(),
        title: '新节点',
        content: '',
        imageUrl: '',
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        color: NODE_COLORS[state.story.nodes.length % NODE_COLORS.length],
        positionX: 0,
        positionY: 0,
        ...nodeData,
      };
      dispatch({ type: 'ADD_NODE', payload: newNode });
    },
    [state.story.nodes.length]
  );

  const deleteNode = useCallback((id: string) => {
    dispatch({ type: 'DELETE_NODE', payload: id });
  }, []);

  const selectNode = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_NODE', payload: id });
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<StoryNode>) => {
    dispatch({ type: 'UPDATE_NODE', payload: { id, updates } });
  }, []);

  const setMode = useCallback((mode: AppMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const updateStoryTitle = useCallback((title: string) => {
    dispatch({ type: 'UPDATE_STORY_TITLE', payload: title });
  }, []);

  const updateThemeColor = useCallback((color: NodeColor) => {
    dispatch({ type: 'UPDATE_THEME_COLOR', payload: color });
  }, []);

  const addRelationship = useCallback(
    (fromId: string, toId: string, type: 'causal' | 'parallel') => {
      const relationship = {
        id: generateId(),
        fromNodeId: fromId,
        toNodeId: toId,
        type,
      };
      dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
    },
    []
  );

  const createShareLink = useCallback(() => {
    const storyData = JSON.stringify(state.story);
    const encoded = btoa(unescape(encodeURIComponent(storyData)));
    return `${window.location.origin}${window.location.pathname}#/s/${encoded}`;
  }, [state.story]);

  const restoreSnapshot = useCallback((snapshot: HistorySnapshot) => {
    dispatch({ type: 'RESTORE_SNAPSHOT', payload: snapshot.story });
  }, []);

  const calculateNodePositions = useCallback((): StoryNode[] => {
    const nodes = [...state.story.nodes].sort((a, b) => a.timestamp - b.timestamp);
    if (nodes.length < 2) {
      return nodes.map((n) => ({ ...n, positionX: 100, positionY: 200 }));
    }

    const minTime = nodes[0].timestamp;
    const maxTime = nodes[nodes.length - 1].timestamp;
    const timeSpan = maxTime - minTime || 1;
    const minSpacing = 40;
    const baseWidth = Math.max(800, window.innerWidth - 320);
    const totalWidth = Math.max(baseWidth, nodes.length * 150);
    const maxSpacing = (totalWidth - 200) / (nodes.length - 1);

    return nodes.map((node, index) => {
      const timeRatio = (node.timestamp - minTime) / timeSpan;
      const calculatedX = timeRatio * (totalWidth - 200) + 100;
      const minX = index * minSpacing + 100;
      const maxX = index * maxSpacing + 100;
      const positionX = Math.max(minX, Math.min(maxX, calculatedX));
      return {
        ...node,
        positionX,
        positionY: node.positionY || 200,
      };
    });
  }, [state.story.nodes]);

  const value: StoryContextType = {
    ...state,
    dispatch,
    addNode,
    deleteNode,
    selectNode,
    updateNode,
    setMode,
    updateStoryTitle,
    updateThemeColor,
    addRelationship,
    createShareLink,
    restoreSnapshot,
    calculateNodePositions,
  };

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
};

export function useStoryStore(): StoryContextType {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStoryStore must be used within a StoryProvider');
  }
  return context;
}
