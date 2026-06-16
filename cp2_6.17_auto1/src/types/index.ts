export interface Score {
  rating: number;
  description: string;
}

export interface TechSolution {
  id: string;
  name: string;
  version: string;
  advantages: string[];
  disadvantages: string[];
  tags: string[];
  scores: { [dimension: string]: Score };
}

export interface Vote {
  solutionId: string;
  voteType: 'support' | 'oppose' | 'abstain';
  voterId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  shortCode: string;
  solutions: TechSolution[];
  votes: Vote[];
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  shortCode: string;
  solutionCount: number;
  voteCount: number;
}

export interface VoteResult {
  projectId: string;
  totalVotes: number;
  results: {
    [solutionId: string]: {
      support: number;
      oppose: number;
      abstain: number;
    };
  };
}

export const DIMENSIONS = ['性能', '学习曲线', '社区活跃度', '生态系统', '部署难度'] as const;
export type Dimension = typeof DIMENSIONS[number];
