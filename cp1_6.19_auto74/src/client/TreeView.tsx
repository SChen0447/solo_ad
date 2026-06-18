import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useStoryStore } from './store';
import { Paragraph } from '../shared/types';

interface TreeNode {
  paragraph: Paragraph;
  children: TreeNode[];
  x: number;
  y: number;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 52;
const H_GAP = 30;
const V_GAP = 70;

const TreeView: React.FC = () => {
  const { story, activeParagraphId, setActiveParagraph } = useStoryStore();
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const paragraphs = story?.paragraphs || [];

  const buildTree = useCallback((): TreeNode | null => {
    const rootParagraphs = paragraphs.filter((p) => p.parentId === null);
    if (rootParagraphs.length === 0) return null;

    const virtualRoot: Paragraph = {
      id: '__root__',
      content: '',
      authorId: '',
      authorName: '',
      parentId: null,
      createdAt: 0,
      updatedAt: 0,
      history: [],
    };

    const map = new Map<string, TreeNode>();
    const root: TreeNode = { paragraph: virtualRoot, children: [], x: 0, y: 0 };
    map.set('__root__', root);

    paragraphs.forEach((p) => {
      map.set(p.id, { paragraph: p, children: [], x: 0, y: 0 });
    });

    paragraphs.forEach((p) => {
      const node = map.get(p.id)!;
      const parentNode = p.parentId ? map.get(p.parentId) : root;
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        root.children.push(node);
      }
    });

    return root.children.length === 1 ? root.children[0] : root;
  }, [paragraphs]);

  const layoutTree = useCallback((node: TreeNode, depth: number = 0): number => {
    node.y = depth * (NODE_HEIGHT + V_GAP);

    if (node.children.length === 0) {
      node.x = 0;
      return NODE_WIDTH;
    }

    let totalWidth = 0;
    node.children.forEach((child, i) => {
      const childWidth = layoutTree(child, depth + 1);
      if (i > 0) totalWidth += H_GAP;
      totalWidth += childWidth;
    });

    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    node.x = (firstChild.x + lastChild.x) / 2;

    return Math.max(totalWidth, NODE_WIDTH);
  }, []);

  const { tree, lines, minX, maxX, maxY } = useMemo(() => {
    const root = buildTree();
    if (!root) return { tree: null, lines: [], minX: 0, maxX: 0, maxY: 0 };

    layoutTree(root);

    const allNodes: TreeNode[] = [];
    const allLines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

    const collect = (node: TreeNode) => {
      allNodes.push(node);
      node.children.forEach((child) => {
        allLines.push({
          key: `${node.paragraph.id}-${child.paragraph.id}`,
          x1: node.x + NODE_WIDTH / 2,
          y1: node.y + NODE_HEIGHT,
          x2: child.x + NODE_WIDTH / 2,
          y2: child.y,
        });
        collect(child);
      });
    };
    collect(root);

    let mnX = Infinity, mxX = -Infinity, mxY = 0;
    allNodes.forEach((n) => {
      mnX = Math.min(mnX, n.x);
      mxX = Math.max(mxX, n.x + NODE_WIDTH);
      mxY = Math.max(mxY, n.y + NODE_HEIGHT);
    });

    return { tree: root, lines: allLines, minX: mnX, maxX: mxX, maxY: mxY };
  }, [buildTree, layoutTree]);

  const renderNode = (node: TreeNode): React.ReactNode => {
    if (node.paragraph.id === '__root__') {
      return <>{node.children.map((child) => renderNode(child))}</>;
    }

    const p = node.paragraph;
    const isActive = activeParagraphId === p.id;
    const summary = p.content.slice(0, 20) || '(空段落)';

    return (
      <React.Fragment key={p.id}>
        <div
          style={{
            ...styles.node,
            border: isActive ? '2px solid #2196F3' : '1px solid #e0e0e0',
          }}
          onClick={() => {
            setActiveParagraph(p.id);
            const el = document.getElementById(`paragraph-${p.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          <div style={styles.nodeAuthor}>{p.authorName || '匿名'}</div>
          <div style={styles.nodeSummary}>{summary}</div>
        </div>
        {node.children.map((child) => renderNode(child))}
      </React.Fragment>
    );
  };

  if (!tree || paragraphs.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🌳</div>
        <p style={styles.emptyText}>暂无段落</p>
        <p style={styles.emptySub}>添加段落后，叙事树将在此显示</p>
      </div>
    );
  }

  const svgWidth = (maxX - minX) + 40;
  const svgHeight = maxY + 40;
  const offsetX = -minX + 20;

  return (
    <div ref={containerRef} style={styles.container}>
      <h3 style={styles.title}>叙事树</h3>
      <div style={styles.treeScroll}>
        <svg width={svgWidth} height={svgHeight} style={{ minWidth: '100%' }}>
          {lines.map((line) => (
            <line
              key={line.key}
              x1={line.x1 + offsetX}
              y1={line.y1}
              x2={line.x2 + offsetX}
              y2={line.y2}
              stroke={hoveredLine === line.key ? '#4CAF50' : '#888'}
              strokeWidth={hoveredLine === line.key ? 2 : 1}
              onMouseEnter={() => setHoveredLine(line.key)}
              onMouseLeave={() => setHoveredLine(null)}
              style={{ cursor: 'pointer', transition: 'stroke 0.2s' }}
            />
          ))}
          {(() => {
            const nodes: { paragraph: Paragraph; x: number; y: number }[] = [];
            const flatten = (node: TreeNode) => {
              if (node.paragraph.id !== '__root__') {
                nodes.push({ paragraph: node.paragraph, x: node.x, y: node.y });
              }
              node.children.forEach(flatten);
            };
            flatten(tree);
            return nodes.map(({ paragraph: p, x, y }) => {
              const isActive = activeParagraphId === p.id;
              const summary = p.content.slice(0, 20) || '(空)';
              return (
                <g key={p.id} transform={`translate(${x + offsetX}, ${y})`}>
                  <rect
                    x={0}
                    y={0}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={6}
                    fill={isActive ? '#E3F2FD' : '#fff'}
                    stroke={isActive ? '#2196F3' : '#ddd'}
                    strokeWidth={isActive ? 2 : 1}
                    style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                    onClick={() => {
                      setActiveParagraph(p.id);
                      const el = document.getElementById(`paragraph-${p.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  />
                  <text
                    x={8}
                    y={18}
                    fontSize={10}
                    fill="#2196F3"
                    fontWeight={600}
                    style={{ pointerEvents: 'none' }}
                  >
                    {p.authorName || '匿名'}
                  </text>
                  <text
                    x={8}
                    y={36}
                    fontSize={11}
                    fill="#555"
                    style={{ pointerEvents: 'none' }}
                  >
                    {summary.length > 14 ? summary.slice(0, 14) + '…' : summary}
                  </text>
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 16,
    flexShrink: 0,
  },
  treeScroll: {
    flex: 1,
    overflow: 'auto',
  },
  node: {
    position: 'absolute' as const,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    background: '#fff',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  nodeAuthor: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: 600,
  },
  nodeSummary: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#aaa',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
  },
};

export default TreeView;
