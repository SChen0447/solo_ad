export interface BranchOption {
  id: string;
  title: string;
  description: string;
  child_node_id: string | null;
}

export interface StoryNodeData {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  parent_id: string | null;
  branch_title: string | null;
  depth: number;
  branch_options: BranchOption[];
}

export interface ParticipantData {
  id: string;
  name: string;
  avatar: string;
}

export interface ActivityData {
  node_id: string;
  author: string;
  avatar: string;
  summary: string;
  timestamp: string;
}

export interface RoomData {
  room_code: string;
  creator_id: string;
  theme: string;
  initial_text: string;
  is_completed: boolean;
  created_at: string;
  last_activity: string;
  nodes: Record<string, StoryNodeData>;
  participants: Record<string, ParticipantData>;
  activities: ActivityData[];
  root_node_id: string | null;
}

export interface TreeNode {
  id: string;
  node: StoryNodeData;
  x: number;
  y: number;
  width: number;
  height: number;
  children: string[];
}
