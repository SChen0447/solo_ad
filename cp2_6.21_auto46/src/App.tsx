import React, { useEffect, useState, useCallback } from 'react';
import { AppProvider, useApp, ElementType, SUBJECT_COLORS, Panel, CanvasElement } from './store';
import PanelList from './PanelList';
import ElementsPanel from './ElementsPanel';
import EditorCanvas from './EditorCanvas';

const MOBILE_BREAKPOINT = 1024;

function renderElementForExport(element: CanvasElement, scale = 1) {
  const { type, width, height, fill, stroke, text, tailDirection, rotation } = element;
  const w = width * scale;
  const h = height * scale;
  const sw = Math.max(1, 2 * scale);
  const fontSize = 14 * scale;
  const textColor = fill === '#1F2937' || fill === '#111827' ? '#FFFFFF' : '#374151';
  const pad = 8 * scale;

  let shapeHtml = '';

  switch (type) {
    case 'rectangle':
      shapeHtml = `<svg width="${w}" height="${h}"><rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" rx="${4 * scale}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
      break;
    case 'circle':
      shapeHtml = `<svg width="${w}" height="${h}"><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - sw}" ry="${h / 2 - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
      break;
    case 'triangle':
      shapeHtml = `<svg width="${w}" height="${h}"><polygon points="${w / 2},${sw} ${w - sw},${h - sw} ${sw},${h - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
      break;
    case 'dialogBox':
      shapeHtml = `<div style="position:relative;width:${w}px;height:${h}px">
        <svg width="${w}" height="${h}" style="position:absolute"><rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="${4 * scale}"/></svg>
        ${text ? `<div style="position:absolute;top:${pad}px;left:50%;transform:translateX(-50%);width:90%;font-size:${fontSize}px;color:${textColor};text-align:center;word-break:break-word;line-height:1.4">${text}</div>` : ''}
      </div>`;
      break;
    case 'speechBubble': {
      const tailDir = tailDirection ?? 180;
      const rad = (tailDir * Math.PI) / 180;
      const tailLen = 16 * scale;
      const cx = w / 2;
      const cy = h;
      const tipX = cx + Math.cos(rad) * tailLen;
      const tipY = cy + Math.sin(rad) * tailLen;
      const baseW = 16 * scale;
      const leftX = cx - baseW / 2 + Math.cos(rad + Math.PI / 2) * (baseW / 2);
      const leftY = cy + Math.sin(rad + Math.PI / 2) * (baseW / 2);
      const rightX = cx + Math.cos(rad + Math.PI / 2) * (baseW / 2);
      const rightY = cy + Math.sin(rad + Math.PI / 2) * (baseW / 2);
      const totalW = Math.max(w, tipX + 10 * scale);
      const totalH = Math.max(h, tipY + 10 * scale);
      const round = 6 * scale;

      shapeHtml = `<div style="position:relative;width:${totalW}px;height:${totalH}px">
        <svg width="${totalW}" height="${totalH}" style="position:absolute"><path d="
          M${sw},${sw + round}
          Q${sw},${sw} ${sw + round},${sw}
          L${w - sw - round},${sw}
          Q${w - sw},${sw} ${w - sw},${sw + round}
          L${w - sw},${h - sw - round}
          Q${w - sw},${h - sw} ${w - sw - round},${h - sw}
          L${rightX},${h - sw}
          L${tipX},${tipY}
          L${leftX},${h - sw}
          L${sw + round},${h - sw}
          Q${sw},${h - sw} ${sw},${h - sw - round}
          Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>
        <div style="position:absolute;top:0;left:0;width:${w}px;height:${h}px">
          ${text ? `<div style="position:absolute;top:${pad}px;left:50%;transform:translateX(-50%);width:90%;font-size:${fontSize}px;color:${textColor};text-align:center;word-break:break-word;line-height:1.4">${text}</div>` : ''}
        </div>
      </div>`;
      break;
    }
  }

  return `<div style="position:absolute;left:0;top:0;transform:translate(${element.x * scale}px, ${element.y * scale}px) rotate(${rotation}deg);transform-origin:center center;will-change:transform">${shapeHtml}</div>`;
}

function renderPanelForExport(panel: Panel) {
  const panelW = 180;
  const panelH = 130;
  const previewScale = 0.5;
  const bgColor = SUBJECT_COLORS[panel.subjectType];

  const elementsHtml = panel.elements
    .map((el) => renderElementForExport(el, previewScale))
    .join('');

  return `
    <div style="width:${panelW}px;display:flex;flex-direction:column;align-items:center;gap:8px">
      <div style="width:${panelW}px;height:${panelH}px;background-color:#111827;border-radius:6px;overflow:hidden;position:absolute">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg, ${bgColor}22 0%, #111827 100%)"></div>
        <div style="position:relative;width:100%;height:100%">
          <div style="position:absolute;top:8px;left:8px;padding:2px 8px;background:rgba(0,0,0,0.6);border-radius:3px;color:#fff;font-size:14px;font-weight:600">
            #${panel.order}
          </div>
          ${elementsHtml}
        </div>
      </div>
      <div style="position:relative;margin-top:${panelH + 8}px;width:${panelW}px;text-align:center">
        <div style="color:#fff;font-size:12px;font-weight:600;margin-bottom:2px">分镜 ${panel.order}</div>
        <div style="color:#9CA3AF;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${panel.description}</div>
      </div>
    </div>
  `;
}

function AppInner() {
  const { state } = useApp();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleElementDragStart = useCallback(
    (e: React.DragEvent, type: ElementType, colorIndex: number) => {
      e.dataTransfer.setData('application/element-type', type);
      e.dataTransfer.setData('application/color-index', String(colorIndex));
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  const handleExport = useCallback(() => {
    const cols = 3;
    const gap = 16;
    const panelW = 180;
    const panelH = 130;
    const descH = 40;
    const cardH = panelH + descH + gap;
    const rows = Math.ceil(state.panels.length / cols);
    const totalW = cols * panelW + (cols - 1) * gap + 48;
    const totalH = rows * cardH + 80;

    const panelsHtml = state.panels
      .map((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 24 + col * (panelW + gap);
        const y = 64 + row * cardH;
        return `<div style="position:absolute;left:${x}px;top:${y}px">${renderPanelForExport(p)}</div>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>漫画分镜预览</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1A1A2E;
    color: #fff;
    min-height: 100vh;
    padding: 24px;
  }
  .toolbar {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 100;
  }
  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
    font-family: inherit;
  }
  .btn:hover { filter: brightness(0.9); }
  .btn:active { transform: scale(0.95); }
  .btn-primary { background: #F59E0B; color: #fff; }
  .btn-secondary { background: #4B5563; color: #fff; }
  .preview-title {
    text-align: center;
    color: #fff;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 24px;
    padding-top: 20px;
  }
  .preview-container {
    position: relative;
    width: ${totalW}px;
    margin: 0 auto;
    background: #111827;
    border-radius: 12px;
    padding: 16px;
  }
  .preview-inner {
    position: relative;
    width: ${totalW - 32}px;
    height: ${totalH - 32}px;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none; }
    .preview-container { background: #fff; box-shadow: none; }
    .preview-title { color: #000; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn btn-primary" onclick="window.print()">🖨️ 打印</button>
    <button class="btn btn-secondary" onclick="downloadPNG()">⬇️ 下载PNG</button>
  </div>
  <div class="preview-title">📚 漫画分镜预览（共 ${state.panels.length} 个分镜）</div>
  <div id="preview" class="preview-container">
    <div class="preview-inner">
      ${panelsHtml}
    </div>
  </div>
  <script>
    async function downloadPNG() {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '生成中...';
      
      const preview = document.getElementById('preview');
      const w = preview.offsetWidth;
      const h = preview.offsetHeight + 40;
      
      const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            \${new XMLSerializer().serializeToString(preview)}
          </div>
        </foreignObject>
      </svg>\`;
      
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        canvas.toBlob((b) => {
          if (b) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = 'comic-storyboard-' + Date.now() + '.png';
            a.click();
          }
          btn.disabled = false;
          btn.textContent = '⬇️ 下载PNG';
        }, 'image/png');
      };
      img.onerror = () => {
        btn.disabled = false;
        btn.textContent = '⬇️ 下载PNG';
        alert('下载失败，请尝试打印另存为PDF');
      };
      img.src = url;
    }
  <\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }, [state.panels]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A2E',
      }}
    >
      <div
        style={{
          height: 48,
          backgroundColor: '#2D2D44',
          borderBottom: '1px solid #1F2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎨</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>漫画分镜编辑器</span>
          <span
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              backgroundColor: '#374151',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {state.panels.length} 个分镜
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: '#F59E0B',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.2s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D97706';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F59E0B';
            }}
          >
            <span>📤</span>
            导出预览
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <PanelList />

        <div style={{ flex: 1, display: 'flex', minWidth: 0, padding: 12 }}>
          <EditorCanvas />
        </div>

        {!isMobile && (
          <ElementsPanel onDragStart={handleElementDragStart} />
        )}

        {isMobile && drawerOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 50,
              display: 'flex',
              justifyContent: 'flex-end',
              transition: 'opacity 0.3s ease-in-out',
            }}
            onClick={() => setDrawerOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ElementsPanel
                onDragStart={handleElementDragStart}
                isMobileDrawer
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {isMobile && !drawerOpen && (
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              position: 'fixed',
              right: 16,
              bottom: 16,
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
              color: '#fff',
              fontSize: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              zIndex: 40,
              transition: 'transform 0.1s ease, background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D97706';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F59E0B';
            }}
            title="打开元素面板"
          >
            ✦
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
