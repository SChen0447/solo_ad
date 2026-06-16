import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NodeChange, EdgeChange, Connection, Node } from 'react-flow-renderer';
import NodeEditor from './components/NodeEditor';
import * as npcManager from './services/npcManager';
import { PersonalityParams, FlowNode, FlowEdge } from './types';
import './styles.css';

interface NPCItem {
  id: string;
  name: string;
  personality: PersonalityParams;
  avatarExpression: string;
}

interface PreviewNode {
  id: string;
  text: string;
  children: PreviewNode[];
  personalityFit: number;
  nodeType: string;
}

const DEFAULT_PERSONALITY: PersonalityParams = {
  extroversion: 50,
  friendliness: 50,
  humor: 50,
  patience: 50,
  curiosity: 50,
};

const PERSONALITY_LABELS: Record<keyof PersonalityParams, string> = {
  extroversion: '外向性',
  friendliness: '友好度',
  humor: '幽默感',
  patience: '耐心',
  curiosity: '好奇心',
};

function drawRadarChart(
  canvas: HTMLCanvasElement,
  personality: PersonalityParams,
  size: number = 100
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const traits = Object.keys(personality) as (keyof PersonalityParams)[];
  const n = traits.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

  for (let ring = 1; ring <= 4; ring++) {
    const ringR = (r * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + ringR * Math.cos(angle);
      const y = cy + ringR * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const labelX = cx + (r + 8) * Math.cos(angle);
    const labelY = cy + (r + 8) * Math.sin(angle);
    ctx.fillStyle = '#888';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PERSONALITY_LABELS[traits[i]][0], labelX, labelY);
  }

  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = startAngle + idx * angleStep;
    const value = personality[traits[idx]] / 100;
    const px = cx + r * value * Math.cos(angle);
    const py = cy + r * value * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(233, 69, 96, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const value = personality[traits[i]] / 100;
    const px = cx + r * value * Math.cos(angle);
    const py = cy + r * value * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#e94560';
    ctx.fill();
  }
}

function buildPreviewTree(nodes: FlowNode[], edges: FlowEdge[]): PreviewNode | null {
  const nodeMap = new Map<string, PreviewNode>();
  const childMap = new Map<string, string[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, {
      id: n.id,
      text: n.data.label,
      children: [],
      personalityFit: n.data.personalityFit,
      nodeType: n.data.nodeType,
    });
    childMap.set(n.id, []);
  }

  let rootId: string | null = null;
  const targetIds = new Set(edges.map((e) => e.target));
  for (const n of nodes) {
    if (!targetIds.has(n.id)) {
      rootId = n.id;
      break;
    }
  }

  for (const e of edges) {
    const children = childMap.get(e.source);
    if (children) {
      children.push(e.target);
    }
  }

  if (!rootId) return null;

  function buildNode(id: string): PreviewNode {
    const node = nodeMap.get(id)!;
    const children = childMap.get(id) || [];
    node.children = children.map((cid) => buildNode(cid));
    return node;
  }

  return buildNode(rootId);
}

const App: React.FC = () => {
  const [npcList, setNpcList] = useState<NPCItem[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPath, setPreviewPath] = useState<PreviewNode[]>([]);
  const [previewCurrentChildren, setPreviewCurrentChildren] = useState<PreviewNode[]>([]);
  const [previewCurrentNode, setPreviewCurrentNode] = useState<PreviewNode | null>(null);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newNpcName, setNewNpcName] = useState('');
  const [creatingNpc, setCreatingNpc] = useState(false);

  const radarCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    npcList.forEach((npc) => {
      const canvas = radarCanvasRefs.current.get(npc.id);
      if (canvas) {
        drawRadarChart(canvas, npc.personality, isMobile ? 60 : 80);
      }
    });
  }, [npcList, isMobile]);

  const selectedNpc = npcList.find((n) => n.id === selectedNpcId);

  const handleCreateNPC = useCallback(async () => {
    if (!newNpcName.trim()) return;
    try {
      const result = await npcManager.createNPC(newNpcName.trim(), { ...DEFAULT_PERSONALITY });
      const newItem: NPCItem = {
        id: result.id,
        name: result.name,
        personality: result.personality,
        avatarExpression: result.avatarExpression,
      };
      setNpcList((prev) => [...prev, newItem]);
      setNewNpcName('');
      setCreatingNpc(false);
      setSelectedNpcId(result.id);
    } catch (err) {
      console.error('Failed to create NPC:', err);
    }
  }, [newNpcName]);

  const handlePersonalityChange = useCallback(
    async (trait: keyof PersonalityParams, value: number) => {
      if (!selectedNpcId) return;
      setNpcList((prev) =>
        prev.map((npc) =>
          npc.id === selectedNpcId
            ? {
                ...npc,
                personality: { ...npc.personality, [trait]: value },
              }
            : npc
        )
      );
    },
    [selectedNpcId]
  );

  const handleGenerateDialogue = useCallback(async () => {
    if (!selectedNpcId || !selectedNpc) return;
    try {
      const result = await npcManager.generateDialogue(selectedNpcId, selectedNpc.personality);
      setNodes(result.nodes);
      setEdges(result.edges);
      setNpcList((prev) =>
        prev.map((npc) =>
          npc.id === selectedNpcId ? { ...npc, avatarExpression: result.avatarExpression } : npc
        )
      );
      setPreviewPath([]);
      setPreviewCurrentNode(null);
      setPreviewCurrentChildren([]);
    } catch (err) {
      console.error('Failed to generate dialogue:', err);
    }
  }, [selectedNpcId, selectedNpc]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {}, []);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {}, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newEdge: FlowEdge = {
          id: `e-${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: 'bezier',
          style: { stroke: '#e94560', strokeWidth: 2 },
        };
        setEdges((prev) => [...prev, newEdge]);
      }
    },
    []
  );

  const handleNodeDragStop = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      if (!selectedNpcId) return;
    },
    [selectedNpcId]
  );

  const handleNodeDoubleClick = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      if (!selectedNpcId) return;
      const newText = prompt('编辑节点文本:', node.data.label);
      if (newText !== null && newText.trim()) {
        try {
          const result = await npcManager.updateNode(selectedNpcId, node.id, newText.trim());
          setNodes((prev) =>
            prev.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: { ...n.data, label: result.text, personalityFit: result.personalityFit },
                  }
                : n
            )
          );
        } catch (err) {
          console.error('Failed to update node:', err);
        }
      }
    },
    [selectedNpcId]
  );

  useEffect(() => {
    const handleDeleteNode = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!selectedNpcId) return;

      const nodeEl = (e.target as HTMLElement).closest('.react-flow__node');
      const nodeId = nodeEl?.getAttribute('data-id');
      if (!nodeId) return;

      try {
        const result = await npcManager.deleteNode(selectedNpcId, nodeId);
        const deletedSet = new Set(result.deletedIds);
        setNodes((prev) => prev.filter((n) => !deletedSet.has(n.id)));
        setEdges((prev) => prev.filter((e) => !deletedSet.has(e.source) && !deletedSet.has(e.target)));
      } catch (err) {
        console.error('Failed to delete node:', err);
      }
    };

    const handleAddChild = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!selectedNpcId || !selectedNpc) return;

      const nodeEl = (e.target as HTMLElement).closest('.react-flow__node');
      const parentId = nodeEl?.getAttribute('data-id');
      if (!parentId) return;

      const { text } = customEvent.detail;
      try {
        const result = await npcManager.addChild(selectedNpcId, parentId, text, selectedNpc.personality);
        setNodes((prev) => [...prev, result.node]);
        setEdges((prev) => [...prev, result.edge]);
      } catch (err) {
        console.error('Failed to add child:', err);
      }
    };

    document.addEventListener('deleteNode', handleDeleteNode);
    document.addEventListener('addChildNode', handleAddChild);
    return () => {
      document.removeEventListener('deleteNode', handleDeleteNode);
      document.removeEventListener('addChildNode', handleAddChild);
    };
  }, [selectedNpcId, selectedNpc]);

  const startPreview = useCallback(() => {
    const tree = buildPreviewTree(nodes, edges);
    if (!tree) return;

    setPreviewPath([tree]);
    setPreviewCurrentNode(tree);
    setPreviewCurrentChildren(tree.children);
    setHighlightNodeId(tree.id);
    setShowPreview(true);
  }, [nodes, edges]);

  const selectPreviewOption = useCallback((child: PreviewNode) => {
    setPreviewPath((prev) => [...prev, child]);
    setPreviewCurrentNode(child);
    setPreviewCurrentChildren(child.children);
    setHighlightNodeId(child.id);
  }, []);

  const resetPreview = useCallback(() => {
    if (previewPath.length > 1) {
      const newPath = previewPath.slice(0, -1);
      const current = newPath[newPath.length - 1];
      setPreviewPath(newPath);
      setPreviewCurrentNode(current);
      setPreviewCurrentChildren(current.children);
      setHighlightNodeId(current.id);
    }
  }, [previewPath]);

  const handleExport = useCallback(async () => {
    if (!selectedNpcId) return;
    try {
      const result = await npcManager.exportDialogueTree(selectedNpcId);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.name || 'npc'}_dialogue_tree.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  }, [selectedNpcId]);

  return (
    <div className="app-container">
      {(isMobile ? (
        <div className="mobile-toolbar">
          <button className="toolbar-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            ☰ NPC列表
          </button>
          {selectedNpc && <span className="toolbar-title">{selectedNpc.name}</span>}
          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={startPreview} disabled={!selectedNpcId || nodes.length === 0}>
              预览
            </button>
            <button className="toolbar-btn" onClick={handleExport} disabled={!selectedNpcId}>
              导出
            </button>
          </div>
        </div>
      ) : null)}

      {(!isMobile || !sidebarCollapsed) && (
        <div className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`}>
          <div className="sidebar-header">
            <h2>NPC 管理器</h2>
            <button
              className="add-npc-btn"
              onClick={() => setCreatingNpc(true)}
            >
              + 新建
            </button>
          </div>

          {creatingNpc && (
            <div className="create-npc-form">
              <input
                className="npc-name-input"
                placeholder="NPC名称..."
                value={newNpcName}
                onChange={(e) => setNewNpcName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNPC();
                  if (e.key === 'Escape') setCreatingNpc(false);
                }}
                autoFocus
              />
              <button className="confirm-btn" onClick={handleCreateNPC}>
                创建
              </button>
              <button className="cancel-btn" onClick={() => setCreatingNpc(false)}>
                取消
              </button>
            </div>
          )}

          <div className="npc-list">
            {npcList.map((npc) => (
              <div
                key={npc.id}
                className={`npc-card ${npc.id === selectedNpcId ? 'npc-card-selected' : ''}`}
                onClick={() => setSelectedNpcId(npc.id)}
              >
                <div className="npc-avatar">{npc.avatarExpression}</div>
                <div className="npc-card-info">
                  <div className="npc-card-name">{npc.name}</div>
                  <canvas
                    ref={(el) => {
                      if (el) radarCanvasRefs.current.set(npc.id, el);
                    }}
                    className="npc-radar"
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedNpc && !isMobile && (
            <div className="personality-panel">
              <h3>性格参数</h3>
              {(Object.keys(PERSONALITY_LABELS) as (keyof PersonalityParams)[]).map((trait) => (
                <div key={trait} className="personality-slider-row">
                  <label className="personality-label">{PERSONALITY_LABELS[trait]}</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedNpc.personality[trait]}
                    onChange={(e) => handlePersonalityChange(trait, parseInt(e.target.value))}
                    className="personality-slider"
                  />
                  <span className="personality-value">{selectedNpc.personality[trait]}</span>
                </div>
              ))}
              <button className="generate-btn" onClick={handleGenerateDialogue}>
                🌳 生成对话树
              </button>
              <div className="action-btns">
                <button
                  className="action-btn"
                  onClick={startPreview}
                  disabled={nodes.length === 0}
                >
                  ▶ 预览对话
                </button>
                <button className="action-btn" onClick={handleExport}>
                  💾 导出JSON
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="editor-area">
        {selectedNpc && isMobile && (
          <div className="mobile-personality-panel">
            {(Object.keys(PERSONALITY_LABELS) as (keyof PersonalityParams)[]).map((trait) => (
              <div key={trait} className="personality-slider-row compact">
                <label className="personality-label">{PERSONALITY_LABELS[trait]}</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedNpc.personality[trait]}
                  onChange={(e) => handlePersonalityChange(trait, parseInt(e.target.value))}
                  className="personality-slider"
                />
                <span className="personality-value">{selectedNpc.personality[trait]}</span>
              </div>
            ))}
            <button className="generate-btn compact" onClick={handleGenerateDialogue}>
              生成对话树
            </button>
          </div>
        )}

        {selectedNpcId && nodes.length > 0 ? (
          <NodeEditor
            nodes={nodes}
            edges={edges}
            npcId={selectedNpcId}
            personality={selectedNpc?.personality || DEFAULT_PERSONALITY}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeDragStop={handleNodeDragStop}
            onNodeDoubleClick={handleNodeDoubleClick}
            highlightNodeId={highlightNodeId}
          />
        ) : (
          <div className="editor-placeholder">
            <div className="placeholder-icon">🌳</div>
            <div className="placeholder-text">
              {selectedNpcId
                ? '点击「生成对话树」开始编辑'
                : '创建或选择一个NPC以开始'}
            </div>
          </div>
        )}
      </div>

      {showPreview && previewCurrentNode && (
        <div className={`preview-panel ${isMobile ? 'preview-panel-fullscreen' : ''}`}>
          <div className="preview-header">
            <h3>对话预览</h3>
            <div className="preview-header-actions">
              {previewPath.length > 1 && (
                <button className="preview-back-btn" onClick={resetPreview}>
                  ↩ 返回
                </button>
              )}
              <button className="preview-close-btn" onClick={() => {
                setShowPreview(false);
                setHighlightNodeId(null);
              }}>
                ✕
              </button>
            </div>
          </div>
          <div className="preview-conversation">
            {previewPath.map((node, idx) => (
              <React.Fragment key={node.id}>
                <div className="preview-bubble preview-bubble-npc" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="bubble-avatar">{selectedNpc?.avatarExpression || '🤖'}</div>
                  <div className="bubble-content">{node.text}</div>
                  <div className="bubble-fit">适配度 {node.personalityFit}%</div>
                </div>
                {idx < previewPath.length - 1 && (
                  <div className="preview-bubble preview-bubble-user" style={{ animationDelay: `${idx * 0.05 + 0.025}s` }}>
                    <div className="bubble-content">选择了选项</div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          {previewCurrentChildren.length > 0 && (
            <div className="preview-options">
              {previewCurrentChildren.map((child) => (
                <button
                  key={child.id}
                  className="preview-option-btn"
                  onClick={() => selectPreviewOption(child)}
                >
                  {child.text}
                </button>
              ))}
            </div>
          )}
          {previewCurrentChildren.length === 0 && previewCurrentNode && (
            <div className="preview-end">— 对话结束 —</div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
