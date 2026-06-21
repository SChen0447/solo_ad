import type { GameElement, TemplateType } from '../types';
import { generateId } from './helpers';

function mk<T extends Partial<GameElement>>(base: T): GameElement {
  const id = generateId();
  return {
    id,
    type: 'rect',
    name: `element_${id.slice(-4)}`,
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    radius: 0,
    color: '#4A90D9',
    rotation: 0,
    zIndex: 0,
    physics: {
      enabled: false,
      gravity: 0,
      bounciness: 0,
      friction: 0,
      vx: 0,
      vy: 0,
      isStatic: false
    },
    script: '',
    ...base
  } as GameElement;
}

export function getParkourTemplate(): GameElement[] {
  return [
    mk({
      id: generateId(),
      type: 'circle',
      name: '玩家',
      x: 100,
      y: 400,
      width: 0,
      height: 0,
      radius: 24,
      color: '#10B981',
      zIndex: 10,
      physics: { enabled: true, gravity: 0.8, bounciness: 0.2, friction: 0.05, vx: 3, vy: 0, isStatic: false },
      script: `// 跑酷玩家：点击屏幕或按空格跳跃\nif (!window._keys) window._keys = new Set();\nconst onKey = e => { if(e.code==='Space'){ window._keys.add('jump'); e.preventDefault(); }};\nconst offKey = e => { if(e.code==='Space') window._keys.delete('jump'); };\nif (!ctx._init) {\n  ctx._init = true;\n  document.addEventListener('keydown', onKey);\n  document.addEventListener('keyup', offKey);\n}\nif (window._keys.has('jump') && element.physics.vy === 0) {\n  element.physics.vy = -14;\n  window._keys.delete('jump');\n}\nif (element.x > engine.canvasWidth + 50) {\n  element.x = -50;\n  engine.addScore(1);\n}`
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '地面',
      x: 400,
      y: 560,
      width: 1200,
      height: 80,
      radius: 0,
      color: '#4B5563',
      zIndex: 0,
      physics: { enabled: true, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '障碍1',
      x: 350,
      y: 500,
      width: 40,
      height: 60,
      radius: 0,
      color: '#EF4444',
      zIndex: 1,
      physics: { enabled: true, gravity: 0, bounciness: 0.5, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '障碍2',
      x: 550,
      y: 500,
      width: 40,
      height: 60,
      radius: 0,
      color: '#EF4444',
      zIndex: 1,
      physics: { enabled: true, gravity: 0, bounciness: 0.5, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'text',
      name: '提示文字',
      x: 400,
      y: 100,
      width: 0,
      height: 0,
      radius: 0,
      color: '#1F2937',
      zIndex: 20,
      textContent: '按空格键跳跃！躲避障碍',
      fontSize: 28,
      physics: { enabled: false, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    })
  ];
}

export function getPlatformerTemplate(): GameElement[] {
  return [
    mk({
      id: generateId(),
      type: 'rect',
      name: '玩家',
      x: 100,
      y: 300,
      width: 32,
      height: 48,
      radius: 0,
      color: '#3B82F6',
      zIndex: 10,
      physics: { enabled: true, gravity: 0.7, bounciness: 0.1, friction: 0.1, vx: 0, vy: 0, isStatic: false },
      script: `// 平台跳跃：方向键/AD移动，空格跳\nif (!window._pkeys) window._pkeys = new Set();\nconst onDown = e => { window._pkeys.add(e.code); if(e.code==='Space') e.preventDefault(); };\nconst onUp = e => { window._pkeys.delete(e.code); };\nif (!ctx._init) {\n  ctx._init = true;\n  document.addEventListener('keydown', onDown);\n  document.addEventListener('keyup', onUp);\n}\nconst speed = 5;\nif (window._pkeys.has('ArrowLeft') || window._pkeys.has('KeyA')) element.physics.vx = -speed;\nelse if (window._pkeys.has('ArrowRight') || window._pkeys.has('KeyD')) element.physics.vx = speed;\nif ((window._pkeys.has('Space') || window._pkeys.has('ArrowUp') || window._pkeys.has('KeyW')) && Math.abs(element.physics.vy) < 0.5) {\n  element.physics.vy = -13;\n}\nif (element.x < 20) element.x = 20;\nif (element.x > engine.canvasWidth - 20) element.x = engine.canvasWidth - 20;`
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '地面',
      x: 400,
      y: 580,
      width: 1200,
      height: 60,
      radius: 0,
      color: '#065F46',
      zIndex: 0,
      physics: { enabled: true, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '平台1',
      x: 250,
      y: 460,
      width: 160,
      height: 20,
      radius: 0,
      color: '#059669',
      zIndex: 1,
      physics: { enabled: true, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '平台2',
      x: 500,
      y: 370,
      width: 160,
      height: 20,
      radius: 0,
      color: '#059669',
      zIndex: 1,
      physics: { enabled: true, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'rect',
      name: '平台3',
      x: 680,
      y: 280,
      width: 160,
      height: 20,
      radius: 0,
      color: '#059669',
      zIndex: 1,
      physics: { enabled: true, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    }),
    mk({
      id: generateId(),
      type: 'circle',
      name: '金币',
      x: 700,
      y: 240,
      width: 0,
      height: 0,
      radius: 14,
      color: '#F59E0B',
      zIndex: 5,
      physics: { enabled: true, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: `// 金币：碰到玩家加分\nconst player = engine.getElement ? engine.getElement('') : null;\nconst all = engine.getAllElements();\nconst p = all.find(e => e.name === '玩家');\nif (p) {\n  const dx = p.x - element.x;\n  const dy = p.y - element.y;\n  if (Math.sqrt(dx*dx+dy*dy) < 35) {\n    engine.addScore(10);\n    element.x = 1000 + Math.random()*500;\n  }\n}`
    }),
    mk({
      id: generateId(),
      type: 'text',
      name: '提示',
      x: 400,
      y: 60,
      width: 0,
      height: 0,
      radius: 0,
      color: '#1F2937',
      zIndex: 20,
      textContent: '方向键/AD移动 · 空格/W/↑跳跃',
      fontSize: 24,
      physics: { enabled: false, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    })
  ];
}

export function getShooterTemplate(): GameElement[] {
  return [
    mk({
      id: generateId(),
      type: 'rect',
      name: '玩家',
      x: 400,
      y: 540,
      width: 48,
      height: 48,
      radius: 0,
      color: '#10B981',
      zIndex: 10,
      physics: { enabled: false, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: false },
      script: `// 弹幕射击：方向键移动，空格发射\nif (!window._skeys) window._skeys = new Set();\nconst d = e => { window._skeys.add(e.code); if(e.code==='Space')e.preventDefault(); };\nconst u = e => { window._skeys.delete(e.code); };\nif (!ctx._init) {\n  ctx._init = true; ctx.cd = 0;\n  document.addEventListener('keydown', d);\n  document.addEventListener('keyup', u);\n}\nconst sp = 6;\nif (window._skeys.has('ArrowLeft') || window._skeys.has('KeyA')) element.x -= sp;\nif (window._skeys.has('ArrowRight') || window._skeys.has('KeyD')) element.x += sp;\nif (window._skeys.has('ArrowUp') || window._skeys.has('KeyW')) element.y -= sp;\nif (window._skeys.has('ArrowDown') || window._skeys.has('KeyS')) element.y += sp;\nctx.cd -= delta;\nif (window._skeys.has('Space') && ctx.cd <= 0) {\n  ctx.cd = 0.2;\n  engine.getAllElements().forEach(el => {\n    if (el.name && el.name.startsWith('子弹池') && el.radius > 0 && el.physics.vy === 0) {\n      el.x = element.x; el.y = element.y - 30;\n      el.physics.vy = -12;\n    }\n  });\n}`
    }),
    ...Array.from({ length: 8 }, (_, i) =>
      mk({
        id: generateId(),
        type: 'circle',
        name: `子弹池_${i}`,
        x: -100 - i * 20,
        y: -100,
        width: 0,
        height: 0,
        radius: 6,
        color: '#F59E0B',
        zIndex: 5,
        physics: { enabled: false, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: false },
        script: `if (element.y < -50) { element.physics.vy = 0; element.x = -200; }\nif (element.physics.vy !== 0) {\n  const all = engine.getAllElements();\n  for (const e of all) {\n    if (e.name && e.name.startsWith('敌人') && e.radius > 0) {\n      const dx = e.x - element.x, dy = e.y - element.y;\n      if (Math.sqrt(dx*dx+dy*dy) < e.radius + 8) {\n        e.x = -500; e.y = -500; e.radius = 0;\n        element.x = -300; element.physics.vy = 0;\n        engine.addScore(50);\n        break;\n      }\n    }\n  }\n}`
      })
    ),
    ...Array.from({ length: 5 }, (_, i) =>
      mk({
        id: generateId(),
        type: 'circle',
        name: `敌人_${i}`,
        x: 100 + i * 140,
        y: 80 + (i % 2) * 40,
        width: 0,
        height: 0,
        radius: 22,
        color: '#EF4444',
        zIndex: 6,
        physics: { enabled: false, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: false },
        script: `if (element.radius > 0) {\n  element.x += Math.sin(ctx.t * 2 + ${i}) * 1.5;\n  element.y += Math.sin(ctx.t * 1.5) * 0.5;\n}`
      })
    ),
    mk({
      id: generateId(),
      type: 'text',
      name: '提示',
      x: 400,
      y: 40,
      width: 0,
      height: 0,
      radius: 0,
      color: '#1F2937',
      zIndex: 20,
      textContent: '方向键/WASD移动 · 空格发射',
      fontSize: 24,
      physics: { enabled: false, gravity: 0, bounciness: 0, friction: 0, vx: 0, vy: 0, isStatic: true },
      script: ''
    })
  ];
}

export function getTemplate(type: TemplateType): GameElement[] {
  switch (type) {
    case 'parkour':
      return getParkourTemplate();
    case 'platformer':
      return getPlatformerTemplate();
    case 'shooter':
      return getShooterTemplate();
    default:
      return [];
  }
}

export const TEMPLATE_META: Record<TemplateType, { name: string; welcome: string }> = {
  parkour: { name: '跑酷', welcome: '欢迎来到跑酷模板！按空格跳跃，躲避障碍物。' },
  platformer: { name: '平台跳跃', welcome: '欢迎来到平台跳跃模板！方向键移动，空格跳跃收集金币。' },
  shooter: { name: '弹幕射击', welcome: '欢迎来到弹幕射击模板！移动并发射子弹击败敌人。' }
};
