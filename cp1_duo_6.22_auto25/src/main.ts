import { Application, Container } from 'pixi.js';
import { GameManager } from './GameManager.js';
import { UIManager } from './UIManager.js';

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.5;

async function main(): Promise<void> {
  const app = new Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a1a,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.view as HTMLCanvasElement);

  const canvas = app.view as HTMLCanvasElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const mapContainer = new Container();
  app.stage.addChild(mapContainer);

  const gameManager = new GameManager();
  gameManager.init();

  for (const node of gameManager.resourceNodes) {
    node.x = node.gridX * gameManager.cellSize + gameManager.cellSize / 2;
    node.y = node.gridY * gameManager.cellSize + gameManager.cellSize / 2;

    node.on('pointerdown', () => {
      gameManager.handleNodeClick(node.id);
    });

    mapContainer.addChild(node);
  }

  const uiManager = new UIManager(gameManager, mapContainer);
  app.stage.addChild(uiManager);

  let lastTime = performance.now();

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let mapStartX = 0;
  let mapStartY = 0;

  mapContainer.x = 300;
  mapContainer.y = 0;

  const gameLoop = (now: number): void => {
    const delta = now - lastTime;
    lastTime = now;
    const dt = Math.min(delta / 1000, 0.1);

    gameManager.update(dt);
    uiManager.update(dt);

    const res = gameManager.playerResources;
    uiManager.updateResourceCounters(res, dt);

    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? -0.05 : 0.05;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, mapContainer.scale.x + zoomDelta));

    const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - mapContainer.x) / mapContainer.scale.x;
    const worldY = (mouseY - mapContainer.y) / mapContainer.scale.y;

    mapContainer.scale.set(newScale);

    mapContainer.x = mouseX - worldX * newScale;
    mapContainer.y = mouseY - worldY * newScale;
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button === 0 && e.clientX > 300) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      mapStartX = mapContainer.x;
      mapStartY = mapContainer.y;
      (e.target as HTMLElement).style.cursor = 'grabbing';
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    mapContainer.x = mapStartX + dx;
    mapContainer.y = mapStartY + dy;
  };

  const onPointerUp = (): void => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = 'default';
    }
  };

  const canvasEl = app.view as HTMLCanvasElement;
  canvasEl.addEventListener('wheel', onWheel, { passive: false });
  canvasEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  let pinchStartDist = 0;
  let pinchStartScale = 1;

  canvasEl.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale = mapContainer.scale.x;
    }
  }, { passive: false });

  canvasEl.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartScale * (dist / pinchStartDist)));
      mapContainer.scale.set(newScale);
    }
  }, { passive: false });

  const onResize = (): void => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    uiManager.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);
}

main().catch(console.error);
