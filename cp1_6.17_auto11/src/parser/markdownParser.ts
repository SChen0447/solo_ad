import { v4 as uuidv4 } from 'uuid';
import { GraphNode, GraphEdge, GraphData } from '../types';

interface ParserState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  headingStack: { id: string; depth: number }[];
  lastListItemId: string | null;
  lastListDepth: number;
  currentParentId: string | null;
  rootId: string | null;
}

function createNode(
  label: string,
  type: 'heading' | 'list-item' | 'code-block',
  depth: number,
  parentId: string | null,
  markdown: string
): GraphNode {
  return {
    id: uuidv4(),
    label,
    type,
    depth,
    parentId,
    childIds: [],
    markdown,
    tags: [],
    collapsed: false,
  };
}

function addNode(state: ParserState, node: GraphNode): void {
  state.nodes.push(node);
  if (node.parentId) {
    const parent = state.nodes.find((n) => n.id === node.parentId);
    if (parent) {
      parent.childIds.push(node.id);
    }
    state.edges.push({
      id: uuidv4(),
      source: node.parentId,
      target: node.id,
      type: 'hierarchy',
    });
  }
}

function getHeadingDepth(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

function getListIndent(line: string): number {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s/);
  if (!match) return -1;
  const indent = match[1].length;
  return Math.floor(indent / 2);
}

function isListItem(line: string): boolean {
  return /^\s*([-*+]|\d+\.)\s/.test(line);
}

function isCodeFence(line: string): boolean {
  return /^\s*```/.test(line);
}

function parseMarkdown(markdown: string): GraphData {
  const lines = markdown.split('\n');
  const state: ParserState = {
    nodes: [],
    edges: [],
    headingStack: [],
    lastListItemId: null,
    lastListDepth: -1,
    currentParentId: null,
    rootId: null,
  };

  let i = 0;
  let rootCreated = false;

  while (i < lines.length) {
    const line = lines[i];

    if (isCodeFence(line)) {
      const codeLines: string[] = [line];
      const langMatch = line.match(/```(\w*)/);
      const lang = langMatch ? langMatch[1] : '';
      i++;
      while (i < lines.length && !isCodeFence(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        codeLines.push(lines[i]);
      }
      const codeContent = codeLines.slice(1, -1).join('\n');
      const label = lang ? `代码: ${lang}` : '代码块';
      const codeMarkdown = codeLines.join('\n');

      let parentId = state.currentParentId;
      if (state.lastListItemId) {
        parentId = state.lastListItemId;
      }

      const codeNode = createNode(
        label,
        'code-block',
        parentId ? (state.nodes.find((n) => n.id === parentId)?.depth || 0) + 1 : 1,
        parentId,
        codeMarkdown
      );
      addNode(state, codeNode);
      i++;
      continue;
    }

    const headingDepth = getHeadingDepth(line);
    if (headingDepth > 0) {
      if (!rootCreated) {
        const rootNode = createNode('根节点', 'heading', 0, null, '');
        addNode(state, rootNode);
        state.rootId = rootNode.id;
        state.currentParentId = rootNode.id;
        state.headingStack.push({ id: rootNode.id, depth: 0 });
        rootCreated = true;
      }

      while (
        state.headingStack.length > 0 &&
        state.headingStack[state.headingStack.length - 1].depth >= headingDepth
      ) {
        state.headingStack.pop();
      }

      const parentEntry = state.headingStack[state.headingStack.length - 1];
      const parentId = parentEntry ? parentEntry.id : state.rootId;

      const headingNode = createNode(
        line.replace(/^#{1,6}\s+/, ''),
        'heading',
        headingDepth,
        parentId,
        line
      );
      addNode(state, headingNode);

      state.headingStack.push({ id: headingNode.id, depth: headingDepth });
      state.currentParentId = headingNode.id;
      state.lastListItemId = null;
      state.lastListDepth = -1;
      i++;
      continue;
    }

    if (isListItem(line)) {
      if (!rootCreated) {
        const rootNode = createNode('根节点', 'heading', 0, null, '');
        addNode(state, rootNode);
        state.rootId = rootNode.id;
        state.currentParentId = rootNode.id;
        state.headingStack.push({ id: rootNode.id, depth: 0 });
        rootCreated = true;
      }

      const listDepth = getListIndent(line);
      const listContent = line.replace(/^\s*([-*+]|\d+\.)\s+/, '');

      let parentId = state.currentParentId;

      if (listDepth === 0) {
        parentId = state.currentParentId;
      } else if (state.lastListItemId && listDepth > state.lastListDepth) {
        parentId = state.lastListItemId;
      } else if (state.lastListItemId && listDepth <= state.lastListDepth) {
        let currentId = state.lastListItemId;
        let depthDiff = state.lastListDepth - listDepth;
        while (depthDiff > 0 && currentId) {
          const node = state.nodes.find((n) => n.id === currentId);
          if (node && node.parentId) {
            currentId = node.parentId;
            depthDiff--;
          } else {
            break;
          }
        }
        const currentNode = state.nodes.find((n) => n.id === currentId);
        parentId = currentNode?.parentId || state.currentParentId;
      }

      const parentNode = state.nodes.find((n) => n.id === parentId);
      const nodeDepth = parentNode ? parentNode.depth + 1 : 1;

      const listNode = createNode(
        listContent,
        'list-item',
        nodeDepth,
        parentId,
        line
      );
      addNode(state, listNode);

      state.lastListItemId = listNode.id;
      state.lastListDepth = listDepth;
      i++;
      continue;
    }

    if (line.trim() === '') {
      state.lastListItemId = null;
      state.lastListDepth = -1;
    }

    i++;
  }

  if (!rootCreated) {
    const rootNode = createNode('根节点', 'heading', 0, null, '');
    addNode(state, rootNode);
    state.rootId = rootNode.id;
  }

  state.nodes.forEach((node) => {
    node.size = Math.max(20, 30 + node.childIds.length * 3);
  });

  return {
    nodes: state.nodes,
    edges: state.edges,
  };
}

export { parseMarkdown };
export default parseMarkdown;
