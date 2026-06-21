import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { UIManager } from './UIManager';
import { cardSystem } from './CardSystem';
import { gameEngine } from './GameEngine';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let uiManager: UIManager;
let animationId: number;
let lastTime = 0;

const clock = new THREE.Clock();

function init(): void {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    console.error('Canvas container not found');
    return;
  }

  const uiContainer = document.getElementById('ui-container');
  if (!uiContainer) {
    console.error('UI container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 20, 50);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 8, 12);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  canvasContainer.appendChild(renderer.domElement);

  setupLighting();
  create3DBattlefield();

  uiManager = new UIManager(uiContainer, scene, camera, renderer);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('beforeunload', dispose);

  console.log('🎮 卡牌连击模拟器已启动');
  console.log('📋 预设卡牌:', cardSystem.getAllCards().length + '张');
  console.log('✨ 预设连击规则:', cardSystem.getAllComboRules().length + '个');

  animate(0);
}

function setupLighting(): void {
  const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(5, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -15;
  mainLight.shadow.camera.right = 15;
  mainLight.shadow.camera.top = 15;
  mainLight.shadow.camera.bottom = -15;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.4);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xff6b6b, 0.3);
  rimLight.position.set(0, 5, -10);
  scene.add(rimLight);

  const pointLight1 = new THREE.PointLight(0x00d4ff, 0.5, 20);
  pointLight1.position.set(-8, 3, 0);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xff6b6b, 0.5, 20);
  pointLight2.position.set(8, 3, 0);
  scene.add(pointLight2);
}

function create3DBattlefield(): void {
  const groundGeometry = new THREE.PlaneGeometry(30, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x16213e,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(30, 30, 0x00d4ff44, 0x00d4ff11);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const platformGeometry = new THREE.BoxGeometry(8, 0.3, 5);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a3e,
    roughness: 0.6,
    metalness: 0.4,
  });

  const enemyPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
  enemyPlatform.position.set(0, 0.15, -4);
  enemyPlatform.castShadow = true;
  enemyPlatform.receiveShadow = true;
  scene.add(enemyPlatform);

  const playerPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
  playerPlatform.position.set(0, 0.15, 4);
  playerPlatform.castShadow = true;
  playerPlatform.receiveShadow = true;
  scene.add(playerPlatform);

  const edgeGeometry = new THREE.EdgesGeometry(platformGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00d4ff, linewidth: 2 });
  
  const enemyEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  enemyEdges.position.copy(enemyPlatform.position);
  scene.add(enemyEdges);

  const playerEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  playerEdges.position.copy(playerPlatform.position);
  scene.add(playerEdges);

  const centerMarkerGeometry = new THREE.TorusGeometry(1.5, 0.05, 16, 50);
  const centerMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const centerMarker = new THREE.Mesh(centerMarkerGeometry, centerMarkerMaterial);
  centerMarker.rotation.x = -Math.PI / 2;
  centerMarker.position.y = 0.02;
  scene.add(centerMarker);

  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 40;
    positions[i + 1] = Math.random() * 15;
    positions[i + 2] = (Math.random() - 0.5) * 30;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0x00d4ff,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  particles.userData.isFloatingParticles = true;
  scene.add(particles);

  createDecorativePillars();
}

function createDecorativePillars(): void {
  const pillarPositions = [
    { x: -12, z: -6 },
    { x: 12, z: -6 },
    { x: -12, z: 6 },
    { x: 12, z: 6 },
  ];

  const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a4e,
    roughness: 0.5,
    metalness: 0.5,
  });

  pillarPositions.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.set(pos.x, 2, pos.z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    const runeLight = new THREE.PointLight(0x00d4ff, 0.3, 5);
    runeLight.position.set(pos.x, 4.2, pos.z);
    scene.add(runeLight);

    const topOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff })
    );
    topOrb.position.set(pos.x, 4.2, pos.z);
    scene.add(topOrb);
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time: number): void {
  animationId = requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  TWEEN.update(time);

  scene.traverse((object) => {
    if (object.userData.isFloatingParticles) {
      const positions = object.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.005;
        if (positions[i] > 15) positions[i] = 0;
      }
      object.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (uiManager) {
    uiManager.update(deltaTime);
  }

  lastTime = time;
  renderer.render(scene, camera);
}

function dispose(): void {
  cancelAnimationFrame(animationId);
  
  if (uiManager) {
    uiManager.dispose();
  }

  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('beforeunload', dispose);

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach(m => m.dispose());
      } else {
        object.material.dispose();
      }
    }
  });

  renderer.dispose();
  console.log('♻️ 资源已清理');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { scene, camera, renderer, gameEngine, cardSystem };
