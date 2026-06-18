import { v4 as uuidv4 } from 'uuid';

export interface ParsedElement {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  innerHTML: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const ANIMATABLE_TAGS = new Set([
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'tspan',
  'g',
  'image',
  'use',
]);

function getBBoxFallback(el: Element): { x: number; y: number; width: number; height: number } {
  const tag = el.tagName.toLowerCase();
  const attr = (name: string) => parseFloat(el.getAttribute(name) || '0');

  switch (tag) {
    case 'rect':
      return { x: attr('x'), y: attr('y'), width: attr('width'), height: attr('height') };
    case 'circle': {
      const cx = attr('cx');
      const cy = attr('cy');
      const r = attr('r');
      return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
    }
    case 'ellipse': {
      const cx = attr('cx');
      const cy = attr('cy');
      const rx = attr('rx');
      const ry = attr('ry');
      return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
    }
    case 'line': {
      const x1 = attr('x1'), y1 = attr('y1'), x2 = attr('x2'), y2 = attr('y2');
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      return { x: minX, y: minY, width: Math.abs(x2 - x1) || 1, height: Math.abs(y2 - y1) || 1 };
    }
    default:
      return { x: 0, y: 0, width: 100, height: 100 };
  }
}

function extractAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

export function parseSVG(svgString: string): ParsedElement[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return [];

  const elements: ParsedElement[] = [];
  const walker = document.createTreeWalker(svgEl, NodeFilter.SHOW_ELEMENT);

  let node: Element | null = svgEl;
  while (node) {
    const tag = node.tagName.toLowerCase();
    if (ANIMATABLE_TAGS.has(tag)) {
      const existingId = node.getAttribute('id');
      const id = existingId || `pd-${uuidv4().slice(0, 8)}`;
      if (!existingId) {
        node.setAttribute('id', id);
      }

      const bbox = getBBoxFallback(node);
      const attrs = extractAttributes(node);

      elements.push({
        id,
        tagName: tag,
        attributes: attrs,
        innerHTML: node.innerHTML,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      });
    }
    node = walker.nextNode() as Element | null;
  }

  return elements;
}

export function getSvgIconName(tagName: string): 'circle' | 'square' | 'arrow' | 'text' {
  switch (tagName) {
    case 'circle':
    case 'ellipse':
      return 'circle';
    case 'rect':
      return 'square';
    case 'line':
    case 'polyline':
    case 'polygon':
    case 'path':
      return 'arrow';
    case 'text':
    case 'tspan':
      return 'text';
    default:
      return 'square';
  }
}
