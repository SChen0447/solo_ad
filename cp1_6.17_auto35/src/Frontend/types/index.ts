export interface IdeaCard {
  id: string;
  text: string;
  color: string;
  starred: boolean;
  x: number;
  y: number;
  groupId?: number;
  createdAt: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface ClusterResult {
  clusters: Record<string, number>;
  group_names: Record<string, string>;
  group_sizes: Record<string, number>;
}

export interface GroupData {
  groupId: number;
  groupName: string;
  size: number;
  color: string;
}

export interface DragState {
  isDragging: boolean;
  sourceId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
