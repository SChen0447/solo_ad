export interface Experiment {
  id: string;
  name: string;
  date: string;
  leader: string;
  description: string;
  order: number;
  createdAt: string;
}

export interface Step {
  id: string;
  experimentId: string;
  name: string;
  startTime: string;
  endTime: string;
  expectedResult: string;
  actualResult: string;
  order: number;
  attachments: Attachment[];
  completed: boolean;
}

export interface Attachment {
  id: string;
  stepId: string;
  filename: string;
  originalName: string;
  mimetype: string;
  path: string;
  url: string;
}

export type RecordType = 'numeric' | 'text' | 'boolean' | 'enum';

export interface DataRecord {
  id: string;
  stepId: string;
  type: RecordType;
  value: string;
  timestamp: string;
  enumOptions?: string[];
}

export interface ReportData {
  experiment: Experiment;
  steps: Step[];
  recordsByStep: Record<string, DataRecord[]>;
  conclusion?: string;
}
