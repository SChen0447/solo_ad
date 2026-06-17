import { initScene, type SceneContext } from './modules/sceneSetup';
import { TerrainManager } from './modules/terrainManager';
import { SunSimulator } from './modules/sunSimulator';
import { UIController } from './modules/uiController';

function main(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container element #app not found');
    return;
  }

  const ctx: SceneContext = initScene(container);

  const terrainManager = new TerrainManager(ctx);
  const sunSimulator = new SunSimulator(ctx);
  new UIController(terrainManager, sunSimulator);

  let lastTime = performance.now();

  function animate(): void {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    terrainManager.updateAnimations(now);
    ctx.controls.update();
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  animate();
}

main();
