import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { FileNode, DependencyEdge, ParseResult, FileType } from '../types';

interface GraphContextType {
  nodes: FileNode[];
  edges: DependencyEdge[];
  stats: ParseResult['stats'] | null;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  searchQuery: string;
  visibleTypes: Set<FileType>;
  isDataLoaded: boolean;

  setGraphData: (data: ParseResult) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleTypeVisibility: (type: FileType) => void;
  resetView: () => void;
  clearData: () => void;
  updateNodePositions: (nodes: FileNode[]) => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [edges, setEdges] = useState<DependencyEdge[]>([]);
  const [stats, setStats] = useState<ParseResult['stats'] | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const [visibleTypes, setVisibleTypes] = useState<Set<FileType>>(
    new Set(['component', 'util', 'config', 'style', 'other'])
  );
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const setGraphData = useCallback((data: ParseResult) => {
    setNodes(data.nodes);
    setEdges(data.edges);
    setStats(data.stats);
    setIsDataLoaded(true);
    setSelectedNodeId(null);
    setHighlightedNodeIds(new Set());
    setSearchQueryState('');
    setVisibleTypes(new Set(['component', 'util', 'config', 'style', 'other']));
  }, []);

  const setSelectedNode = useCallback(
    (nodeId: string | null) => {
      if (nodeId === null) {
        setSelectedNodeId(null);
        setHighlightedNodeIds(new Set());
        return;
      }

      const highlighted = new Set<string>([nodeId]);
      const node = nodes.find((n) => n.id === nodeId);

      if (node) {
        node.imports.forEach((id) => highlighted.add(id));
        node.importedBy.forEach((id) => highlighted.add(id));
      }

      for (const edge of edges) {
        if (edge.source === nodeId || edge.target === nodeId) {
          highlighted.add(edge.source);
          highlighted.add(edge.target);
        }
      }

      setSelectedNodeId(nodeId);
      setHighlightedNodeIds(highlighted);
    },
    [nodes, edges]
  );

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const toggleTypeVisibility = useCallback((type: FileType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    setSelectedNodeId(null);
    setHighlightedNodeIds(new Set());
    setSearchQueryState('');
  }, []);

  const clearData = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setStats(null);
    setIsDataLoaded(false);
    setSelectedNodeId(null);
    setHighlightedNodeIds(new Set());
    setSearchQueryState('');
    setVisibleTypes(new Set(['component', 'util', 'config', 'style', 'other']));
  }, []);

  const updateNodePositions = useCallback((updatedNodes: FileNode[]) => {
    setNodes((prev) =>
      prev.map((node) => {
        const updated = updatedNodes.find((n) => n.id === node.id);
        if (updated) {
          return { ...node, x: updated.x, y: updated.y, fx: updated.fx, fy: updated.fy };
        }
        return node;
      })
    );
  }, []);

  const value = useMemo(
    () => ({
      nodes,
      edges,
      stats,
      selectedNodeId,
      highlightedNodeIds,
      searchQuery,
      visibleTypes,
      isDataLoaded,
      setGraphData,
      setSelectedNode,
      setSearchQuery,
      toggleTypeVisibility,
      resetView,
      clearData,
      updateNodePositions
    }),
    [
      nodes,
      edges,
      stats,
      selectedNodeId,
      highlightedNodeIds,
      searchQuery,
      visibleTypes,
      isDataLoaded,
      setGraphData,
      setSelectedNode,
      setSearchQuery,
      toggleTypeVisibility,
      resetView,
      clearData,
      updateNodePositions
    ]
  );

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export const useGraphContext = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraphContext must be used within a GraphProvider');
  }
  return context;
};
