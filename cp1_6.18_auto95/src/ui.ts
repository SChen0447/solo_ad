import {
  ParticleType,
  Rule,
  PARTICLE_TYPES,
  PARTICLE_COLORS,
  RULE_LABELS
} from './particle';
import { RuleMatrix } from './ruleEngine';

export interface UIHandlers {
  onPlaceParticle: (x: number, y: number, type: ParticleType) => void;
  onRuleChange: (subject: number, target: number, rule: Rule) => void;
  onClearAll: () => void;
  onResetRules: () => void;
  onSaveConfig: () => string;
  onLoadConfig: (json: string) => boolean;
}

export interface UIData {
  canvas: HTMLCanvasElement;
}

let _currentType: ParticleType = 'cyan';
let _handlers: UIHandlers | null = null;
let _ruleGridEl: HTMLElement | null = null;
let _canvasEl: HTMLCanvasElement | null = null;

let _toastTimer: number | null = null;

export function initUI(handlers: UIHandlers): UIData {
  _handlers = handlers;

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element #game-canvas not found');
  _canvasEl = canvas;

  _bindToolbar();
  _bindRulePanel();
  _bindActionButtons();
  _bindModal();
  _bindCanvasInteraction(canvas);
  _bindKeyboard();
  _renderRuleGrid();

  return { canvas };
}

export function getCurrentType(): ParticleType {
  return _currentType;
}

export function showToast(msg: string, error = false): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('error', error);
  el.classList.add('visible');
  if (_toastTimer !== null) window.clearTimeout(_toastTimer);
  _toastTimer = window.setTimeout(() => {
    el.classList.remove('visible');
    _toastTimer = null;
  }, 2200);
}

export function updateStats(
  particleCount: number,
  fps: number,
  avgSpeed: number,
  perfMode: boolean,
  fpsLow: boolean
): void {
  const countEl = document.getElementById('stat-count');
  const fpsEl = document.getElementById('stat-fps');
  const speedEl = document.getElementById('stat-speed');
  const tagsEl = document.getElementById('stat-tags');
  if (countEl) countEl.textContent = String(particleCount);
  if (fpsEl) {
    fpsEl.textContent = `${fps.toFixed(0)} FPS`;
    fpsEl.style.color = fpsLow ? '#ff6b6b' : '#00d4ff';
  }
  if (speedEl) speedEl.textContent = `${avgSpeed.toFixed(2)} px/f`;
  if (tagsEl) {
    let html = '';
    if (perfMode) html += '<span class="perf-mode-tag">性能模式</span>';
    if (fpsLow) html += '<span class="fps-warn-tag">低帧率警告</span>';
    tagsEl.innerHTML = html;
  }
}

export function renderRuleMatrix(matrix: RuleMatrix): void {
  if (!_ruleGridEl) return;
  const selects = _ruleGridEl.querySelectorAll<HTMLSelectElement>('select[data-subject][data-target]');
  selects.forEach(sel => {
    const s = Number(sel.dataset.subject);
    const t = Number(sel.dataset.target);
    if (Number.isFinite(s) && Number.isFinite(t) && matrix[s] && matrix[s][t]) {
      sel.value = matrix[s][t];
    }
  });
}

function _bindToolbar(): void {
  const btns = document.querySelectorAll<HTMLButtonElement>('.type-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.type as ParticleType;
      if (!t || !PARTICLE_TYPES.includes(t)) return;
      _currentType = t;
      btns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  const defaultBtn = document.querySelector<HTMLButtonElement>('.type-btn[data-type="cyan"]');
  if (defaultBtn) {
    btns.forEach(b => b.classList.remove('active'));
    defaultBtn.classList.add('active');
  }
}

function _bindRulePanel(): void {
  const panel = document.getElementById('rule-panel');
  const toggle = document.getElementById('rule-toggle');
  if (panel && toggle) {
    toggle.addEventListener('click', () => panel.classList.toggle('collapsed'));
  }
}

function _bindActionButtons(): void {
  const clearBtn = document.getElementById('btn-clear');
  const resetBtn = document.getElementById('btn-reset');
  const saveBtn = document.getElementById('btn-save');
  const loadBtn = document.getElementById('btn-load');

  clearBtn?.addEventListener('click', () => {
    _handlers?.onClearAll();
  });
  resetBtn?.addEventListener('click', () => {
    _handlers?.onResetRules();
    showToast('所有规则已重置为"无视"');
  });
  saveBtn?.addEventListener('click', async () => {
    if (!_handlers) return;
    const json = _handlers.onSaveConfig();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json);
        showToast('配置已复制到剪贴板');
      } else {
        const ta = document.createElement('textarea');
        ta.value = json;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('配置已复制到剪贴板');
      }
    } catch (e) {
      showToast('复制失败，请手动复制', true);
      console.warn(e);
    }
  });
  loadBtn?.addEventListener('click', () => {
    const modal = document.getElementById('load-modal');
    const ta = document.getElementById('load-textarea') as HTMLTextAreaElement | null;
    if (modal) {
      modal.classList.add('visible');
      if (ta) {
        ta.value = '';
        window.setTimeout(() => ta.focus(), 50);
      }
    }
  });
}

function _bindModal(): void {
  const modal = document.getElementById('load-modal');
  const cancel = document.getElementById('load-cancel');
  const confirm = document.getElementById('load-confirm');
  const ta = document.getElementById('load-textarea') as HTMLTextAreaElement | null;
  const close = () => modal?.classList.remove('visible');
  cancel?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  confirm?.addEventListener('click', () => {
    if (!_handlers || !ta) return;
    const json = ta.value.trim();
    if (!json) {
      showToast('请输入配置JSON', true);
      return;
    }
    const ok = _handlers.onLoadConfig(json);
    if (ok) {
      showToast('场景已加载');
      close();
    } else {
      showToast('加载失败：JSON格式错误', true);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('visible')) close();
  });
}

function _bindCanvasInteraction(canvas: HTMLCanvasElement): void {
  let isDown = false;
  let lastSpawn = 0;
  const SPREAD_INTERVAL = 35;

  const getPos = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (clientX - rect.left) * (canvas.width / rect.width) / dpr;
    const y = (clientY - rect.top) * (canvas.height / rect.height) / dpr;
    return { x, y };
  };

  const tryPlace = (x: number, y: number, now: number, force = false): void => {
    if (!force && now - lastSpawn < SPREAD_INTERVAL) return;
    lastSpawn = now;
    _handlers?.onPlaceParticle(x, y, _currentType);
  };

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    const { x, y } = getPos(e.clientX, e.clientY);
    tryPlace(x, y, performance.now(), true);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const { x, y } = getPos(e.clientX, e.clientY);
    tryPlace(x, y, performance.now());
  });
  const up = () => { isDown = false; };
  window.addEventListener('mouseup', up);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;
    const { x, y } = getPos(t.clientX, t.clientY);
    tryPlace(x, y, performance.now(), true);
    isDown = true;
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;
    const { x, y } = getPos(t.clientX, t.clientY);
    tryPlace(x, y, performance.now());
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDown = false;
  }, { passive: false });
}

function _bindKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    if (k === 'c') {
      _handlers?.onClearAll();
    } else if (k === 'r') {
      _handlers?.onResetRules();
      showToast('所有规则已重置为"无视"');
    } else if (k >= '1' && k <= '6') {
      const idx = Number(k) - 1;
      const t = PARTICLE_TYPES[idx];
      if (t) {
        _currentType = t;
        const btns = document.querySelectorAll<HTMLButtonElement>('.type-btn');
        btns.forEach((b, i) => b.classList.toggle('active', i === idx));
      }
    }
  });
}

function _renderRuleGrid(): void {
  const grid = document.getElementById('rule-grid');
  if (!grid) return;
  _ruleGridEl = grid;

  const corner = document.createElement('div');
  corner.className = 'rule-corner';
  corner.innerHTML = '<div class="rule-label" style="padding-top:4px">主体↓ \\ 目标→</div>';
  grid.appendChild(corner);

  for (let t = 0; t < PARTICLE_TYPES.length; t++) {
    const cell = document.createElement('div');
    cell.className = 'rule-header-col';
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = PARTICLE_COLORS[PARTICLE_TYPES[t]];
    dot.style.color = PARTICLE_COLORS[PARTICLE_TYPES[t]];
    cell.appendChild(dot);
    grid.appendChild(cell);
  }

  const rulesOpts: Rule[] = ['attract', 'repel', 'follow', 'ignore'];

  for (let s = 0; s < PARTICLE_TYPES.length; s++) {
    const rowHead = document.createElement('div');
    rowHead.className = 'rule-header-row';
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = PARTICLE_COLORS[PARTICLE_TYPES[s]];
    dot.style.color = PARTICLE_COLORS[PARTICLE_TYPES[s]];
    rowHead.appendChild(dot);
    grid.appendChild(rowHead);

    for (let t = 0; t < PARTICLE_TYPES.length; t++) {
      const cell = document.createElement('div');
      cell.className = 'rule-cell';
      const sel = document.createElement('select');
      sel.dataset.subject = String(s);
      sel.dataset.target = String(t);
      sel.title = `${PARTICLE_TYPES[s]} → ${PARTICLE_TYPES[t]}`;
      rulesOpts.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = RULE_LABELS[r];
        sel.appendChild(opt);
      });
      sel.value = 'ignore';
      sel.addEventListener('change', () => {
        const rule = sel.value as Rule;
        const subj = Number(sel.dataset.subject);
        const targ = Number(sel.dataset.target);
        if (Number.isFinite(subj) && Number.isFinite(targ)) {
          _handlers?.onRuleChange(subj, targ, rule);
        }
      });
      cell.appendChild(sel);
      grid.appendChild(cell);
    }
  }
}
