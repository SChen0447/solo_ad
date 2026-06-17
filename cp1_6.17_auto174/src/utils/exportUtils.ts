import { MindMapNode } from '../types';

export function generateMarkdownOutline(
  nodes: Record<string, MindMapNode>,
  rootIds: string[]
): string {
  const lines: string[] = [];

  const traverse = (nodeId: string, level: number) => {
    const node = nodes[nodeId];
    if (!node) return;

    const prefix = '#'.repeat(Math.min(level + 1, 6));
    lines.push(`${prefix} ${node.text}`);

    if (!node.collapsed) {
      node.children.forEach((childId) => traverse(childId, level + 1));
    }
  };

  rootIds.forEach((rootId) => traverse(rootId, 0));

  return lines.join('\n\n');
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPNG(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
