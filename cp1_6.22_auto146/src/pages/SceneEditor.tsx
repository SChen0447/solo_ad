import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Scene,
  RuleNode as RuleNodeType,
  Connection,
  ConditionSubtype,
  ActionSubtype,
  DeviceChange,
} from '../types';
import { sceneApi, deviceApi } from '../services/api';
import RuleNode, { NODE_WIDTH, NODE_HEIGHT } from '../components/RuleNode';
import { Device } from '../types';

interface SceneEditorProps {
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface PaletteItem {
  type: 'condition' | 'action';
  subtype: ConditionSubtype | ActionSubtype;
  label: string;
  defaultParams: Record<string, any>;
}

const conditionPalette: PaletteItem[] = [
  { type: 'condition', subtype: 'temp_high', label: '温度 > 30°C', defaultParams: { threshold: 30 } },
  { type: 'condition', subtype: 'temp_low', label: '温度 < 18°C', defaultParams: { threshold: 18 } },
  { type: 'condition', subtype: 'humidity_high', label: '湿度 > 70%', defaultParams: { threshold: 70 } },
  { type: 'condition', subtype: 'humidity_low', label: '湿度 < 30%', defaultParams: { threshold: 30 } },
  { type: 'condition', subtype: 'device_on', label: '设备开启', defaultParams: { deviceId: '' } },
  { type: 'condition', subtype: 'motion', label: '有人移动', defaultParams: { location: '门口' } },
];

const actionPalette: PaletteItem[] = [
  { type: 'action', subtype: 'light_on', label: '开灯', defaultParams: { deviceId: '' } },
  { type: 'action', subtype: 'light_off', label: '关灯', defaultParams: { deviceId: '' } },
  { type: 'action', subtype: 'ac_on', label: '打开空调', defaultParams: { deviceId: '' } },
  { type: 'action', subtype: 'ac_off', label: '关闭空调', defaultParams: { deviceId: '' } },
  { type: 'action', subtype: 'curtain_open', label: '打开窗帘', defaultParams: { deviceId: '' } },
  { type: 'action', subtype: 'curtain_close', label: '拉上窗帘', defaultParams: { deviceId: '' } },
];

function SceneEditor({ addNotification }: SceneEditorProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string>('');
  const [sceneName, setSceneName] = useState('新场景');
  const [nodes, setNodes] = useState<RuleNodeType[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [editingNode, setEditingNode] = useState<RuleNodeType | null>(null);
  const [connecting, setConnecting] = useState<{ fromNodeId: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [animatingConnections, setAnimatingConnections] = useState<Set<string>>(new Set());
  const [animatingNodes, setAnimatingNodes] = useState<Set<string>>(new Set());
  const [simResults, setSimResults] = useState<DeviceChange[]>([]);
  const [showSceneList, setShowSceneList] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<PaletteItem | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scns, devs] = await Promise.all([sceneApi.getAll(), deviceApi.getAll()]);
        setScenes(scns);
        setDevices(devs);
        if (scns.length > 0) {
          loadScene(scns[0]);
        }
      } catch (e: any) {
        addNotification('error', e.message || '加载数据失败');
      }
    };
    loadData();
  }, [addNotification]);

  const loadScene = (scene: Scene) => {
    setCurrentSceneId(scene.id);
    setSceneName(scene.name);
    setNodes(scene.nodes);
    setConnections(scene.connections);
    setSelectedNodeId(null);
  };

  const handleDragStart = (item: PaletteItem) => {
    dragItem.current = item;
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragItem.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - NODE_WIDTH / 2;
    const y = e.clientY - rect.top - NODE_HEIGHT / 2;

    const newNode: RuleNodeType = {
      id: uuidv4(),
      type: dragItem.current.type,
      subtype: dragItem.current.subtype,
      label: dragItem.current.label,
      x: Math.max(0, x),
      y: Math.max(0, y),
      params: { ...dragItem.current.defaultParams },
    };

    setNodes((prev) => [...prev, newNode]);
    dragItem.current = null;
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    );
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const handleNodeDoubleClick = (node: RuleNodeType) => {
    setEditingNode({ ...node });
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.from !== nodeId && c.to !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleStartConnect = (nodeId: string) => {
    setConnecting({ fromNodeId: nodeId });
  };

  const handleEndConnect = (nodeId: string) => {
    if (!connecting || connecting.fromNodeId === nodeId) {
      setConnecting(null);
      return;
    }

    const fromNode = nodes.find((n) => n.id === connecting.fromNodeId);
    const toNode = nodes.find((n) => n.id === nodeId);

    if (fromNode && toNode && fromNode.type !== toNode.type) {
      const exists = connections.some(
        (c) => c.from === connecting.fromNodeId && c.to === nodeId
      );
      if (!exists) {
        setConnections((prev) => [
          ...prev,
          { id: uuidv4(), from: connecting.fromNodeId, to: nodeId },
        ]);
      }
    }
    setConnecting(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleCanvasClick = () => {
    setSelectedNodeId(null);
    setConnecting(null);
  };

  const handleSaveNodeEdit = () => {
    if (!editingNode) return;
    setNodes((prev) => prev.map((n) => (n.id === editingNode.id ? editingNode : n)));
    setEditingNode(null);
    addNotification('success', '节点已更新');
  };

  const generateNodeLabel = (node: RuleNodeType): string => {
    switch (node.subtype) {
      case 'temp_high':
        return `温度 > ${node.params.threshold || 30}°C`;
      case 'temp_low':
        return `温度 < ${node.params.threshold || 18}°C`;
      case 'humidity_high':
        return `湿度 > ${node.params.threshold || 70}%`;
      case 'humidity_low':
        return `湿度 < ${node.params.threshold || 30}%`;
      case 'device_on': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `${dev.name} 已开启` : '设备开启';
      }
      case 'motion':
        return node.params.location ? `${node.params.location}有人移动` : '有人移动';
      case 'light_on': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `开 ${dev.name}` : '开灯';
      }
      case 'light_off': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `关 ${dev.name}` : '关灯';
      }
      case 'ac_on': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `开 ${dev.name}` : '打开空调';
      }
      case 'ac_off': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `关 ${dev.name}` : '关闭空调';
      }
      case 'curtain_open': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `开 ${dev.name}` : '打开窗帘';
      }
      case 'curtain_close': {
        const dev = devices.find((d) => d.id === node.params.deviceId);
        return dev ? `关 ${dev.name}` : '拉上窗帘';
      }
      default:
        return node.label;
    }
  };

  const handleSaveScene = async () => {
    if (!sceneName.trim()) {
      addNotification('error', '请输入场景名称');
      return;
    }
    setSaving(true);
    try {
      const sceneData = {
        name: sceneName,
        nodes: nodes.map((n) => ({ ...n, label: generateNodeLabel(n) })),
        connections,
      };

      let savedScene: Scene;
      if (currentSceneId && scenes.some((s) => s.id === currentSceneId)) {
        savedScene = await sceneApi.update(currentSceneId, sceneData);
        addNotification('success', '场景已更新');
      } else {
        savedScene = await sceneApi.create(sceneData);
        setCurrentSceneId(savedScene.id);
        addNotification('success', '场景已保存');
      }

      setNodes(savedScene.nodes);
      const allScenes = await sceneApi.getAll();
      setScenes(allScenes);
    } catch (e: any) {
      addNotification('error', e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSimulate = async () => {
    if (!currentSceneId) {
      addNotification('error', '请先保存场景');
      return;
    }
    if (nodes.length === 0) {
      addNotification('error', '场景中没有节点');
      return;
    }

    setSimulating(true);
    setSimResults([]);

    try {
      await sceneApi.update(currentSceneId, {
        name: sceneName,
        nodes: nodes.map((n) => ({ ...n, label: generateNodeLabel(n) })),
        connections,
      });

      const result = await sceneApi.simulate(currentSceneId);
      setSimResults(result.changes);

      if (result.changes.length > 0) {
        result.changes.forEach((c) => {
          addNotification('success', `${c.deviceName} - ${c.message}`);
        });
      } else if (result.conditionsMet) {
        addNotification('info', '条件已满足，无设备状态变更');
      } else {
        addNotification('info', '条件未满足');
      }

      conditionNodesLoop: for (const cond of nodes.filter((n) => n.type === 'condition')) {
        for (const act of nodes.filter((n) => n.type === 'action')) {
          const conn = connections.find(
            (c) =>
              (c.from === cond.id && c.to === act.id) ||
              (c.from === act.id && c.to === cond.id)
          );
          if (conn) {
            setTimeout(() => {
              setAnimatingConnections((prev) => new Set(prev).add(conn.id));
              setAnimatingNodes((prev) => new Set(prev).add(cond.id).add(act.id));
            }, 100);
            break conditionNodesLoop;
          }
        }
      }

      setTimeout(() => {
        setAnimatingConnections(new Set());
        setAnimatingNodes(new Set());
      }, 1500);
    } catch (e: any) {
      addNotification('error', e.message || '模拟失败');
    } finally {
      setTimeout(() => setSimulating(false), 1000);
    }
  };

  const handleNewScene = () => {
    setCurrentSceneId('');
    setSceneName('新场景');
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
  };

  const handleDeleteConnection = (connId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  const getAnchorPosition = (nodeId: string, anchor: 'input' | 'output') => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: anchor === 'output' ? node.x + NODE_WIDTH : node.x,
      y: node.y + NODE_HEIGHT / 2,
    };
  };

  const renderBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0' }}>场景编辑</h2>
          <div style={{ position: 'relative' }}>
            <button
              className="btn-pulse"
              onClick={() => setShowSceneList(!showSceneList)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid #475569',
                background: '#1e293b',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 200ms',
              }}
            >
              已保存场景 ▾
            </button>
            {showSceneList && (
              <div
                className="fade-in"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: '#1e293b',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  minWidth: 200,
                  zIndex: 50,
                  boxShadow: 'rgba(0,0,0,0.4) 0px 8px 24px',
                }}
              >
                <button
                  onClick={() => {
                    handleNewScene();
                    setShowSceneList(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid #334155',
                    background: 'transparent',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  + 新建场景
                </button>
                {scenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      loadScene(s);
                      setShowSceneList(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: 'none',
                      background: s.id === currentSceneId ? '#334155' : 'transparent',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 13,
                      textAlign: 'left',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none',
              width: 180,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn-pulse ${simulating ? 'glow-pulse' : ''}`}
            onClick={handleSimulate}
            disabled={simulating}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#f59e0b',
              color: '#ffffff',
              cursor: simulating ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              opacity: simulating ? 0.8 : 1,
              transition: 'filter 200ms',
            }}
            onMouseEnter={(e) => {
              if (!simulating) e.currentTarget.style.filter = 'brightness(1.2)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            ⚡ 模拟触发
          </button>
          <button
            className="btn-pulse"
            onClick={handleSaveScene}
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              opacity: saving ? 0.6 : 1,
              transition: 'filter 200ms',
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.filter = 'brightness(1.2)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            {saving ? '保存中...' : '💾 保存场景'}
          </button>
        </div>
      </div>

      {simResults.length > 0 && (
        <div
          className="slide-down"
          style={{
            padding: '12px 16px',
            background: '#065f46',
            borderRadius: 8,
            color: '#ffffff',
            fontSize: 14,
          }}
        >
          <strong>模拟结果：</strong>
          {simResults.map((r, i) => (
            <span key={i}>
              {i > 0 && ' | '}
              {r.deviceName} - {r.message}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
        <div
          style={{
            width: 200,
            background: '#1e293b',
            borderRadius: 12,
            padding: 16,
            boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
            flexShrink: 0,
            display: panelExpanded ? 'block' : 'none',
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            条件元件
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {conditionPalette.map((item, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(item)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#1e3a5f',
                  border: '1px solid #3b82f6',
                  color: '#e2e8f0',
                  fontSize: 13,
                  cursor: 'grab',
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1e3a5f';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            动作元件
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actionPalette.map((item, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(item)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#3b1e5f',
                  border: '1px solid #8b5cf6',
                  color: '#e2e8f0',
                  fontSize: 13,
                  cursor: 'grab',
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#7c3aed';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b1e5f';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 12,
              borderRadius: 8,
              background: '#0f172a',
              fontSize: 11,
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            💡 提示：拖拽元件到画布，从输出锚点拖到输入锚点建立连线。双击节点编辑参数。
          </div>
        </div>

        <button
          onClick={() => setPanelExpanded(!panelExpanded)}
          style={{
            position: 'absolute',
            left: panelExpanded ? 216 : 0,
            top: 8,
            width: 24,
            height: 32,
            borderRadius: '0 6px 6px 0',
            border: 'none',
            background: '#1e293b',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 12,
            zIndex: 5,
          }}
        >
          {panelExpanded ? '◀' : '▶'}
        </button>

        <div
          ref={canvasRef}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
          style={{
            flex: 1,
            width: '100%',
            height: 600,
            background: '#111827',
            borderRadius: 12,
            position: 'relative',
            overflow: 'auto',
            boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
            backgroundImage:
              'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            minWidth: 600,
          }}
        >
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              minWidth: 2000,
              minHeight: 800,
            }}
          >
            {connections.map((conn) => {
              const from = getAnchorPosition(conn.from, 'output');
              const to = getAnchorPosition(conn.to, 'input');
              const isAnimating = animatingConnections.has(conn.id);
              const isHovered = hoveredConnection === conn.id;
              return (
                <g key={conn.id}>
                  <path
                    d={renderBezierPath(from.x, from.y, to.x, to.y)}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredConnection(conn.id)}
                    onMouseLeave={() => setHoveredConnection(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('删除此连线？')) handleDeleteConnection(conn.id);
                    }}
                  />
                  <path
                    d={renderBezierPath(from.x, from.y, to.x, to.y)}
                    stroke={isAnimating ? '#22c55e' : isHovered ? '#0ea5e9' : '#38bdf8'}
                    strokeWidth={isAnimating ? 3 : 2}
                    fill="none"
                    className={isAnimating ? 'flow-animation' : ''}
                    style={{ transition: 'stroke 200ms, stroke-width 200ms' }}
                  />
                  {isAnimating && (
                    <circle r={6} fill="#22c55e">
                      <animateMotion dur="500ms" repeatCount="indefinite">
                        <mpath href={`#path-${conn.id}`} />
                      </animateMotion>
                    </circle>
                  )}
                </g>
              );
            })}

            {connecting && (() => {
              const from = getAnchorPosition(connecting.fromNodeId, 'output');
              return (
                <path
                  d={renderBezierPath(from.x, from.y, mousePos.x, mousePos.y)}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                />
              );
            })()}
          </svg>

          {nodes.map((node) => (
            <RuleNode
              key={node.id}
              node={{ ...node, label: generateNodeLabel(node) }}
              isSelected={selectedNodeId === node.id}
              isAnimating={animatingNodes.has(node.id)}
              onSelect={() => handleNodeSelect(node.id)}
              onMove={(x, y) => handleNodeMove(node.id, x, y)}
              onDoubleClick={() => handleNodeDoubleClick(node)}
              onStartConnect={(id) => handleStartConnect(id)}
              onEndConnect={(id) => handleEndConnect(id)}
              isConnecting={!!connecting}
              onDelete={() => handleNodeDelete(node.id)}
            />
          ))}

          {nodes.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#64748b',
                fontSize: 14,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              从左侧面板拖拽条件和动作元件到此处开始创建场景
            </div>
          )}
        </div>
      </div>

      {editingNode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setEditingNode(null)}
        >
          <div
            className="fade-in-up"
            style={{
              background: '#0f172a',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: 'rgba(0,0,0,0.5) 0px 8px 32px',
              border: '1px solid #334155',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: 20,
              }}
            >
              编辑{editingNode.type === 'condition' ? '条件' : '动作'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(editingNode.subtype === 'temp_high' ||
                editingNode.subtype === 'temp_low' ||
                editingNode.subtype === 'humidity_high' ||
                editingNode.subtype === 'humidity_low') && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#94a3b8',
                      marginBottom: 6,
                    }}
                  >
                    阈值
                    {editingNode.subtype.includes('temp') ? ' (°C)' : ' (%)'}
                  </label>
                  <input
                    type="number"
                    value={editingNode.params.threshold || 0}
                    onChange={(e) =>
                      setEditingNode({
                        ...editingNode,
                        params: { ...editingNode.params, threshold: Number(e.target.value) },
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #334155',
                      background: '#334155',
                      color: '#e2e8f0',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {editingNode.subtype === 'motion' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#94a3b8',
                      marginBottom: 6,
                    }}
                  >
                    位置
                  </label>
                  <input
                    type="text"
                    value={editingNode.params.location || ''}
                    onChange={(e) =>
                      setEditingNode({
                        ...editingNode,
                        params: { ...editingNode.params, location: e.target.value },
                      })
                    }
                    placeholder="例如：门口、客厅"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #334155',
                      background: '#334155',
                      color: '#e2e8f0',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {(editingNode.subtype === 'device_on' ||
                editingNode.subtype.startsWith('light') ||
                editingNode.subtype.startsWith('ac') ||
                editingNode.subtype.startsWith('curtain')) && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#94a3b8',
                      marginBottom: 6,
                    }}
                  >
                    目标设备
                  </label>
                  <select
                    value={editingNode.params.deviceId || ''}
                    onChange={(e) =>
                      setEditingNode({
                        ...editingNode,
                        params: { ...editingNode.params, deviceId: e.target.value },
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #334155',
                      background: '#334155',
                      color: '#e2e8f0',
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">自动选择匹配类型</option>
                    {devices
                      .filter((d) => {
                        if (editingNode.subtype.startsWith('light')) return d.type === 'light';
                        if (editingNode.subtype.startsWith('ac')) return d.type === 'ac';
                        if (editingNode.subtype.startsWith('curtain')) return d.type === 'curtain';
                        return true;
                      })
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 24,
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="btn-pulse"
                onClick={() => setEditingNode(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                className="btn-pulse"
                onClick={handleSaveNodeEdit}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="display: flex"][style*="gap: 16"][style*="position: relative"] {
            flex-direction: column !important;
          }
          div[style*="width: 200px"][style*="background: #1e293b"] {
            width: 100% !important;
          }
          button[style*="position: absolute"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SceneEditor;
