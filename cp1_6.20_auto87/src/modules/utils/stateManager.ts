import type { Node, Edge } from 'reactflow';

export type NodeType = 'start' | 'process' | 'decision' | 'end';

export interface NodeData {
  label: string;
  type: NodeType;
  description: string;
}

export interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

interface HistoryEntry {
  state: FlowState;
}

type Listener = (state: FlowState) => void;

const MAX_HISTORY = 30;

class StateManager {
  private state: FlowState;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private listeners: Set<Listener> = new Set();

  constructor(initialState?: Partial<FlowState>) {
    this.state = {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      ...initialState,
    };
  }

  getState(): FlowState {
    return { ...this.state };
  }

  getNodes(): Node<NodeData>[] {
    return this.state.nodes;
  }

  getEdges(): Edge[] {
    return this.state.edges;
  }

  getSelectedNodeId(): string | null {
    return this.state.selectedNodeId;
  }

  getSelectedEdgeId(): string | null {
    return this.state.selectedEdgeId;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  private snapshot(): HistoryEntry {
    return {
      state: {
        nodes: this.state.nodes.map((n) => ({
          ...n,
          position: { ...n.position },
          data: { ...n.data },
        })),
        edges: this.state.edges.map((e) => ({ ...e })),
        selectedNodeId: this.state.selectedNodeId,
        selectedEdgeId: this.state.selectedEdgeId,
      },
    };
  }

  private restore(entry: HistoryEntry): void {
    this.state = {
      nodes: entry.state.nodes.map((n) => ({
        ...n,
        position: { ...n.position },
        data: { ...n.data },
      })),
      edges: entry.state.edges.map((e) => ({ ...e })),
      selectedNodeId: entry.state.selectedNodeId,
      selectedEdgeId: entry.state.selectedEdgeId,
    };
    this.notify();
  }

  private pushUndo(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private mutate(mutator: () => void, recordHistory = true): void {
    if (recordHistory) {
      this.pushUndo(this.snapshot());
    }
    mutator();
    this.notify();
  }

  addNode(node: Node<NodeData>): void {
    this.mutate(() => {
      this.state.nodes = [...this.state.nodes, node];
    });
  }

  addNodes(nodes: Node<NodeData>[]): void {
    if (nodes.length === 0) return;
    this.mutate(() => {
      this.state.nodes = [...this.state.nodes, ...nodes];
    });
  }

  updateNode(id: string, updates: Partial<Node<NodeData>>, recordHistory = true): void {
    this.mutate(() => {
      this.state.nodes = this.state.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              ...updates,
              position: updates.position ? { ...updates.position } : n.position,
              data: updates.data ? { ...n.data, ...updates.data } : n.data,
            }
          : n
      );
    }, recordHistory);
  }

  updateNodes(updatesMap: Map<string, Partial<Node<NodeData>>>): void {
    if (updatesMap.size === 0) return;
    this.mutate(() => {
      this.state.nodes = this.state.nodes.map((n) => {
        const updates = updatesMap.get(n.id);
        if (!updates) return n;
        return {
          ...n,
          ...updates,
          position: updates.position ? { ...updates.position } : n.position,
          data: updates.data ? { ...n.data, ...updates.data } : n.data,
        };
      });
    });
  }

  deleteNode(id: string): void {
    this.mutate(() => {
      this.state.nodes = this.state.nodes.filter((n) => n.id !== id);
      this.state.edges = this.state.edges.filter((e) => e.source !== id && e.target !== id);
      if (this.state.selectedNodeId === id) {
        this.state.selectedNodeId = null;
      }
    });
  }

  addEdge(edge: Edge): void {
    this.mutate(() => {
      const exists = this.state.edges.some(
        (e) => e.source === edge.source && e.target === edge.target
      );
      if (!exists) {
        this.state.edges = [...this.state.edges, edge];
      }
    });
  }

  addEdges(edges: Edge[]): void {
    if (edges.length === 0) return;
    this.mutate(() => {
      const newEdges = edges.filter(
        (edge) =>
          !this.state.edges.some(
            (e) => e.source === edge.source && e.target === edge.target
          )
      );
      this.state.edges = [...this.state.edges, ...newEdges];
    });
  }

  updateEdge(id: string, updates: Partial<Edge>): void {
    this.mutate(() => {
      this.state.edges = this.state.edges.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
    });
  }

  deleteEdge(id: string): void {
    this.mutate(() => {
      this.state.edges = this.state.edges.filter((e) => e.id !== id);
      if (this.state.selectedEdgeId === id) {
        this.state.selectedEdgeId = null;
      }
    });
  }

  setSelectedNode(id: string | null): void {
    if (this.state.selectedNodeId === id && this.state.selectedEdgeId === null) return;
    this.state.selectedNodeId = id;
    this.state.selectedEdgeId = null;
    this.notify();
  }

  setSelectedEdge(id: string | null): void {
    if (this.state.selectedEdgeId === id && this.state.selectedNodeId === null) return;
    this.state.selectedEdgeId = id;
    this.state.selectedNodeId = null;
    this.notify();
  }

  clearSelection(): void {
    if (this.state.selectedNodeId === null && this.state.selectedEdgeId === null) return;
    this.state.selectedNodeId = null;
    this.state.selectedEdgeId = null;
    this.notify();
  }

  replaceAll(nodes: Node<NodeData>[], edges: Edge[]): void {
    this.mutate(() => {
      this.state.nodes = nodes;
      this.state.edges = edges;
      this.state.selectedNodeId = null;
      this.state.selectedEdgeId = null;
    });
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    const current = this.snapshot();
    const previous = this.undoStack.pop()!;
    this.redoStack.push(current);
    this.restore(previous);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const current = this.snapshot();
    const next = this.redoStack.pop()!;
    this.undoStack.push(current);
    this.restore(next);
  }
}

let instance: StateManager | null = null;

export function getStateManager(): StateManager {
  if (!instance) {
    instance = new StateManager();
  }
  return instance;
}

export function resetStateManager(): void {
  instance = null;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
