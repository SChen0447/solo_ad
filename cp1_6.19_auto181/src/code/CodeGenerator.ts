import type { RecognizedElement } from '../recognition/ShapeRecognizer'

const COLORS = {
  button: '#4A90D9',
  rectangle: '#F0F0F0',
  circle: '#FF6B6B',
  text: '#333333',
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function generateHtmlCode(elements: RecognizedElement[]): string {
  if (elements.length === 0) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sketch to HTML</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #fafafa; }
    .container { position: relative; width: 800px; height: 600px; background: #fff; border: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <!-- 在左侧画布绘制图形，然后点击"生成代码"按钮 -->
  </div>
</body>
</html>`
  }

  const containerWidth = 800
  const containerHeight = 600

  let elementsHtml = ''

  for (const el of elements) {
    switch (el.type) {
      case 'rectangle':
        elementsHtml += generateRectangleElement(el)
        break
      case 'circle':
        elementsHtml += generateCircleElement(el)
        break
      case 'button':
        elementsHtml += generateButtonElement(el)
        break
      case 'text':
        elementsHtml += generateTextElement(el)
        break
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sketch to HTML</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #fafafa;
    }
    .sketch-container {
      position: relative;
      width: ${containerWidth}px;
      height: ${containerHeight}px;
      background: #fff;
      border: 1px solid #e0e0e0;
      margin: 0 auto;
    }
    .sketch-element {
      position: absolute;
    }
    .sketch-rectangle {
      background-color: ${COLORS.rectangle};
      border: 2px solid #ccc;
      border-radius: 4px;
    }
    .sketch-circle {
      background-color: ${COLORS.circle};
      border-radius: 50%;
    }
    .sketch-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${COLORS.button};
      color: white;
      font-size: 14px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .sketch-button:hover {
      filter: brightness(1.1);
    }
    .sketch-text {
      color: ${COLORS.text};
      font-size: 16px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="sketch-container">
${elementsHtml}
  </div>
</body>
</html>`
}

function generateRectangleElement(el: RecognizedElement): string {
  return `    <div class="sketch-element sketch-rectangle" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;"></div>
`
}

function generateCircleElement(el: RecognizedElement): string {
  return `    <div class="sketch-element sketch-circle" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;"></div>
`
}

function generateButtonElement(el: RecognizedElement): string {
  const text = el.text || '按钮'
  return `    <button class="sketch-element sketch-button" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;">
      ${escapeHtml(text)}
    </button>
`
}

function generateTextElement(el: RecognizedElement): string {
  const text = el.text || '文本'
  return `    <div class="sketch-element sketch-text" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;">
      ${escapeHtml(text)}
    </div>
`
}

export function formatHtmlCode(html: string): string {
  return html
}

export function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch) {
    return bodyMatch[1].trim()
  }
  return html
}

export function generateInlineHtml(elements: RecognizedElement[]): string {
  const fullHtml = generateHtmlCode(elements)
  return fullHtml
}
