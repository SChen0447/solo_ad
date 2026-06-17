export interface DialogueOption {
  text: string;
  nextNodeId: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  backgroundIndex: number;
  options: DialogueOption[];
  x: number;
  y: number;
}

export interface DialogueTree {
  nodes: DialogueNode[];
  rootNodeId: string;
}

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface NodeConnection {
  fromNodeId: string;
  toNodeId: string;
  bendPoints: ConnectionPoint[];
  optionIndex: number;
}
