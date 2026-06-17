import { useState, useRef, useMemo, useEffect } from 'react';
import { useControls } from 'leva';
import { useTreeData, TreeType, TreeNodeData } from './hooks/useTreeData';
import { TreeScene } from './components/TreeScene';
import { ControlPanelWrapper, ControlPanelParams } from './components/ControlPanel';
import { MiniPreview } from './components/MiniPreview';

export default function App() {
  const {
    treeType,
    switchTreeType,
    allNodes,
    visibleNodes,
    visibleConnections,
    toggleNode,
    isCollapsed,
  } = useTreeData();

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const cameraResetRef = useRef<(() => void) | null>(null);

  const [controlParams, setControlParams] = useControls(() => ({
    树类型: {
      value: treeType as TreeType,
      options: [
        { label: '公司组织架构', value: 'company' },
        { label: '生物学分类', value: 'biology' },
        { label: '知识图谱', value: 'knowledge' },
      ],
      label: '数据源',
      onChange: (v: TreeType) => {
        switchTreeType(v);
        setFocusedNodeId(null);
      },
    },
    节点大小缩放: {
      value: 1.0,
      min: 0.5,
      max: 2.0,
      step: 0.1,
    },
    连线透明度: {
      value: 0.6,
      min: 0.1,
      max: 1.0,
      step: 0.05,
    },
    自动旋转速度: {
      value: 2.0,
      min: 0,
      max: 5,
      step: 0.5,
      label: '°/秒',
    },
    摄像机飞入速度: {
      value: 1.5,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      label: '秒',
    },
  }), [treeType, switchTreeType]);

  const collapsedNodesSet = useMemo(() => {
    const set = new Set<string>();
    allNodes.forEach(node => {
      if (isCollapsed(node.id)) {
        set.add(node.id);
      }
    });
    return set;
  }, [allNodes, isCollapsed]);

  const focusedNode: TreeNodeData | null = useMemo(() => {
    if (!focusedNodeId) return null;
    return allNodes.find(n => n.id === focusedNodeId) || null;
  }, [focusedNodeId, allNodes]);

  const handleNodeClick = (nodeId: string) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.children.length > 0) {
      toggleNode(nodeId);
    }
    setFocusedNodeId(nodeId);
  };

  const handleResetCamera = () => {
    if (cameraResetRef.current) {
      cameraResetRef.current();
    }
    setFocusedNodeId(null);
  };

  const handleParamsChange = (newParams: Partial<ControlPanelParams>) => {
    setControlParams(newParams as any);
  };

  useEffect(() => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 100, 200, 0.6);
      border: 1px solid rgba(100, 180, 255, 0.5);
      cursor: pointer;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    `;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    `;
    btn.title = '重置视角';
    btn.onmouseenter = () => {
      btn.style.background = 'rgba(0, 150, 255, 0.8)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(0, 100, 200, 0.6)';
    };
    btn.onclick = handleResetCamera;
    document.body.appendChild(btn);

    return () => {
      document.body.removeChild(btn);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TreeScene
        nodes={visibleNodes}
        connections={visibleConnections}
        nodeScale={controlParams['节点大小缩放'] as number}
        lineOpacity={controlParams['连线透明度'] as number}
        autoRotateSpeed={controlParams['自动旋转速度'] as number}
        flyDuration={controlParams['摄像机飞入速度'] as number}
        focusedNodeId={focusedNodeId}
        collapsedNodes={collapsedNodesSet}
        onNodeClick={handleNodeClick}
        onCameraResetRef={cameraResetRef}
      />

      <MiniPreview nodes={visibleNodes} connections={visibleConnections} />

      {focusedNode && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            padding: '12px 18px',
            background: 'rgba(0, 10, 30, 0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            border: '1px solid rgba(100, 150, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0, 100, 255, 0.2)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: focusedNode.color,
              boxShadow: `0 0 12px ${focusedNode.color}`,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                color: '#EEEEEE',
                fontSize: '13px',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 500,
              }}
            >
              {focusedNode.name}
            </span>
            <span
              style={{
                color: '#88AACC',
                fontSize: '11px',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {focusedNode.children.length > 0
                ? `${focusedNode.children.length} 个子节点`
                : '叶子节点'}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 16px',
          background: 'rgba(0, 10, 30, 0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          border: '1px solid rgba(100, 150, 255, 0.2)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            color: '#AACCFF',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          拖拽旋转 · 滚轮缩放 · 点击节点展开/收起
        </span>
      </div>

      <ControlPanelWrapper />
    </div>
  );
}
