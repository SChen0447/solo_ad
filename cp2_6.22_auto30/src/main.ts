import {
  MaterialCategory,
  MaterialSelection,
  getDefaultSelection,
  getMaterials,
  getMaterialById,
  drawMaterialThumbnail,
  materialsByCategory,
} from './materialLibrary';
import { SceneManager } from './sceneManager';

interface HistoryRecord {
  id: string;
  selection: MaterialSelection;
  thumbnail: string;
  createdAt: number;
}

const state = {
  selection: getDefaultSelection(),
  sceneManager: null as SceneManager | null,
  history: [] as HistoryRecord[],
  isAnimating: false,
};

const dom = {
  canvas: null as HTMLCanvasElement | null,
  thumbLists: {} as Record<MaterialCategory, HTMLDivElement | null>,
  saveBtn: null as HTMLButtonElement | null,
  randomBtn: null as HTMLButtonElement | null,
  historyList: null as HTMLDivElement | null,
  historyCount: null as HTMLSpanElement | null,
  toast: null as HTMLDivElement | null,
};

function init(): void {
  cacheDom();
  if (!dom.canvas) throw new Error('找不到 canvas 元素');

  state.sceneManager = new SceneManager(dom.canvas, state.selection);
  buildThumbnails();
  bindEvents();
  updateSelectedState();
  updateHistoryUI();
}

function cacheDom(): void {
  dom.canvas = document.getElementById('roomCanvas') as HTMLCanvasElement;
  dom.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  dom.randomBtn = document.getElementById('randomBtn') as HTMLButtonElement;
  dom.historyList = document.getElementById('historyList') as HTMLDivElement;
  dom.historyCount = document.getElementById('historyCount') as HTMLSpanElement;
  dom.toast = document.getElementById('toast') as HTMLDivElement;

  (['floor', 'wall', 'curtain'] as MaterialCategory[]).forEach((cat) => {
    const el = document.querySelector(`.thumb-list[data-category="${cat}"]`);
    dom.thumbLists[cat] = el as HTMLDivElement | null;
  });
}

function buildThumbnails(): void {
  (['floor', 'wall', 'curtain'] as MaterialCategory[]).forEach((cat) => {
    const list = dom.thumbLists[cat];
    if (!list) return;
    list.innerHTML = '';

    const materials = getMaterials(cat);
    materials.forEach((mat) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.dataset.category = cat;
      thumb.dataset.id = mat.id;
      thumb.title = mat.name;

      const canvas = document.createElement('canvas');
      const size = 60;
      canvas.width = size;
      canvas.height = size;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.borderRadius = '6px';

      const ctx = canvas.getContext('2d')!;
      drawMaterialThumbnail(ctx, mat, size, size);
      thumb.appendChild(canvas);

      const label = document.createElement('div');
      label.className = 'thumb-label';
      label.textContent = mat.name;
      thumb.appendChild(label);

      list.appendChild(thumb);
    });
  });
}

function bindEvents(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const thumbEl = target.closest('.thumb') as HTMLElement | null;
    if (thumbEl) {
      e.stopPropagation();
      const cat = thumbEl.dataset.category as MaterialCategory;
      const id = thumbEl.dataset.id as string;
      if (cat && id && !state.isAnimating) {
        handleSelect(cat, id);
      }
      return;
    }

    const historyCard = target.closest('.history-card') as HTMLElement | null;
    if (historyCard) {
      e.stopPropagation();
      if (target.closest('.history-delete')) {
        const recId = historyCard.dataset.id;
        if (recId) handleDeleteHistory(recId);
      } else {
        const recId = historyCard.dataset.id;
        if (recId) handleRestoreHistory(recId);
      }
      return;
    }
  });

  if (dom.saveBtn) {
    dom.saveBtn.addEventListener('click', () => {
      if (!state.isAnimating) handleSave();
    });
  }

  if (dom.randomBtn) {
    dom.randomBtn.addEventListener('click', () => {
      if (!state.isAnimating) handleRandom();
    });
  }
}

function handleSelect(category: MaterialCategory, id: string, withFade: boolean = true): void {
  const mat = getMaterialById(category, id);
  if (!mat) return;

  state.selection[category] = id;

  if (withFade && dom.canvas) {
    dom.canvas.classList.add('fading');
    setTimeout(() => {
      applySelection();
      dom.canvas?.classList.remove('fading');
    }, 150);
  } else {
    applySelection();
  }

  updateSelectedState();
}

function applySelection(): void {
  if (state.sceneManager) {
    state.sceneManager.setSelection(state.selection);
  }
}

function updateSelectedState(): void {
  document.querySelectorAll('.thumb').forEach((el) => {
    const htmlEl = el as HTMLElement;
    const cat = htmlEl.dataset.category as MaterialCategory;
    const id = htmlEl.dataset.id as string;
    if (state.selection[cat] === id) {
      htmlEl.classList.add('selected');
    } else {
      htmlEl.classList.remove('selected');
    }
  });
}

function handleSave(): void {
  if (!state.sceneManager || !dom.canvas) return;

  try {
    const dataUrl = state.sceneManager.toDataURL(200 * 1024);
    const record: HistoryRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      selection: { ...state.selection },
      thumbnail: dataUrl,
      createdAt: Date.now(),
    };

    state.history.unshift(record);
    if (state.history.length > 50) state.history.pop();

    updateHistoryUI();
    showToast('方案已保存');
  } catch (err) {
    console.error(err);
    showToast('保存失败', false);
  }
}

function updateHistoryUI(): void {
  if (!dom.historyList || !dom.historyCount) return;

  dom.historyCount.textContent = `（${state.history.length} 个方案）`;

  if (state.history.length === 0) {
    dom.historyList.innerHTML =
      '<div class="history-empty">暂无保存的方案，点击右上角按钮保存当前搭配</div>';
    return;
  }

  dom.historyList.innerHTML = '';

  state.history.forEach((rec, idx) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.dataset.id = rec.id;

    const img = document.createElement('img');
    img.src = rec.thumbnail;
    img.alt = `方案 ${idx + 1}`;
    card.appendChild(img);

    const badge = document.createElement('div');
    badge.className = 'history-index';
    badge.textContent = `#${state.history.length - idx}`;
    card.appendChild(badge);

    const del = document.createElement('button');
    del.className = 'history-delete';
    del.type = 'button';
    del.title = '删除此方案';
    del.textContent = '×';
    card.appendChild(del);

    dom.historyList!.appendChild(card);
  });
}

function handleDeleteHistory(id: string): void {
  const before = state.history.length;
  state.history = state.history.filter((r) => r.id !== id);
  if (state.history.length !== before) {
    updateHistoryUI();
    showToast('方案已删除');
  }
}

function handleRestoreHistory(id: string): void {
  const rec = state.history.find((r) => r.id === id);
  if (!rec) return;

  state.selection = { ...rec.selection };

  if (dom.canvas) {
    dom.canvas.classList.add('fading');
    setTimeout(() => {
      applySelection();
      updateSelectedState();
      dom.canvas?.classList.remove('fading');
    }, 150);
  } else {
    applySelection();
    updateSelectedState();
  }

  showToast('已恢复方案');
}

function handleRandom(): void {
  if (state.isAnimating) return;
  state.isAnimating = true;
  if (dom.randomBtn) dom.randomBtn.style.pointerEvents = 'none';

  const cats: MaterialCategory[] = ['floor', 'wall', 'curtain'];
  const finalSelection: MaterialSelection = {
    floor: pickRandom('floor'),
    wall: pickRandom('wall'),
    curtain: pickRandom('curtain'),
  };

  const flickers: { cat: MaterialCategory; id: string }[][] = [];
  for (let i = 0; i < 3; i++) {
    const frame: { cat: MaterialCategory; id: string }[] = cats.map((cat) => ({
      cat,
      id: pickRandom(cat),
    }));
    flickers.push(frame);
  }

  let step = 0;
  const intervalMs = 150;

  if (dom.canvas) dom.canvas.classList.add('fading');

  const runStep = (): void => {
    if (step < flickers.length) {
      const frame = flickers[step];
      frame.forEach(({ cat, id }) => {
        state.selection[cat] = id;
      });
      applySelection();
      updateSelectedState();
      step++;
      setTimeout(runStep, intervalMs);
    } else {
      state.selection = { ...finalSelection };
      applySelection();
      updateSelectedState();
      dom.canvas?.classList.remove('fading');
      state.isAnimating = false;
      if (dom.randomBtn) dom.randomBtn.style.pointerEvents = 'auto';

      const names = cats
        .map((c) => getMaterialById(c, state.selection[c])?.name)
        .filter(Boolean)
        .join(' + ');
      showToast(`随机搭配：${names}`);
    }
  };

  setTimeout(runStep, 80);
}

function pickRandom(category: MaterialCategory): string {
  const list = materialsByCategory[category];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx].id;
}

function showToast(message: string, success: boolean = true): void {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.remove('success');
  if (success) dom.toast.classList.add('success');
  dom.toast.classList.add('show');

  window.setTimeout(() => {
    dom.toast?.classList.remove('show');
  }, 2200);
}

window.addEventListener('DOMContentLoaded', init);
