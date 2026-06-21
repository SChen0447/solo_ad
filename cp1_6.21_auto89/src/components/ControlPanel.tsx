import { useState, useMemo } from 'react';
import type { GraphNode, Importance } from '../types';

interface ControlPanelProps {
  nodes: GraphNode[];
  themeColor: string;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  isMobileOpen: boolean;
}

interface TreeNode {
  node: GraphNode;
  children: TreeNode[];
}

function buildTree(nodes: GraphNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];
  const processed = new Set<string>();

  nodes.forEach((node) => {
    nodeMap.set(node.id, { node, children: [] });
  });

  const importanceOrder: Record<Importance, number> = {
    large: 0,
    medium: 1,
    small: 2,
  };

  const sortedNodes = [...nodes].sort(
    (a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]
  );

  const addToTree = (node: GraphNode, depth: number = 0, maxDepth: number = 3) => {
    if (processed.has(node.id) || depth > maxDepth) return;
    processed.add(node.id);

    const treeNode = nodeMap.get(node.id)!;

    if (depth === 0) {
      rootNodes.push(treeNode);
    }

    node.connections.forEach((connId) => {
      const connNode = nodes.find((n) => n.id === connId);
      if (connNode && !processed.has(connId)) {
        const childTreeNode = nodeMap.get(connId)!;
        treeNode.children.push(childTreeNode);
        addToTree(connNode, depth + 1, maxDepth);
      }
    });
  };

  sortedNodes.forEach((node) => {
    if (!processed.has(node.id)) {
      addToTree(node);
    }
  });

  return rootNodes;
}

function TreeNodeComponent({
  treeNode,
  themeColor,
  selectedNodeId,
  onNodeSelect,
  depth = 0,
}: {
  treeNode: TreeNode;
  themeColor: string;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const hasChildren = treeNode.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeSelect(treeNode.node.id);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div
        className={`tree-node ${treeNode.node.importance} ${selectedNodeId === treeNode.node.id ? 'active' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            className="collapse-btn"
            onClick={toggleExpand}
            style={{ width: '18px', height: '18px', padding: 0 }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        ) : (
          <span style={{ width: '18px' }} />
        )}
        <span
          className="tree-node-icon"
          style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}66` }}
        />
        <span className="tree-node-label">{treeNode.node.title}</span>
      </div>
      {isExpanded && hasChildren && (
        <div className="tree-children">
          {treeNode.children.map((child) => (
            <TreeNodeComponent
              key={child.node.id}
              treeNode={child}
              themeColor={themeColor}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ControlPanel({
  nodes,
  themeColor,
  selectedNodeId,
  onNodeSelect,
  isMobileOpen,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const treeData = useMemo(() => buildTree(nodes), [nodes]);

  return (
    <div
      className={`control-panel ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
    >
      {isCollapsed ? (
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(false)}
          style={{ width: '100%', height: '100%', borderRadius: '16px' }}
        >
          ☰
        </button>
      ) : (
        <>
          <div className="panel-header">
            <span className="panel-title">知识节点</span>
            <button
              className="collapse-btn"
              onClick={() => setIsCollapsed(true)}
              title="收起面板"
            >
              ×
            </button>
          </div>
          <div className="tree-list">
            {treeData.map((treeNode) => (
              <TreeNodeComponent
                key={treeNode.node.id}
                treeNode={treeNode}
                themeColor={themeColor}
                selectedNodeId={selectedNodeId}
                onNodeSelect={onNodeSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
