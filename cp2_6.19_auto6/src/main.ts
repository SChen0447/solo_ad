import { AnimationController } from './animationController';
import { BuildingPanel, BuildingConfig } from './buildingPanel';
import { SkylineScene } from './skylineScene';

function main(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const animCtrl = new AnimationController(0, 0);
  const scene = new SkylineScene(canvas, animCtrl);

  const panel = new BuildingPanel((config: BuildingConfig | null) => {
    scene.setPlacingConfig(config);
  });

  panel.setDropHandler((config: BuildingConfig, cx: number, cy: number) => {
    scene.addBuilding(config, cx, cy);
  });

  const btnDay = document.getElementById('btn-day')!;
  const btnNight = document.getElementById('btn-night')!;
  const btnDelete = document.getElementById('btn-delete')!;
  const btnClear = document.getElementById('btn-clear')!;
  const resetViewBtn = document.getElementById('reset-view-btn')!;
  const zoomInfo = document.getElementById('zoom-info')!;

  btnDay.addEventListener('click', () => {
    scene.setNightMode(false);
    btnDay.classList.add('active');
    btnNight.classList.remove('active');
  });

  btnNight.addEventListener('click', () => {
    scene.setNightMode(true);
    btnNight.classList.add('active');
    btnDay.classList.remove('active');
  });

  btnDelete.addEventListener('click', () => {
    scene.deleteSelected();
  });

  btnClear.addEventListener('click', () => {
    scene.clearAll();
  });

  resetViewBtn.addEventListener('click', () => {
    scene.resetView();
  });

  window.addEventListener('resize', () => {
    scene.resize();
  });

  function animate(timestamp: number): void {
    scene.render(timestamp);

    const zoom = scene.getZoom();
    const zoomPercent = Math.round(zoom * 100);
    zoomInfo.textContent = `缩放: ${zoomPercent}%`;

    if (zoom < 0.8) {
      resetViewBtn.classList.add('visible');
    } else {
      resetViewBtn.classList.remove('visible');
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();
