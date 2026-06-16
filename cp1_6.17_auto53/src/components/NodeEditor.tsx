import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  ReactFlowProvider,
} from 'react-flow-renderer';
import * as npcManager from '../services/npcManager';
import { PersonalityParams, FlowNode, FlowEdge } from '../types';

interface DialogueNodeData {
  label: string;
  personalityFit: number;
  nodeType: 'root' | 'branch' | 'leaf';
  npcId: string;
}

const DialogueNodeComponent: React.FC<NodeProps<DialogueNodeData>> = ({ data, selected }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(data.label);
  const [addChildInput, setAddChildInput] = useState(false);
  const [newChildText, setNewChildText] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const fitColor = data.personalityFit >= 70 ? '#4caf50' : data.personalityFit >= 40 ? '#ff9800' : '#f44336';

  const nodeBorderClass = data.nodeType === 'root' ? 'dialogue-node-root' : 'dialogue-node-branch';

  return (
    <div
      className={`dialogue-node ${nodeBorderClass} ${selected ? 'dialogue-node-selected' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#0f3460', width: 8, height: 8 }} />
      <div className="dialogue-node-content">
        {editing ? (
          <input
            ref={inputRef}
            className="dialogue-node-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                try {
                  await npcManager.updateNode(data.npcId, (e.target as any).closest('.dialogue-node')?.getAttribute('data-id') || '', editText);
                } catch {}
                data.label = editText;
                setEditing(false);
              }
              if (e.key === 'Escape') {
                setEditText(data.label);
                setEditing(false);
              }
            }}
            onBlur={() => {
              setEditText(data.label);
              setEditing(false);
            }}
          />
        ) : (
          <div className="dialogue-node-text">{data.label}</div>
        )}
        <div className="dialogue-node-fit" style={{ color: fitColor }}>
          {data.personalityFit}%
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#e94560', width: 8, height: 8 }} />

      {showMenu && (
        <div ref={menuRef} className="context-menu">
          <div
            className="context-menu-item"
            onClick={() => {
              setEditing(true);
              setShowMenu(false);
            }}
          >
            编辑文本
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              setAddChildInput(true);
              setShowMenu(false);
            }}
          >
            添加子节点
          </div>
          <div
            className="context-menu-item context-menu-item-danger"
            onClick={() => {
              const event = new CustomEvent('deleteNode', { detail: { nodeId: 'placeholder' } });
              document.dispatchEvent(event);
              setShowMenu(false);
            }}
          >
            删除节点
          </div>
        </div>
      )}

      {addChildInput && (
        <div className="add-child-popup">
          <input
            className="add-child-input"
            placeholder="输入子节点文本..."
            value={newChildText}
            onChange={(e) => setNewChildText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newChildText.trim()) {
                const event = new CustomEvent('addChildNode', {
                  detail: { parentId: 'placeholder', text: newChildText.trim() },
                });
                document.dispatchEvent(event);
                setNewChildText('');
                setAddChildInput(false);
              }
              if (e.key === 'Escape') {
                setNewChildText('');
                setAddChildInput(false);
              }
            }}
            autoFocus
          />
          <button
            className="add-child-confirm"
            onClick={() => {
              if (newChildText.trim()) {
                const event = new CustomEvent('addChildNode', {
                  detail: { parentId: 'placeholder', text: newChildText.trim() },
                });
                document.dispatchEvent(event);
                setNewChildText('');
                setAddChildInput(false);
              }
            }}
          >
            ✓
          </button>
          <button
            className="add-child-cancel"
            onClick={() => {
              setNewChildText('');
              setAddChildInput(false);
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

const nodeTypes = { dialogueNode: DialogueNodeComponent };

interface NodeEditorProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  npcId: string;
  personality: PersonalityParams;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  highlightNodeId?: string | null;
}

const NodeEditorInner: React.FC<NodeEditorProps> = ({
  nodes: flowNodes,
  edges: flowEdges,
  npcId,
  personality,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  onNodeDoubleClick,
  highlightNodeId,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const rfNodes = flowNodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      npcId,
    },
  })) as Node<DialogueNodeData>[];

  const rfEdges = flowEdges.map((e) => ({
    ...e,
  })) as Edge[];

  const [localNodes, setLocalNodes, onLocalNodesChange] = useNodesState(rfNodes);
  const [localEdges, setLocalEdges, onLocalEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => {
    setLocalNodes(rfNodes);
  }, [flowNodes]);

  useEffect(() => {
    setLocalEdges(rfEdges);
  }, [flowEdges]);

  useEffect(() => {
    if (highlightNodeId) {
      setLocalNodes((nds) =>
        nds.map((n) => ({
          ...n,
          className: n.id === highlightNodeId ? 'highlighted-node' : '',
        }))
      );
    } else {
      setLocalNodes((nds) =>
        nds.map((n) => ({ ...n, className: '' }))
      );
    }
  }, [highlightNodeId]);

  const handleLocalNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onLocalNodesChange(changes);
      onNodesChange(changes);
    },
    [onLocalNodesChange, onNodesChange]
  );

  const handleLocalEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onLocalEdgesChange(changes);
      onEdgesChange(changes);
    },
    [onLocalEdgesChange, onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setLocalEdges((eds) => addEdge({ ...connection, type: 'bezier', style: { stroke: '#e94560', strokeWidth: 2 } }, eds));
      onConnect(connection);
    },
    [setLocalEdges, onConnect]
  );

  return (
    <div ref={reactFlowWrapper} className="node-editor-container">
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleLocalNodesChange}
        onEdgesChange={handleLocalEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Controls className="react-flow-controls" />
        <Background variant={BackgroundVariant.Dots} color="#0f3460" gap={20} size={1} />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.nodeType === 'root') return '#e94560';
            return '#0f3460';
          }}
          maskColor="rgba(26, 26, 46, 0.8)"
          style={{ background: '#16213e', border: '1px solid #0f3460' }}
        />
      </ReactFlow>
    </div>
  );
};

const NodeEditor: React.FC<NodeEditorProps> = (props) => (
  <ReactFlowProvider>
    <NodeEditorInner {...props} />
  </ReactFlowProvider>
);

export default NodeEditor;
