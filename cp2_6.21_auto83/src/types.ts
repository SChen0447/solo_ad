export interface Evaluation {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface Instrument {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: '全新' | '9成新' | '8成新';
  price: number;
  images: string[];
  description: string;
  createdAt: string;
  evaluations: Evaluation[];
}

export type InstrumentSummary = Omit<Instrument, 'evaluations'> & {
  avgRating: number;
  evaluationCount: number;
};

export interface EvaluationInput {
  rating: number;
  content: string;
}

export interface InstrumentInput {
  name: string;
  brand: string;
  category: string;
  condition: '全新' | '9成新' | '8成新';
  price: number;
  images: string[];
  description: string;
}
