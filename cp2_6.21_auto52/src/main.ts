import { GalaxyRenderer } from '@/visualization/GalaxyRenderer';
import { ControlPanel } from '@/ui/ControlPanel';

function initApp(): void {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    console.error('Canvas container not found');
    return;
  }

  const renderer = new GalaxyRenderer(canvasContainer);
  const controlPanel = new ControlPanel();
  controlPanel.mount();

  renderer.start();

  window.addEventListener('beforeunload', () => {
    renderer.dispose();
    controlPanel.unmount();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
