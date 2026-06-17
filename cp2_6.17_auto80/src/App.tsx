import { useState, useEffect, useRef, useCallback } from 'react';
import GraphCanvas from './GraphCanvas';
import type { GraphCanvasRef, LayoutType } from './GraphCanvas';
import { api } from './api';
import type { GraphNode, GraphEdge } from './types';

const LABEL_OPTIONS = ['人物', '事件', '概念', '地点', '组织'];
const LABEL_COLORS: Record<string, string> = {
  '人物': '#ef4444',
  '事件': '#8b5cf6',
  '概念': '#3b82f6',
  '地点': '#10b981',
  '组织': '#f59e0b',
};

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<LayoutType>('force');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('概念');
  const [isEdgeMode, setIsEdgeMode] = useState(false);
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef<GraphCanvasRef>(null);
  const editPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGraph();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingNode && editPopupRef.current && !editPopupRef.current.contains(e.target as Node)) {
        setEditingNode(null);
      }
    };
    if (editingNode) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [editingNode]);

  const loadGraph = async () => {
    try {
      const data = await api.getGraph();
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (err) {
      console.error('加载图谱数据失败:', err);
    }
  };

  const handleAddNode = async () => {
    if (!newNodeName.trim() || newNodeName.length > 20) return;
    try {
      const newNode = await api.createNode({
        name: newNodeName.trim(),
        label: newNodeLabel,
        x: 400,
        y: 300,
      });
      setNodes(prev => [...prev, newNode]);
      setIsModalOpen(false);
      setNewNodeName('');
      setNewNodeLabel('概念');
    } catch (err) {
      console.error('添加节点失败:', err);
    }
  };

  const handleNodeUpdate = async (id: string, data: { x?: number; y?: number; name?: string; label?: string }) => {
    try {
      const updated = await api.updateNode(id, data);
      setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    } catch (err) {
      console.error('更新节点失败:', err);
    }
  };

  const handleEdgeCreate = async (source: string, target: string) => {
    try {
      const newEdge = await api.createEdge({ source, target });
      setEdges(prev => [...prev, newEdge]);
    } catch (err) {
      console.error('创建连线失败:', err);
    }
  };

  const handleNodeDoubleClick = (node: GraphNode) => {
    setEditingNode(node);
    setEditName(node.name);
    setEditLabel(node.label);
    const canvasRect = document.querySelector('canvas')?.getBoundingClientRect();
    if (canvasRect) {
      setEditPosition({
        x: canvasRect.left + node.x + 50,
        y: canvasRect.top + node.y - 30,
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingNode || !editName.trim() || editName.length > 20) return;
    try {
      const updated = await api.updateNode(editingNode.id, {
        name: editName.trim(),
        label: editLabel,
      });
      setNodes(prev => prev.map(n => (n.id === editingNode.id ? updated : n)));
      setEditingNode(null);
    } catch (err) {
      console.error('保存编辑失败:', err);
    }
  };

  const handleContextMenu = (x: number, y: number, nodeId?: string) => {
    setContextMenu({ x, y, nodeId });
  };

  const handleAddEdgeMode = () => {
    setIsEdgeMode(true);
    setContextMenu(null);
  };

  const handleDeleteNode = async () => {
    if (!contextMenu?.nodeId) return;
    try {
      await api.deleteNode(contextMenu.nodeId);
      setNodes(prev => prev.filter(n => n.id !== contextMenu.nodeId));
      setEdges(prev => prev.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId));
      setContextMenu(null);
    } catch (err) {
      console.error('删除节点失败:', err);
    }
  };

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
    canvasRef.current?.applyLayout(newLayout);
  };

  const handleZoomChange = (zoom: number) => {
    setZoomLevel(zoom);
  };

  const handleResetZoom = () => {
    canvasRef.current?.resetZoom();
  };

  const filteredNodes = nodes.filter(n => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return n.name.toLowerCase().includes(query) || n.label.toLowerCase().includes(query);
  });

  return (
    <div style={styles.app}>
      <div style={styles.leftPanel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>节点列表</h2>
          <button
            style={styles.addButton}
            onClick={() => setIsModalOpen(true)}
          >
            + 添加节点
          </button>
        </div>
        <div style={styles.nodeList}>
          {nodes.map(node => {
            const isFiltered = searchQuery.trim() && !filteredNodes.find(n => n.id === node.id);
            return (
              <div
                key={node.id}
                style={{
                  ...styles.nodeItem,
                  opacity: isFiltered ? 0.3 : 1,
                  borderLeftColor: LABEL_COLORS[node.label] || '#3b82f6',
                }}
              >
                <div style={styles.nodeItemName}>{node.name}</div>
                <div style={{
                  ...styles.nodeItemLabel,
                  backgroundColor: LABEL_COLORS[node.label] || '#3b82f6',
                }}>
                  {node.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.mainArea}>
        <div style={styles.topBar}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="搜索节点…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.toolbar}>
            <button
              style={{
                ...styles.toolButton,
                backgroundColor: layout === 'force' ? '#3b82f6' : '#334155',
              }}
              onClick={() => handleLayoutChange('force')}
            >
              力导向布局
            </button>
            <button
              style={{
                ...styles.toolButton,
                backgroundColor: layout === 'circle' ? '#3b82f6' : '#334155',
              }}
              onClick={() => handleLayoutChange('circle')}
            >
              圆形布局
            </button>
            <button
              style={{
                ...styles.toolButton,
                backgroundColor: layout === 'hierarchy' ? '#3b82f6' : '#334155',
              }}
              onClick={() => handleLayoutChange('hierarchy')}
            >
              分层布局
            </button>
          </div>
        </div>

        <div style={styles.canvasContainer}>
          <GraphCanvas
            ref={canvasRef}
            nodes={nodes}
            edges={edges}
            searchQuery={searchQuery}
            labelFilter=""
            layout={layout}
            isEdgeMode={isEdgeMode}
            onEdgeModeChange={setIsEdgeMode}
            onNodeUpdate={handleNodeUpdate}
            onEdgeCreate={handleEdgeCreate}
            onNodeDoubleClick={handleNodeDoubleClick}
            onContextMenu={handleContextMenu}
            onZoomChange={handleZoomChange}
          />
          {isEdgeMode && (
            <div style={styles.edgeModeIndicator}>
              连线模式 - 点击两个节点创建连线
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setIsEdgeMode(false);
                }}
              >
                取消
              </button>
            </div>
          )}
          <div style={styles.zoomIndicator} onClick={handleResetZoom}>
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          style={{
            ...styles.modalOverlay,
            animation: 'fadeIn 0.2s ease forwards',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              ...styles.modalContent,
              animation: 'scaleIn 0.2s ease forwards',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={styles.modalTitle}>添加节点</h3>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>节点名称</label>
              <input
                type="text"
                value={newNodeName}
                onChange={e => setNewNodeName(e.target.value)}
                maxLength={20}
                style={styles.formInput}
                placeholder="最多20个字符"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddNode();
                }}
              />
              <div style={styles.charCount}>{newNodeName.length}/20</div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>标签</label>
              <select
                value={newNodeLabel}
                onChange={e => setNewNodeLabel(e.target.value)}
                style={styles.formSelect}
              >
                {LABEL_OPTIONS.map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.modalButton, backgroundColor: '#334155' }}
                onClick={() => setIsModalOpen(false)}
              >
                取消
              </button>
              <button
                style={{ ...styles.modalButton, backgroundColor: '#3b82f6' }}
                onClick={handleAddNode}
                disabled={!newNodeName.trim()}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {editingNode && (
        <div
          ref={editPopupRef}
          style={{
            ...styles.editPopup,
            left: editPosition.x,
            top: editPosition.y,
            animation: 'fadeIn 0.3s ease forwards',
          }}
        >
          <h4 style={styles.editPopupTitle}>编辑节点</h4>
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            maxLength={20}
            style={styles.editInput}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveEdit();
            }}
          />
          <select
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            style={styles.editSelect}
          >
            {LABEL_OPTIONS.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
          <div style={styles.editButtons}>
            <button
              style={{ ...styles.editButton, backgroundColor: '#334155' }}
              onClick={() => setEditingNode(null)}
            >
              取消
            </button>
            <button
              style={{ ...styles.editButton, backgroundColor: '#3b82f6' }}
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
            animation: 'fadeIn 0.15s ease forwards',
          }}
          onClick={e => e.stopPropagation()}
        >
          {!contextMenu.nodeId && (
            <div style={styles.contextMenuItem} onClick={handleAddEdgeMode}>
              添加连线
            </div>
          )}
          {contextMenu.nodeId && (
            <div
              style={{ ...styles.contextMenuItem, color: '#ef4444' }}
              onClick={handleDeleteNode}
            >
              删除节点
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    minWidth: '900px',
  },
  leftPanel: {
    width: '300px',
    flexShrink: 0,
    backgroundColor: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '16px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  nodeList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  nodeItem: {
    padding: '10px 12px',
    marginBottom: '0px',
    backgroundColor: '#334155',
    borderRadius: '0px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderLeft: '3px solid #3b82f6',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeItemName: {
    fontSize: '14px',
    fontWeight: 500,
  },
  nodeItemLabel: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    color: 'white',
  },
  divider: {
    width: '1px',
    backgroundColor: '#334155',
    flexShrink: 0,
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  topBar: {
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  searchContainer: {
    flex: 1,
    maxWidth: '400px',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
  },
  toolButton: {
    padding: '8px 14px',
    backgroundColor: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.2s',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    zIndex: 10,
    border: '1px solid #334155',
    transition: 'all 0.2s',
  },
  edgeModeIndicator: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#f59e0b',
    color: '#1e293b',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 10,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    border: '1px solid #1e293b',
    color: '#1e293b',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    width: '360px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
  },
  formGroup: {
    marginBottom: '16px',
    position: 'relative',
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  charCount: {
    position: 'absolute',
    right: '8px',
    top: '32px',
    fontSize: '11px',
    color: '#64748b',
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
  },
  modalButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  editPopup: {
    position: 'fixed',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    zIndex: 50,
    width: '200px',
  },
  editPopupTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
  },
  editInput: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    marginBottom: '8px',
    boxSizing: 'border-box',
  },
  editSelect: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  editButtons: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    flex: 1,
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s',
  },
  contextMenu: {
    position: 'fixed',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    zIndex: 60,
    minWidth: '120px',
    overflow: 'hidden',
  },
  contextMenuItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.15s',
  },
};

export default App;
