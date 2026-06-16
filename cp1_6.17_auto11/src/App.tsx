import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ForceGraph from './graph/ForceGraph';
import EditPanel from './panel/EditPanel';
import { parseMarkdown } from './parser/markdownParser';
import { GraphNode, GraphEdge } from './types';
import {
  exportToSVG,
  downloadSVG,
  exportToHTML,
  downloadHTML,
  generateShortLink,
  getShortLinkData,
} from './utils/exporter';

const sampleMarkdown = `# 知识图谱简介

## 什么是知识图谱

知识图谱是一种结构化的语义知识库，用于以符号形式描述物理世界中的概念及其相互关系。

### 核心概念
- 实体：现实世界中的事物
- 关系：实体之间的联系
- 属性：实体的特征

## 应用场景

### 搜索引擎
- Google Knowledge Graph
- 百度知心
- 搜狗知立方

### 智能问答
- 问答系统
- 对话机器人
- 智能客服

### 推荐系统
- 商品推荐
- 内容推荐
- 社交推荐

## 技术实现

### 数据存储
\`\`\`
图数据库：Neo4j, JanusGraph
三元组存储：Virtuoso, AllegroGraph
\`\`\`

### 知识抽取
- 实体识别
- 关系抽取
- 属性抽取

### 知识推理
- 规则推理
- 统计推理
- 神经网络推理

## 发展历程

### 早期阶段
- 语义网络
- 专家系统
- 本体论

### 发展阶段
- 链接开放数据
- 维基百科
- DBpedia

### 现代阶段
- 大模型知识融合
- 多模态知识图谱
- 动态知识图谱
`;

const App: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(true);
  const [markdownInput, setMarkdownInput] = useState(sampleMarkdown);
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      const data = getShortLinkData(shareId);
      if (data) {
        setNodes(data.nodes);
        setEdges(data.edges);
        setIsInputModalOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (nodes.length === 0) {
      const data = parseMarkdown(sampleMarkdown);
      setNodes(data.nodes);
      setEdges(data.edges);
    }
  }, []);

  const handleParse = useCallback(() => {
    const data = parseMarkdown(markdownInput);
    setNodes(data.nodes);
    setEdges(data.edges);
    setIsInputModalOpen(false);
    setSelectedNodeId(null);
    setIsPanelOpen(false);
  }, [markdownInput]);

  const handleNodeSelect = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    setIsPanelOpen(!!id);
  }, []);

  const handleNodeDoubleClick = useCallback((id: string) => {
    // Handled by onToggleCollapse
  }, []);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, collapsed: !node.collapsed } : node
      )
    );
  }, []);

  const handleCollapseAll = useCallback(() => {
    setNodes((prev) =>
      prev.map((node) =>
        node.childIds.length > 0 ? { ...node, collapsed: true } : node
      )
    );
  }, []);

  const handleExpandAll = useCallback(() => {
    setNodes((prev) =>
      prev.map((node) => ({ ...node, collapsed: false }))
    );
  }, []);

  const handleResetLayout = useCallback(() => {
    const resetNodes = nodes.map((n) => ({
      ...n,
      x: undefined,
      y: undefined,
      fx: null,
      fy: null,
    }));
    setNodes([]);
    setTimeout(() => {
      setNodes(resetNodes);
      if ((window as any).__resetGraphView) {
        (window as any).__resetGraphView();
      }
    }, 50);
  }, [nodes]);

  const handleUpdateNode = useCallback((id: string, updates: Partial<GraphNode>) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      )
    );
  }, []);

  const handleAddManualEdge = useCallback((sourceId: string, targetId: string) => {
    const exists = edges.some(
      (e) =>
        (e.source === sourceId && e.target === targetId) ||
        (e.source === targetId && e.target === sourceId)
    );
    if (!exists) {
      const newEdge: GraphEdge = {
        id: uuidv4(),
        source: sourceId,
        target: targetId,
        type: 'manual',
      };
      setEdges((prev) => [...prev, newEdge]);
    }
    setIsLinkingMode(false);
    setLinkingSourceId(null);
  }, [edges]);

  const handleRemoveEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  const handleStartLinking = useCallback(() => {
    setIsLinkingMode(true);
    setLinkingSourceId(selectedNodeId);
  }, [selectedNodeId]);

  const handleExportSVG = useCallback(() => {
    const svgContent = exportToSVG(nodes, edges);
    downloadSVG(svgContent);
  }, [nodes, edges]);

  const handleExportHTML = useCallback(() => {
    const htmlContent = exportToHTML(nodes, edges);
    downloadHTML(htmlContent);
  }, [nodes, edges]);

  const handleGenerateShortLink = useCallback(() => {
    const url = generateShortLink(nodes, edges);
    navigator.clipboard?.writeText(url).then(() => {
      alert(`短链接已复制到剪贴板：\n${url}`);
    }).catch(() => {
      prompt('请复制以下链接：', url);
    });
  }, [nodes, edges]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.log('全屏失败:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const toolButtons = [
    { icon: '⤵', label: '展开全部', action: handleExpandAll },
    { icon: '⤴', label: '折叠全部', action: handleCollapseAll },
    { icon: '↻', label: '重置布局', action: handleResetLayout },
    { icon: '⬚', label: 'SVG导出', action: handleExportSVG },
    { icon: '📄', label: 'HTML导出', action: handleExportHTML },
    { icon: '🔗', label: '短链接', action: handleGenerateShortLink },
    { icon: '⛶', label: '全屏', action: handleFullscreen },
    { icon: '📝', label: '编辑Markdown', action: () => setIsInputModalOpen(true) },
  ];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#1e1e2e',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: isMobile ? 56 : 60,
          backgroundColor: 'rgba(24, 24, 37, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 4,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#3b82f6',
            marginBottom: 12,
            padding: '8px 0',
          }}
        >
          KG
        </div>
        {toolButtons.map((btn, index) => (
          <button
            key={index}
            onClick={btn.action}
            title={btn.label}
            style={{
              width: 44,
              height: 44,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div
        ref={graphRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isLinkingMode && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(245, 158, 11, 0.9)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🔗 连线模式：</span>
            <span>
              {linkingSourceId
                ? '点击目标节点建立关联'
                : '点击选择源节点'}
            </span>
            <button
              onClick={() => {
                setIsLinkingMode(false);
                setLinkingSourceId(null);
              }}
              style={{
                marginLeft: 8,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              取消
            </button>
          </div>
        )}

        <ForceGraph
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onToggleCollapse={handleToggleCollapse}
          onUpdateNode={handleUpdateNode}
          onAddManualEdge={handleAddManualEdge}
          isLinkingMode={isLinkingMode}
          linkingSourceId={linkingSourceId}
          onLinkingSourceSelect={setLinkingSourceId}
        />
      </div>

      <EditPanel
        node={selectedNode}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedNodeId(null);
        }}
        onUpdateNode={handleUpdateNode}
        allNodes={nodes}
        onStartLinking={handleStartLinking}
        isLinkingMode={isLinkingMode}
        linkingSourceId={linkingSourceId}
        onRemoveEdge={handleRemoveEdge}
        edges={edges}
      />

      {isInputModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setIsInputModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#1e1e2e',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              width: isMobile ? '90%' : 600,
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#fff',
                  margin: 0,
                }}
              >
                📝 输入 Markdown 内容
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 4,
                  margin: 0,
                }}
              >
                粘贴你的 Markdown 笔记，自动生成知识图谱
              </p>
            </div>

            <div
              style={{
                flex: 1,
                padding: '16px 24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <textarea
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
                placeholder="# 输入你的 Markdown 内容..."
                style={{
                  flex: 1,
                  minHeight: 300,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 12,
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setIsInputModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
              >
                取消
              </button>
              <button
                onClick={handleParse}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
              >
                生成图谱
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
