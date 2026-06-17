import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelBuilder, MoleculeData, PresetMolecule, RenderMode, ColorTheme } from './ModelBuilder';

const MAX_ATOMS = 200;
const MAX_BONDS = 300;
const MIN_FPS = 45;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let modelBuilder: ModelBuilder;
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;
let lightIndicator: THREE.Mesh;
let lightIndicatorHTML: HTMLElement;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let selectedElement: { id: number; type: 'atom' | 'bond' } | null = null;
let hoveredElement: { id: number; type: 'atom' | 'bond' } | null = null;
let isDraggingLight = false;
let presetMolecules: PresetMolecule[] = [];
let currentMolecule: MoleculeData | null = null;

let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;

function init(): void {
  const container = document.getElementById('canvas-container')!;
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 0, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.enablePan = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };

  ambientLight = new THREE.AmbientLight(0x87ceeb, 0.4);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  const lightGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  lightIndicator = new THREE.Mesh(lightGeometry, lightMaterial);
  lightIndicator.position.copy(directionalLight.position);
  lightIndicator.userData = { type: 'light' };
  scene.add(lightIndicator);

  createLightIndicatorHTML();

  modelBuilder = new ModelBuilder(scene);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  setupEventListeners();
  loadPresetMolecules();
  animate();
}

function createLightIndicatorHTML(): void {
  lightIndicatorHTML = document.createElement('div');
  lightIndicatorHTML.className = 'light-indicator';
  document.getElementById('app')!.appendChild(lightIndicatorHTML);
  updateLightIndicatorPosition();
}

function updateLightIndicatorPosition(): void {
  const vector = directionalLight.position.clone().project(camera);
  const container = document.getElementById('canvas-container')!;
  const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
  const y = (-vector.y * 0.5 + 0.5) * container.clientHeight;
  lightIndicatorHTML.style.left = `${x - 8}px`;
  lightIndicatorHTML.style.top = `${y - 8}px`;
}

function setupEventListeners(): void {
  const container = document.getElementById('canvas-container')!;
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('click', onMouseClick);
  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('resize', onWindowResize);

  document.getElementById('load-btn')!.addEventListener('click', () => {
    const input = document.getElementById('smiles-input') as HTMLInputElement;
    if (input.value.trim()) {
      loadMolecule(input.value.trim());
    }
  });

  document.getElementById('mobile-load-btn')!.addEventListener('click', () => {
    const input = document.getElementById('mobile-smiles-input') as HTMLInputElement;
    if (input.value.trim()) {
      loadMolecule(input.value.trim());
    }
  });

  document.getElementById('smiles-input')!.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      if (input.value.trim()) {
        loadMolecule(input.value.trim());
      }
    }
  });

  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode') as RenderMode;
      setRenderMode(mode);
    });
  });

  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.getAttribute('data-theme') as ColorTheme;
      setColorTheme(theme);
    });
  });

  document.getElementById('preset-select')!.addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value;
    if (value) {
      const preset = presetMolecules.find(p => p.id === value);
      if (preset) {
        loadMolecule(preset.smiles);
      }
    }
  });

  document.getElementById('mobile-preset-select')!.addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value;
    if (value) {
      const preset = presetMolecules.find(p => p.id === value);
      if (preset) {
        loadMolecule(preset.smiles);
      }
    }
  });

  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.mobile-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mobile-panel-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`mobile-${tab}`)!.classList.add('active');
    });
  });

  lightIndicatorHTML.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingLight = true;
    controls.enabled = false;
  });
}

function onMouseMove(event: MouseEvent): void {
  const container = document.getElementById('canvas-container')!;
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (isDraggingLight) {
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    if (intersectPoint) {
      const distance = 5;
      const direction = intersectPoint.clone().normalize().multiplyScalar(distance);
      directionalLight.position.copy(direction);
      lightIndicator.position.copy(direction);
      updateLightIndicatorPosition();
    }
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const pickableObjects = modelBuilder.getPickableObjects();
  const intersects = raycaster.intersectObjects(pickableObjects, false);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const type = obj.userData.type as 'atom' | 'bond';
    const id = obj.userData.id as number;

    if (!hoveredElement || hoveredElement.id !== id || hoveredElement.type !== type) {
      hoveredElement = { id, type };
      modelBuilder.setHoverElement(id, type);
      document.body.style.cursor = 'pointer';
    }

    updateTooltipPosition(event.clientX, event.clientY);
  } else {
    if (hoveredElement) {
      hoveredElement = null;
      modelBuilder.setHoverElement(null, 'atom');
      document.body.style.cursor = 'default';
      hideTooltip();
    }
  }
}

function onMouseClick(event: MouseEvent): void {
  if (isDraggingLight) return;

  const container = document.getElementById('canvas-container')!;
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const pickableObjects = modelBuilder.getPickableObjects();
  const intersects = raycaster.intersectObjects(pickableObjects, false);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const type = obj.userData.type as 'atom' | 'bond';
    const id = obj.userData.id as number;

    if (selectedElement && selectedElement.id === id && selectedElement.type === type) {
      selectedElement = null;
      modelBuilder.clearHighlight();
      hideTooltip();
    } else {
      selectedElement = { id, type };
      modelBuilder.highlightElement(id, type);
      showTooltip(id, type, event.clientX, event.clientY);
    }
  } else {
    selectedElement = null;
    modelBuilder.clearHighlight();
    hideTooltip();
  }
}

function onMouseDown(event: MouseEvent): void {
  if (event.button === 0) {
    const rect = lightIndicatorHTML.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      isDraggingLight = true;
      controls.enabled = false;
    }
  }
}

function onMouseUp(): void {
  if (isDraggingLight) {
    isDraggingLight = false;
    controls.enabled = true;
  }
}

function onWindowResize(): void {
  const container = document.getElementById('canvas-container')!;
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  updateLightIndicatorPosition();
}

function showTooltip(id: number, type: 'atom' | 'bond', x: number, y: number): void {
  const tooltip = document.getElementById('tooltip')!;
  const data = modelBuilder.getCurrentData();
  if (!data) return;

  let content = '';
  if (type === 'atom') {
    const atom = data.atoms.find(a => a.id === id);
    if (atom) {
      content = `
        <div class="tooltip-title">原子: ${atom.element}</div>
        <div class="tooltip-row"><span class="tooltip-label">ID:</span><span class="tooltip-value">${atom.id}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">坐标:</span><span class="tooltip-value">(${atom.x.toFixed(3)}, ${atom.y.toFixed(3)}, ${atom.z.toFixed(3)})</span></div>
      `;
    }
  } else {
    const bond = data.bonds.find(b => b.id === id);
    if (bond) {
      const bondTypeNames: { [key: string]: string } = {
        single: '单键', double: '双键', triple: '三键', aromatic: '芳香键'
      };
      content = `
        <div class="tooltip-title">键: ${bondTypeNames[bond.type] || bond.type}</div>
        <div class="tooltip-row"><span class="tooltip-label">ID:</span><span class="tooltip-value">${bond.id}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">连接:</span><span class="tooltip-value">${bond.atom1} - ${bond.atom2}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">键长:</span><span class="tooltip-value">${bond.length.toFixed(3)} Å</span></div>
      `;
    }
  }

  tooltip.innerHTML = content;
  tooltip.style.display = 'block';
  updateTooltipPosition(x, y);
}

function updateTooltipPosition(x: number, y: number): void {
  const tooltip = document.getElementById('tooltip')!;
  const offset = 15;
  let posX = x + offset;
  let posY = y + offset;

  if (posX + tooltip.offsetWidth > window.innerWidth) {
    posX = x - tooltip.offsetWidth - offset;
  }
  if (posY + tooltip.offsetHeight > window.innerHeight) {
    posY = y - tooltip.offsetHeight - offset;
  }

  tooltip.style.left = `${posX}px`;
  tooltip.style.top = `${posY}px`;
}

function hideTooltip(): void {
  document.getElementById('tooltip')!.style.display = 'none';
}

async function loadPresetMolecules(): Promise<void> {
  try {
    const response = await fetch('/api/molecule/sample');
    const data = await response.json();
    presetMolecules = data.molecules;
    populatePresetSelects();
    if (presetMolecules.length > 0) {
      loadMolecule(presetMolecules[0].smiles);
    }
  } catch (error) {
    console.error('Failed to load preset molecules:', error);
    useFallbackPresets();
  }
}

function useFallbackPresets(): void {
  presetMolecules = [
    { id: 'ethanol', name: '乙醇', smiles: 'CCO' },
    { id: 'benzene', name: '苯环', smiles: 'c1ccccc1' },
    { id: 'caffeine', name: '咖啡因', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
    { id: 'glucose', name: '葡萄糖', smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O' },
    { id: 'peptide', name: '短肽', smiles: 'NCC(=O)NCC(=O)O' }
  ];
  populatePresetSelects();
  loadMolecule(presetMolecules[0].smiles);
}

function populatePresetSelects(): void {
  const selects = ['preset-select', 'mobile-preset-select'];
  selects.forEach(selectId => {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    select.innerHTML = '<option value="">选择预设分子...</option>';
    presetMolecules.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = `${preset.name} (${preset.smiles})`;
      select.appendChild(option);
    });
  });
}

async function loadMolecule(smiles: string): Promise<void> {
  showLoadingProgress();

  try {
    const response = await fetch('/api/molecule/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smiles })
    });

    if (!response.ok) {
      throw new Error('Failed to parse molecule');
    }

    const data: MoleculeData = await response.json();

    if (data.atoms.length > MAX_ATOMS) {
      alert(`分子包含${data.atoms.length}个原子，超过上限${MAX_ATOMS}个`);
      hideLoadingProgress();
      return;
    }
    if (data.bonds.length > MAX_BONDS) {
      alert(`分子包含${data.bonds.length}个键，超过上限${MAX_BONDS}个`);
      hideLoadingProgress();
      return;
    }

    currentMolecule = data;
    modelBuilder.buildMolecule(data);
    updateInfoPanel(data);
    camera.position.set(0, 0, Math.max(8, data.atoms.length * 0.3 + 3));
    controls.target.set(0, 0, 0);
    controls.update();

  } catch (error) {
    console.error('Failed to load molecule:', error);
    alert('加载分子失败，请检查SMILES字符串是否正确');
  }

  hideLoadingProgress();
}

function updateInfoPanel(data: MoleculeData): void {
  const formulaDisplay = formatFormula(data.formula);
  
  const updates: { [key: string]: string } = {
    'formula': formulaDisplay,
    'molecular-weight': data.molecularWeight.toFixed(2),
    'atom-count': data.atoms.length.toString(),
    'bond-count': data.bonds.length.toString(),
    'molecule-name': data.name || '未知'
  };

  Object.entries(updates).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
    const mobileEl = document.getElementById(`mobile-${id}`);
    if (mobileEl) mobileEl.textContent = value;
  });
}

function formatFormula(formula: string): string {
  return formula.replace(/(\d+)/g, '<sub>$1</sub>');
}

function setRenderMode(mode: RenderMode): void {
  document.querySelectorAll('.btn-mode').forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  modelBuilder.setRenderMode(mode);
}

function setColorTheme(theme: ColorTheme): void {
  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.getAttribute('data-theme') === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  modelBuilder.setColorTheme(theme);
}

function showLoadingProgress(): void {
  const fill = document.getElementById('progress-bar-fill')!;
  fill.classList.add('loading');
  fill.style.width = '0%';
}

function hideLoadingProgress(): void {
  const fill = document.getElementById('progress-bar-fill')!;
  fill.classList.remove('loading');
  fill.style.width = '100%';
  setTimeout(() => {
    fill.style.width = '0%';
  }, 300);
}

function updateFPS(time: number): void {
  frameCount++;
  if (time - lastFpsUpdate >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (time - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = time;
    document.getElementById('fps-counter')!.textContent = `FPS: ${currentFps}`;

    if (currentFps < MIN_FPS) {
      renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.1));
    } else if (currentFps >= 55 && renderer.getPixelRatio() < Math.min(window.devicePixelRatio, 2)) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2, renderer.getPixelRatio() + 0.1));
    }
  }
}

function animate(time: number = 0): void {
  requestAnimationFrame(animate);

  modelBuilder.update(time);
  controls.update();
  updateLightIndicatorPosition();
  updateFPS(time);

  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);
