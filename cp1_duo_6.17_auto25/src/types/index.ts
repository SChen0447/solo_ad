export type FileType = 'component' | 'util' | 'config' | 'style' | 'other';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileType;
  lineCount: number;
  imports: string[];
  importedBy: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  radius: number;
  vx?: number;
  vy?: number;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  depth: number;
}

export interface ParseResult {
  nodes: FileNode[];
  edges: DependencyEdge[];
  stats: {
    totalFiles: number;
    totalDependencies: number;
    fileTypes: Record<FileType, number>;
  };
}

export interface UploadedFile {
  name: string;
  size: number;
  lastModified: Date;
  file: File;
}

export const FILE_TYPE_COLORS: Record<FileType, string> = {
  component: '#4a9eff',
  util: '#4ade80',
  config: '#f97316',
  style: '#a855f7',
  other: '#6b7280'
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  component: '组件',
  util: '工具函数',
  config: '配置文件',
  style: '样式文件',
  other: '其他'
};
