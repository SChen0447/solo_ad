export type AnnotationType = 'suggestion' | 'error' | 'question';

export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string;
  selection: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  codeSnippet: string;
  createdAt: string;
  submissionId: string;
}

export interface CodeSubmission {
  id: string;
  code: string;
  createdAt: string;
}

export interface DiffResult {
  diffImage: string;
  diffPixels: number;
  diffRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export type ViewMode = 'preview' | 'annotate' | 'diff';
