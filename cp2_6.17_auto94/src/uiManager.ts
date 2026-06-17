import type { SceneObject } from './textParser';

export interface UIManagerCallbacks {
  onGenerate: (text: string) => void;
  onReshuffle: () => void;
  onColorChange: (id: string, color: string) => void;
  onPositionChange: (id: string, position: { x: number; y: number; z: number }) => void;
}

let callbacks: UIManagerCallbacks;
let selectedObject: SceneObject | null = null;
let isGenerating = false;
let sidebarCollapsed = false;

const elements: {
  sceneInput: HTMLTextAreaElement | null;
  generateBtn: HTMLButtonElement | null;
  reshuffleBtn: HTMLButtonElement | null;
  detailsPanel: HTMLDivElement | null;
  detailName: HTMLDivElement | null;
  detailColor: HTMLInputElement | null;
  detailColorHex: HTMLSpanElement | null;
  coordX: HTMLInputElement | null;
  coordY: HTMLInputElement | null;
  coordZ: HTMLInputElement | null;
  loadingOverlay: HTMLDivElement | null;
  sidebar: HTMLElement | null;
  sidebarToggle: HTMLButtonElement | null;
  toggleIcon: HTMLSpanElement | null;
} = {
  sceneInput: null,
  generateBtn: null,
  reshuffleBtn: null,
  detailsPanel: null,
  detailName: null,
  detailColor: null,
  detailColorHex: null,
  coordX: null,
  coordY: null,
  coordZ: null,
  loadingOverlay: null,
  sidebar: null,
  sidebarToggle: null,
  toggleIcon: null
};

let positionUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

export function initUI(cb: UIManagerCallbacks): void {
  callbacks = cb;

  elements.sceneInput = document.getElementById('sceneInput') as HTMLTextAreaElement;
  elements.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  elements.reshuffleBtn = document.getElementById('reshuffleBtn') as HTMLButtonElement;
  elements.detailsPanel = document.getElementById('detailsPanel') as HTMLDivElement;
  elements.detailName = document.getElementById('detailName') as HTMLDivElement;
  elements.detailColor = document.getElementById('detailColor') as HTMLInputElement;
  elements.detailColorHex = document.getElementById('detailColorHex') as HTMLSpanElement;
  elements.coordX = document.getElementById('coordX') as HTMLInputElement;
  elements.coordY = document.getElementById('coordY') as HTMLInputElement;
  elements.coordZ = document.getElementById('coordZ') as HTMLInputElement;
  elements.loadingOverlay = document.getElementById('loadingOverlay') as HTMLDivElement;
  elements.sidebar = document.getElementById('sidebar') as HTMLElement;
  elements.sidebarToggle = document.getElementById('sidebarToggle') as HTMLButtonElement;
  elements.toggleIcon = document.getElementById('toggleIcon') as HTMLSpanElement;

  bindEvents();
  checkResponsive();
  window.addEventListener('resize', checkResponsive);
}

function bindEvents(): void {
  elements.generateBtn?.addEventListener('click', handleGenerate);
  elements.reshuffleBtn?.addEventListener('click', handleReshuffle);
  elements.detailColor?.addEventListener('input', handleColorChange);
  elements.coordX?.addEventListener('input', handlePositionInput);
  elements.coordY?.addEventListener('input', handlePositionInput);
  elements.coordZ?.addEventListener('input', handlePositionInput);
  elements.sidebarToggle?.addEventListener('click', toggleSidebar);

  elements.sceneInput?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  });
}

function handleGenerate(): void {
  if (isGenerating || !elements.sceneInput) return;

  const text = elements.sceneInput.value.trim();
  if (!text) return;

  isGenerating = true;
  updateButtonsState();
  showLoading();

  callbacks.onGenerate(text);
}

function handleReshuffle(): void {
  callbacks.onReshuffle();
}

function handleColorChange(e: Event): void {
  if (!selectedObject || !elements.detailColor || !elements.detailColorHex) return;

  const color = (e.target as HTMLInputElement).value;
  elements.detailColorHex.textContent = color;
  callbacks.onColorChange(selectedObject.id, color);
}

function handlePositionInput(): void {
  if (!selectedObject || !elements.coordX || !elements.coordY || !elements.coordZ) return;

  if (positionUpdateTimeout) {
    clearTimeout(positionUpdateTimeout);
  }

  positionUpdateTimeout = setTimeout(() => {
    const x = parseFloat(elements.coordX!.value) || 0;
    const y = parseFloat(elements.coordY!.value) || 0;
    const z = parseFloat(elements.coordZ!.value) || 0;

    callbacks.onPositionChange(selectedObject!.id, { x, y, z });
  }, 300);
}

function updateButtonsState(): void {
  if (elements.generateBtn) {
    elements.generateBtn.disabled = isGenerating;
    elements.generateBtn.textContent = isGenerating ? '生成中...' : '生成场景';
  }
}

export function updateSelectedObject(obj: SceneObject | null): void {
  selectedObject = obj;

  if (!elements.detailsPanel) return;

  if (obj) {
    elements.detailsPanel.classList.add('visible');

    if (elements.detailName) {
      elements.detailName.textContent = obj.name;
    }
    if (elements.detailColor) {
      elements.detailColor.value = obj.color;
    }
    if (elements.detailColorHex) {
      elements.detailColorHex.textContent = obj.color;
    }
    if (elements.coordX) {
      elements.coordX.value = obj.position.x.toFixed(1);
    }
    if (elements.coordY) {
      elements.coordY.value = obj.position.y.toFixed(1);
    }
    if (elements.coordZ) {
      elements.coordZ.value = obj.position.z.toFixed(1);
    }
  } else {
    elements.detailsPanel.classList.remove('visible');
  }
}

export function showLoading(): void {
  elements.loadingOverlay?.classList.add('visible');
}

export function hideLoading(): void {
  elements.loadingOverlay?.classList.remove('visible');
  isGenerating = false;
  updateButtonsState();
}

export function toggleSidebar(): void {
  if (!elements.sidebar || !elements.toggleIcon) return;

  sidebarCollapsed = !sidebarCollapsed;

  if (sidebarCollapsed) {
    elements.sidebar.classList.add('collapsed');
    elements.toggleIcon.textContent = '›';
  } else {
    elements.sidebar.classList.remove('collapsed');
    elements.toggleIcon.textContent = '‹';
  }
}

function checkResponsive(): void {
  if (!elements.sidebar || !elements.sidebarToggle) return;

  const isMobile = window.innerWidth < 1024;

  if (isMobile) {
    elements.sidebarToggle.classList.add('visible');
    if (!sidebarCollapsed) {
      elements.sidebar.classList.add('collapsed');
      sidebarCollapsed = true;
      if (elements.toggleIcon) {
        elements.toggleIcon.textContent = '›';
      }
    }
  } else {
    elements.sidebarToggle.classList.remove('visible');
    elements.sidebar.classList.remove('collapsed');
    sidebarCollapsed = false;
    if (elements.toggleIcon) {
      elements.toggleIcon.textContent = '‹';
    }
  }
}

export function getCurrentText(): string {
  return elements.sceneInput?.value || '';
}
