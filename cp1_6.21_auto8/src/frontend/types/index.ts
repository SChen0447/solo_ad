export type NodeType =
  | 'file-watcher'
  | 'image-compress'
  | 'email-send'
  | 'http-request'
  | 'file-convert'
  | 'delay'
  | 'notification';

export interface NodeConfig {
  [key: string]: string | number | boolean | string[];
}

export interface PipelineNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: NodeConfig;
  label: string;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  trigger: {
    type: 'manual' | 'cron' | 'file';
    cronExpression?: string;
    filePath?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NodeExecutionLog {
  nodeId: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'success' | 'failed';
  input: any;
  output?: any;
  error?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface ExecutionRecord {
  id: string;
  pipelineId: string;
  status: 'running' | 'success' | 'failed';
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  nodeLogs: NodeExecutionLog[];
  triggeredBy: 'manual' | 'cron' | 'file';
}

export interface NodeTemplate {
  type: NodeType;
  label: string;
  icon: string;
  category: string;
  description: string;
  defaultConfig: NodeConfig;
  configFields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'password';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  description?: string;
}

export type NodeStatusMap = Record<string, 'pending' | 'running' | 'success' | 'failed'>;
