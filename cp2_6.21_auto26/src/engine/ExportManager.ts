import type { GameState, GameElement, FrameData } from '../types'

const RUNTIME_CODE = `
(function() {
  const state = __GAME_STATE__;
  let elements = JSON.parse(JSON.stringify(state.elements));
  let score = 0;
  let lastScore = 0;
  let scoreAnimTime = 0;
  let isPaused = false;
  let isRunning = true;
  const keys = new Set();
  let animationId = null;
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTime = lastTime;
  let currentFps = 60;
  let avgFps = 60;
  let minFps = 60;
  let fpsHistory = [];
  let totalFpsSamples = 0;
  let totalFpsSum = 0;
  let pauseBtnRect = { x: 0, y: 0, r: 16 };
  let isPauseBtnHover = false;

  const canvas = document.getElementById('game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') { e.preventDefault(); isPaused = !isPaused; }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - pauseBtnRect.x;
    const dy = y - pauseBtnRect.y;
    const wasHover = isPauseBtnHover;
    isPauseBtnHover = dx * dx + dy * dy <= pauseBtnRect.r * pauseBtnRect.r;
    if (wasHover !== isPauseBtnHover) {
      canvas.style.cursor = isPauseBtnHover ? 'pointer' : 'default';
    }
  });
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - pauseBtnRect.x;
    const dy = y - pauseBtnRect.y;
    if (dx * dx + dy * dy <= pauseBtnRect.r * pauseBtnRect.r) {
      isPaused = !isPaused;
    }
  });

  function generateId() { return Math.random().toString(36).substring(2, 11); }
  function addElement(el) { elements.push(JSON.parse(JSON.stringify(el))); }
  function removeElement(id) { elements = elements.filter(e => e.id !== id); }
  function setScore(s) { score = s; }
  function getElements() { return elements; }

  function getAABB(el) {
    if (el.type === 'circle' && el.radius) {
      return { minX: el.x - el.radius, minY: el.y - el.radius, maxX: el.x + el.radius, maxY: el.y + el.radius };
    }
    return { minX: el.x, minY: el.y, maxX: el.x + el.width, maxY: el.y + el.height };
  }

  function resolveCollisions() {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i], b = elements[j];
        const boxA = getAABB(a), boxB = getAABB(b);
        if (boxA.minX < boxB.maxX && boxA.maxX > boxB.minX && boxA.minY < boxB.maxY && boxA.maxY > boxB.minY) {
          if (a.physics.isStatic && b.physics.isStatic) continue;
          const overlapX = Math.min(boxA.maxX - boxB.minX, boxB.maxX - boxA.minX);
          const overlapY = Math.min(boxA.maxY - boxB.minY, boxB.maxY - boxA.minY);
          if (overlapX < overlapY) {
            if (!a.physics.isStatic && !b.physics.isStatic) {
              const shift = overlapX / 2;
              if (a.x < b.x) { a.x -= shift; b.x += shift; } else { a.x += shift; b.x -= shift; }
              const temp = a.physics.velocityX;
              a.physics.velocityX = b.physics.velocityX * a.physics.bounciness;
              b.physics.velocityX = temp * b.physics.bounciness;
            } else if (!a.physics.isStatic) {
              if (a.x < b.x) a.x -= overlapX; else a.x += overlapX;
              a.physics.velocityX = -a.physics.velocityX * a.physics.bounciness;
            } else {
              if (b.x < a.x) b.x -= overlapX; else b.x += overlapX;
              b.physics.velocityX = -b.physics.velocityX * b.physics.bounciness;
            }
          } else {
            if (!a.physics.isStatic && !b.physics.isStatic) {
              const shift = overlapY / 2;
              if (a.y < b.y) { a.y -= shift; b.y += shift; } else { a.y += shift; b.y -= shift; }
              const temp = a.physics.velocityY;
              a.physics.velocityY = b.physics.velocityY * a.physics.bounciness;
              b.physics.velocityY = temp * b.physics.bounciness;
            } else if (!a.physics.isStatic) {
              if (a.y < b.y) a.y -= overlapY; else a.y += overlapY;
              a.physics.velocityY = -a.physics.velocityY * a.physics.bounciness;
            } else {
              if (b.y < a.y) b.y -= overlapY; else b.y += overlapY;
              b.physics.velocityY = -b.physics.velocityY * b.physics.bounciness;
            }
          }
        }
      }
    }
  }

  function update(dt) {
    const w = window.innerWidth, h = window.innerHeight;
    for (const el of elements) {
      if (!el.physics.isStatic) {
        el.physics.velocityY += el.physics.gravity * dt;
        el.x += el.physics.velocityX * dt;
        el.y += el.physics.velocityY * dt;
        el.physics.velocityX *= Math.max(0, 1 - el.physics.friction * dt * 10);
        if (el.type === 'circle' && el.radius) {
          if (el.y + el.radius > h) { el.y = h - el.radius; el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness; el.physics.velocityX *= (1 - el.physics.friction); }
          if (el.y - el.radius < 0) { el.y = el.radius; el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness; }
          if (el.x + el.radius > w) { el.x = w - el.radius; el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness; }
          if (el.x - el.radius < 0) { el.x = el.radius; el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness; }
        } else {
          if (el.y + el.height > h) { el.y = h - el.height; el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness; el.physics.velocityX *= (1 - el.physics.friction); }
          if (el.y < 0) { el.y = 0; el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness; }
          if (el.x + el.width > w) { el.x = w - el.width; el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness; }
          if (el.x < 0) { el.x = 0; el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness; }
        }
      }
      if (el.script && el.script.trim()) {
        try {
          const fn = new Function('element', 'state', 'keys', 'dt', 'engine', el.script);
          fn(el, { score, isPaused }, keys, dt, { generateId, addElement, removeElement, setScore, getElements });
        } catch(e) {}
      }
    }
    resolveCollisions();
  }

  function drawPerfPanel(fps, avgFps, minFps, w) {
    const panelW = 110, panelH = 72, x = w - panelW - 10, y = 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath(); ctx.roundRect(x, y, panelW, panelH, 4); ctx.fill();
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lineHeight = 20, labelW = 36;
    const fpsColor = fps >= 55 ? '#10B981' : fps >= 30 ? '#F59E0B' : '#EF4444';
    ctx.fillStyle = '#aaa'; ctx.fillText('当前', x + 10, y + 8);
    ctx.fillStyle = fpsColor; ctx.textAlign = 'right'; ctx.fillText(fps, x + panelW - 10, y + 8);
    ctx.textAlign = 'left'; ctx.fillText('FPS', x + labelW + 10, y + 8);
    ctx.fillStyle = '#aaa'; ctx.fillText('平均', x + 10, y + 8 + lineHeight);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(avgFps, x + panelW - 10, y + 8 + lineHeight);
    ctx.textAlign = 'left'; ctx.fillText('FPS', x + labelW + 10, y + 8 + lineHeight);
    ctx.fillStyle = '#aaa'; ctx.fillText('最低', x + 10, y + 8 + lineHeight * 2);
    const minColor = minFps >= 55 ? '#10B981' : minFps >= 30 ? '#F59E0B' : '#EF4444';
    ctx.fillStyle = minColor; ctx.textAlign = 'right'; ctx.fillText(minFps, x + panelW - 10, y + 8 + lineHeight * 2);
    ctx.textAlign = 'left'; ctx.fillText('FPS', x + labelW + 10, y + 8 + lineHeight * 2);
    return x;
  }

  function drawPauseButton(x, y) {
    pauseBtnRect = { x, y, r: 16 };
    const alpha = isPauseBtnHover ? 0.85 : 0.6;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    if (isPaused) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 8);
      ctx.lineTo(x - 4, y + 8);
      ctx.lineTo(x + 8, y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x - 6, y - 7, 4, 14);
      ctx.fillRect(x + 2, y - 7, 4, 14);
    }
  }

  function render() {
    if (score !== lastScore) {
      scoreAnimTime = performance.now();
      lastScore = score;
    }
    const w = window.innerWidth, h = window.innerHeight;
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(0, 0, w, h);
    for (const el of elements) {
      ctx.save();
      if (el.type === 'rect') {
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate(el.rotation * Math.PI / 180);
        ctx.fillStyle = el.color;
        ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
      } else if (el.type === 'circle') {
        const r = el.radius || Math.min(el.width, el.height) / 2;
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rotation * Math.PI / 180);
        ctx.fillStyle = el.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (el.type === 'text') {
        ctx.translate(el.x, el.y + (el.fontSize || 24));
        ctx.rotate(el.rotation * Math.PI / 180);
        ctx.fillStyle = el.color;
        ctx.font = (el.fontSize || 24) + 'px sans-serif';
        ctx.fillText(el.text || '', 0, 0);
      }
      ctx.restore();
    }
    const perfX = drawPerfPanel(currentFps, avgFps, minFps, w);
    drawPauseButton(perfX - 24, 24);

    const animElapsed = performance.now() - scoreAnimTime;
    const animDuration = 200;
    let scale = 1;
    if (animElapsed < animDuration) {
      const t = animElapsed / animDuration;
      if (t < 0.5) { scale = 1 + t * 0.6; } else { scale = 1.3 - (t - 0.5) * 0.6; }
    }
    const sx = 70, sy = 24;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath(); ctx.roundRect(10, 10, 120, 28, 4); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('得分: ', 20, sy);
    if (scale !== 1) {
      ctx.save();
      ctx.translate(sx + 10, sy);
      ctx.scale(scale, scale);
      ctx.translate(-(sx + 10), -sy);
    }
    ctx.fillStyle = '#10B981';
    ctx.font = (14 * scale) + 'px monospace';
    ctx.fillText(score, sx + 10, sy);
    if (scale !== 1) ctx.restore();

    if (isPaused) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('已暂停', w / 2, h / 2);
    }
  }

  function loop() {
    if (!isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1/30);
    lastTime = now;
    frameCount++;
    if (now - fpsTime >= 500) {
      currentFps = Math.round(frameCount * 1000 / (now - fpsTime));
      frameCount = 0; fpsTime = now;
      fpsHistory.push(currentFps);
      if (fpsHistory.length > 120) fpsHistory.shift();
      totalFpsSamples++;
      totalFpsSum += currentFps;
      avgFps = Math.round(totalFpsSum / totalFpsSamples);
      minFps = Math.min.apply(null, fpsHistory);
    }
    if (!isPaused) update(dt);
    render();
    animationId = requestAnimationFrame(loop);
  }
  loop();
})();
`

export class ExportManager {
  static generateHTML(state: GameState): string {
    const gameState = JSON.stringify({
      elements: state.elements,
      title: state.title,
      author: state.author
    })

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${state.title} - ${state.author}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #121212; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
#intro {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: #121212; z-index: 10;
}
.intro-card {
  width: 60%; max-width: 600px;
  background: linear-gradient(135deg, #1E1E2E, #2D2D44);
  border: 2px solid #4A90D9;
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
}
.intro-title {
  color: #fff; font-size: 36px; font-weight: bold; margin-bottom: 8px;
}
.intro-author {
  color: #aaa; font-size: 16px; margin-bottom: 32px;
}
.intro-hint {
  color: #888; font-size: 14px; margin-top: 20px;
}
.btn {
  background: #3B82F6; color: #fff; border: none;
  padding: 14px 40px; font-size: 18px; font-weight: 600;
  border-radius: 8px; cursor: pointer;
  transition: filter 0.2s;
}
.btn:hover { filter: brightness(1.15); }
#game { display: none; }
</style>
</head>
<body>
<div id="intro">
  <div class="intro-card">
    <div class="intro-title">${state.title}</div>
    <div class="intro-author">作者: ${state.author}</div>
    <button class="btn" onclick="startGame()">开始游戏</button>
    <div class="intro-hint">按 空格键 暂停 / 继续</div>
  </div>
</div>
<canvas id="game"></canvas>
<script>
const __GAME_STATE__ = ${gameState};
function startGame() {
  document.getElementById('intro').style.display = 'none';
  const game = document.getElementById('game');
  game.style.display = 'block';
  ${RUNTIME_CODE}
}
</script>
</body>
</html>`
  }

  static encodeShareURL(state: GameState): string {
    const data = JSON.stringify({
      elements: state.elements,
      title: state.title,
      author: state.author
    })
    const encoded = btoa(unescape(encodeURIComponent(data)))
    const baseUrl = window.location.origin + window.location.pathname
    return `${baseUrl}#game=${encoded}`
  }

  static decodeShareURL(): GameState | null {
    const hash = window.location.hash
    if (!hash.startsWith('#game=')) return null
    try {
      const encoded = hash.substring(6)
      const data = decodeURIComponent(escape(atob(encoded)))
      const parsed = JSON.parse(data)
      return {
        elements: parsed.elements || [],
        score: 0,
        isRunning: false,
        isPaused: false,
        selectedId: null,
        title: parsed.title || '我的游戏',
        author: parsed.author || '开发者'
      }
    } catch (e) {
      return null
    }
  }

  static downloadHTML(html: string, filename: string = 'game.html') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  static copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text)
  }
}
