export interface StoryNode {
  id: string;
  projectId: string;
  parentId: string | null;
  author: string;
  content: string;
  summary: string;
  branchIndex: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  targetWordCount: number;
  versions: NodeVersion[];
}

export interface NodeVersion {
  id: string;
  nodeId: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

export interface InspirationCard {
  id: string;
  type: 'character' | 'scene' | 'event';
  title: string;
  content: string;
  keywords: string[];
}

export interface StoryProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  nodes: StoryNode[];
  members: string[];
}
