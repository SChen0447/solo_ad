import { useState, useMemo, useCallback } from 'react';

export interface TreeNodeData {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  position: [number, number, number];
  children: string[];
}

export interface ConnectionData {
  id: string;
  from: string;
  to: string;
  color: string;
}

interface RawNode {
  id: string;
  name: string;
  color: string;
  children?: RawNode[];
}

const companyTree: RawNode = {
  id: 'company',
  name: '集团总部',
  color: '#FF6B6B',
  children: [
    {
      id: 'tech',
      name: '技术部',
      color: '#4ECDC4',
      children: [
        { id: 'frontend', name: '前端组', color: '#45B7D1', children: [
          { id: 'fe-web', name: 'Web团队', color: '#96CEB4' },
          { id: 'fe-mobile', name: '移动端团队', color: '#88D8B0' },
        ]},
        { id: 'backend', name: '后端组', color: '#2ECC71', children: [
          { id: 'be-api', name: 'API团队', color: '#1ABC9C' },
          { id: 'be-infra', name: '基础设施', color: '#16A085' },
        ]},
        { id: 'ai', name: 'AI组', color: '#9B59B6', children: [
          { id: 'ai-ml', name: '机器学习', color: '#8E44AD' },
          { id: 'ai-cv', name: '计算机视觉', color: '#6C3483' },
        ]},
      ],
    },
    {
      id: 'product',
      name: '产品部',
      color: '#F39C12',
      children: [
        { id: 'pm', name: '产品经理', color: '#E67E22', children: [
          { id: 'pm-b2c', name: 'B2C产品线', color: '#D35400' },
          { id: 'pm-b2b', name: 'B2B产品线', color: '#CA6F1E' },
        ]},
        { id: 'design', name: '设计组', color: '#E91E63', children: [
          { id: 'design-ui', name: 'UI设计', color: '#C2185B' },
          { id: 'design-ux', name: 'UX研究', color: '#AD1457' },
        ]},
      ],
    },
    {
      id: 'market',
      name: '市场部',
      color: '#3498DB',
      children: [
        { id: 'sales', name: '销售组', color: '#2980B9', children: [
          { id: 'sales-na', name: '北美区', color: '#1F618D' },
          { id: 'sales-eu', name: '欧洲区', color: '#2874A6' },
        ]},
        { id: 'brand', name: '品牌组', color: '#1ABC9C', children: [
          { id: 'brand-content', name: '内容运营', color: '#17A589' },
          { id: 'brand-pr', name: '公关传播', color: '#148F77' },
        ]},
      ],
    },
  ],
};

const biologyTree: RawNode = {
  id: 'biology',
  name: '生物界',
  color: '#27AE60',
  children: [
    {
      id: 'animalia',
      name: '动物界',
      color: '#E74C3C',
      children: [
        { id: 'mammalia', name: '哺乳纲', color: '#C0392B', children: [
          { id: 'primate', name: '灵长目', color: '#922B21', children: [
            { id: 'hominidae', name: '人科', color: '#7B241C' },
            { id: 'cercopithecidae', name: '猴科', color: '#641E16' },
          ]},
          { id: 'carnivora', name: '食肉目', color: '#A93226', children: [
            { id: 'canidae', name: '犬科', color: '#922B21' },
            { id: 'felidae', name: '猫科', color: '#7B241C' },
          ]},
        ]},
        { id: 'aves', name: '鸟纲', color: '#F39C12', children: [
          { id: 'passeriformes', name: '雀形目', color: '#D68910', children: [
            { id: 'corvidae', name: '鸦科', color: '#B9770E' },
            { id: 'paridae', name: '山雀科', color: '#9A7D0A' },
          ]},
          { id: 'falconiformes', name: '隼形目', color: '#E67E22', children: [
            { id: 'accipitridae', name: '鹰科', color: '#CA6F1E' },
            { id: 'falconidae', name: '隼科', color: '#AF601A' },
          ]},
        ]},
      ],
    },
    {
      id: 'plantae',
      name: '植物界',
      color: '#2ECC71',
      children: [
        { id: 'angiospermae', name: '被子植物门', color: '#27AE60', children: [
          { id: 'rosaceae', name: '蔷薇科', color: '#1E8449', children: [
            { id: 'rosa', name: '蔷薇属', color: '#196F3D' },
            { id: 'malus', name: '苹果属', color: '#145A32' },
          ]},
          { id: 'fabaceae', name: '豆科', color: '#229954', children: [
            { id: 'glycine', name: '大豆属', color: '#1D8348' },
            { id: 'phaseolus', name: '菜豆属', color: '#186A3B' },
          ]},
        ]},
      ],
    },
  ],
};

const knowledgeTree: RawNode = {
  id: 'knowledge',
  name: '知识体系',
  color: '#9B59B6',
  children: [
    {
      id: 'science',
      name: '自然科学',
      color: '#3498DB',
      children: [
        { id: 'physics', name: '物理学', color: '#2980B9', children: [
          { id: 'quantum', name: '量子力学', color: '#1F618D', children: [
            { id: 'qft', name: '量子场论', color: '#154360' },
            { id: 'qm-basic', name: '基础量子', color: '#1A5276' },
          ]},
          { id: 'relativity', name: '相对论', color: '#2471A3', children: [
            { id: 'gr', name: '广义相对论', color: '#1F618D' },
            { id: 'sr', name: '狭义相对论', color: '#2874A6' },
          ]},
        ]},
        { id: 'chemistry', name: '化学', color: '#1ABC9C', children: [
          { id: 'organic', name: '有机化学', color: '#17A589', children: [
            { id: 'organic-synth', name: '有机合成', color: '#148F77' },
            { id: 'biochem', name: '生物化学', color: '#117A65' },
          ]},
          { id: 'inorganic', name: '无机化学', color: '#16A085', children: [
            { id: 'coord', name: '配位化学', color: '#138D75' },
            { id: 'solid', name: '固体化学', color: '#117A65' },
          ]},
        ]},
      ],
    },
    {
      id: 'humanities',
      name: '人文学科',
      color: '#E74C3C',
      children: [
        { id: 'philosophy', name: '哲学', color: '#C0392B', children: [
          { id: 'epistemology', name: '认识论', color: '#922B21', children: [
            { id: 'rationalism', name: '理性主义', color: '#641E16' },
            { id: 'empiricism', name: '经验主义', color: '#7B241C' },
          ]},
          { id: 'ethics', name: '伦理学', color: '#A93226', children: [
            { id: 'utilitarianism', name: '功利主义', color: '#922B21' },
            { id: 'deontology', name: '义务论', color: '#7B241C' },
          ]},
        ]},
        { id: 'history', name: '历史学', color: '#D35400', children: [
          { id: 'ancient', name: '古代史', color: '#BA4A00', children: [
            { id: 'greek', name: '古希腊', color: '#9C4000' },
            { id: 'roman', name: '古罗马', color: '#873600' },
          ]},
          { id: 'modern', name: '近现代史', color: '#CA6F1E', children: [
            { id: 'industrial', name: '工业革命', color: '#AF601A' },
            { id: 'contemporary', name: '当代史', color: '#935116' },
          ]},
        ]},
      ],
    },
  ],
};

const treeDataSources: Record<string, RawNode> = {
  company: companyTree,
  biology: biologyTree,
  knowledge: knowledgeTree,
};

const LEVEL_SPACING = 2;
const INITIAL_HORIZONTAL_SPACING = 3;

function computePositions(
  node: RawNode,
  level: number,
  startX: number,
  endX: number,
  parentId: string | null,
  nodes: Map<string, TreeNodeData>,
  connections: ConnectionData[]
) {
  const midX = (startX + endX) / 2;
  const y = -level * LEVEL_SPACING;

  const nodeData: TreeNodeData = {
    id: node.id,
    name: node.name,
    color: node.color,
    parentId,
    position: [midX, y, 0],
    children: node.children ? node.children.map(c => c.id) : [],
  };
  nodes.set(node.id, nodeData);

  if (parentId) {
    connections.push({
      id: `${parentId}-${node.id}`,
      from: parentId,
      to: node.id,
      color: node.color,
    });
  }

  if (node.children && node.children.length > 0) {
    const childrenCount = node.children.length;
    const horizontalSpacing = INITIAL_HORIZONTAL_SPACING / Math.pow(1.5, level);
    const totalWidth = (childrenCount - 1) * horizontalSpacing;
    const childStartX = midX - totalWidth / 2;

    node.children.forEach((child, index) => {
      const childX = childStartX + index * horizontalSpacing;
      computePositions(child, level + 1, childX - horizontalSpacing / 2, childX + horizontalSpacing / 2, node.id, nodes, connections);
    });
  }
}

function flattenTree(root: RawNode) {
  const nodes = new Map<string, TreeNodeData>();
  const connections: ConnectionData[] = [];
  computePositions(root, 0, -5, 5, null, nodes, connections);
  return { nodes: Array.from(nodes.values()), connections };
}

function getAllDescendantIds(nodeId: string, nodes: TreeNodeData[]): string[] {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || node.children.length === 0) return [];
  const descendants = [...node.children];
  node.children.forEach(childId => {
    descendants.push(...getAllDescendantIds(childId, nodes));
  });
  return descendants;
}

export type TreeType = 'company' | 'biology' | 'knowledge';

export function useTreeData() {
  const [treeType, setTreeType] = useState<TreeType>('company');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const { nodes: allNodes, connections: allConnections } = useMemo(() => {
    return flattenTree(treeDataSources[treeType]);
  }, [treeType]);

  const visibleNodes = useMemo(() => {
    const hiddenIds = new Set<string>();
    collapsedNodes.forEach(nodeId => {
      const descendants = getAllDescendantIds(nodeId, allNodes);
      descendants.forEach(id => hiddenIds.add(id));
    });
    return allNodes.filter(n => !hiddenIds.has(n.id));
  }, [allNodes, collapsedNodes]);

  const visibleConnections = useMemo(() => {
    const hiddenIds = new Set<string>();
    collapsedNodes.forEach(nodeId => {
      const descendants = getAllDescendantIds(nodeId, allNodes);
      descendants.forEach(id => hiddenIds.add(id));
    });
    return allConnections.filter(c => !hiddenIds.has(c.to));
  }, [allConnections, collapsedNodes, allNodes]);

  const toggleNode = useCallback((nodeId: string) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node || node.children.length === 0) return;

    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, [allNodes]);

  const isCollapsed = useCallback((nodeId: string) => {
    return collapsedNodes.has(nodeId);
  }, [collapsedNodes]);

  const switchTreeType = useCallback((type: TreeType) => {
    setTreeType(type);
    setCollapsedNodes(new Set());
  }, []);

  return {
    treeType,
    switchTreeType,
    allNodes,
    visibleNodes,
    visibleConnections,
    toggleNode,
    isCollapsed,
  };
}
