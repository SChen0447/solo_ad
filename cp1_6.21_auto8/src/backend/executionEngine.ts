import { v4 as uuidv4 } from 'uuid';
import { Pipeline, PipelineNode, PipelineEdge, ExecutionRecord, NodeExecutionLog, NodeType } from '../frontend/types';

interface NodeExecutorResult {
  success: boolean;
  output: any;
  error?: string;
  duration: number;
}

type NodeExecutor = (node: PipelineNode, input: any) => Promise<NodeExecutorResult>;

const nodeExecutors: Record<NodeType, NodeExecutor> = {
  'file-watcher': async (node, input) => {
    const startTime = Date.now();
    const delay = 500 + Math.random() * 300;
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
      success: true,
      output: {
        files: ['image1.jpg', 'image2.png', 'document.pdf', 'data.json'].slice(0, Math.floor(Math.random() * 4) + 1),
        watchPath: node.config.filePath as string || './uploads',
        timestamp: new Date().toISOString(),
      },
      duration: Date.now() - startTime,
    };
  },

  'image-compress': async (node, input) => {
    const startTime = Date.now();
    const quality = (node.config.quality as number) || 80;
    const delay = 800 + Math.random() * 700;
    await new Promise(resolve => setTimeout(resolve, delay));
    const files = input?.files || ['image1.jpg', 'image2.png'];
    return {
      success: true,
      output: {
        compressedFiles: files.map((f: string) => `compressed_${f}`),
        savedBytes: Math.floor(Math.random() * 5000000) + 100000,
        originalSize: Math.floor(Math.random() * 10000000) + 2000000,
        compressionRatio: (100 - quality + Math.random() * 20).toFixed(1) + '%',
      },
      duration: Date.now() - startTime,
    };
  },

  'email-send': async (node, input) => {
    const startTime = Date.now();
    const delay = 300 + Math.random() * 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    const success = Math.random() > 0.1;
    return {
      success,
      output: success
        ? {
            sent: true,
            messageId: uuidv4(),
            to: node.config.to as string,
            subject: node.config.subject as string,
            timestamp: new Date().toISOString(),
          }
        : undefined,
      error: success ? undefined : 'SMTP connection timeout: failed to send email after 3 attempts',
      duration: Date.now() - startTime,
    };
  },

  'http-request': async (node, input) => {
    const startTime = Date.now();
    const delay = 200 + Math.random() * 800;
    await new Promise(resolve => setTimeout(resolve, delay));
    const success = Math.random() > 0.05;
    return {
      success,
      output: success
        ? {
            status: 200,
            response: {
              ok: true,
              data: { id: uuidv4(), result: 'processed', timestamp: new Date().toISOString() },
            },
            url: node.config.url as string,
            method: node.config.method as string,
          }
        : undefined,
      error: success ? undefined : 'Request failed with status 500: Internal Server Error',
      duration: Date.now() - startTime,
    };
  },

  'file-convert': async (node, input) => {
    const startTime = Date.now();
    const delay = 600 + Math.random() * 600;
    await new Promise(resolve => setTimeout(resolve, delay));
    const files = input?.files || input?.compressedFiles || ['document.pdf'];
    const toFormat = node.config.toFormat as string;
    return {
      success: true,
      output: {
        convertedFiles: files.map((f: string) => f.replace(/\.[^/.]+$/, `.${toFormat}`)),
        fromFormat: node.config.fromFormat as string,
        toFormat,
        count: files.length,
      },
      duration: Date.now() - startTime,
    };
  },

  'delay': async (node, input) => {
    const startTime = Date.now();
    const duration = (node.config.durationMs as number) || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
    return {
      success: true,
      output: { ...input, delayed: true, delayDuration: duration },
      duration: Date.now() - startTime,
    };
  },

  'notification': async (node, input) => {
    const startTime = Date.now();
    const delay = 200 + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
      success: true,
      output: {
        delivered: true,
        channel: node.config.channel as string || 'email',
        title: node.config.title as string,
        message: node.config.message as string,
        timestamp: new Date().toISOString(),
      },
      duration: Date.now() - startTime,
    };
  },
};

function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const inDegree: Record<string, number> = {};
  const adjacencyList: Record<string, string[]> = {};

  nodes.forEach(node => {
    inDegree[node.id] = 0;
    adjacencyList[node.id] = [];
  });

  edges.forEach(edge => {
    adjacencyList[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  const queue: string[] = Object.keys(inDegree).filter(id => inDegree[id] === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    adjacencyList[current].forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  if (result.length !== nodes.length) {
    throw new Error('Cycle detected in pipeline graph');
  }

  return result;
}

function getExecutionPath(edges: PipelineEdge[], nodeIds: string[]): string[][] {
  const pathMap: Record<string, string[]> = {};
  const edgeMap: Record<string, string[]> = {};

  edges.forEach(edge => {
    if (!edgeMap[edge.source]) {
      edgeMap[edge.source] = [];
    }
    edgeMap[edge.source].push(edge.target);
  });

  nodeIds.forEach(nodeId => {
    pathMap[nodeId] = [nodeId];
  });

  nodeIds.forEach(nodeId => {
    if (edgeMap[nodeId]) {
      edgeMap[nodeId].forEach(targetId => {
        pathMap[targetId] = [...pathMap[nodeId], targetId];
      });
    }
  });

  return Object.values(pathMap);
}

export interface ExecutionCallbacks {
  onNodeStart: (executionId: string, nodeId: string) => void;
  onNodeComplete: (executionId: string, nodeId: string, output: any, duration: number) => void;
  onNodeError: (executionId: string, nodeId: string, error: string, duration: number) => void;
  onPipelineComplete: (executionId: string, status: 'success' | 'failed', totalDuration: number) => void;
  onLog: (executionId: string, log: NodeExecutionLog) => void;
}

export class ExecutionEngine {
  private executions: Record<string, ExecutionRecord> = {};

  async executePipeline(
    pipeline: Pipeline,
    triggeredBy: 'manual' | 'cron' | 'file',
    callbacks: ExecutionCallbacks
  ): Promise<ExecutionRecord> {
    const executionId = uuidv4();
    const startTime = Date.now();

    const executionRecord: ExecutionRecord = {
      id: executionId,
      pipelineId: pipeline.id,
      status: 'running',
      startTime: new Date().toISOString(),
      nodeLogs: [],
      triggeredBy,
    };

    this.executions[executionId] = executionRecord;

    try {
      const sortedNodeIds = topologicalSort(pipeline.nodes, pipeline.edges);
      const nodeMap: Record<string, PipelineNode> = {};
      const nodeOutputs: Record<string, any> = {};

      pipeline.nodes.forEach(node => {
        nodeMap[node.id] = node;
      });

      const inputEdgesMap: Record<string, string[]> = {};
      pipeline.edges.forEach(edge => {
        if (!inputEdgesMap[edge.target]) {
          inputEdgesMap[edge.target] = [];
        }
        inputEdgesMap[edge.target].push(edge.source);
      });

      for (const nodeId of sortedNodeIds) {
        const node = nodeMap[nodeId];

        const nodeLog: NodeExecutionLog = {
          nodeId,
          nodeType: node.type,
          status: 'running',
          input: null,
          startTime: new Date().toISOString(),
        };

        const inputSources = inputEdgesMap[nodeId] || [];
        if (inputSources.length > 0) {
          nodeLog.input = inputSources.length === 1
            ? nodeOutputs[inputSources[0]]
            : Object.fromEntries(inputSources.map(src => [src, nodeOutputs[src]]));
        }

        callbacks.onNodeStart(executionId, nodeId);

        const executor = nodeExecutors[node.type];
        const result = await executor(node, nodeLog.input);

        nodeLog.endTime = new Date().toISOString();
        nodeLog.duration = result.duration;

        if (result.success) {
          nodeLog.status = 'success';
          nodeLog.output = result.output;
          nodeOutputs[nodeId] = result.output;
          callbacks.onNodeComplete(executionId, nodeId, result.output, result.duration);
        } else {
          nodeLog.status = 'failed';
          nodeLog.error = result.error;
          callbacks.onNodeError(executionId, nodeId, result.error!, result.duration);
          executionRecord.status = 'failed';
          executionRecord.endTime = new Date().toISOString();
          executionRecord.totalDuration = Date.now() - startTime;
          executionRecord.nodeLogs.push(nodeLog);
          callbacks.onLog(executionId, nodeLog);
          callbacks.onPipelineComplete(executionId, 'failed', executionRecord.totalDuration);
          this.executions[executionId] = executionRecord;
          return executionRecord;
        }

        executionRecord.nodeLogs.push(nodeLog);
        callbacks.onLog(executionId, nodeLog);
      }

      executionRecord.status = 'success';
      executionRecord.endTime = new Date().toISOString();
      executionRecord.totalDuration = Date.now() - startTime;
      callbacks.onPipelineComplete(executionId, 'success', executionRecord.totalDuration);

    } catch (error) {
      executionRecord.status = 'failed';
      executionRecord.endTime = new Date().toISOString();
      executionRecord.totalDuration = Date.now() - startTime;
      callbacks.onPipelineComplete(executionId, 'failed', executionRecord.totalDuration);
    }

    this.executions[executionId] = executionRecord;
    return executionRecord;
  }

  getExecution(executionId: string): ExecutionRecord | undefined {
    return this.executions[executionId];
  }

  getAllExecutions(pipelineId?: string): ExecutionRecord[] {
    const records = Object.values(this.executions);
    if (pipelineId) {
      return records.filter(r => r.pipelineId === pipelineId);
    }
    return records.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  getExecutionPath(edges: PipelineEdge[], nodeIds: string[]): string[][] {
    return getExecutionPath(edges, nodeIds);
  }
}

export const executionEngine = new ExecutionEngine();
