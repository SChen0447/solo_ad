import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  FolderOpen,
  Image,
  Mail,
  Globe,
  FileDown,
  Clock,
  Bell,
  ChevronLeft,
  ChevronRight,
  Play,
  Save,
  Trash2,
  Zap,
} from 'lucide-react';
import { usePipelineStore } from '../stores/pipelineStore';
import { NodeType, NodeStatusMap } from '../types';

const iconMap: Record<string, React.FC<any>> = {
  FolderOpen,
  Image,
  Mail,
  Globe,
  FileDown,
  Clock,
  Bell,
};

const nodeTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  'file-watcher': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  'image-compress': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  'email-send': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  'http-request': { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
  'file-convert': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  'delay': { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
  'notification': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
};

const statusBorderColors: Record<string, string> = {
  pending: '',
  running: '!border-amber-400 shadow-glow-amber',
  success: '!border-emerald-400 shadow-glow-emerald',
  failed: '!border-red-400 shadow-glow-red',
};

interface CustomNodeProps extends NodeProps {
  data: {
    label: string;
    type: NodeType;
    icon: string;
    status?: 'pending' | 'running' | 'success' | 'failed';
    isHighlighted?: boolean;
  };
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const Icon = iconMap[data.icon] || Zap;
  const colors = nodeTypeColors[data.type] || nodeTypeColors['delay'];
  const statusColor = data.status ? statusBorderColors[data.status] : '';
  const highlighted = data.isHighlighted ? 'ring-2 ring-primary-400 ring-offset-2' : '';

  return (
    <div
      className={`
        min-w-[160px] rounded-xl border-2 ${colors.border} ${colors.bg}
        shadow-lg transition-all duration-150
        ${selected ? 'ring-2 ring-primary-400 ring-offset-2 shadow-glow-emerald' : ''}
        ${statusColor}
        ${highlighted}
        hover:shadow-xl
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slateblue-400 !border-2 !border-white"
      />
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-sm ${colors.text} truncate`}>
              {data.label}
            </div>
            <div className="text-xs text-slateblue-500 capitalize">
              {data.type.replace('-', ' ')}
            </div>
          </div>
        </div>
        {data.status && data.status !== 'pending' && (
          <div className={`mt-2 text-xs font-medium ${
            data.status === 'running' ? 'text-amber-600' :
            data.status === 'success' ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {data.status === 'running' ? '执行中...' :
             data.status === 'success' ? '✓ 成功' : '✕ 失败'}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary-400 !border-2 !border-white"
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

interface NodePanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NodePanel: React.FC<NodePanelProps> = ({ collapsed, onToggle }) => {
  const { nodeTemplates, addNode } = usePipelineStore();
  const { screenToFlowPosition } = useReactFlow();

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow/type') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, typeof nodeTemplates> = {};
    nodeTemplates.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [nodeTemplates]);

  if (collapsed) {
    return (
      <div
        className="h-full bg-white border-r border-slateblue-200 flex flex-col items-center py-4 gap-3"
        style={{ width: '56px' }}
      >
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-slateblue-100 text-slateblue-500 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        {nodeTemplates.map((template) => {
          const Icon = iconMap[template.icon] || Zap;
          const colors = nodeTypeColors[template.type];
          return (
            <div
              key={template.type}
              draggable
              onDragStart={(e) => onDragStart(e, template.type)}
              className={`p-2 rounded-lg ${colors.bg} ${colors.text} cursor-grab active:cursor-grabbing hover:scale-110 transition-transform`}
              title={template.label}
            >
              <Icon size={20} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="h-full bg-white border-r border-slateblue-200 flex flex-col"
      style={{ width: '280px' }}
    >
      <div className="p-4 border-b border-slateblue-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slateblue-800">组件面板</h2>
          <p className="text-xs text-slateblue-500 mt-0.5">拖拽节点到画布</p>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-slateblue-100 text-slateblue-500 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3" onDrop={onDrop} onDragOver={onDragOver}>
        {Object.entries(groupedTemplates).map(([category, templates]) => (
          <div key={category} className="mb-4">
            <h3 className="text-xs font-semibold text-slateblue-500 uppercase tracking-wider mb-2 px-1">
              {category}
            </h3>
            <div className="space-y-2">
              {templates.map((template) => {
                const Icon = iconMap[template.icon] || Zap;
                const colors = nodeTypeColors[template.type];
                return (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, template.type)}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.bg}
                      cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02]
                      transition-all duration-150
                    `}
                  >
                    <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${colors.text}`}>
                        {template.label}
                      </div>
                      <div className="text-xs text-slateblue-500 truncate">
                        {template.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ToolbarProps {
  onRun: () => void;
  onSave: () => void;
  onClear: () => void;
  isExecuting: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onRun, onSave, onClear, isExecuting }) => {
  const { getCurrentPipeline, clearNodeStatus, clearHighlight } = usePipelineStore();
  const pipeline = getCurrentPipeline();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slateblue-200 px-4 py-2">
      <div className="flex items-center gap-2 pr-3 border-r border-slateblue-200">
        <Zap className="text-primary-500" size={20} />
        <div className="min-w-[120px]">
          <div className="font-semibold text-sm text-slateblue-800 truncate">
            {pipeline?.name || '未命名管道'}
          </div>
          <div className="text-xs text-slateblue-500">
            {pipeline?.nodes.length || 0} 个节点
          </div>
        </div>
      </div>
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slateblue-600 hover:bg-slateblue-100 transition-colors"
        title="保存管道"
      >
        <Save size={16} />
        保存
      </button>
      <button
        onClick={() => {
          clearNodeStatus();
          clearHighlight();
          onClear();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slateblue-600 hover:bg-slateblue-100 transition-colors"
        title="清空状态"
      >
        <Trash2 size={16} />
        重置
      </button>
      <div className="w-px h-6 bg-slateblue-200" />
      <button
        onClick={onRun}
        disabled={isExecuting || !pipeline || pipeline.nodes.length === 0}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
          ${isExecuting || !pipeline || pipeline.nodes.length === 0
            ? 'bg-slateblue-200 text-slateblue-400 cursor-not-allowed'
            : 'bg-primary-500 text-white hover:bg-primary-600 shadow-md hover:shadow-lg'
          }
        `}
      >
        <Play size={16} className={isExecuting ? 'animate-pulse' : ''} />
        {isExecuting ? '执行中...' : '运行管道'}
      </button>
    </div>
  );
};

interface PipelineCanvasInnerProps {
  socket: any;
  currentExecutionId: string | null;
}

const PipelineCanvasInner: React.FC<PipelineCanvasInnerProps> = ({ socket, currentExecutionId }) => {
  const {
    pipelines,
    currentPipelineId,
    selectedNodeId,
    nodeStatus,
    highlightedNodeIds,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    selectNode,
    updateNodePosition,
    deleteNode,
    addEdge: storeAddEdge,
    deleteEdge,
    setNodeStatus,
    clearNodeStatus,
    setIsExecuting,
    addExecution,
    updateExecution,
    addNodeLog,
    saveCurrentPipeline,
    triggerExecution,
    getCurrentPipeline,
    clearHighlight,
  } = usePipelineStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);

  useEffect(() => {
    if (!currentPipeline) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const flowNodes: Node[] = currentPipeline.nodes.map(node => {
      const template = usePipelineStore.getState().nodeTemplates.find(t => t.type === node.type);
      return {
        id: node.id,
        type: 'custom',
        position: node.position,
        data: {
          label: node.label,
          type: node.type,
          icon: template?.icon || 'Zap',
          status: nodeStatus[node.id] || 'pending',
          isHighlighted: highlightedNodeIds.includes(node.id),
        },
      };
    });

    const flowEdges: Edge[] = currentPipeline.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: nodeStatus[edge.target] === 'running',
      style: {
        stroke: nodeStatus[edge.target] === 'running' ? '#f59e0b' :
               nodeStatus[edge.target] === 'success' ? '#10b981' :
               nodeStatus[edge.target] === 'failed' ? '#ef4444' : '#94a3b8',
        strokeWidth: 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [currentPipeline, nodeStatus, highlightedNodeIds, setNodes, setEdges]);

  useEffect(() => {
    if (!socket) return;

    socket.on('node:start', (data: { executionId: string; nodeId: string }) => {
      if (data.executionId === currentExecutionId || currentExecutionId === null) {
        setNodeStatus(data.nodeId, 'running');
        setIsExecuting(true);
      }
    });

    socket.on('node:complete', (data: { executionId: string; nodeId: string; output: any; duration: number }) => {
      if (data.executionId === currentExecutionId || currentExecutionId === null) {
        setNodeStatus(data.nodeId, 'success');
        const execution = usePipelineStore.getState().executions.find(e => e.id === data.executionId);
        if (execution) {
          addNodeLog(data.executionId, {
            nodeId: data.nodeId,
            nodeType: currentPipeline?.nodes.find(n => n.id === data.nodeId)?.type || 'delay',
            status: 'success',
            input: null,
            output: data.output,
            startTime: new Date(Date.now() - data.duration).toISOString(),
            endTime: new Date().toISOString(),
            duration: data.duration,
          });
        }
      }
    });

    socket.on('node:error', (data: { executionId: string; nodeId: string; error: string; duration: number }) => {
      if (data.executionId === currentExecutionId || currentExecutionId === null) {
        setNodeStatus(data.nodeId, 'failed');
        const execution = usePipelineStore.getState().executions.find(e => e.id === data.executionId);
        if (execution) {
          addNodeLog(data.executionId, {
            nodeId: data.nodeId,
            nodeType: currentPipeline?.nodes.find(n => n.id === data.nodeId)?.type || 'delay',
            status: 'failed',
            input: null,
            error: data.error,
            startTime: new Date(Date.now() - data.duration).toISOString(),
            endTime: new Date().toISOString(),
            duration: data.duration,
          });
        }
      }
    });

    socket.on('pipeline:complete', (data: { executionId: string; status: string; totalDuration: number }) => {
      setIsExecuting(false);
      updateExecution(data.executionId, {
        status: data.status as 'success' | 'failed',
        endTime: new Date().toISOString(),
        totalDuration: data.totalDuration,
      });
    });

    socket.on('execution:log', (log: any) => {
      addNodeLog(log.executionId, log);
    });

    return () => {
      socket.off('node:start');
      socket.off('node:complete');
      socket.off('node:error');
      socket.off('pipeline:complete');
      socket.off('execution:log');
    };
  }, [socket, currentExecutionId, setNodeStatus, setIsExecuting, updateExecution, addNodeLog, currentPipeline]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        storeAddEdge(params.source, params.target);
      }
    },
    [storeAddEdge]
  );

  const handleRun = useCallback(() => {
    clearNodeStatus();
    clearHighlight();
    const pipeline = getCurrentPipeline();
    if (pipeline) {
      addExecution({
        id: `exec-${Date.now()}`,
        pipelineId: pipeline.id,
        status: 'running',
        startTime: new Date().toISOString(),
        nodeLogs: [],
        triggeredBy: 'manual',
      });
      triggerExecution();
    }
  }, [clearNodeStatus, clearHighlight, getCurrentPipeline, addExecution, triggerExecution]);

  const handleClear = useCallback(() => {
    if (currentPipeline) {
      setNodes(prev => prev.map(n => ({
        ...n,
        data: { ...n.data, status: 'pending' }
      })));
    }
  }, [currentPipeline, setNodes]);

  if (!currentPipeline) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slateblue-50">
        <div className="text-center">
          <Zap size={64} className="mx-auto text-slateblue-300 mb-4" />
          <h2 className="text-xl font-semibold text-slateblue-600 mb-2">选择或创建管道</h2>
          <p className="text-slateblue-500">从左侧列表中选择一个管道开始编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <NodePanel collapsed={leftPanelCollapsed} onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <Toolbar
          onRun={handleRun}
          onSave={saveCurrentPipeline}
          onClear={handleClear}
          isExecuting={usePipelineStore.getState().isExecuting}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgesDelete={(edges) => edges.forEach(e => deleteEdge(e.id))}
          onNodesDelete={(nodes) => nodes.forEach(n => deleteNode(n.id))}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: 'bezier',
            animated: true,
            style: { strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-slateblue-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
          <Controls
            className="bg-white rounded-xl shadow-lg border border-slateblue-200"
            position="bottom-right"
          />
          <MiniMap
            className="bg-white rounded-xl shadow-lg border border-slateblue-200 !w-40 !h-28"
            nodeColor={(node) => {
              const status = (node.data as any).status;
              return status === 'success' ? '#10b981' :
                     status === 'failed' ? '#ef4444' :
                     status === 'running' ? '#f59e0b' : '#94a3b8';
            }}
            position="bottom-left"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

interface PipelineCanvasProps {
  socket: any;
  currentExecutionId: string | null;
}

const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ socket, currentExecutionId }) => {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner socket={socket} currentExecutionId={currentExecutionId} />
    </ReactFlowProvider>
  );
};

export default PipelineCanvas;
