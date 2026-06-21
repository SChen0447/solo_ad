import { useState, useMemo, useEffect, useCallback } from 'react';
import Scene3D from './components/Scene3D';
import ControlPanel from './components/ControlPanel';
import InfoCard from './components/InfoCard';
import AutoModeToggle from './components/AutoModeToggle';
import templatesData from './data/templates.json';
import type { Template, GraphNode, Edge } from './types';
import './styles/global.css';

const templates = templatesData.templates as Template[];

function buildEdges(nodes: GraphNode[]): Edge[] {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  nodes.forEach((node) => {
    node.connections.forEach((targetId) => {
      const sortedIds = [node.id, targetId].sort();
      const edgeKey = sortedIds.join('-');
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: edgeKey,
          source: sortedIds[0],
          target: sortedIds[1],
        });
      }
    });
  });

  return edges;
}

export default function App() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [autoInterval, setAutoInterval] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0],
    [selectedTemplateId]
  );

  const edges = useMemo(() => buildEdges(currentTemplate.nodes), [currentTemplate]);

  const selectedNode = useMemo(
    () => currentTemplate.nodes.find((n) => n.id === selectedNodeId) || null,
    [currentTemplate, selectedNodeId]
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setSelectedNodeId(null);
    setFocusNodeId(null);
    setAutoMode(false);
  }, [selectedTemplateId]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  }, []);

  const handleNodeSelect = useCallback(
    (node: GraphNode | null) => {
      if (node) {
        setSelectedNodeId(node.id);
        setFocusNodeId(node.id);
      } else {
        setSelectedNodeId(null);
      }
    },
    []
  );

  const handlePanelNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
    setIsMobileMenuOpen(false);
  }, []);

  const handleConnectionClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  }, []);

  const handleCloseInfoCard = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleCameraTransitionComplete = useCallback(() => {
    setFocusNodeId(null);
  }, []);

  useEffect(() => {
    if (!autoMode) return;

    const selectRandomNode = () => {
      const nodeIndex = Math.floor(Math.random() * currentTemplate.nodes.length);
      const randomNode = currentTemplate.nodes[nodeIndex];
      if (randomNode) {
        setSelectedNodeId(randomNode.id);
        setFocusNodeId(randomNode.id);
      }
    };

    selectRandomNode();

    const interval = setInterval(selectRandomNode, autoInterval * 1000);
    return () => clearInterval(interval);
  }, [autoMode, autoInterval, currentTemplate.nodes]);

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">正在加载3D知识图谱...</div>
        </div>
      )}

      <Scene3D
        key={currentTemplate.id}
        nodes={currentTemplate.nodes}
        edges={edges}
        themeColor={currentTemplate.color}
        selectedNodeId={selectedNodeId}
        autoRotate={autoMode}
        onNodeClick={handleNodeClick}
        onNodeSelect={handleNodeSelect}
        focusNodeId={focusNodeId}
        onCameraTransitionComplete={handleCameraTransitionComplete}
      />

      <div className="top-bar">
        <div className="logo">
          <span className="logo-icon">🌐</span>
          <span>交互式知识图谱 3D</span>
        </div>

        <div className="template-selector">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            style={{
              borderColor: `${currentTemplate.color}44`,
            }}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="hamburger-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          display: isMobileMenuOpen ? 'none' : undefined,
        }}
      >
        <div className="hamburger-icon" />
      </button>

      <ControlPanel
        nodes={currentTemplate.nodes}
        themeColor={currentTemplate.color}
        selectedNodeId={selectedNodeId}
        onNodeSelect={handlePanelNodeSelect}
        isMobileOpen={isMobileMenuOpen}
      />

      {isMobileMenuOpen && (
        <button
          className="hamburger-btn"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            left: '308px',
          }}
        >
          ×
        </button>
      )}

      <AutoModeToggle
        enabled={autoMode}
        interval={autoInterval}
        onToggle={setAutoMode}
        onIntervalChange={setAutoInterval}
        themeColor={currentTemplate.color}
      />

      {selectedNode && (
        <InfoCard
          node={selectedNode}
          nodes={currentTemplate.nodes}
          themeColor={currentTemplate.color}
          onClose={handleCloseInfoCard}
          onConnectionClick={handleConnectionClick}
        />
      )}

      <div className="hint-bar">
        <div className="hint-item">
          <span className="hint-key">拖拽</span>
          <span>旋转视角</span>
        </div>
        <div className="hint-item">
          <span className="hint-key">滚轮</span>
          <span>缩放场景</span>
        </div>
        <div className="hint-item">
          <span className="hint-key">右键</span>
          <span>平移画面</span>
        </div>
        <div className="hint-item">
          <span className="hint-key">点击节点</span>
          <span>查看详情</span>
        </div>
      </div>
    </div>
  );
}
