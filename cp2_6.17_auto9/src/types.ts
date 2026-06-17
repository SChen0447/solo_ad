export interface TechOption {
  id: string;
  name: string;
  version: string;
  advantages: string[];
  disadvantages: string[];
  tags: string[];
  ratings: Record<string, number>;
  ratingNotes: Record<string, string>;
}

export interface VoteRecord {
  optionId: string;
  vote: 'support' | 'oppose' | 'abstain';
}

export interface Project {
  id: string;
  shortCode: string;
  name: string;
  description: string;
  options: TechOption[];
  votes: VoteRecord[];
  createdAt: string;
  createdBy: string;
}

export interface Dimension {
  key: string;
  label: string;
}
