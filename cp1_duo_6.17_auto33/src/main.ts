import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { CurveSurface } from './CurveSurface';
import { LightController } from './LightController';
import { PanelController } from './PanelController';
import GUI from 'lil-gui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let dragControls: DragControls;
let curveSurface: CurveSurface;
let lightController: LightController;
let panelController: PanelController;
let mouse: THREE.Vector2;
let gui: GUI;

const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = 0;
let isDraggingPoint = false;

function init(): void {
    const container = document.getElementById('scene-container');
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );
    camera.position.set(12, 8, 18);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.target.set(0, 0, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    curveSurface = new CurveSurface(scene);

    lightController = new LightController(scene, renderer, curveSurface);

    panelController = new PanelController(curveSurface, lightController, camera);

    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.95,
        metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(30, 30, 0x4488ff, 0x2a2a44);
    gridHelper.position.y = -4.99;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    setupDragControls();
    setupEventListeners();
    setupDebugGUI();

    const startBtn = document.getElementById('start-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    const appContainer = document.getElementById('app-container');

    if (startBtn && welcomeScreen && appContainer) {
        startBtn.addEventListener('click', () => {
            welcomeScreen.classList.add('hidden');
            appContainer.classList.add('visible');
            setTimeout(() => {
                onWindowResize();
            }, 100);
        });
    }

    animate();
}

function setupDragControls(): void {
    const controlPointMeshes = curveSurface.getControlPointMeshes();

    dragControls = new DragControls(
        controlPointMeshes,
        camera,
        renderer.domElement
    );

    dragControls.addEventListener('dragstart', (event: any) => {
        controls.enabled = false;
        isDraggingPoint = true;
        panelController.setMinimapInteracting(true);
        document.body.style.cursor = 'grabbing';

        const mesh = event.object as THREE.Mesh;
        const index = mesh.userData.index;
        if (index !== undefined) {
            panelController['selectedPointIndex'] = index;
            panelController.updateControlPointDisplay();
        }
    });

    dragControls.addEventListener('drag', (event: any) => {
        const mesh = event.object as THREE.Mesh;
        const index = mesh.userData.index;

        if (index !== undefined) {
            curveSurface.updateControlPoint(
                index,
                mesh.position.x,
                mesh.position.y,
                mesh.position.z
            );
            panelController.updateControlPointDisplay();
        }
    });

    dragControls.addEventListener('dragend', () => {
        controls.enabled = true;
        isDraggingPoint = false;
        panelController.setMinimapInteracting(false);
        document.body.style.cursor = 'default';
    });

    dragControls.addEventListener('hoveron', () => {
        if (!isDraggingPoint) {
            document.body.style.cursor = 'grab';
        }
    });

    dragControls.addEventListener('hoveroff', () => {
        if (!isDraggingPoint) {
            document.body.style.cursor = 'default';
        }
    });
}

function setupEventListeners(): void {
    window.addEventListener('resize', onWindowResize);

    renderer.domElement.addEventListener('click', onClick);

    document.addEventListener('keydown', onKeyDown);
}

function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateMouse(event: MouseEvent | Touch): void {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onClick(event: MouseEvent): void {
    if (isDraggingPoint) return;

    updateMouse(event);

    const panelIndex = curveSurface.getPanelAtScreenPosition(mouse, camera);
    if (panelIndex !== null) {
        const multiSelect = event.ctrlKey || event.metaKey;
        panelController.selectPanel(panelIndex, multiSelect);
    }
}

function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        panelController.clearSelection();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        panelController.selectAllPanels();
    }
}

function setupDebugGUI(): void {
    gui = new GUI({ title: '调试面板', width: 220 });
    gui.close();

    const surfaceFolder = gui.addFolder('曲面参数');
    const panelCount = { '面板数量': curveSurface.getPanelCount() };
    surfaceFolder.add(panelCount, '面板数量').listen().name('面板数量');

    const lightFolder = gui.addFolder('光照参数');
    const sunParams = {
        '方位角': 45,
        '高度角': 45
    };
    lightFolder.add(sunParams, '方位角', 0, 360, 1).onChange((value: number) => {
        lightController.setSunAngle(value, lightController.getSunAltitude());
    }).listen();
    lightFolder.add(sunParams, '高度角', 0, 90, 1).onChange((value: number) => {
        lightController.setSunAngle(lightController.getSunAzimuth(), value);
    }).listen();

    setInterval(() => {
        sunParams['方位角'] = Math.round(lightController.getSunAzimuth());
        sunParams['高度角'] = Math.round(lightController.getSunAltitude());
    }, 200);

    const envFolder = gui.addFolder('环境预设');
    const envParams = { '环境': 'clearSky' };
    envFolder.add(envParams, '环境', ['clearSky', 'sunset', 'cloudy']).onChange((value: string) => {
        lightController.setEnvMap(value as any);
    });

    const perfFolder = gui.addFolder('性能');
    const fpsObj = { FPS: 60 };
    perfFolder.add(fpsObj, 'FPS', 0, 120).listen();

    setInterval(() => {
        fpsObj.FPS = Math.round(frameCount / ((performance.now() - lastFpsUpdate) / 1000));
        frameCount = 0;
        lastFpsUpdate = performance.now();
    }, 500);
}

function animate(): void {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    controls.update();
    lightController.update();
    curveSurface.updateTime(elapsed);

    if (frameCount % 3 === 0) {
        panelController.updateMinimap();
    }

    renderer.render(scene, camera);

    frameCount++;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
