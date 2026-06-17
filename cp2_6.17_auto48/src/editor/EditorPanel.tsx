import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NodeGraph } from './NodeGraph';
import { DialogueNode, DialogueOption, NodeConnection, ConnectionPoint, DialogueTree } from '../types/DialogueNode';
import { editorBus, EDITOR_EVENTS, RENDERER_EVENTS } from '../eventBus';

interface EditorPanelProps {
  onExportRequest: () => DialogueTree;
  onImportData: (data: DialogueTree) => { invalidNodeIds: Set<string> };
}

const MAX_NODES = 100;
const MAX_OPTIONS = 4;
const MAX_TEXT_LENGTH = 200;

const BACKGROUND_OPTIONS = [
  { value: 0, label: '0 - 星空 (#1a1a2e)' },
  { value: 1, label: '1 - 森林 (#2d5a27)' },
  { value: 2, label: '2 - 城堡 (#8b5e3c)' },
  { value: 3, label: '3 - 洞穴 (#1c1c1c)' },
];

const generateId = (): string => {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
};

const createInitialNodes = (): DialogueNode[] => {
  const node1: DialogueNode = {
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
  };

  const node2: DialogueNode = {
    id: 'node_choice',
    speaker: 'Old Man',
    text: 'The forest is dangerous. Take this sword with you.',
    backgroundIndex: 1,
    options: [
      { text: 'Thank you kindly', nextNodeId: 'node_end' },
    ],
    x: 60,
    y: 240,
  };

  const node3: DialogueNode = {
    id: 'node_end',
    speaker: 'Narrator',
    text: 'The End. Thanks for playing!',
    backgroundIndex: 2,
    options: [],
    x: 300,
    y: 160,
  };

  return [node1, node2, node3];
};

const buildConnections = (nodes: DialogueNode[]): NodeConnection[] => {
  const connections: NodeConnection[] = [];
  
  for (const node of nodes) {
    node.options.forEach((option, optionIndex) => {
      if (option.nextNodeId && nodes.some(n => n.id === option.nextNodeId)) {
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

export const EditorPanel: React.FC<EditorPanelProps> = ({ onExportRequest, onImportData }) => {
  const [nodes, setNodes] = useState<DialogueNode[]>(createInitialNodes);
  const [connections, setConnections] = useState<NodeConnection[]>(() => buildConnections(createInitialNodes()));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [invalidNodeIds, setInvalidNodeIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    editorBus.emit(EDITOR_EVENTS.UPDATE_TREE, nodes);
  }, [nodes]);

  useEffect(() => {
    editorBus.on(RENDERER_EVENTS.OPTION_CLICKED, (optionIndex) => {
      console.log('Renderer clicked option:', optionIndex);
    });

    editorBus.on(RENDERER_EVENTS.NODE_CLICKED, (nodeId) => {
      setSelectedNodeId(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        editorBus.emit(EDITOR_EVENTS.PREVIEW_NODE, nodeId);
      }
    });
  }, [nodes]);

  useEffect(() => {
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (selectedNode) {
      editorBus.emit(EDITOR_EVENTS.PREVIEW_NODE, selectedNode.id);
    } else if (nodes.length > 0) {
      editorBus.emit(EDITOR_EVENTS.PREVIEW_NODE, nodes[0].id);
    }
  }, [selectedNodeId, nodes]);

  const validateNextNodeIds = useCallback((nodesToValidate: DialogueNode[]): Set<string> => {
    const invalid = new Set<string>();
    const validIds = new Set(nodesToValidate.map(n => n.id));
    
    for (const node of nodesToValidate) {
      for (const option of node.options) {
        if (option.nextNodeId && !validIds.has(option.nextNodeId)) {
          invalid.add(node.id);
          break;
        }
      }
    }
    
    return invalid;
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
    
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, [field]: value };
      }
      return n;
    }));
  }, [selectedNodeId]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.substring(0, MAX_TEXT_LENGTH);
    handlePropertyChange('text', value);
  }, [handlePropertyChange]);

  const handleSpeakerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handlePropertyChange('speaker', e.target.value);
  }, [handlePropertyChange]);

  const handleBackgroundChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handlePropertyChange('backgroundIndex', parseInt(e.target.value, 10));
  }, [handlePropertyChange]);

  const handleAddOption = useCallback(() => {
    if (!selectedNodeId) return;
    
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId && n.options.length < MAX_OPTIONS) {
        const newOptions: DialogueOption[] = [...n.options, { text: '', nextNodeId: '' }];
        return { ...n, options: newOptions };
      }
      return n;
    }));
  }, [selectedNodeId]);

  const handleRemoveOption = useCallback((index: number) => {
    if (!selectedNodeId) return;
    
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        const newOptions = n.options.filter((_, i) => i !== index);
        return { ...n, options: newOptions };
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
      
      const invalidSet = validateNextNodeIds(updated);
      setInvalidNodeIds(invalidSet);
      
      return updated;
    });
    
    setConnections(prev => {
      const filtered = prev.filter(conn => !(conn.fromNodeId === selectedNodeId && conn.optionIndex === index));
      
      if (nextNodeId) {
        filtered.push({
          fromNodeId: selectedNodeId,
          toNodeId: nextNodeId,
          optionIndex: index,
          bendPoints: [],
        });
      }
      
      return filtered;
    });
  }, [selectedNodeId, validateNextNodeIds]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    
    setNodes(prev => {
      const nodeToDelete = prev.find(n => n.id === selectedNodeId);
      if (!nodeToDelete) return prev;
      
      const remaining = prev.filter(n => n.id !== selectedNodeId);
      
      const cleaned = remaining.map(n => ({
        ...n,
        options: n.options.filter(opt => opt.nextNodeId !== selectedNodeId),
      }));
      
      setConnections(buildConnections(cleaned));
      setInvalidNodeIds(validateNextNodeIds(cleaned));
      
      return cleaned;
    });
    
    setSelectedNodeId(null);
  }, [selectedNodeId, validateNextNodeIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNodeId) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          return;
        }
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
      
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          return;
        }
        e.preventDefault();
        
        const step = 4;
        let dx = 0;
        let dy = 0;
        
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        
        setNodes(prev => prev.map(n => {
          if (n.id === selectedNodeId) {
            return {
              ...n,
              x: Math.max(0, n.x + dx),
              y: Math.max(0, n.y + dy),
            };
          }
          return n;
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, handleDeleteNode]);

  const handleExportClick = useCallback(() => {
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
    
    onExportRequest();
  }, [nodes, onExportRequest]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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

        const invalidSet = validateNextNodeIds(parsed.nodes);
        const result = onImportData(parsed);
        
        setNodes(parsed.nodes);
        setConnections(buildConnections(parsed.nodes));
        setInvalidNodeIds(result.invalidNodeIds.size > 0 ? result.invalidNodeIds : invalidSet);
        setSelectedNodeId(parsed.nodes[0]?.id || null);
        
      } catch (error) {
        alert(`Failed to import: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    
    e.target.value = '';
  }, [validateNextNodeIds, onImportData]);

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
          width: selectedNode ? '240px' : '0px',
          backgroundColor: '#333',
          borderRadius: '8px 0 0 8px',
          overflow: 'hidden',
          transition: 'width 0.3s ease, padding 0.3s ease',
          zIndex: 10,
          borderLeft: selectedNode ? '1px solid #555' : 'none',
          padding: selectedNode ? '16px' : '0px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
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
                onChange={handleSpeakerChange}
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
                onChange={handleTextChange}
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
                onChange={handleBackgroundChange}
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

              {selectedNode.options.map((option, index) => (
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
                    onFocus={(e) => { e.target.style.borderColor = '#00e5ff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#555'; }}
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
                        <option key={n.id} value={n.id}>
                          {n.id}
                        </option>
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

      <div style={{ position: 'absolute', top: 0, right: 0, display: 'none' }}>
        <button onClick={handleExportClick}>Export</button>
        <button onClick={handleImportClick}>Import</button>
      </div>
    </div>
  );
};
