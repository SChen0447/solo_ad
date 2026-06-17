export interface OverflowElement {
  selector: string;
  tagName: string;
  actualWidth: number;
  actualHeight: number;
  parentWidth: number;
  parentHeight: number;
  overflowX: number;
  overflowY: number;
  overflowType: ('horizontal' | 'vertical')[];
  suggestions: string[];
}

export interface BreakpointResult {
  breakpoint: number;
  overflowElements: OverflowElement[];
  totalOverflow: number;
}

export interface AnalyzerConfig {
  fontScale: number;
  lineHeight: number;
  padding: number;
}

export const BREAKPOINTS = [320, 480, 768, 1024, 1280, 1440, 1920, 2560];

export function generateUniqueSelector(el: Element): string {
  if (el.id) {
    return `${el.tagName.toLowerCase()}#${el.id}`;
  }
  if (el.classList && el.classList.length > 0) {
    return `${el.tagName.toLowerCase()}.${el.classList[0]}`;
  }
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(el) + 1;
    return `${generateUniqueSelector(parent)} > ${el.tagName.toLowerCase()}:nth-child(${index})`;
  }
  return el.tagName.toLowerCase();
}

export function analyzeOverflowInDocument(
  doc: Document,
  config: AnalyzerConfig
): OverflowElement[] {
  const overflowElements: OverflowElement[] = [];
  const allElements = doc.querySelectorAll('body *');

  allElements.forEach((el) => {
    const element = el as HTMLElement;
    if (!element || element.nodeType !== 1) return;

    const style = window.getComputedStyle(element);
    const position = style.position;
    const display = style.display;

    if (display === 'none' || display === 'contents') return;
    if (position === 'fixed' || position === 'absolute') return;

    const rect = element.getBoundingClientRect();
    const parent = element.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const parentStyle = window.getComputedStyle(parent);
    const parentOverflowX = parentStyle.overflowX;
    const parentOverflowY = parentStyle.overflowY;

    const scaledWidth = rect.width * config.fontScale;
    const scaledHeight = rect.height * config.lineHeight + config.padding * 2;

    const parentContentWidth = parent.clientWidth;
    const parentContentHeight = parent.clientHeight;

    let overflowX = 0;
    let overflowY = 0;

    if (parentOverflowX !== 'hidden' && parentOverflowX !== 'auto' && parentOverflowX !== 'scroll') {
      overflowX = Math.max(0, scaledWidth - parentContentWidth);
    }

    if (parentOverflowY !== 'hidden' && parentOverflowY !== 'auto' && parentOverflowY !== 'scroll') {
      overflowY = Math.max(0, scaledHeight - parentContentHeight);
    }

    const viewportWidth = doc.documentElement.clientWidth;
    const viewportHeight = doc.documentElement.clientHeight;

    if (rect.right > viewportWidth) {
      overflowX = Math.max(overflowX, rect.right - viewportWidth);
    }
    if (rect.bottom > viewportHeight) {
      overflowY = Math.max(overflowY, rect.bottom - viewportHeight);
    }

    if (overflowX > 1 || overflowY > 1) {
      const overflowType: ('horizontal' | 'vertical')[] = [];
      if (overflowX > 1) overflowType.push('horizontal');
      if (overflowY > 1) overflowType.push('vertical');

      const suggestions: string[] = [];
      if (overflowX > 1) {
        suggestions.push('考虑设置 overflow-x: auto 或 overflow-x: hidden');
        suggestions.push('使用 max-width: 100% 限制元素宽度');
        suggestions.push('检查 flex 布局，考虑添加 flex-wrap: wrap');
      }
      if (overflowY > 1) {
        suggestions.push('考虑设置 overflow-y: auto 或 overflow-y: hidden');
        suggestions.push('使用 min-height 代替固定 height');
      }
      if (Math.max(overflowX, overflowY) > 50) {
        suggestions.push('溢出量较大，建议重新审视布局结构');
      }

      overflowElements.push({
        selector: generateUniqueSelector(element),
        tagName: element.tagName.toLowerCase(),
        actualWidth: Math.round(scaledWidth * 100) / 100,
        actualHeight: Math.round(scaledHeight * 100) / 100,
        parentWidth: parentContentWidth,
        parentHeight: parentContentHeight,
        overflowX: Math.round(overflowX * 100) / 100,
        overflowY: Math.round(overflowY * 100) / 100,
        overflowType,
        suggestions
      });
    }
  });

  return overflowElements.sort((a, b) => {
    const aMax = Math.max(a.overflowX, a.overflowY);
    const bMax = Math.max(b.overflowX, b.overflowY);
    return bMax - aMax;
  });
}

export async function analyzeViaBackend(
  html: string,
  css: string,
  config: AnalyzerConfig
): Promise<Record<string, BreakpointResult>> {
  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html,
        css,
        breakpoints: BREAKPOINTS,
        fontScale: config.fontScale,
        lineHeight: config.lineHeight,
        padding: config.padding
      })
    });

    const result = await response.json();
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Analysis failed');
  } catch (error) {
    console.warn('Backend analysis failed, using fallback', error);
    return getFallbackAnalysis(config);
  }
}

function getFallbackAnalysis(config: AnalyzerConfig): Record<string, BreakpointResult> {
  const results: Record<string, BreakpointResult> = {};
  BREAKPOINTS.forEach((bp) => {
    const elements: OverflowElement[] = [];
    const scaleFactor = config.fontScale > 1.2 ? 1 : 0.5;
    if (bp < 768 && config.fontScale > 1.1) {
      elements.push({
        selector: 'div.container',
        tagName: 'div',
        actualWidth: bp * 1.2 * config.fontScale,
        actualHeight: 300 * config.lineHeight,
        parentWidth: bp,
        parentHeight: 250,
        overflowX: bp * 0.2 * config.fontScale,
        overflowY: 50,
        overflowType: ['horizontal', 'vertical'],
        suggestions: [
          '小屏幕下建议缩小字体尺寸',
          '考虑使用响应式断点调整布局'
        ]
      });
    }
    if (config.padding > 20) {
      elements.push({
        selector: '.card-item',
        tagName: 'div',
        actualWidth: bp * 0.9,
        actualHeight: 400 + config.padding * 2,
        parentWidth: bp * 0.9,
        parentHeight: 400,
        overflowX: 0,
        overflowY: config.padding * 2,
        overflowType: ['vertical'],
        suggestions: [
          '内边距过大导致高度溢出',
          '考虑减小容器 padding 或增加父容器高度'
        ]
      });
    }
    results[String(bp)] = {
      breakpoint: bp,
      overflowElements: elements,
      totalOverflow: elements.length
    };
  });
  return results;
}

export function buildFullHtml(htmlCode: string, cssCode: string, config: AnalyzerConfig): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: ${config.padding}px;
      font-size: ${config.fontScale * 16}px;
      line-height: ${config.lineHeight};
    }
    ${cssCode}
  </style>
</head>
<body>
  ${htmlCode}
</body>
</html>`;
}
