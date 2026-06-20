export interface Note {
  id: string;
  title: string;
  date: string;
  summary: string;
  content: string;
  highlights: Highlight[];
  tags: Tag[];
  timestamps: Timestamp[];
  filePath: string;
}

export interface Timestamp {
  time: string;
  text: string;
}

export interface Highlight {
  start: number;
  end: number;
  text: string;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}
