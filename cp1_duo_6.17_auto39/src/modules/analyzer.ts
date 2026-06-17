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
  offsetLeft: number;
  offsetTop: number;
  scrollLeft: number;
  scrollTop: number;
  parentBorderLeft: number;
  parentBorderTop: number;
  parentPaddingLeft: number;
  parentPaddingTop: number;
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
    const classList = (current as HTMLElement).className;
    if (classList && typeof classList === 'string' && classList.trim()) {
      const classes = classList.trim().split(/\s+/).slice(0, 2);
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

function parseTransformScale(computedStyle: CSSStyleDeclaration): { scaleX: number; scaleY: number } {
  const transform = computedStyle.transform;
  if (!transform || transform === 'none') {
    return { scaleX: 1, scaleY: 1 };
  }
  try {
    if (transform.startsWith('matrix(')) {
      const values = transform.slice(7, -1).split(',').map(Number);
      return {
        scaleX: Math.abs(values[0]),
        scaleY: Math.abs(values[3]),
      };
    }
    if (transform.startsWith('matrix3d(')) {
      const values = transform.slice(9, -1).split(',').map(Number);
      return {
        scaleX: Math.abs(values[0]),
        scaleY: Math.abs(values[5]),
      };
    }
  } catch {
    // ignore
  }
  return { scaleX: 1, scaleY: 1 };
}

function getBorderWidth(computedStyle: CSSStyleDeclaration): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: parseFloat(computedStyle.borderLeftWidth) || 0,
    top: parseFloat(computedStyle.borderTopWidth) || 0,
    right: parseFloat(computedStyle.borderRightWidth) || 0,
    bottom: parseFloat(computedStyle.borderBottomWidth) || 0,
  };
}

function getPadding(computedStyle: CSSStyleDeclaration): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: parseFloat(computedStyle.paddingLeft) || 0,
    top: parseFloat(computedStyle.paddingTop) || 0,
    right: parseFloat(computedStyle.paddingRight) || 0,
    bottom: parseFloat(computedStyle.paddingBottom) || 0,
  };
}

function getContentBoxSize(el: HTMLElement, computedStyle: CSSStyleDeclaration): { width: number; height: number } {
  const boxSizing = computedStyle.boxSizing;
  const borders = getBorderWidth(computedStyle);
  const padding = getPadding(computedStyle);

  if (boxSizing === 'border-box') {
    return {
      width: el.offsetWidth - borders.left - borders.right - padding.left - padding.right,
      height: el.offsetHeight - borders.top - borders.bottom - padding.top - padding.bottom,
    };
  }
  return {
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function getParentContentBox(el: HTMLElement): { width: number; height: number } | null {
  const parent = el.offsetParent as HTMLElement | null;
  if (!parent) return null;

  const parentStyle = getComputedStyle(parent);
  const parentBorders = getBorderWidth(parentStyle);
  const parentPadding = getPadding(parentStyle);

  return {
    width: parent.clientWidth - parentPadding.left - parentPadding.right,
    height: parent.clientHeight - parentPadding.top - parentPadding.bottom,
  };
}

function isOutOfFlow(el: HTMLElement, computedStyle: CSSStyleDeclaration): boolean {
  const position = computedStyle.position;
  return position === 'absolute' || position === 'fixed';
}

function getOverflowClippingAncestor(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflow = style.overflow;
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    if (
      overflow === 'hidden' ||
      overflow === 'scroll' ||
      overflowX === 'hidden' ||
      overflowX === 'scroll' ||
      overflowY === 'hidden' ||
      overflowY === 'scroll'
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function getOffsetRelativeToClippingParent(
  el: HTMLElement,
  clippingParent: HTMLElement
): { left: number; top: number } {
  let current: HTMLElement | null = el;
  let left = 0;
  let top = 0;

  while (current && current !== clippingParent) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
    if (current === null) {
      break;
    }
  }

  return { left, top };
}

export function analyzeDom(
  doc: Document,
  viewportWidth: number,
  fontScale: number,
  lineHeightScale: number,
  containerPadding: number
): OverflowElement[] {
  const results: OverflowElement[] = [];
  const allElements = doc.querySelectorAll(
    'body *:not(script):not(style):not(meta):not(link):not(br):not(hr)'
  );
  const body = doc.body;
  const html = doc.documentElement;

  allElements.forEach((el, index) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = getComputedStyle(htmlEl);
    const display = computedStyle.display;

    if (display === 'none' || display === 'contents') {
      return;
    }

    const { scaleX, scaleY } = parseTransformScale(computedStyle);
    const outOfFlow = isOutOfFlow(htmlEl, computedStyle);

    const contentSize = getContentBoxSize(htmlEl, computedStyle);
    const scaledWidth = contentSize.width * (1 + (fontScale - 1) * 0.3) * scaleX;
    const scaledHeight = contentSize.height * lineHeightScale * scaleY;

    const offsetWidth = htmlEl.offsetWidth * scaleX;
    const offsetHeight = htmlEl.offsetHeight * scaleY;

    let clippingParent: HTMLElement | null = null;
    let parentContentWidth: number;
    let parentContentHeight: number;
    let parentBorderLeft = 0;
    let parentBorderTop = 0;
    let parentPaddingLeft = 0;
    let parentPaddingTop = 0;

    if (outOfFlow) {
      const containingBlock = htmlEl.offsetParent as HTMLElement | null;
      if (containingBlock) {
        const cbStyle = getComputedStyle(containingBlock);
        const cbPadding = getPadding(cbStyle);
        const cbBorder = getBorderWidth(cbStyle);
        parentContentWidth = containingBlock.clientWidth - cbPadding.left - cbPadding.right;
        parentContentHeight = containingBlock.clientHeight - cbPadding.top - cbPadding.bottom;
        parentBorderLeft = cbBorder.left;
        parentBorderTop = cbBorder.top;
        parentPaddingLeft = cbPadding.left;
        parentPaddingTop = cbPadding.top;
        clippingParent = containingBlock;
      } else {
        parentContentWidth = viewportWidth - containerPadding * 2;
        parentContentHeight = html.clientHeight;
      }
    } else {
      const parentInfo = getParentContentBox(htmlEl);
      if (parentInfo) {
        parentContentWidth = parentInfo.width;
        parentContentHeight = parentInfo.height;
      } else {
        parentContentWidth = viewportWidth - containerPadding * 2;
        parentContentHeight = body ? body.clientHeight : viewportWidth * 0.75;
      }

      const parentEl = htmlEl.parentElement;
      if (parentEl) {
        const pStyle = getComputedStyle(parentEl);
        const pBorder = getBorderWidth(pStyle);
        const pPadding = getPadding(pStyle);
        parentBorderLeft = pBorder.left;
        parentBorderTop = pBorder.top;
        parentPaddingLeft = pPadding.left;
        parentPaddingTop = pPadding.top;
      }

      const overflowClipAncestor = getOverflowClippingAncestor(htmlEl);
      if (overflowClipAncestor) {
        clippingParent = overflowClipAncestor;
      }
    }

    if (clippingParent) {
      const clipStyle = getComputedStyle(clippingParent);
      const overflowX = clipStyle.overflowX;
      const overflowY = clipStyle.overflowY;
      const clipPadding = getPadding(clipStyle);
      const clipBorder = getBorderWidth(clipStyle);

      const clipContentWidth =
        clippingParent.clientWidth - clipPadding.left - clipPadding.right;
      const clipContentHeight =
        clippingParent.clientHeight - clipPadding.top - clipPadding.bottom;

      const offset = getOffsetRelativeToClippingParent(htmlEl, clippingParent);

      const scrollLeft = clippingParent.scrollLeft;
      const scrollTop = clippingParent.scrollTop;

      const visibleLeft = offset.left - scrollLeft;
      const visibleTop = offset.top - scrollTop;
      const visibleRight = visibleLeft + offsetWidth;
      const visibleBottom = visibleTop + offsetHeight;

      let isOverflowingX = false;
      let isOverflowingY = false;
      let overflowXAmount = 0;
      let overflowYAmount = 0;

      if (overflowX !== 'visible') {
        if (visibleLeft < -0.5 || visibleRight > clipContentWidth + 0.5) {
          isOverflowingX = true;
          if (overflowX === 'hidden') {
            // 被hidden裁剪的不算溢出问题
            isOverflowingX = false;
          } else {
            overflowXAmount = Math.max(
              Math.abs(visibleLeft),
              visibleRight - clipContentWidth
            );
          }
        }
      } else {
        if (visibleRight > clipContentWidth + 0.5) {
          isOverflowingX = true;
          overflowXAmount = visibleRight - clipContentWidth;
        }
      }

      if (overflowY !== 'visible') {
        if (visibleTop < -0.5 || visibleBottom > clipContentHeight + 0.5) {
          isOverflowingY = true;
          if (overflowY === 'hidden') {
            isOverflowingY = false;
          } else {
            overflowYAmount = Math.max(
              Math.abs(visibleTop),
              visibleBottom - clipContentHeight
            );
          }
        }
      } else {
        if (visibleBottom > clipContentHeight + 0.5) {
          isOverflowingY = true;
          overflowYAmount = visibleBottom - clipContentHeight;
        }
      }

      if (isOverflowingX || isOverflowingY) {
        const directions: string[] = [];
        if (isOverflowingX) directions.push('horizontal');
        if (isOverflowingY) directions.push('vertical');

        const suggestions = generateSuggestions(directions, {
          position: computedStyle.position,
          display,
          boxSizing: computedStyle.boxSizing,
        });

        results.push({
          selector: generateCssSelector(htmlEl),
          tag: htmlEl.tagName.toLowerCase(),
          actualWidth: Math.round(offsetWidth * 10) / 10,
          actualHeight: Math.round(offsetHeight * 10) / 10,
          parentWidth: Math.round(clipContentWidth * 10) / 10,
          parentHeight: Math.round(clipContentHeight * 10) / 10,
          overflowX: Math.round(overflowXAmount * 10) / 10,
          overflowY: Math.round(overflowYAmount * 10) / 10,
          overflowDirection: directions.join(', '),
          suggestions,
          index,
          offsetLeft: offset.left,
          offsetTop: offset.top,
          scrollLeft,
          scrollTop,
          parentBorderLeft: clipBorder.left,
          parentBorderTop: clipBorder.top,
          parentPaddingLeft: clipPadding.left,
          parentPaddingTop: clipPadding.top,
        });
      }
      return;
    }

    // No clipping parent found, compare with body
    const bodyRect = body ? body.getBoundingClientRect() : { width: parentContentWidth, height: parentContentHeight };
    const elRect = htmlEl.getBoundingClientRect();

    const elRight = elRect.left - bodyRect.left + offsetWidth;
    const elBottom = elRect.top - bodyRect.top + offsetHeight;

    const overflowX = Math.max(0, elRight - parentContentWidth);
    const overflowY = Math.max(0, elBottom - parentContentHeight);

    if (overflowX > 0.5 || overflowY > 0.5) {
      const directions: string[] = [];
      if (overflowX > 0.5) directions.push('horizontal');
      if (overflowY > 0.5) directions.push('vertical');

      const suggestions = generateSuggestions(directions, {
        position: computedStyle.position,
        display,
        boxSizing: computedStyle.boxSizing,
      });

      results.push({
        selector: generateCssSelector(htmlEl),
        tag: htmlEl.tagName.toLowerCase(),
        actualWidth: Math.round(offsetWidth * 10) / 10,
        actualHeight: Math.round(offsetHeight * 10) / 10,
        parentWidth: Math.round(parentContentWidth * 10) / 10,
        parentHeight: Math.round(parentContentHeight * 10) / 10,
        overflowX: Math.round(overflowX * 10) / 10,
        overflowY: Math.round(overflowY * 10) / 10,
        overflowDirection: directions.join(', '),
        suggestions,
        index,
        offsetLeft: elRect.left - bodyRect.left,
        offsetTop: elRect.top - bodyRect.top,
        scrollLeft: body ? body.scrollLeft : 0,
        scrollTop: body ? body.scrollTop : 0,
        parentBorderLeft,
        parentBorderTop,
        parentPaddingLeft,
        parentPaddingTop,
      });
    }
  });

  return results;
}

function generateSuggestions(
  directions: string[],
  context: { position: string; display: string; boxSizing: string }
): string[] {
  const suggestions: string[] = [];

  if (directions.includes('horizontal')) {
    suggestions.push('考虑设置 width: 100% 或 max-width: 100% 限制元素宽度');
    suggestions.push('检查 padding/margin 是否使用了固定像素值，尝试改用相对单位');

    if (context.boxSizing !== 'border-box') {
      suggestions.push('使用 box-sizing: border-box 确保内边距包含在宽度内');
    }

    if (context.position === 'absolute' || context.position === 'fixed') {
      suggestions.push('定位元素检查 left/right 属性设置是否合理');
    }
  }

  if (directions.includes('vertical')) {
    suggestions.push('考虑设置 overflow: auto 或 overflow: hidden 处理纵向溢出');
    suggestions.push('检查子元素高度是否超出父容器限制');
    suggestions.push('尝试使用 min-height 替代固定 height 以适应内容');
  }

  if (directions.length === 0) {
    suggestions.push('检查元素尺寸和父容器约束关系');
  }

  return suggestions;
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
