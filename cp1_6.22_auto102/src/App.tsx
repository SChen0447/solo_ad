import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphContainer from './components/GraphContainer';
import CollisionPanel from './components/CollisionPanel';
import Toolbar from './components/Toolbar';
import NodeModal from './components/NodeModal';
import { GraphNode, GraphLink, Conflict } from './types';
import { detectConflicts } from './utils/conflictDetector';
import { apiService } from './services/apiService';
import html2canvas from 'html2canvas';

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [collisionPanelCollapsed, setCollisionPanelCollapsed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newConflicts = detectConflicts(nodes, links);
    setConflicts(newConflicts);
  }, [nodes, links]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await apiService.getNodes();
        if (data.nodes.length > 0) {
          setNodes(data.nodes);
          setLinks(data.links);
        }
      } catch (error) {
        console.log('Using empty initial state');
      }
    };
    loadData();
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.canvas-bg')) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setModalPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setEditingNode(null);
      setShowNodeModal(true);
    }
  }, []);

  const handleCreateNode = useCallback((title: string, description: string, tags: string[]) => {
    const newNode: GraphNode = {
      id: uuidv4(),
      title,
      description,
      tags,
      x: modalPosition.x,
      y: modalPosition.y,
    };
    setNodes(prev => [...prev, newNode]);
    setShowNodeModal(false);
  }, [modalPosition]);

  const handleUpdateNode = useCallback((id: string, title: string, description: string, tags: string[]) => {
    setNodes(prev => prev.map(n =>
      n.id === id ? { ...n, title, description, tags } : n
    ));
    setShowNodeModal(false);
    setEditingNode(null);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setLinks(prev => prev.filter(l => l.source !== nodeId && l.target !== nodeId));
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setEditingNode(node);
    setModalPosition({ x: node.x, y: node.y });
    setShowNodeModal(true);
  }, []);

  const handleAddLink = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const exists = links.some(
      l => (l.source === sourceId && l.target === targetId) ||
           (l.source === targetId && l.target === sourceId)
    );

    if (!exists) {
      const newLink: GraphLink = {
        id: uuidv4(),
        source: sourceId,
        target: targetId,
        weight: 5,
      };
      setLinks(prev => [...prev, newLink]);
    }
  }, [links]);

  const handleUpdateLinkWeight = useCallback((linkId: string, weight: number) => {
    setLinks(prev => prev.map(l =>
      l.id === linkId ? { ...l, weight: Math.max(1, Math.min(10, weight)) } : l
    ));
  }, []);

  const handleDeleteLink = useCallback((linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  const handleNodesPositionChange = useCallback((updatedNodes: GraphNode[]) => {
    setNodes(updatedNodes);
  }, []);

  const handleConflictClick = useCallback((conflict: Conflict) => {
    setSelectedConflictId(conflict.linkId);
    setTimeout(() => setSelectedConflictId(null), 2000);
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#1a202c',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `mind-graph-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  }, []);

  const handleResetLayout = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, fx: null, fy: null })));
  }, []);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#1a202c' }}>
      <Toolbar
        onExportPNG={handleExportPNG}
        onResetLayout={handleResetLayout}
      />

      <div
        ref={canvasRef}
        className="main-canvas canvas-bg"
        onClick={handleCanvasClick}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'crosshair',
        }}
      >
        <GraphContainer
          nodes={nodes}
          links={links}
          conflicts={conflicts}
          selectedConflictId={selectedConflictId}
          onNodeClick={handleNodeClick}
          onAddLink={handleAddLink}
          onUpdateLinkWeight={handleUpdateLinkWeight}
          onDeleteLink={handleDeleteLink}
          onNodesPositionChange={handleNodesPositionChange}
        />
      </div>

      <CollisionPanel
        conflicts={conflicts}
        nodes={nodes}
        selectedConflictId={selectedConflictId}
        collapsed={collisionPanelCollapsed}
        onConflictClick={handleConflictClick}
        onToggleCollapse={() => setCollisionPanelCollapsed(!collisionPanelCollapsed)}
      />

      {showNodeModal && (
        <NodeModal
          position={modalPosition}
          node={editingNode}
          onSave={editingNode
            ? (title, desc, tags) => handleUpdateNode(editingNode.id, title, desc, tags)
            : handleCreateNode
          }
          onDelete={editingNode ? () => handleDeleteNode(editingNode.id) : undefined}
          onClose={() => {
            setShowNodeModal(false);
            setEditingNode(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
