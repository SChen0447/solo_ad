import { useState, useCallback, useRef } from 'react';
import Toolbar from './toolbar/Toolbar';
import FlowCanvas from './canvas/FlowCanvas';
import { generateExportHtml } from './canvas/exportHtml';
import type { Node, Edge } from '@xyflow/react';

export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  color: string;
  shape: 'circle' | 'rectangle';
}

export interface EdgeData extends Record<string, unknown> {
  label?: string;
}

export type AppNode = Node<NodeData>;
export type AppEdge = Edge<EdgeData>;

const COLORS = [
  '#e53e3e',
  '#ed8936',
  '#ecc94b',
  '#48bb78',
  '#38b2ac',
  '#3182ce',
  '#805ad5',
  '#d53f8c',
];

const initialNodes: AppNode[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: '中心主题',
      description: '这是概念图的中心主题\n可以展开查看详细描述',
      color: '#3182ce',
      shape: 'rectangle',
    },
  },
  {
    id: '2',
    type: 'custom',
    position: { x: 350, y: 50 },
    data: {
      label: '分支一',
      description: '第一个分支的详细说明',
      color: '#48bb78',
      shape: 'rectangle',
    },
  },
  {
    id: '3',
    type: 'custom',
    position: { x: 350, y: 200 },
    data: {
      label: '分支二',
      description: '第二个分支的详细说明\n支持多行文本',
      color: '#ed8936',
      shape: 'circle',
    },
  },
];

const initialEdges: AppEdge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    data: { label: '包含' },
    animated: false,
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'smoothstep',
    data: { label: '导致' },
    animated: false,
  },
];

function App() {
  const [nodes, setNodes] = useState<AppNode[]>(initialNodes);
  const [edges, setEdges] = useState<AppEdge[]>(initialEdges);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<{ resetView: () => void } | null>(null);

  const handleAddNode = useCallback(() => {
    const newId = `node-${Date.now()}`;
    const newNode: AppNode = {
      id: newId,
      type: 'custom',
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        label: '新节点',
        description: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: 'rectangle',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setNodes((nds) => nds.filter((n) => !selectedIds.includes(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedIds.includes(e.id) &&
          !selectedIds.includes(e.source) &&
          !selectedIds.includes(e.target)
      )
    );
    setSelectedIds([]);
  }, [selectedIds]);

  const handleExportHtml = useCallback(() => {
    const htmlContent = generateExportHtml(nodes, edges);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'concept-map.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const match = content.match(
            /<script type="application\/json" id="concept-map-data">(.*?)<\/script>/s
          );
          if (match) {
            const jsonData = JSON.parse(match[1]);
            if (jsonData.nodes && jsonData.edges) {
              setNodes(jsonData.nodes);
              setEdges(jsonData.edges);
              setSelectedIds([]);
            }
          }
        } catch (err) {
          console.error('导入失败:', err);
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    []
  );

  const handleResetView = useCallback(() => {
    canvasRef.current?.resetView();
  }, []);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <Toolbar
        onAddNode={handleAddNode}
        onDeleteSelected={handleDeleteSelected}
        onExportHtml={handleExportHtml}
        onImport={handleImportClick}
        onResetView={handleResetView}
        hasSelection={selectedIds.length > 0}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onSelectionChange={handleSelectionChange}
          ref={canvasRef}
        />
      </div>
    </div>
  );
}

export default App;
