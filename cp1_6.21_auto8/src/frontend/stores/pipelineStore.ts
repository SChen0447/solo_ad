import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  NodeConfig,
  ExecutionRecord,
  NodeExecutionLog,
  NodeStatusMap,
  NodeTemplate,
  NodeType,
} from '../types';

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'file-watcher',
    label: '文件监听',
    icon: 'FolderOpen',
    category: '触发器',
    description: '监听指定目录的文件变化',
    defaultConfig: {
      filePath: './uploads',
      interval: 5000,
    },
    configFields: [
      { key: 'filePath', label: '监听路径', type: 'text', placeholder: './uploads', required: true },
      { key: 'interval', label: '检查间隔(ms)', type: 'number', placeholder: '5000', required: true },
    ],
  },
  {
    type: 'image-compress',
    label: '图片压缩',
    icon: 'Image',
    category: '处理',
    description: '批量压缩图片，支持调整质量和格式',
    defaultConfig: {
      quality: 80,
      maxWidth: 1920,
      format: 'webp',
    },
    configFields: [
      { key: 'quality', label: '压缩质量(1-100)', type: 'number', placeholder: '80', required: true },
      { key: 'maxWidth', label: '最大宽度(px)', type: 'number', placeholder: '1920' },
      {
        key: 'format',
        label: '输出格式',
        type: 'select',
        options: [
          { value: 'webp', label: 'WebP' },
          { value: 'jpg', label: 'JPEG' },
          { value: 'png', label: 'PNG' },
        ],
        required: true,
      },
    ],
  },
  {
    type: 'email-send',
    label: '发送邮件',
    icon: 'Mail',
    category: '通知',
    description: '向指定收件人发送邮件',
    defaultConfig: {
      to: 'user@example.com',
      subject: '工作流通知',
      template: 'default',
    },
    configFields: [
      { key: 'to', label: '收件人', type: 'text', placeholder: 'user@example.com', required: true },
      { key: 'subject', label: '邮件主题', type: 'text', placeholder: '工作流通知', required: true },
      { key: 'template', label: '邮件模板', type: 'text', placeholder: 'default' },
    ],
  },
  {
    type: 'http-request',
    label: 'HTTP请求',
    icon: 'Globe',
    category: '处理',
    description: '发送HTTP请求获取或提交数据',
    defaultConfig: {
      url: 'https://api.example.com',
      method: 'GET',
      headers: '{}',
      body: '',
    },
    configFields: [
      { key: 'url', label: '请求URL', type: 'text', placeholder: 'https://api.example.com', required: true },
      {
        key: 'method',
        label: '请求方法',
        type: 'select',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
        ],
        required: true,
      },
      { key: 'headers', label: '请求头(JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer xxx"}' },
      { key: 'body', label: '请求体', type: 'textarea', placeholder: '' },
    ],
  },
  {
    type: 'file-convert',
    label: '格式转换',
    icon: 'FileDown',
    category: '处理',
    description: '将文件从一种格式转换为另一种',
    defaultConfig: {
      fromFormat: 'pdf',
      toFormat: 'docx',
    },
    configFields: [
      {
        key: 'fromFormat',
        label: '源格式',
        type: 'select',
        options: [
          { value: 'pdf', label: 'PDF' },
          { value: 'docx', label: 'Word' },
          { value: 'xlsx', label: 'Excel' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ],
        required: true,
      },
      {
        key: 'toFormat',
        label: '目标格式',
        type: 'select',
        options: [
          { value: 'pdf', label: 'PDF' },
          { value: 'docx', label: 'Word' },
          { value: 'xlsx', label: 'Excel' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
        required: true,
      },
    ],
  },
  {
    type: 'delay',
    label: '延迟等待',
    icon: 'Clock',
    category: '控制',
    description: '延迟指定时间后继续执行',
    defaultConfig: {
      durationMs: 1000,
    },
    configFields: [
      { key: 'durationMs', label: '延迟时间(ms)', type: 'number', placeholder: '1000', required: true },
    ],
  },
  {
    type: 'notification',
    label: '系统通知',
    icon: 'Bell',
    category: '通知',
    description: '发送系统通知或消息',
    defaultConfig: {
      title: '任务完成',
      message: '工作流已成功执行',
      channel: 'email',
    },
    configFields: [
      { key: 'title', label: '通知标题', type: 'text', placeholder: '任务完成', required: true },
      { key: 'message', label: '通知内容', type: 'textarea', placeholder: '工作流已成功执行', required: true },
      {
        key: 'channel',
        label: '通知渠道',
        type: 'select',
        options: [
          { value: 'email', label: '邮件' },
          { value: 'sms', label: '短信' },
          { value: 'webhook', label: 'Webhook' },
        ],
        required: true,
      },
    ],
  },
];

interface PipelineState {
  pipelines: Pipeline[];
  currentPipelineId: string | null;
  selectedNodeId: string | null;
  nodeStatus: NodeStatusMap;
  executions: ExecutionRecord[];
  currentExecutionId: string | null;
  highlightedNodeIds: string[];
  isExecuting: boolean;
  nodeTemplates: NodeTemplate[];
  leftPanelCollapsed: boolean;
  configPanelOpen: boolean;

  setPipelines: (pipelines: Pipeline[]) => void;
  setCurrentPipelineId: (id: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (source: string, target: string) => void;
  deleteEdge: (edgeId: string) => void;
  setNodeStatus: (nodeId: string, status: 'pending' | 'running' | 'success' | 'failed') => void;
  clearNodeStatus: () => void;
  addExecution: (execution: ExecutionRecord) => void;
  updateExecution: (executionId: string, updates: Partial<ExecutionRecord>) => void;
  addNodeLog: (executionId: string, log: NodeExecutionLog) => void;
  setCurrentExecutionId: (id: string | null) => void;
  highlightExecutionPath: (executionId: string) => void;
  clearHighlight: () => void;
  setIsExecuting: (executing: boolean) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setConfigPanelOpen: (open: boolean) => void;
  saveCurrentPipeline: () => Promise<void>;
  triggerExecution: () => Promise<void>;
  loadExecutions: () => Promise<void>;
  getCurrentPipeline: () => Pipeline | null;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: [],
  currentPipelineId: null,
  selectedNodeId: null,
  nodeStatus: {},
  executions: [],
  currentExecutionId: null,
  highlightedNodeIds: [],
  isExecuting: false,
  nodeTemplates: NODE_TEMPLATES,
  leftPanelCollapsed: false,
  configPanelOpen: false,

  setPipelines: (pipelines) => set({ pipelines }),

  setCurrentPipelineId: (id) => set({ currentPipelineId: id, selectedNodeId: null, configPanelOpen: false }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, configPanelOpen: nodeId !== null }),

  addNode: (type, position) => {
    const template = NODE_TEMPLATES.find(t => t.type === type);
    if (!template) return;

    const newNode: PipelineNode = {
      id: `node-${uuidv4().slice(0, 8)}`,
      type,
      position,
      config: { ...template.defaultConfig },
      label: template.label,
    };

    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === state.currentPipelineId
          ? { ...p, nodes: [...p.nodes, newNode], updatedAt: new Date().toISOString() }
          : p
      ),
      selectedNodeId: newNode.id,
      configPanelOpen: true,
    }));
  },

  updateNodePosition: (nodeId, position) =>
    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === state.currentPipelineId
          ? {
              ...p,
              nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === state.currentPipelineId
          ? {
              ...p,
              nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, config } : n)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),

  deleteNode: (nodeId) =>
    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === state.currentPipelineId
          ? {
              ...p,
              nodes: p.nodes.filter((n) => n.id !== nodeId),
              edges: p.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      configPanelOpen: state.selectedNodeId === nodeId ? false : state.configPanelOpen,
    })),

  addEdge: (source, target) => {
    const state = get();
    const currentPipeline = state.pipelines.find(p => p.id === state.currentPipelineId);
    if (!currentPipeline) return;

    const existingEdge = currentPipeline.edges.find(
      (e) => e.source === source && e.target === target
    );
    if (existingEdge) return;

    const newEdge: PipelineEdge = {
      id: `edge-${uuidv4().slice(0, 8)}`,
      source,
      target,
    };

    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === state.currentPipelineId
          ? { ...p, edges: [...p.edges, newEdge], updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  },

  deleteEdge: (edgeId) =>
    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === state.currentPipelineId
          ? { ...p, edges: p.edges.filter((e) => e.id !== edgeId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),

  setNodeStatus: (nodeId, status) =>
    set((state) => ({
      nodeStatus: { ...state.nodeStatus, [nodeId]: status },
    })),

  clearNodeStatus: () => set({ nodeStatus: {} }),

  addExecution: (execution) =>
    set((state) => ({
      executions: [execution, ...state.executions],
    })),

  updateExecution: (executionId, updates) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.id === executionId ? { ...e, ...updates } : e
      ),
    })),

  addNodeLog: (executionId, log) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.id === executionId
          ? { ...e, nodeLogs: [...e.nodeLogs.filter(l => l.nodeId !== log.nodeId), log] }
          : e
      ),
    })),

  setCurrentExecutionId: (id) => set({ currentExecutionId: id }),

  highlightExecutionPath: (executionId) => {
    const state = get();
    const execution = state.executions.find(e => e.id === executionId);
    if (execution) {
      set({
        highlightedNodeIds: execution.nodeLogs.map(log => log.nodeId),
        currentExecutionId: executionId,
      });
    }
  },

  clearHighlight: () => set({ highlightedNodeIds: [], currentExecutionId: null }),

  setIsExecuting: (executing) => set({ isExecuting: executing }),

  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),

  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),

  getCurrentPipeline: () => {
    const state = get();
    return state.pipelines.find(p => p.id === state.currentPipelineId) || null;
  },

  saveCurrentPipeline: async () => {
    const state = get();
    const pipeline = state.getCurrentPipeline();
    if (!pipeline) return;

    try {
      const response = await fetch(`/api/pipelines/${pipeline.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipeline),
      });
      if (!response.ok) throw new Error('Failed to save pipeline');
    } catch (error) {
      console.error('Save pipeline error:', error);
    }
  },

  triggerExecution: async () => {
    const state = get();
    const pipelineId = state.currentPipelineId;
    if (!pipelineId) return;

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/trigger`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to trigger execution');
    } catch (error) {
      console.error('Trigger execution error:', error);
    }
  },

  loadExecutions: async () => {
    const state = get();
    const pipelineId = state.currentPipelineId;
    try {
      const url = pipelineId
        ? `/api/executions?pipelineId=${pipelineId}`
        : '/api/executions';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load executions');
      const executions = await response.json();
      set({ executions });
    } catch (error) {
      console.error('Load executions error:', error);
    }
  },
}));
