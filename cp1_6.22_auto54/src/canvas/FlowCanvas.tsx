import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  NodeProps,
  EdgeProps,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  getSmoothStepPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AppNode, AppEdge, NodeData, EdgeData } from '../App';

const COLORS = [
  '#e53e3e',
  '#ed8936',
  '#ecc94b',
  '#48bb78',
  '#38b2ac',
  '#3182ce',
  '#805ad5',
  '#d53f8c',
];

const NODE_WIDTH = 80;
const NODE_HEIGHT = 60;

interface CustomNodeProps extends NodeProps<AppNode> {
  onLabelChange?: (id: string, label: string) => void;
  onDescriptionChange?: (id: string, description: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onShapeChange?: (id: string, shape: 'circle' | 'rectangle') => void;
}

const CustomNode: React.FC<CustomNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  onDescriptionChange,
  onColorChange,
  onShapeChange,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [description, setDescription] = useState(data.description);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPanel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showPanel]);

  const baseStyle: React.CSSProperties = {
    width: `${NODE_WIDTH}px`,
    height: `${NODE_HEIGHT}px`,
    backgroundColor: data.color,
    boxShadow: selected
      ? '0 4px 12px rgba(0,0,0,0.2), 0 0 0 2px #3182ce'
      : '0 2px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
    userSelect: 'none',
    position: 'relative',
  };

  const nodeStyle = {
    ...baseStyle,
    borderRadius: data.shape === 'circle' ? '50%' : '12px',
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPanel(true);
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSave = () => {
    if (onLabelChange) onLabelChange(id, label.slice(0, 20));
    if (onDescriptionChange) onDescriptionChange(id, description);
    setShowPanel(false);
  };

  const getLighterColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 40);
    const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 40);
    const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 40);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={nodeStyle} onDoubleClick={handleDoubleClick} className="nodrag nopan">
        <span style={{ padding: '4px', textAlign: 'center', lineHeight: 1.2 }}>
          {data.label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {showPanel && (
        <div
          onClick={handlePanelClick}
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '16px',
            width: '240px',
            zIndex: 1000,
            color: '#2d3748',
            fontSize: '13px',
          }}
          className="nodrag nopan"
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              标题 (最多20字)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 20))}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              详细描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              颜色标签
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange && onColorChange(id, color)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: data.color === color ? '2px solid #2d3748' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease-in-out',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = 'scale(1.15)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'scale(1)')
                  }
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              形状
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onShapeChange && onShapeChange(id, 'rectangle')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '4px',
                  border: `1px solid ${data.shape === 'rectangle' ? data.color : '#e2e8f0'}`,
                  backgroundColor: data.shape === 'rectangle' ? getLighterColor(data.color) : 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: data.shape === 'rectangle' ? 'white' : '#2d3748',
                }}
              >
                圆角矩形
              </button>
              <button
                onClick={() => onShapeChange && onShapeChange(id, 'circle')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '4px',
                  border: `1px solid ${data.shape === 'circle' ? data.color : '#e2e8f0'}`,
                  backgroundColor: data.shape === 'circle' ? getLighterColor(data.color) : 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: data.shape === 'circle' ? 'white' : '#2d3748',
                }}
              >
                圆形
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: data.color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            保存
          </button>
        </div>
      )}
    </>
  );
};

interface CustomEdgeProps extends EdgeProps<AppEdge> {
  onLabelChange?: (id: string, label: string) => void;
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || '');
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  const strokeColor = selected ? '#3182ce' : '#a0aec0';
  const strokeWidth = selected ? 3 : 2;
  const showLabel = hovered || selected || isEditing || (data?.label && data.label.length > 0);

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{ transition: 'stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out' }}
        markerEnd={`url(#arrow-${selected ? 'selected' : 'default'}-${id})`}
      />
      <defs>
        <marker
          id={`arrow-default-${id}`}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#a0aec0" />
        </marker>
        <marker
          id={`arrow-selected-${id}`}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#3182ce" />
        </marker>
      </defs>

      {showLabel && !isEditing && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 12}
          width="80"
          height="24"
          style={{
            opacity: showLabel ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: 'all',
          }}
          onDoubleClick={handleDoubleClick}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              backgroundColor: 'white',
              borderRadius: '4px',
              color: '#4a5568',
              cursor: 'text',
              padding: '2px 6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              userSelect: 'none',
            }}
          >
            {data?.label || '双击编辑'}
          </div>
        </foreignObject>
      )}

      {isEditing && (
        <foreignObject x={labelX - 50} y={labelY - 14} width="100" height="28">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              height: '100%',
              fontSize: '11px',
              border: '1px solid #3182ce',
              borderRadius: '4px',
              padding: '2px 4px',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        </foreignObject>
      )}
    </g>
  );
};

interface FlowCanvasProps {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: (nodes: AppNode[]) => void;
  onEdgesChange: (edges: AppEdge[]) => void;
  onSelectionChange: (ids: string[]) => void;
}

export interface FlowCanvasRef {
  resetView: () => void;
}

const FlowCanvasInner = forwardRef<FlowCanvasRef, FlowCanvasProps>(
  ({ nodes, edges, onNodesChange, onEdgesChange, onSelectionChange }, ref) => {
  const [internalNodes, setInternalNodes, onNodesChangeInternal] = useNodesState<AppNode>(
    nodes as any[]
  );
  const [internalEdges, setInternalEdges, onEdgesChangeInternal] = useEdgesState<AppEdge>(
    edges as any[]
  );
  const { fitView, screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    setInternalNodes(nodes as any[]);
  }, [nodes, setInternalNodes]);

  useEffect(() => {
    setInternalEdges(edges as any[]);
  }, [edges, setInternalEdges]);

  useImperativeHandle(ref, () => ({
    resetView: () => {
      fitView({ padding: 0.2, duration: 300 });
    },
  }));

  const onConnect = useCallback(
    (params: any) => {
      const newEdge = {
        ...params,
        type: 'custom',
        data: { label: '' },
        animated: false,
      };
      setInternalEdges((eds) => addEdge(newEdge, eds) as any);
    },
    [setInternalEdges]
  );

  const handleLabelChange = useCallback(
    (id: string, label: string) => {
      setInternalNodes((nds) =>
        nds.map((n: any) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n
        ) as any
      );
    },
    [setInternalNodes]
  );

  const handleDescriptionChange = useCallback(
    (id: string, description: string) => {
      setInternalNodes((nds) =>
        nds.map((n: any) =>
          n.id === id ? { ...n, data: { ...n.data, description } } : n
        ) as any
      );
    },
    [setInternalNodes]
  );

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      setInternalNodes((nds) =>
        nds.map((n: any) =>
          n.id === id ? { ...n, data: { ...n.data, color } } : n
        ) as any
      );
    },
    [setInternalNodes]
  );

  const handleShapeChange = useCallback(
    (id: string, shape: 'circle' | 'rectangle') => {
      setInternalNodes((nds) =>
        nds.map((n: any) =>
          n.id === id ? { ...n, data: { ...n.data, shape } } : n
        ) as any
      );
    },
    [setInternalNodes]
  );

  const nodeTypes = {
    custom: (props: any) => (
      <CustomNode
        {...props}
        onLabelChange={handleLabelChange}
        onDescriptionChange={handleDescriptionChange}
        onColorChange={handleColorChange}
        onShapeChange={handleShapeChange}
      />
    ),
  };

  const edgeTypes = {
    custom: CustomEdge as any,
  };

  const handleSelectionChangeInternal = useCallback(
    (params: any) => {
      const ids = [
        ...(params.nodes?.map((n: any) => n.id) || []),
        ...(params.edges?.map((e: any) => e.id) || []),
      ];
      onSelectionChange(ids);
    },
    [onSelectionChange]
  );

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: '新节点',
          description: '',
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: 'rectangle' as const,
        },
      };

      setInternalNodes((nds) => [...nds, newNode] as any);
    },
    [screenToFlowPosition, setInternalNodes]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      onNodesChange(internalNodes as unknown as AppNode[]);
      onEdgesChange(internalEdges as unknown as AppEdge[]);
    }, 100);
    return () => clearTimeout(timer);
  }, [internalNodes, internalEdges, onNodesChange, onEdgesChange]);

  const ReactFlowComponent = ReactFlow as any;

  return (
    <ReactFlowComponent
      nodes={internalNodes}
      edges={internalEdges}
      onConnect={onConnect}
      onNodesChange={onNodesChangeInternal}
      onEdgesChange={onEdgesChangeInternal}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onSelectionChange={handleSelectionChangeInternal}
      onPaneDoubleClick={handlePaneDoubleClick}
      fitView
      minZoom={0.3}
      maxZoom={3}
      panOnDrag={true}
      selectionOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={true}
      zoomOnPinch={true}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'custom',
        markerEnd: { type: MarkerType.ArrowClosed },
      }}
    >
      <Background variant={BackgroundVariant.Lines} gap={40} color="#e2e8f0" />
      <MiniMap
        style={{
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}
        nodeColor={(node: any) => node.data?.color || '#3182ce'}
        nodeStrokeWidth={2}
        zoomable
        pannable
      />
      <Controls
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      />
    </ReactFlowComponent>
  );
});

FlowCanvasInner.displayName = 'FlowCanvasInner';

const FlowCanvasWithProvider = forwardRef<FlowCanvasRef, FlowCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});

FlowCanvasWithProvider.displayName = 'FlowCanvasWithProvider';

export default FlowCanvasWithProvider;
