import * as THREE from 'three';
import gsap from 'gsap';
import { GeologyLoader } from './data/GeologyLoader';
import { GeologyLayer, CrossSectionResult, LayerSample } from './data/GeologyInterfaces';
import { SceneManager } from './renderer/SceneManager';
import { CrossSection } from './renderer/CrossSection';

const container = document.getElementById('canvas-container') as HTMLElement;
if (!container) {
  throw new Error('canvas-container 元素未找到');
}

const loader = new GeologyLoader();
const geologyData = loader.loadSync();

const sceneManager = new SceneManager(container);
sceneManager.buildFromData(geologyData);
sceneManager.start();

const crossSection = new CrossSection(geologyData, sceneManager);

const depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
const depthDisplay = document.getElementById('depth-display') as HTMLElement;
const layerList = document.getElementById('layer-list') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const popupCard = document.getElementById('popup-card') as HTMLElement;
const popupClose = document.getElementById('popup-close') as HTMLButtonElement;
const popupName = document.getElementById('popup-name') as HTMLElement;
const popupColor = document.getElementById('popup-color') as HTMLElement;
const popupDepth = document.getElementById('popup-depth') as HTMLElement;
const popupDensity = document.getElementById('popup-density') as HTMLElement;
const popupEra = document.getElementById('popup-era') as HTMLElement;

const maxDepth = crossSection.getMaxDepth();
depthSlider.max = String(maxDepth);
depthSlider.value = String(Math.round(maxDepth * 0.4));

let sliderReleaseTimeout: number | null = null;

function updateDepthDisplay(depth: number): void {
  depthDisplay.textContent = String(Math.round(depth));
}

function renderLayerList(result: CrossSectionResult): void {
  if (result.samples.length === 0) {
    layerList.innerHTML = `<div style="font-size:12px; color:#666; padding:10px 0;">该深度暂无岩层数据</div>`;
    return;
  }

  const sorted: LayerSample[] = [...result.samples].sort((a, b) => b.thickness - a.thickness);
  const d = Math.round(result.depth);
  const header = `<div style="font-size:12px; color:#4A90D9; font-weight:500; margin-bottom:10px;">
    深度 ${d}m &middot; 共 ${sorted.length} 个岩层
  </div>`;
  const items = sorted.map(s => `
    <div class="layer-item">
      <div class="row1">
        <span class="name">
          <span class="color-dot" style="background:${s.color}"></span>
          ${s.name}
        </span>
        <span class="thickness">${s.thickness}m</span>
      </div>
      <div class="hex">${s.color.toUpperCase()}</div>
    </div>
  `).join('');
  layerList.innerHTML = header + items;
}

function handleSliderChange(e: Event, isInput: boolean): void {
  const val = parseFloat((e.target as HTMLInputElement).value);
  updateDepthDisplay(val);

  if (isInput) {
    crossSection.updatePlane(val);
  } else {
    const result = crossSection.applyDepth(val);
    renderLayerList(result);
  }
}

depthSlider.addEventListener('input', (e) => {
  if (sliderReleaseTimeout) {
    window.clearTimeout(sliderReleaseTimeout);
    sliderReleaseTimeout = null;
  }
  handleSliderChange(e, true);
});

depthSlider.addEventListener('change', (e) => {
  handleSliderChange(e, false);
});

depthSlider.addEventListener('pointerup', () => {
  sliderReleaseTimeout = window.setTimeout(() => {
    sliderReleaseTimeout = null;
  }, 100);
});

resetBtn.addEventListener('click', () => {
  const { startPos, startTarget, endPos, endTarget } = sceneManager.resetCamera();

  const camObj = {
    px: startPos.x,
    py: startPos.y,
    pz: startPos.z,
    tx: startTarget.x,
    ty: startTarget.y,
    tz: startTarget.z
  };

  gsap.to(camObj, {
    px: endPos.x,
    py: endPos.y,
    pz: endPos.z,
    tx: endTarget.x,
    ty: endTarget.y,
    tz: endTarget.z,
    duration: 1.0,
    ease: 'power2.inOut',
    onUpdate: () => {
      const pos = new THREE.Vector3(camObj.px, camObj.py, camObj.pz);
      const tgt = new THREE.Vector3(camObj.tx, camObj.ty, camObj.tz);
      sceneManager.applyCameraState(pos, tgt);
    }
  });
});

function showPopup(layer: GeologyLayer, screenPos: { x: number; y: number }): void {
  popupName.textContent = layer.name;
  popupColor.style.background = layer.color;
  popupDepth.textContent = `${layer.topDepth}m ~ ${layer.bottomDepth}m`;
  popupDensity.textContent = `${layer.density} kg/m³`;
  popupEra.textContent = layer.era;

  popupCard.style.display = 'block';

  const cardW = popupCard.offsetWidth || 260;
  const cardH = popupCard.offsetHeight || 180;
  const padding = 16;
  const maxX = window.innerWidth - cardW - padding - 300;
  const maxY = window.innerHeight - cardH - padding;

  let x = screenPos.x + 18;
  let y = screenPos.y - 20;
  if (x > maxX) x = Math.max(padding, screenPos.x - cardW - 18);
  if (y > maxY) y = maxY;
  if (y < padding) y = padding;
  if (x < padding) x = padding;

  popupCard.style.left = `${x}px`;
  popupCard.style.top = `${y}px`;
}

function hidePopup(): void {
  popupCard.style.display = 'none';
  sceneManager.clearHighlight();
}

popupClose.addEventListener('click', hidePopup);

document.addEventListener('pointerdown', (e) => {
  if (popupCard.style.display === 'none') return;
  if ((e.target as HTMLElement).closest('#popup-card')) return;
  if ((e.target as HTMLElement).closest('#reset-btn')) return;
  if ((e.target as HTMLElement).closest('#side-panel')) return;
  if ((e.target as HTMLElement).tagName === 'CANVAS') return;
  hidePopup();
});

sceneManager.setOnLayerClick((layer, screenPos) => {
  showPopup(layer, screenPos);
});

const initialDepth = parseFloat(depthSlider.value);
updateDepthDisplay(initialDepth);
const initResult = crossSection.applyDepth(initialDepth);
renderLayerList(initResult);
