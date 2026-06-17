import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { NodeGraph } from './editor/NodeGraph';
import { CanvasRenderer } from './renderer/CanvasRenderer';
import { DialogueNode, DialogueOption, NodeConnection, ConnectionPoint, DialogueTree } from './types/DialogueNode';
import { editorBus, EDITOR_EVENTS, RENDERER_EVENTS } from './eventBus';

const MAX_NODES = 100;
const MAX_OPTIONS = 4;
const MAX_TEXT_LENGTH = 200;
const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const GRID_SIZE = 20;

const BACKGROUND_OPTIONS = [
  { value: 0, label: '0 - 星空 (#1a1a2e)' },
  { value: 1, label: '1 - 森林 (#2d5a27)' },
  { value: 2, label: '2 - 城堡 (#8b5e3c)' },
  { value: 3, label: '3 - 洞穴 (#1c1c1c)' },
];

const generateId = (): string => {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
};

const buildConnections = (nodes: DialogueNode[]): NodeConnection[] => {
  const connections: NodeConnection[] = [];
  const validIds = new Set(nodes.map(n => n.id));
  for (const node of nodes) {
    node.options.forEach((option, optionIndex) => {
      if (option.nextNodeId && validIds.has(option.nextNodeId)) {
        const existing = connections.find(
          c => c.fromNodeId === node.id && c.toNodeId === option.nextNodeId && c.optionIndex === optionIndex
        );
        if (!existing) {
          connections.push({
            fromNodeId: node.id,
            toNodeId: option.nextNodeId,
            optionIndex,
            bendPoints: [],
          });
        }
      }
    });
  }
  return connections;
};

interface ValidationIssue {
  type: 'missing_node' | 'circular_ref' | 'no_root' | 'unreachable';
  message: string;
  targetNodeId?: string;
}

const validateDialogueTree = (
  nodes: DialogueNode[],
  rootNodeId?: string
): { invalidNodeIds: Set<string>; invalidInfo: Map<string, ValidationIssue[]> } => {
  const invalidInfo = new Map<string, ValidationIssue[]>();
  const validIds = new Set(nodes.map(n => n.id));

  const addIssue = (nodeId: string, issue: ValidationIssue) => {
    if (!invalidInfo.has(nodeId)) {
      invalidInfo.set(nodeId, []);
    }
    invalidInfo.get(nodeId)!.push(issue);
  };

  for (const node of nodes) {
    for (const option of node.options) {
      if (option.nextNodeId && !validIds.has(option.nextNodeId)) {
        addIssue(node.id, {
          type: 'missing_node',
          message: `分支指向不存在的节点: ${option.nextNodeId}`,
          targetNodeId: option.nextNodeId,
        });
      }
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  const detectCycle = (nodeId: string, path: string[]): boolean => {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycleNodes = path.slice(cycleStart);
      cycleNodes.forEach((nid) => {
        addIssue(nid, {
          type: 'circular_ref',
          message: `循环引用: ${cycleNodes.join(' → ')}`,
        });
      });
      return true;
    }
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      for (const opt of node.options) {
        if (opt.nextNodeId && validIds.has(opt.nextNodeId)) {
          detectCycle(opt.nextNodeId, [...path]);
        }
      }
    }

    inStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      detectCycle(node.id, []);
    }
  }

  const allTargets = new Set<string>();
  for (const node of nodes) {
    for (const opt of node.options) {
      if (opt.nextNodeId) {
        allTargets.add(opt.nextNodeId);
      }
    }
  }

  const rootCandidates = nodes.filter(n => !allTargets.has(n.id));
  if (rootCandidates.length === 0 && nodes.length > 0) {
    nodes.forEach((n) => {
      addIssue(n.id, {
        type: 'no_root',
        message: '没有根节点：所有节点都被其他节点引用',
      });
    });
  }

  if (rootNodeId && validIds.has(rootNodeId)) {
    const reachable = new Set<string>();
    const stack = [rootNodeId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const node = nodes.find(n => n.id === current);
      if (node) {
        for (const opt of node.options) {
          if (opt.nextNodeId && validIds.has(opt.nextNodeId)) {
            stack.push(opt.nextNodeId);
          }
        }
      }
    }
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        addIssue(node.id, {
          type: 'unreachable',
          message: '从根节点无法到达此节点',
        });
      }
    }
  }

  const invalidNodeIds = new Set(invalidInfo.keys());
  return { invalidNodeIds, invalidInfo };
};

const createInitialNodes = (): DialogueNode[] => [
  {
    id: 'node_start',
    speaker: 'Narrator',
    text: 'Welcome, adventurer! A great journey awaits you.',
    backgroundIndex: 0,
    options: [
      { text: 'Start the adventure', nextNodeId: 'node_choice' },
      { text: 'Stay at home', nextNodeId: 'node_end' },
    ],
    x: 60,
    y: 80,
  },
  {
    id: 'node_choice',
    speaker: 'Old Man',
    text: 'The forest is dangerous. Take this sword with you.',
    backgroundIndex: 1,
    options: [{ text: 'Thank you kindly', nextNodeId: 'node_end' }],
    x: 60,
    y: 240,
  },
  {
    id: 'node_end',
    speaker: 'Narrator',
    text: 'The End. Thanks for playing!',
    backgroundIndex: 2,
    options: [],
    x: 300,
    y: 160,
  },
];

export interface EditorPanelHandle {
  exportJSON: () => void;
  importJSON: () => void;
}

interface EditorPanelProps {
  onStatusChange?: (nodeId: string | null, optionCount: number) => void;
}

const EditorPanelComp = forwardRef<EditorPanelHandle, EditorPanelProps>(({ onStatusChange }, ref) => {
  const [nodes, setNodes] = useState<DialogueNode[]>(createInitialNodes);
  const [connections, setConnections] = useState<NodeConnection[]>(() => buildConnections(createInitialNodes()));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [invalidNodeIds, setInvalidNodeIds] = useState<Set<string>>(new Set());
  const [invalidInfo, setInvalidInfo] = useState<Map<string, ValidationIssue[]>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    exportJSON: () => handleExport(),
    importJSON: () => fileInputRef.current?.click(),
  }));

  useEffect(() => {
    editorBus.emit(EDITOR_EVENTS.UPDATE_TREE, nodes);
  }, [nodes]);

  useEffect(() => {
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (selectedNode) {
      editorBus.emit(EDITOR_EVENTS.PREVIEW_NODE, selectedNode.id);
      onStatusChange?.(selectedNode.id, selectedNode.options.length);
    } else if (nodes.length > 0) {
      editorBus.emit(EDITOR_EVENTS.PREVIEW_NODE, nodes[0].id);
      onStatusChange?.(nodes[0].id, nodes[0].options.length);
    }
  }, [selectedNodeId, nodes, onStatusChange]);

  useEffect(() => {
    return editorBus.on(RENDERER_EVENTS.OPTION_CLICKED, () => {});
  }, []);

  const handleExport = useCallback(() => {
    const data: DialogueTree = {
      nodes,
      rootNodeId: nodes[0]?.id || '',
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dialogue.dialogtree';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as DialogueTree;

        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid format: nodes array missing');
        }

        const { invalidNodeIds: invalidSet, invalidInfo: info } = validateDialogueTree(
          parsed.nodes,
          parsed.rootNodeId
        );

        setNodes(parsed.nodes);
        setConnections(buildConnections(parsed.nodes));
        setInvalidNodeIds(invalidSet);
        setInvalidInfo(info);
        setSelectedNodeId(parsed.nodes[0]?.id || null);
      } catch (error) {
        alert(`Failed to import: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    if (nodes.length >= MAX_NODES) {
      alert(`Maximum ${MAX_NODES} nodes allowed`);
      return;
    }

    const newNode: DialogueNode = {
      id: generateId(),
      speaker: '',
      text: 'New dialogue node',
      backgroundIndex: 0,
      options: [],
      x,
      y,
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes.length]);

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, x, y } : n
    ));
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleConnectionBendAdd = useCallback((fromNodeId: string, toNodeId: string, optionIndex: number, point: ConnectionPoint) => {
    setConnections(prev => prev.map(conn => {
      if (conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId && conn.optionIndex === optionIndex) {
        return { ...conn, bendPoints: [...conn.bendPoints, point] };
      }
      return conn;
    }));
  }, []);

  const handleConnectionBendMove = useCallback((fromNodeId: string, toNodeId: string, optionIndex: number, bendIndex: number, point: ConnectionPoint) => {
    setConnections(prev => prev.map(conn => {
      if (conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId && conn.optionIndex === optionIndex) {
        const newBendPoints = [...conn.bendPoints];
        newBendPoints[bendIndex] = point;
        return { ...conn, bendPoints: newBendPoints };
      }
      return conn;
    }));
  }, []);

  const handlePropertyChange = useCallback((field: keyof DialogueNode, value: unknown) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, [field]: value } : n));
  }, [selectedNodeId]);

  const handleAddOption = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId && n.options.length < MAX_OPTIONS) {
        return { ...n, options: [...n.options, { text: '', nextNodeId: '' }] };
      }
      return n;
    }));
  }, [selectedNodeId]);

  const handleRemoveOption = useCallback((index: number) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, options: n.options.filter((_, i) => i !== index) };
      }
      return n;
    }));
    setConnections(prev => prev.filter(conn => !(conn.fromNodeId === selectedNodeId && conn.optionIndex === index)));
  }, [selectedNodeId]);

  const handleOptionTextChange = useCallback((index: number, text: string) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        const newOptions = [...n.options];
        newOptions[index] = { ...newOptions[index], text };
        return { ...n, options: newOptions };
      }
      return n;
    }));
  }, [selectedNodeId]);

  const handleOptionTargetChange = useCallback((index: number, nextNodeId: string) => {
    if (!selectedNodeId) return;
    setNodes(prev => {
      const updated = prev.map(n => {
        if (n.id === selectedNodeId) {
          const newOptions = [...n.options];
          newOptions[index] = { ...newOptions[index], nextNodeId };
          return { ...n, options: newOptions };
        }
        return n;
      });
      const { invalidNodeIds: inv, invalidInfo: info } = validateDialogueTree(updated);
      setInvalidNodeIds(inv);
      setInvalidInfo(info);
      return updated;
    });
    setConnections(prev => {
      const filtered = prev.filter(conn => !(conn.fromNodeId === selectedNodeId && conn.optionIndex === index));
      if (nextNodeId) {
        filtered.push({ fromNodeId: selectedNodeId, toNodeId: nextNodeId, optionIndex: index, bendPoints: [] });
      }
      return filtered;
    });
  }, [selectedNodeId]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(prev => {
      const remaining = prev.filter(n => n.id !== selectedNodeId);
      const cleaned = remaining.map(n => ({
        ...n,
        options: n.options.filter(opt => opt.nextNodeId !== selectedNodeId),
      }));
      setConnections(buildConnections(cleaned));
      const { invalidNodeIds: inv, invalidInfo: info } = validateDialogueTree(cleaned);
      setInvalidNodeIds(inv);
      setInvalidInfo(info);
      return cleaned;
    });
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNodeId) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        e.preventDefault();
        handleDeleteNode();
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = nodes.findIndex(n => n.id === selectedNodeId);
        if (nodes.length > 1) {
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + nodes.length) % nodes.length
            : (currentIndex + 1) % nodes.length;
          setSelectedNodeId(nodes[nextIndex].id);
        }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInput) {
        e.preventDefault();
        const step = 4;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        setNodes(prev => prev.map(n => n.id === selectedNodeId
          ? { ...n, x: Math.max(0, n.x + dx), y: Math.max(0, n.y + dy) }
          : n
        ));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, handleDeleteNode]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#3a3a3a',
          backgroundImage: 'radial-gradient(circle, #4a4a4a40 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <NodeGraph
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          invalidNodeIds={invalidNodeIds}
          invalidInfo={invalidInfo}
          onNodeSelect={handleNodeSelect}
          onNodeMove={handleNodeMove}
          onCanvasDoubleClick={handleCanvasDoubleClick}
          onConnectionBendAdd={handleConnectionBendAdd}
          onConnectionBendMove={handleConnectionBendMove}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '240px',
          backgroundColor: '#333',
          borderRadius: '8px 0 0 8px',
          overflow: 'hidden',
          transform: selectedNodeId ? 'translateX(0)' : 'translateX(100%)',
          opacity: selectedNodeId ? 1 : 0,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          zIndex: 10,
          borderLeft: '1px solid #555',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: selectedNodeId ? 'auto' : 'none',
        }}
      >
        {selectedNode && (
          <>
            <div style={{ color: '#00e5ff', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
              Node Properties
            </div>
            <div style={{ color: '#888', fontSize: '11px', fontFamily: 'monospace' }}>
              ID: {selectedNode.id}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#ccc', fontSize: '12px' }}>Speaker Name</label>
              <input
                type="text"
                value={selectedNode.speaker}
                onChange={(e) => handlePropertyChange('speaker', e.target.value)}
                placeholder="Enter speaker name..."
                style={{
                  backgroundColor: '#4a4a4a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#ccc', fontSize: '12px' }}>
                Dialogue Text <span style={{ color: '#666' }}>({selectedNode.text.length}/{MAX_TEXT_LENGTH})</span>
              </label>
              <textarea
                value={selectedNode.text}
                onChange={(e) => handlePropertyChange('text', e.target.value.substring(0, MAX_TEXT_LENGTH))}
                placeholder="Enter dialogue text..."
                rows={5}
                maxLength={MAX_TEXT_LENGTH}
                style={{
                  backgroundColor: '#4a4a4a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#ccc', fontSize: '12px' }}>Background</label>
              <select
                value={selectedNode.backgroundIndex}
                onChange={(e) => handlePropertyChange('backgroundIndex', parseInt(e.target.value, 10))}
                style={{
                  backgroundColor: '#4a4a4a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {BACKGROUND_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#ccc', fontSize: '12px' }}>
                  Options ({selectedNode.options.length}/{MAX_OPTIONS})
                </span>
                <button
                  onClick={handleAddOption}
                  disabled={selectedNode.options.length >= MAX_OPTIONS}
                  style={{
                    backgroundColor: selectedNode.options.length >= MAX_OPTIONS ? '#444' : '#00e5ff20',
                    border: '1px solid #00e5ff',
                    color: '#00e5ff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: selectedNode.options.length >= MAX_OPTIONS ? 'not-allowed' : 'pointer',
                    opacity: selectedNode.options.length >= MAX_OPTIONS ? 0.5 : 1,
                  }}
                >
                  + Add
                </button>
              </div>

              {selectedNode.options.map((option: DialogueOption, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px',
                    backgroundColor: '#2d2d2d',
                    borderRadius: '4px',
                    border: '1px solid #444',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: '10px' }}>Option {index + 1}</span>
                    <button
                      onClick={() => handleRemoveOption(index)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ff6666',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionTextChange(index, e.target.value)}
                    placeholder="Option text..."
                    style={{
                      width: '150px',
                      height: '24px',
                      backgroundColor: '#4a4a4a',
                      border: '1px solid #555',
                      borderRadius: '2px',
                      padding: '0 6px',
                      color: '#fff',
                      fontSize: '11px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#00e5ff'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#555'; }}
                  />
                  <select
                    value={option.nextNodeId}
                    onChange={(e) => handleOptionTargetChange(index, e.target.value)}
                    style={{
                      backgroundColor: '#4a4a4a',
                      border: '1px solid #555',
                      borderRadius: '2px',
                      padding: '2px 4px',
                      color: '#fff',
                      fontSize: '10px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">-- Select target --</option>
                    {nodes
                      .filter(n => n.id !== selectedNodeId)
                      .map(n => (
                        <option key={n.id} value={n.id}>{n.id}</option>
                      ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={handleDeleteNode}
              style={{
                marginTop: 'auto',
                backgroundColor: 'transparent',
                border: '1px solid #ff6666',
                color: '#ff6666',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Delete Node (Del)
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".dialogtree,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
});
EditorPanelComp.displayName = 'EditorPanel';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface ToolbarButtonProps {
  label: string;
  ripples: Ripple[];
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, ripples, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        height: '32px',
        padding: '0 16px',
        border: '1px solid #00e5ff',
        backgroundColor: 'transparent',
        color: '#00e5ff',
        fontSize: '13px',
        cursor: 'pointer',
        borderRadius: '4px',
        overflow: 'hidden',
        transition: 'background-color 0.2s ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.125)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {label}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: '0',
            height: '0',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 229, 255, 0.4)',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const editorRef = useRef<EditorPanelHandle>(null);

  const [isResponsive, setIsResponsive] = useState(false);
  const [importRipples, setImportRipples] = useState<Ripple[]>([]);
  const [exportRipples, setExportRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const [statusInfo, setStatusInfo] = useState<{ nodeId: string; optionCount: number } | null>(null);
  const [previewNodeInfo, setPreviewNodeInfo] = useState<{ nodeId: string; optionCount: number } | null>(null);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (rendererRef.current) {
        setPreviewNodeInfo(rendererRef.current.getCurrentNodeInfo());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsResponsive(window.innerWidth < 900);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>, setter: React.Dispatch<React.SetStateAction<Ripple[]>>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = rippleIdRef.current++;
    setter(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setter(prev => prev.filter(r => r.id !== id)), 600);
  };

  const handleExport = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e, setExportRipples);
    editorRef.current?.exportJSON();
  }, []);

  const handleImport = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e, setImportRipples);
    editorRef.current?.importJSON();
  }, []);

  const handleStatusChange = useCallback((nodeId: string | null, optionCount: number) => {
    if (nodeId) {
      setStatusInfo({ nodeId, optionCount });
    }
  }, []);

  const displayInfo = previewNodeInfo || statusInfo;

  const layoutStyle: React.CSSProperties = isResponsive
    ? { display: 'flex', flexDirection: 'column', height: '100%' }
    : { display: 'flex', flexDirection: 'row', height: '100%' };

  const editorStyle: React.CSSProperties = isResponsive
    ? { width: '100%', height: '70%', borderBottom: '1px solid #555' }
    : { width: '60%', height: '100%', borderRight: '1px solid #555' };

  const previewStyle: React.CSSProperties = isResponsive
    ? {
        width: '100%', height: '30%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '12px', padding: '16px', boxSizing: 'border-box',
      }
    : {
        width: '40%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '16px', padding: '20px', boxSizing: 'border-box',
      };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#2d2d2d' }}>
      <div
        style={{
          height: '50px',
          backgroundColor: '#252525',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          boxSizing: 'border-box',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '16px', color: '#00e5ff', fontWeight: 'bold', letterSpacing: '1px' }}>
          对话树编辑器
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ToolbarButton label="导入JSON" ripples={importRipples} onClick={handleImport} />
          <ToolbarButton label="导出JSON" ripples={exportRipples} onClick={handleExport} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', ...layoutStyle }}>
        <div style={{ ...editorStyle, overflow: 'hidden' }}>
          <EditorPanelComp ref={editorRef} onStatusChange={handleStatusChange} />
        </div>
        <div style={{ backgroundColor: '#2d2d2d', ...previewStyle }}>
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: isResponsive ? 'min(100%, 400px)' : '400px',
                height: 'auto',
                aspectRatio: '400 / 240',
                imageRendering: 'pixelated',
                border: '2px solid #555',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: '20px',
              padding: '8px 16px',
              backgroundColor: '#333',
              borderRadius: '4px',
              border: '1px solid #444',
              minWidth: '300px',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Node:</span>
              <span style={{ color: '#00e5ff', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {displayInfo?.nodeId || '--'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Options:</span>
              <span style={{ color: '#f0c040', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {displayInfo?.optionCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          to { width: 80px; height: 80px; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
