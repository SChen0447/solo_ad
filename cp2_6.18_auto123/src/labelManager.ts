import * as THREE from 'three';
import { eventBus } from './eventBus';
import { getBandByIndex, SpectrumBand, ApplicationTag } from './waveData';
import * as engine from './spectrumEngine';

interface LabelSprite {
  sprite: THREE.Sprite;
  application: ApplicationTag;
  bandIndex: number;
  basePosition: THREE.Vector3;
}

let labelSprites: LabelSprite[] = [];
let scaleLines: THREE.Group | null = null;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let currentBand: SpectrumBand | null = null;
let globalTime = 0;
let animationFrameId: number;
let popupEl: HTMLElement | null = null;

function createTextTexture(
  icon: string,
  text: string,
  color: { r: number; g: number; b: number },
): THREE.Texture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const width = 512;
  const height = 160;
  canvas.width = width;
  canvas.height = height;

  const radius = 30;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.6)`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = '64px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 80, height / 2 + 4);

  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(text, 140, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createApplicationLabels(band: SpectrumBand): void {
  labelSprites.forEach((ls) => {
    engine.scene.remove(ls.sprite);
    (ls.sprite.material as THREE.SpriteMaterial).map?.dispose();
    (ls.sprite.material as THREE.Material).dispose();
  });
  labelSprites = [];

  band.applications.forEach((app, idx) => {
    const texture = createTextTexture(app.icon, app.name, band.color);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);

    const zPos = -3 + idx * 3;
    const yPos = 2.8 + (idx % 2) * 0.8;
    const xPos = (idx - 1) * 0.5;

    sprite.position.set(xPos, yPos, zPos);
    sprite.scale.set(2.5, 0.8, 1);
    sprite.renderOrder = 999;

    engine.scene.add(sprite);
    labelSprites.push({
      sprite,
      application: app,
      bandIndex: band.index,
      basePosition: new THREE.Vector3(xPos, yPos, zPos),
    });
  });
}

function createScaleLines(): void {
  if (scaleLines) {
    engine.scene.remove(scaleLines);
    scaleLines.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }

  scaleLines = new THREE.Group();
  const rulerLength = 10;
  const ticks = 20;

  const mainLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-5, -3, -rulerLength / 2),
    new THREE.Vector3(-5, -3, rulerLength / 2),
  ]);
  const mainLineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
  });
  const mainLine = new THREE.Line(mainLineGeometry, mainLineMaterial);
  scaleLines.add(mainLine);

  for (let i = 0; i <= ticks; i++) {
    const t = i / ticks;
    const z = -rulerLength / 2 + t * rulerLength;
    const isMajor = i % 4 === 0;
    const tickLength = isMajor ? 0.6 : 0.3;

    const tickGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -3, z),
      new THREE.Vector3(-5 - tickLength, -3, z),
    ]);
    const tickOpacity = isMajor ? 0.4 : 0.2;
    const tickMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: tickOpacity,
    });
    const tickLine = new THREE.Line(tickGeometry, tickMaterial);
    scaleLines.add(tickLine);

    if (isMajor) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 128;
      canvas.height = 64;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 28px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labels = ['1e5m', '10m', '0.1m', '1mm', '1μm', '10nm'];
      const labelIdx = Math.floor(i / 4);
      if (labelIdx < labels.length) {
        ctx.fillText(labels[labelIdx], 64, 32);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const labelSprite = new THREE.Sprite(spriteMat);
      labelSprite.position.set(-5.9, -3, z);
      labelSprite.scale.set(1.2, 0.6, 1);
      scaleLines.add(labelSprite);
    }
  }

  engine.scene.add(scaleLines);
}

function createHTMLRuler(band: SpectrumBand): void {
  const rulerEl = document.getElementById('scale-ruler');
  if (!rulerEl) return;

  const steps = 10;
  let html = '<div class="ruler-title">波长刻度尺</div><div class="ruler-container">';

  const minLog = Math.log10(Math.max(band.wavelengthMin, 1e-14));
  const maxLog = Math.log10(Math.max(band.wavelengthMax, 1e-14));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const logVal = minLog + (maxLog - minLog) * t;
    const wavelength = Math.pow(10, logVal);
    const formatted = formatWL(wavelength);
    const isMajor = i % 2 === 0;

    html += `
      <div class="ruler-tick ${isMajor ? 'major' : ''}" style="left:${t * 100}%">
        <div class="tick-line"></div>
        ${isMajor ? `<div class="tick-label">${formatted}</div>` : ''}
      </div>
    `;
  }

  html += '<div class="ruler-line"></div></div>';
  html += `<div class="ruler-band-name" style="color:rgb(${Math.floor(band.color.r * 255)},${Math.floor(band.color.g * 255)},${Math.floor(band.color.b * 255)})">${band.name} (${band.nameEn})</div>`;

  rulerEl.innerHTML = html;
}

function formatWL(wavelength: number): string {
  if (wavelength >= 1e3) return `${(wavelength / 1e3).toFixed(0)}km`;
  if (wavelength >= 1) return `${wavelength.toFixed(1)}m`;
  if (wavelength >= 1e-3) return `${(wavelength * 1e3).toFixed(1)}mm`;
  if (wavelength >= 1e-6) return `${(wavelength * 1e6).toFixed(1)}μm`;
  if (wavelength >= 1e-9) return `${(wavelength * 1e9).toFixed(0)}nm`;
  return `${(wavelength * 1e12).toFixed(0)}pm`;
}

function onBandChange(bandIndex: number): void {
  const band = getBandByIndex(bandIndex);
  if (!band) return;
  currentBand = band;
  createApplicationLabels(band);
  createHTMLRuler(band);
}

function animateLabels(): void {
  animationFrameId = requestAnimationFrame(animateLabels);
  globalTime += 0.01;

  labelSprites.forEach((ls, idx) => {
    const floatOffset = Math.sin(globalTime + idx * 0.8) * 0.15;
    ls.sprite.position.y = ls.basePosition.y + floatOffset;
    ls.sprite.position.x = ls.basePosition.x + Math.sin(globalTime * 0.7 + idx) * 0.1;
  });
}

function onMouseClick(event: MouseEvent): void {
  if (!popupEl) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, engine.camera);

  const spriteObjects = labelSprites.map((ls) => ls.sprite);
  const intersects = raycaster.intersectObjects(spriteObjects);

  if (intersects.length > 0) {
    const hitSprite = intersects[0].object;
    const labelData = labelSprites.find((ls) => ls.sprite === hitSprite);

    if (labelData && currentBand) {
      event.preventDefault();
      event.stopPropagation();
      showPopup(labelData.application, currentBand, event.clientX, event.clientY);
    }
  } else {
    hidePopup();
  }
}

function showPopup(
  app: ApplicationTag,
  band: SpectrumBand,
  clientX: number,
  clientY: number,
): void {
  if (!popupEl) return;

  popupEl.innerHTML = `
    <div class="popup-header">
      <span class="popup-icon">${app.icon}</span>
      <span class="popup-title">${app.name}</span>
      <button class="popup-close" id="popup-close-btn">×</button>
    </div>
    <div class="popup-band-info">
      <span class="popup-band-tag" style="background:rgb(${Math.floor(band.color.r * 255)},${Math.floor(band.color.g * 255)},${Math.floor(band.color.b * 255)})">${band.name}</span>
    </div>
    <div class="popup-desc">${app.description}</div>
    <div class="popup-band-desc">${band.description}</div>
  `;

  popupEl.classList.add('visible');

  const rect = popupEl.getBoundingClientRect();
  let left = clientX + 20;
  let top = clientY - 20;

  if (left + rect.width > window.innerWidth) {
    left = clientX - rect.width - 20;
  }
  if (top + rect.height > window.innerHeight) {
    top = window.innerHeight - rect.height - 20;
  }
  if (top < 20) top = 20;

  popupEl.style.left = `${left}px`;
  popupEl.style.top = `${top}px`;
  popupEl.style.transformOrigin = `${clientX - left}px ${clientY - top}px`;

  const closeBtn = document.getElementById('popup-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hidePopup();
    });
  }
}

function hidePopup(): void {
  if (!popupEl) return;
  popupEl.classList.remove('visible');
}

export function createLabels(): void {
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  popupEl = document.getElementById('popup-window');

  createScaleLines();
  eventBus.on('bandChange', (index) => onBandChange(index as number));

  window.addEventListener('click', onMouseClick);

  const band = getBandByIndex(0);
  if (band) {
    currentBand = band;
    createApplicationLabels(band);
    createHTMLRuler(band);
  }

  animateLabels();
}

export function updateLabels(_bandIndex: number): void {
}

export function disposeLabels(): void {
  eventBus.removeAllListeners('bandChange');
  window.removeEventListener('click', onMouseClick);
  cancelAnimationFrame(animationFrameId);

  labelSprites.forEach((ls) => {
    engine.scene.remove(ls.sprite);
    (ls.sprite.material as THREE.SpriteMaterial).map?.dispose();
    (ls.sprite.material as THREE.Material).dispose();
  });
  labelSprites = [];

  if (scaleLines) {
    engine.scene.remove(scaleLines);
    scaleLines.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    scaleLines = null;
  }
}
