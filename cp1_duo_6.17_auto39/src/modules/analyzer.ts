export interface OverflowElement {
  selector: string;
  tag: string;
  actualWidth: number;
  actualHeight: number;
  parentWidth: number;
  parentHeight: number;
  overflowX: number;
  overflowY: number;
  overflowDirection: string;
  suggestions: string[];
  index: number;
}

export interface AnalyzeResult {
  success: boolean;
  overflowElements: OverflowElement[];
  totalElements: number;
  viewportWidth: number;
  error?: string;
}

export interface AnalyzeParams {
  html: string;
  css: string;
  viewportWidth: number;
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
}

export function generateCssSelector(el: Element): string {
  if (el.id) {
    return `#${el.id}`;
  }
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && parts.length < 4) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${current.id}`;
      parts.unshift(part);
      break;
    }
    if (current.className && typeof current.className === 'string' && current.className.trim()) {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      part += classes.map((c) => `.${c}`).join('');
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const nth = siblings.indexOf(current as Element) + 1;
        part += `:nth-of-type(${nth})`;
      }
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

export function getElementBoundingRect(el: Element, viewportWidth: number): DOMRect {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
  } as DOMRect;
}

export function analyzeDom(
  doc: Document,
  viewportWidth: number,
  fontScale: number,
  lineHeightScale: number,
  containerPadding: number
): OverflowElement[] {
  const results: OverflowElement[] = [];
  const allElements = doc.querySelectorAll('body *:not(script):not(style):not(meta):not(link)');
  const body = doc.body;
  const parentWidth = viewportWidth - containerPadding * 2;
  const parentHeight = body ? body.clientHeight : viewportWidth * 0.75;

  allElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(el);
    const overflow = computedStyle.overflow;

    if (overflow === 'hidden' || overflow === 'scroll' || overflow === 'auto') {
      return;
    }

    const parent = el.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const pWidth = parent === body ? parentWidth : parentRect.width;
    const pHeight = parent === body ? parentHeight : parentRect.height;

    const scaledWidth = rect.width * (1 + (fontScale - 1) * 0.3);
    const scaledHeight = rect.height * lineHeightScale;

    const overflowX = Math.max(0, scaledWidth - pWidth);
    const overflowY = Math.max(0, scaledHeight - pHeight);

    if (overflowX > 0 || overflowY > 0) {
      const directions: string[] = [];
      if (overflowX > 0.5) directions.push('horizontal');
      if (overflowY > 0.5) directions.push('vertical');

      if (directions.length > 0) {
        const suggestions: string[] = [];
        if (directions.includes('horizontal')) {
          suggestions.push('考虑设置 width: 100% 或 max-width: 100% 限制元素宽度');
          suggestions.push('检查 padding/margin 是否使用了固定像素值，尝试改用相对单位');
          suggestions.push('使用 box-sizing: border-box 确保内边距包含在宽度内');
        }
        if (directions.includes('vertical')) {
          suggestions.push('考虑设置 overflow: auto 或 overflow: hidden 处理纵向溢出');
          suggestions.push('检查子元素高度是否超出父容器限制');
        }
        if (suggestions.length === 0) {
          suggestions.push('检查元素尺寸和父容器约束关系');
        }

        results.push({
          selector: generateCssSelector(el),
          tag: el.tagName.toLowerCase(),
          actualWidth: Math.round(scaledWidth * 10) / 10,
          actualHeight: Math.round(scaledHeight * 10) / 10,
          parentWidth: Math.round(pWidth * 10) / 10,
          parentHeight: Math.round(pHeight * 10) / 10,
          overflowX: Math.round(overflowX * 10) / 10,
          overflowY: Math.round(overflowY * 10) / 10,
          overflowDirection: directions.join(', '),
          suggestions,
          index,
        });
      }
    }
  });

  return results;
}

export async function analyzeWithServer(params: AnalyzeParams): Promise<AnalyzeResult> {
  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    return data as AnalyzeResult;
  } catch (error) {
    return {
      success: false,
      overflowElements: [],
      totalElements: 0,
      viewportWidth: params.viewportWidth,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
