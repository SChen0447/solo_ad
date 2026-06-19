export interface Annotation {
  id: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  resolved: boolean;
  createdAt: number;
  comments: AnnotationComment[];
}

export interface AnnotationComment {
  id: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface HighlightCoords {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type FilterType = 'all' | 'unresolved' | 'resolved';

export function getSelectionRange(): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  return selection.getRangeAt(0);
}

export function getSelectionCoords(range: Range): HighlightCoords {
  const rect = range.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left + rect.width / 2,
    width: rect.width,
    height: rect.height,
  };
}

export function getTextOffset(container: HTMLElement, node: Node, offset: number): number {
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let currentNode = treeWalker.nextNode();

  while (currentNode) {
    if (currentNode === node) {
      return currentOffset + offset;
    }
    currentOffset += (currentNode.textContent || '').length;
    currentNode = treeWalker.nextNode();
  }

  return -1;
}

export function highlightText(
  container: HTMLElement,
  annotation: Annotation
): void {
  const textNodes = getTextNodes(container);
  let currentOffset = 0;

  for (const textNode of textNodes) {
    const nodeLength = (textNode.textContent || '').length;
    const nodeStart = currentOffset;
    const nodeEnd = currentOffset + nodeLength;

    if (annotation.startOffset < nodeEnd && annotation.endOffset > nodeStart) {
      const relStart = Math.max(0, annotation.startOffset - nodeStart);
      const relEnd = Math.min(nodeLength, annotation.endOffset - nodeStart);

      if (relStart < relEnd) {
        const range = document.createRange();
        range.setStart(textNode, relStart);
        range.setEnd(textNode, relEnd);

        const span = document.createElement('span');
        span.setAttribute('data-annotation-id', annotation.id);
        span.style.backgroundColor = annotation.resolved ? '#d4edda' : 'rgba(255, 243, 205, 0.7)';
        span.style.color = annotation.resolved ? '#155724' : '#856404';
        span.style.borderRadius = '2px';
        span.style.padding = '1px 0';
        span.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        span.style.cursor = 'pointer';

        try {
          range.surroundContents(span);
        } catch {
          const fragment = range.extractContents();
          span.appendChild(fragment);
          range.insertNode(span);
        }
      }
    }

    currentOffset += nodeLength;
  }
}

export function updateHighlightStyle(annotationId: string, resolved: boolean): void {
  const elements = document.querySelectorAll(`[data-annotation-id="${annotationId}"]`);
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.backgroundColor = resolved ? '#d4edda' : 'rgba(255, 243, 205, 0.7)';
    htmlEl.style.color = resolved ? '#155724' : '#856404';
  });
}

export function clearAllHighlights(container: HTMLElement): void {
  const highlights = container.querySelectorAll('[data-annotation-id]');
  highlights.forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
      parent.normalize();
    }
  });
}

function getTextNodes(container: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = treeWalker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = treeWalker.nextNode();
  }
  return textNodes;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}
