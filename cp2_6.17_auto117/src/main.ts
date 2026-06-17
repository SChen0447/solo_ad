import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './sceneManager';
import { UIManager } from './uiManager';

const app = document.getElementById('app');
if (!app) {
  throw new Error('App container not found');
}

const canvas = document.createElement('canvas');
app.appendChild(canvas);

const sceneManager = new SceneManager(canvas);
const uiManager = new UIManager(app);

const controls = new OrbitControls(sceneManager.camera, sceneManager.renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2.2;
controls.target.set(7.5, 0, 7.5);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let mouseDownPos = { x: 0, y: 0 };

function onMouseDown(event: MouseEvent) {
  mouseDownPos = { x: event.clientX, y: event.clientY };
}

function onMouseUp(event: MouseEvent) {
  const dx = Math.abs(event.clientX - mouseDownPos.x);
  const dy = Math.abs(event.clientY - mouseDownPos.y);

  if (dx < 5 && dy < 5) {
    handleClick(event);
  }
}

function handleClick(event: MouseEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, sceneManager.camera);

  const targets: THREE.Object3D[] = [];
  sceneManager.gridCells.forEach((row) => {
    row.forEach((cell) => targets.push(cell));
  });

  sceneManager.buildings.forEach(({ mesh }) => {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        targets.push(child);
      }
    });
  });

  const intersects = raycaster.intersectObjects(targets, true);

  if (intersects.length > 0) {
    sceneManager.handleClick(intersects);
  }
}

function onMouseMove(event: MouseEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, sceneManager.camera);

  const targets: THREE.Object3D[] = [];
  sceneManager.buildings.forEach(({ mesh }) => {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        targets.push(child);
      }
    });
  });

  const intersects = raycaster.intersectObjects(targets, true);
  sceneManager.handleHover(intersects);
}

sceneManager.onBuildingHover = (info) => {
  if (info) {
    uiManager.showBuildingPanel(info);
  } else {
    uiManager.requestHidePanel();
  }
};

sceneManager.onBuildingSelect = (info) => {
  if (info) {
    uiManager.pinBuildingPanel(info);
  } else {
    uiManager.pinBuildingPanel(null);
  }
};

uiManager.onTimeChange = (hour) => {
  sceneManager.setDayNight(hour);
};

uiManager.onGrowthToggle = (isGrowing) => {
  if (isGrowing) {
    sceneManager.startGrowth();
  } else {
    sceneManager.stopGrowth();
  }
};

sceneManager.onBuildingCountChange = (count, density) => {
  uiManager.updateStats(count, density);
};

sceneManager.onGrowthTimeUpdate = (seconds) => {
  uiManager.updateElapsedTime(seconds);
};

uiManager.onReset = () => {
  sceneManager.reset();
  uiManager.setGrowthButtonState(false);
};

uiManager.onExport = () => {
  return sceneManager.exportScene();
};

uiManager.onRandomize = () => {
  sceneManager.randomize(20);
};

uiManager.onClosePanel = () => {
  sceneManager.hoveredBuilding = null;
  sceneManager.selectedBuilding = null;
  sceneManager.updateHoverOutline();
  sceneManager.updateSelectedOutline();
};

canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('mousemove', onMouseMove);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  controls.update();
  sceneManager.update(deltaTime);
  sceneManager.render();
}

animate();

uiManager.updateTimeLabel(12);
uiManager.updateStats(0, 0);
uiManager.updateElapsedTime(0);
