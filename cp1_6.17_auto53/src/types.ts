export interface PersonalityParams {
  extroversion: number;
  friendliness: number;
  humor: number;
  patience: number;
  curiosity: number;
}

export interface NPCData {
  id: string;
  name: string;
  personality: PersonalityParams;
  avatarExpression: string;
  dialogueTree: DialogueNode | null;
}

export interface DialogueNode {
  id: string;
  text: string;
  personalityFit: number;
  children: DialogueNode[];
  nodeType: 'root' | 'branch' | 'leaf';
  position?: { x: number; y: number };
}

export interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    personalityFit: number;
    nodeType: 'root' | 'branch' | 'leaf';
    npcId: string;
  };
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  style?: React.CSSProperties;
}

export interface GenerateRequest {
  npcId: string;
  personality: PersonalityParams;
  parentText?: string;
  depth?: number;
}

export interface UpdateNodeRequest {
  npcId: string;
  nodeId: string;
  text: string;
}

export interface AddChildRequest {
  npcId: string;
  parentId: string;
  text: string;
  personality: PersonalityParams;
}
