export interface MindNode {
  id: string
  parent_id: string | null
  title: string
  description: string
  tags: string[]
  x: number
  y: number
  color: string
  votes: number
  created_at?: number
}

export interface Comment {
  id: string
  user_id: string
  user_name: string
  content: string
  created_at: number
}

export interface User {
  id: string
  name: string
  is_host: boolean
}

export interface RoomState {
  code: string
  host_id: string
  countdown_duration: number
  countdown_started_at: number | null
  voting_locked: boolean
  final_result: Array<{ id: string; title: string; votes: number }> | null
  nodes: Record<string, MindNode>
  votes: Record<string, Record<string, number>>
  comments: Record<string, Comment[]>
  users: Record<string, User>
}

export interface VotePanelProps {
  nodes: Record<string, MindNode>
  votes: Record<string, Record<string, number>>
  userId: string
  votingLocked: boolean
  onVote: (nodeId: string, value: number) => void
  onSelectNode: (nodeId: string) => void
}

export interface RoomBoardProps {
  roomState: RoomState
  userId: string
  isHost: boolean
  onCreateNode: (node: Omit<MindNode, 'votes' | 'created_at'>) => void
  onUpdateNode: (nodeId: string, updates: Partial<MindNode>) => void
  onVote: (nodeId: string, value: number) => void
  onAddComment: (nodeId: string, comment: Comment) => void
  selectedNodeId: string | null
  onSelectNode: (nodeId: string | null) => void
  votingLocked: boolean
}
