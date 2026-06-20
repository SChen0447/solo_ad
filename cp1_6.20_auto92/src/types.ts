export interface Step {
  id: string;
  name: string;
  description: string;
  duration: number;
  hasTimer: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  createdAt: number;
}

export type ViewMode = 'list' | 'detail' | 'cooking';
