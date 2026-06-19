import { useState, useEffect, useCallback, useRef } from 'react'
import GraphCanvas from './components/GraphCanvas'
import NodeEditor from './components/NodeEditor'
import { GraphNode, GraphEdge, GraphData, COLOR_PALETTE } from './utils/graphLayout'

const API_BASE = '/api'

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export default function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [responsiveCollapsed, setResponsiveCollapsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setResponsiveCollapsed(window.innerWidth < 1200)
      if (window.innerWidth < 1200) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadGraph()
  }, [])

  const loadGraph = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<GraphData>('/graph')
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
    } catch (e) {
      console.error('Failed to load graph:', e)
    } finally {
      setLoading(false)
    }
  }

  const scheduleFullSave = useCallback((newNodes: GraphNode[], newEdges: GraphEdge[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiFetch('/graph', {
          method: 'PUT',
          body: JSON.stringify({ nodes: newNodes, edges: newEdges })
        })
      } catch (e) {
        console.error('Save failed:', e)
      }
    }, 500)
  }, [])

  const handleNodeCreate = async (x: number, y: number) => {
    try {
      const newNode = await apiFetch<GraphNode>('/nodes', {
        method: 'POST',
        body: JSON.stringify({
          title: '新概念',
          description: '',
          color: COLOR_PALETTE[0],
          x,
          y
        })
      })
      setNodes(prev => [...prev, newNode])
    } catch (e) {
      console.error('Create node failed:', e)
    }
  }

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => {
      const next = prev.map(n => n.id === nodeId ? { ...n, x, y } : n)
      scheduleFullSave(next, edges)
      return next
    })
  }, [edges, scheduleFullSave])

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
    setEditorOpen(true)
    setHamburgerOpen(false)
  }

  const handleNodeUpdate = async (updated: GraphNode) => {
    try {
      const saved = await apiFetch<GraphNode>(`/nodes/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: updated.title,
          description: updated.description,
          color: updated.color
        })
      })
      setNodes(prev => prev.map(n => n.id === saved.id ? saved : n))
      setSelectedNode(saved)
    } catch (e) {
      console.error('Update failed:', e)
    }
  }

  const handleNodeDelete = async (nodeId: string) => {
    try {
      await apiFetch(`/nodes/${nodeId}`, { method: 'DELETE' })
      setNodes(prev => prev.filter(n => n.id !== nodeId))
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
      setEditorOpen(false)
      setSelectedNode(null)
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const handleEdgeCreate = async (sourceId: string, targetId: string, label: string) => {
    try {
      const newEdge = await apiFetch<GraphEdge>('/edges', {
        method: 'POST',
        body: JSON.stringify({ source: sourceId, target: targetId, label })
      })
      setEdges(prev => [...prev, { ...newEdge, animationProgress: 0 }])
    } catch (e) {
      console.error('Create edge failed:', e)
    }
  }

  const handleEdgeDelete = async (edgeId: string) => {
    try {
      await apiFetch(`/edges/${edgeId}`, { method: 'DELETE' })
      setEdges(prev => prev.filter(e => e.id !== edgeId))
    } catch (e) {
      console.error('Delete edge failed:', e)
    }
  }

  const handleExport = () => {
    const data = { nodes, edges, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `knowledge-graph-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await apiFetch<GraphData>('/graph/import', {
        method: 'POST',
        body: JSON.stringify({ nodes: data.nodes || [], edges: data.edges || [] })
      })
      setNodes(result.nodes)
      setEdges(result.edges)
      setEditorOpen(false)
      setSelectedNode(null)
    } catch (err) {
      console.error('Import failed:', err)
      alert('导入失败：文件格式不正确')
    } finally {
      e.target.value = ''
    }
  }

  const handleAutoLayout = () => {
    import('./utils/graphLayout').then(({ forceDirectedLayout }) => {
      const laid = forceDirectedLayout(nodes, edges, {
        iterations: 150,
        width: 1000,
        height: 700
      })
      setNodes(laid)
      scheduleFullSave(laid, edges)
    })
  }

  const showSidebar = responsiveCollapsed ? hamburgerOpen : sidebarOpen

  return (
    <div style={styles.container}>
      {responsiveCollapsed && (
        <button
          style={{
            ...styles.hamburger,
            transform: hamburgerOpen ? 'translateX(260px)' : 'translateX(0)',
          }}
          onClick={() => setHamburgerOpen(!hamburgerOpen)}
        >
          ☰
        </button>
      )}

      <aside
        style={{
          ...styles.sidebar,
          width: showSidebar ? 280 : 0,
          padding: showSidebar ? '20px 16px' : '0',
          overflow: showSidebar ? 'auto' : 'hidden',
          boxShadow: responsiveCollapsed && hamburgerOpen
            ? '4px 0 20px rgba(0,0,0,0.3)'
            : '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: responsiveCollapsed ? 100 : 10,
        }}
      >
        <div style={styles.sidebarHeader}>
          <h1 style={styles.title}>知识图谱</h1>
          {!responsiveCollapsed && (
            <button
              style={styles.iconBtn}
              onClick={() => setSidebarOpen(false)}
              title="收起"
            >
              ◀
            </button>
          )}
        </div>

        <div style={styles.actionGroup}>
          <button style={styles.primaryBtn} onClick={handleAutoLayout}>
            ✦ 自动布局
          </button>
          <button style={styles.secondaryBtn} onClick={handleExport}>
            ↓ 导出 JSON
          </button>
          <button style={styles.secondaryBtn} onClick={handleImportClick}>
            ↑ 导入 JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{nodes.length}</span>
            <span style={styles.statLabel}>节点</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{edges.length}</span>
            <span style={styles.statLabel}>关系</span>
          </div>
        </div>

        <div style={styles.sectionHeader}>
          <span>节点列表</span>
        </div>

        <div style={styles.nodeList}>
          {nodes.length === 0 && (
            <div style={styles.emptyHint}>
              双击画布创建节点
            </div>
          )}
          {nodes.map(node => (
            <div
              key={node.id}
              style={{
                ...styles.nodeListItem,
                borderLeftColor: node.color,
                background: selectedNode?.id === node.id ? 'rgba(74,111,165,0.15)' : 'transparent',
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div
                style={{
                  ...styles.nodeDot,
                  backgroundColor: node.color,
                }}
              />
              <span style={styles.nodeListItemTitle}>{node.title}</span>
            </div>
          ))}
        </div>

        <div style={styles.hintBox}>
          <div style={styles.hintTitle}>操作提示</div>
          <ul style={styles.hintList}>
            <li>双击画布：创建节点</li>
            <li>拖拽节点：移动位置</li>
            <li>从节点拖拽到另一节点：创建关系</li>
            <li>滚轮：缩放 · 空白拖拽：平移</li>
            <li>点击节点：编辑属性</li>
            <li>右键关系线：删除</li>
          </ul>
        </div>
      </aside>

      {!sidebarOpen && !responsiveCollapsed && (
        <button style={styles.expandBtn} onClick={() => setSidebarOpen(true)}>
          ▶
        </button>
      )}

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNode?.id || null}
            onNodeCreate={handleNodeCreate}
            onNodeMove={handleNodeMove}
            onNodeClick={handleNodeClick}
            onEdgeCreate={handleEdgeCreate}
            onEdgeDelete={handleEdgeDelete}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
          />
        )}
      </main>

      <NodeEditor
        open={editorOpen}
        node={selectedNode}
        onClose={() => {
          setEditorOpen(false)
          setSelectedNode(null)
        }}
        onSave={handleNodeUpdate}
        onDelete={handleNodeDelete}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f2f5',
    position: 'relative',
  },
  sidebar: {
    backgroundColor: '#1a1a2e',
    color: '#e4e4e4',
    flexShrink: 0,
    transition: 'all 300ms ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  hamburger: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 20,
    zIndex: 101,
    transition: 'transform 300ms ease-in-out',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: 1,
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: '#bbb',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 150ms',
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#4a6fa5',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 150ms',
  },
  secondaryBtn: {
    padding: '9px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ddd',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 150ms',
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    padding: '12px',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 700,
    color: '#4a6fa5',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  nodeList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
  },
  nodeListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    borderLeft: '4px solid',
    transition: 'all 150ms',
    backgroundColor: 'transparent',
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  nodeListItemTitle: {
    fontSize: 13,
    color: '#ddd',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  emptyHint: {
    textAlign: 'center',
    padding: 24,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  hintBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    fontSize: 12,
  },
  hintTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#4a6fa5',
    marginBottom: 8,
  },
  hintList: {
    paddingLeft: 16,
    margin: 0,
    color: '#777',
    lineHeight: 1.8,
  },
  expandBtn: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 20,
    height: 60,
    backgroundColor: '#1a1a2e',
    color: '#bbb',
    border: 'none',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    cursor: 'pointer',
    zIndex: 5,
    transition: 'all 150ms',
  },
  main: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0,
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: 16,
  },
}
