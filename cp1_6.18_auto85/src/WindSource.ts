import { create } from 'zustand';
import * as THREE from 'three';
import { scene } from './SceneSetup';

export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface WindSourceData {
  id: string;
  position: THREE.Vector3;
  direction: WindDirection;
  speed: number;
  color: string;
  priority: number;
}

interface WindState {
  windSources: WindSourceData[];
  highlightedId: string | null;
  addWindSource: (source: Omit<WindSourceData, 'id' | 'priority'>) => void;
  removeWindSource: (id: string) => void;
  updateWindSource: (id: string, updates: Partial<WindSourceData>) => void;
  highlightWindSource: (id: string | null) => void;
  reorderWindSources: (fromIndex: number, toIndex: number) => void;
  clearAll: () => void;
}

export const useWindStore = create<WindState>((set, get) => ({
  windSources: [],
  highlightedId: null,

  addWindSource: (source) => {
    const sources = get().windSources;
    const newSource: WindSourceData = {
      ...source,
      id: `wind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority: sources.length + 1,
    };
    set({ windSources: [...sources, newSource] });
  },

  removeWindSource: (id) => {
    set((state) => ({
      windSources: state.windSources.filter((s) => s.id !== id),
      highlightedId: state.highlightedId === id ? null : state.highlightedId,
    }));
  },

  updateWindSource: (id, updates) => {
    set((state) => ({
      windSources: state.windSources.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  highlightWindSource: (id) => {
    set({ highlightedId: id });
  },

  reorderWindSources: (fromIndex, toIndex) => {
    set((state) => {
      const sources = [...state.windSources];
      const [moved] = sources.splice(fromIndex, 1);
      sources.splice(toIndex, 0, moved);
      return {
        windSources: sources.map((s, i) => ({ ...s, priority: i + 1 })),
      };
    });
  },

  clearAll: () => {
    set({ windSources: [], highlightedId: null });
  },
}));

export const DIRECTION_ANGLES: Record<WindDirection, number> = {
  N: 0,
  NE: Math.PI / 4,
  E: Math.PI / 2,
  SE: (3 * Math.PI) / 4,
  S: Math.PI,
  SW: (-3 * Math.PI) / 4,
  W: -Math.PI / 2,
  NW: -Math.PI / 4,
};

export const DIRECTION_VECTORS: Record<WindDirection, THREE.Vector3> = {
  N: new THREE.Vector3(0, 0, -1),
  NE: new THREE.Vector3(1, 0, -1).normalize(),
  E: new THREE.Vector3(1, 0, 0),
  SE: new THREE.Vector3(1, 0, 1).normalize(),
  S: new THREE.Vector3(0, 0, 1),
  SW: new THREE.Vector3(-1, 0, 1).normalize(),
  W: new THREE.Vector3(-1, 0, 0),
  NW: new THREE.Vector3(-1, 0, -1).normalize(),
};

const DIRECTION_LABELS: Record<WindDirection, string> = {
  N: '北',
  NE: '东北',
  E: '东',
  SE: '东南',
  S: '南',
  SW: '西南',
  W: '西',
  NW: '西北',
};

const windCones: Map<string, THREE.Group> = new Map();

export function createWindCone(source: WindSourceData): THREE.Group {
  const group = new THREE.Group();

  const coneGeometry = new THREE.ConeGeometry(8, 20, 8, 1, true);
  const coneMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(source.color),
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.rotation.x = Math.PI / 2;
  cone.position.z = -10;
  group.add(cone);

  const glowGeometry = new THREE.SphereGeometry(12, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(source.color),
    transparent: true,
    opacity: 0.15,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glow);

  const ringGeometry = new THREE.RingGeometry(10, 14, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(source.color),
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.5;
  group.add(ring);

  const angle = DIRECTION_ANGLES[source.direction];
  group.rotation.y = angle;
  group.position.copy(source.position);
  group.position.y = 2;

  scene.add(group);
  windCones.set(source.id, group);

  return group;
}

export function removeWindCone(id: string) {
  const cone = windCones.get(id);
  if (cone) {
    scene.remove(cone);
    cone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    windCones.delete(id);
  }
}

export function updateWindCone(source: WindSourceData) {
  const cone = windCones.get(source.id);
  if (cone) {
    const angle = DIRECTION_ANGLES[source.direction];
    cone.rotation.y = angle;
    cone.position.copy(source.position);
    cone.position.y = 2;
  }
}

export function updateCones(delta: number) {
  windCones.forEach((cone) => {
    cone.children.forEach((child, index) => {
      if (index === 0) {
        child.rotation.z += delta * 2;
      }
      if (index === 2) {
        child.rotation.z += delta * 0.5;
      }
    });
    const glow = cone.children[1] as THREE.Mesh;
    if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      glow.scale.setScalar(scale);
    }
  });
}

let panelElement: HTMLElement | null = null;
let currentPosition: THREE.Vector3 | null = null;
let tempDirection: WindDirection = 'E';
let tempSpeed: number = 5;
let tempColor: string = '#4fc3f7';

export function showWindSourcePanel(position: THREE.Vector3, screenX: number, screenY: number) {
  currentPosition = position.clone();
  tempDirection = 'E';
  tempSpeed = 5;
  tempColor = '#4fc3f7';

  if (panelElement) {
    panelElement.remove();
  }

  panelElement = document.createElement('div');
  panelElement.className = 'wind-source-panel glass-panel';
  panelElement.style.left = `${screenX}px`;
  panelElement.style.top = `${screenY}px`;

  panelElement.innerHTML = `
    <div class="panel-title">添加风源</div>
    
    <div class="slider-container">
      <div class="slider-label">
        <span>风向</span>
        <span class="slider-value">${DIRECTION_LABELS[tempDirection]}</span>
      </div>
      <div class="compass-container">
        <div class="compass">
          <div class="compass-center"></div>
          ${(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as WindDirection[])
            .map(
              (dir) =>
                `<div class="compass-direction ${dir === tempDirection ? 'active' : ''}" data-dir="${dir}">${DIRECTION_LABELS[dir]}</div>`
            )
            .join('')}
        </div>
      </div>
    </div>

    <div class="slider-container">
      <div class="slider-label">
        <span>风速</span>
        <span class="slider-value">${tempSpeed}</span>
      </div>
      <input type="range" min="1" max="10" step="0.5" value="${tempSpeed}" class="speed-slider" />
    </div>

    <div class="color-picker-container">
      <div class="color-picker-label">粒子颜色</div>
      <div class="color-wheel" id="colorWheel">
        <div class="color-wheel-indicator" style="left: 10%; background: ${tempColor};"></div>
      </div>
    </div>

    <div class="panel-actions">
      <button class="btn btn-secondary" id="cancelBtn">取消</button>
      <button class="btn btn-primary" id="confirmBtn">确认</button>
    </div>
  `;

  document.getElementById('ui-layer')!.appendChild(panelElement);

  const directionValue = panelElement.querySelector('.compass-container + .slider-label .slider-value') || 
    panelElement.querySelectorAll('.slider-label .slider-value')[0];

  panelElement.querySelectorAll('.compass-direction').forEach((dirEl) => {
    dirEl.addEventListener('click', () => {
      const dir = dirEl.getAttribute('data-dir') as WindDirection;
      if (dir) {
        tempDirection = dir;
        panelElement!.querySelectorAll('.compass-direction').forEach((d) => d.classList.remove('active'));
        dirEl.classList.add('active');
        const label = panelElement!.querySelectorAll('.slider-label .slider-value')[0];
        if (label) label.textContent = DIRECTION_LABELS[dir];
      }
    });
  });

  const speedSlider = panelElement.querySelector('.speed-slider') as HTMLInputElement;
  const speedValue = panelElement.querySelectorAll('.slider-value')[1];
  speedSlider.addEventListener('input', () => {
    tempSpeed = parseFloat(speedSlider.value);
    if (speedValue) speedValue.textContent = tempSpeed.toString();
  });

  const colorWheel = panelElement.querySelector('#colorWheel') as HTMLElement;
  const colorIndicator = colorWheel.querySelector('.color-wheel-indicator') as HTMLElement;

  const updateColorFromPosition = (clientX: number) => {
    const rect = colorWheel.getBoundingClientRect();
    let x = (clientX - rect.left) / rect.width;
    x = Math.max(0, Math.min(1, x));
    colorIndicator.style.left = `${x * 100}%`;
    tempColor = getColorFromPosition(x);
    colorIndicator.style.background = tempColor;
  };

  let isDraggingColor = false;
  colorWheel.addEventListener('mousedown', (e) => {
    isDraggingColor = true;
    updateColorFromPosition(e.clientX);
  });
  document.addEventListener('mousemove', (e) => {
    if (isDraggingColor) {
      updateColorFromPosition(e.clientX);
    }
  });
  document.addEventListener('mouseup', () => {
    isDraggingColor = false;
  });

  document.getElementById('cancelBtn')!.addEventListener('click', hideWindSourcePanel);
  document.getElementById('confirmBtn')!.addEventListener('click', confirmWindSource);

  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, { once: true });
  }, 10);
}

function handleOutsideClick(e: MouseEvent) {
  if (panelElement && !panelElement.contains(e.target as Node)) {
    hideWindSourcePanel();
  } else {
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick, { once: true });
    }, 10);
  }
}

function getColorFromPosition(x: number): string {
  const colors = [
    { pos: 0, r: 33, g: 150, b: 243 },
    { pos: 0.125, r: 79, g: 195, b: 247 },
    { pos: 0.25, r: 129, g: 212, b: 250 },
    { pos: 0.375, r: 76, g: 175, b: 80 },
    { pos: 0.5, r: 205, g: 220, b: 57 },
    { pos: 0.625, r: 255, g: 235, b: 59 },
    { pos: 0.75, r: 255, g: 152, b: 0 },
    { pos: 0.875, r: 255, g: 87, b: 34 },
    { pos: 1, r: 244, g: 67, b: 54 },
  ];

  for (let i = 0; i < colors.length - 1; i++) {
    if (x >= colors[i].pos && x <= colors[i + 1].pos) {
      const range = colors[i + 1].pos - colors[i].pos;
      const t = (x - colors[i].pos) / range;
      const r = Math.round(colors[i].r + (colors[i + 1].r - colors[i].r) * t);
      const g = Math.round(colors[i].g + (colors[i + 1].g - colors[i].g) * t);
      const b = Math.round(colors[i].b + (colors[i + 1].b - colors[i].b) * t);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  return '#4fc3f7';
}

export function hideWindSourcePanel() {
  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
  currentPosition = null;
}

function confirmWindSource() {
  if (currentPosition) {
    useWindStore.getState().addWindSource({
      position: currentPosition.clone(),
      direction: tempDirection,
      speed: tempSpeed,
      color: tempColor,
    });
  }
  hideWindSourcePanel();
}

let layersPanel: HTMLElement | null = null;
let isCollapsed = false;
let draggedIndex: number | null = null;

export function initLayersPanel() {
  const uiLayer = document.getElementById('ui-layer')!;
  
  layersPanel = document.createElement('div');
  layersPanel.className = 'layers-panel glass-panel';
  
  uiLayer.appendChild(layersPanel);

  renderLayersPanel();

  useWindStore.subscribe(() => {
    renderLayersPanel();
  });
}

function renderLayersPanel() {
  if (!layersPanel) return;

  const state = useWindStore.getState();
  const { windSources, highlightedId } = state;

  layersPanel.className = `layers-panel glass-panel ${isCollapsed ? 'collapsed' : ''}`;

  layersPanel.innerHTML = `
    <div class="layers-header">
      <div class="layers-title">
        <span>🌬️</span>
        <span>风源图层 (${windSources.length})</span>
      </div>
      <div class="layers-actions">
        <button class="action-btn record-btn" id="recordBtn" title="录制视频">⏺</button>
        <button class="action-btn" id="resetBtn" title="重置所有">♻️</button>
      </div>
      <span class="toggle-icon">▼</span>
    </div>
    <div class="layers-list">
      ${windSources
        .slice()
        .reverse()
        .map((source, displayIndex) => {
          const actualIndex = windSources.length - 1 - displayIndex;
          return `
        <div class="wind-source-item ${source.id === highlightedId ? 'highlighted' : ''}" 
             data-id="${source.id}" data-index="${actualIndex}" draggable="true">
          <div class="wind-direction-icon">
            ${getDirectionIcon(source.direction)}
          </div>
          <div class="wind-source-info">
            <div class="wind-source-speed">
              ${source.speed.toFixed(1)} <span>${DIRECTION_LABELS[source.direction]}风</span>
            </div>
          </div>
          <div class="color-swatch" style="background: ${source.color};"></div>
          <button class="remove-btn" data-id="${source.id}">×</button>
        </div>
      `;
        })
        .join('')}
      ${windSources.length === 0 ? '<div style="text-align:center; padding: 20px; color: #546e7a; font-size: 13px;">点击地面添加风源</div>' : ''}
    </div>
  `;

  const header = layersPanel.querySelector('.layers-header')!;
  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.layers-actions')) return;
    isCollapsed = !isCollapsed;
    renderLayersPanel();
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    state.clearAll();
  });

  document.getElementById('recordBtn')?.addEventListener('click', () => {
    const event = new CustomEvent('toggleRecording');
    window.dispatchEvent(event);
  });

  layersPanel.querySelectorAll('.wind-source-item').forEach((itemEl) => {
    const item = itemEl as HTMLElement;
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('remove-btn')) return;
      const id = item.getAttribute('data-id');
      if (id) {
        const currentHighlighted = useWindStore.getState().highlightedId;
        useWindStore.getState().highlightWindSource(currentHighlighted === id ? null : id);
      }
    });

    item.addEventListener('dragstart', (e) => {
      const index = parseInt(item.getAttribute('data-index') || '0');
      draggedIndex = index;
      item.classList.add('dragging');
      (e as DragEvent).dataTransfer!.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      (e as DragEvent).dataTransfer!.dropEffect = 'move';
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const toIndex = parseInt(item.getAttribute('data-index') || '0');
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        useWindStore.getState().reorderWindSources(draggedIndex, toIndex);
      }
    });
  });

  layersPanel.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (id) {
        useWindStore.getState().removeWindSource(id);
      }
    });
  });
}

function getDirectionIcon(dir: WindDirection): string {
  const icons: Record<WindDirection, string> = {
    N: '↑',
    NE: '↗',
    E: '→',
    SE: '↘',
    S: '↓',
    SW: '↙',
    W: '←',
    NW: '↖',
  };
  return icons[dir];
}

export function updateRecordButton(isRecording: boolean) {
  const recordBtn = document.getElementById('recordBtn');
  if (recordBtn) {
    if (isRecording) {
      recordBtn.classList.add('recording');
    } else {
      recordBtn.classList.remove('recording');
    }
  }
}
