import Stats from 'stats.js';
import { initScene, dispose } from './spectrumEngine';
import { createControls, disposeControls } from './uiController';
import { createLabels, disposeLabels } from './labelManager';

let stats: Stats;

function initStats(): void {
  stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'absolute';
  stats.dom.style.right = '16px';
  stats.dom.style.bottom = '16px';
  stats.dom.style.left = 'auto';
  stats.dom.style.top = 'auto';
  stats.dom.style.borderRadius = '8px';
  stats.dom.style.overflow = 'hidden';
  stats.dom.style.background = '#00000066';
  stats.dom.style.backdropFilter = 'blur(8px)';

  const fpsText = stats.dom.querySelector('div:last-child') as HTMLElement | null;
  if (fpsText) {
    fpsText.style.color = '#ffffff';
    fpsText.style.fontSize = '14px';
    fpsText.style.fontFamily = '"SF Mono", Monaco, Consolas, monospace';
    fpsText.style.padding = '4px 8px';
  }

  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer) {
    canvasContainer.appendChild(stats.dom);
  }

  function animateStats(): void {
    stats.update();
    requestAnimationFrame(animateStats);
  }
  animateStats();
}

function initApp(): void {
  initScene('canvas-container');
  createControls();
  createLabels();
  initStats();
}

function cleanup(): void {
  dispose();
  disposeControls();
  disposeLabels();
}

window.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('beforeunload', cleanup);
