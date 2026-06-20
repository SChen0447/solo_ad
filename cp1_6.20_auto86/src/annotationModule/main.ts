import { eventBus } from '../eventBus';
import { getCanvasClickPos, screenToWorld, getAnnotationAt } from '../drawingModule/main';

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

let annotations: Annotation[] = [];
let pendingPos: { x: number; y: number } | null = null;
let annoIdCounter = 0;

function init() {
  const sectionCanvas = document.getElementById('section-canvas') as HTMLCanvasElement;
  const annoModal = document.getElementById('anno-modal') as HTMLDivElement;
  const annoInput = document.getElementById('anno-input') as HTMLInputElement;
  const annoConfirm = document.getElementById('anno-confirm') as HTMLButtonElement;
  const annoCancel = document.getElementById('anno-cancel') as HTMLButtonElement;
  const cutSlider = document.getElementById('cut-slider') as HTMLInputElement;
  const sliderValue = document.getElementById('slider-value') as HTMLElement;
  const floorBtns = document.querySelectorAll('.floor-btn');

  sectionCanvas.addEventListener('click', (e: MouseEvent) => {
    const screenPos = getCanvasClickPos(e);
    const existing = getAnnotationAt(screenPos.x, screenPos.y);
    if (existing) return;

    const worldPos = screenToWorld(screenPos.x, screenPos.y);
    pendingPos = worldPos;

    annoModal.style.display = 'block';
    const containerRect = (document.getElementById('section-container') as HTMLElement).getBoundingClientRect();
    const modalX = e.clientX - containerRect.left + 10;
    const modalY = e.clientY - containerRect.top + 10;
    const maxX = containerRect.width - 220;
    const maxY = containerRect.height - 100;
    annoModal.style.left = Math.min(modalX, maxX) + 'px';
    annoModal.style.top = Math.min(modalY, maxY) + 'px';

    annoInput.value = '';
    setTimeout(() => annoInput.focus(), 10);
  });

  sectionCanvas.addEventListener('mousemove', (e: MouseEvent) => {
    const screenPos = getCanvasClickPos(e);
    const anno = getAnnotationAt(screenPos.x, screenPos.y);
    eventBus.emit('annotationHover', anno ? anno.id : null);
    sectionCanvas.style.cursor = anno ? 'pointer' : 'crosshair';
  });

  annoConfirm.addEventListener('click', () => {
    const text = annoInput.value.trim();
    if (text && pendingPos) {
      addAnnotation(pendingPos.x, pendingPos.y, text);
    }
    closeModal();
  });

  annoCancel.addEventListener('click', closeModal);

  annoInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') annoConfirm.click();
    if (e.key === 'Escape') closeModal();
  });

  document.addEventListener('click', (e: MouseEvent) => {
    if (annoModal.style.display === 'block') {
      const target = e.target as HTMLElement;
      if (!annoModal.contains(target) && target !== sectionCanvas) {
        closeModal();
      }
    }
  });

  cutSlider.addEventListener('input', () => {
    const val = parseInt(cutSlider.value);
    sliderValue.textContent = String(val);
    const height = (val / 100) * 90;
    eventBus.emit('cutHeightChanged', height);
  });

  floorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      floorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const floor = parseInt((btn as HTMLElement).dataset.floor || '1');
      eventBus.emit('floorSwitched', floor);
    });
  });
}

function closeModal() {
  const annoModal = document.getElementById('anno-modal') as HTMLDivElement;
  annoModal.style.display = 'none';
  pendingPos = null;
}

function addAnnotation(x: number, y: number, text: string) {
  annoIdCounter++;
  const annotation: Annotation = {
    id: `anno_${annoIdCounter}`,
    x,
    y,
    text
  };
  annotations.push(annotation);
  eventBus.emit('annotationAdded', annotation);
  eventBus.emit('annotationsUpdated', annotations);
  updateAnnotationListUI();
}

function removeAnnotation(id: string) {
  annotations = annotations.filter(a => a.id !== id);
  eventBus.emit('annotationsUpdated', annotations);
  updateAnnotationListUI();
}

function updateAnnotationListUI() {
  const listEl = document.getElementById('annotation-list') as HTMLDivElement;
  const countEl = document.getElementById('anno-count') as HTMLElement;

  countEl.textContent = `${annotations.length} 项`;

  if (annotations.length === 0) {
    listEl.innerHTML = '<div class="empty-list">点击剖面图添加标注</div>';
    return;
  }

  listEl.innerHTML = '';
  annotations.forEach(anno => {
    const item = document.createElement('div');
    item.className = 'annotation-item';
    item.dataset.id = anno.id;

    const textSpan = document.createElement('span');
    textSpan.className = 'anno-text';
    textSpan.textContent = anno.text;

    const coordSpan = document.createElement('span');
    coordSpan.className = 'anno-coord';
    coordSpan.textContent = `(${anno.x.toFixed(1)}, ${anno.y.toFixed(1)})`;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.title = '删除标注';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeAnnotation(anno.id);
    });

    item.appendChild(textSpan);
    item.appendChild(coordSpan);
    item.appendChild(delBtn);

    item.addEventListener('mouseenter', () => {
      eventBus.emit('annotationHover', anno.id);
    });
    item.addEventListener('mouseleave', () => {
      eventBus.emit('annotationHover', null);
    });

    listEl.appendChild(item);
  });
}

init();

export type { Annotation };
export { annotations };
