import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CurveSurface, PanelMesh } from './CurveSurface';
import { LightController } from './LightController';
import { PanelController } from './PanelController';
import GUI from 'lil-gui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let curveSurface: CurveSurface;
let lightController: LightController;
let panelController: PanelController;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let isDraggingControlPoint: boolean = false;
let draggedPointIndex: number | null = null;
let gui: GUI;

const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = 0;

function init(): void {
    const container = document.getElementById('scene-container');
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(10, 8, 15);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI * 0.9;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    lightController = new LightController(scene, renderer);

    curveSurface = new CurveSurface(scene);
    curveSurface.setEnvMap(lightController.getEnvMap());

    panelController = new PanelController(curveSurface, lightController, camera);

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -4;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(20, 20, 0x4488ff, 0x222233);
    gridHelper.position.y = -3.99;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

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

function setupEventListeners(): void {
    window.addEventListener('resize', onWindowResize);

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);

    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);

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

function onMouseDown(event: MouseEvent): void {
    updateMouse(event);
    raycaster.setFromCamera(mouse, camera);

    const controlPoints = curveSurface.getControlPointMeshes();
    const intersects = raycaster.intersectObjects(controlPoints);

    if (intersects.length > 0) {
        isDraggingControlPoint = true;
        draggedPointIndex = intersects[0].object.userData.index;
        controls.enabled = false;
        panelController.setMinimapInteracting(true);
        document.body.style.cursor = 'grabbing';
    }
}

function onMouseMove(event: MouseEvent): void {
    updateMouse(event);

    if (isDraggingControlPoint && draggedPointIndex !== null) {
        raycaster.setFromCamera(mouse, camera);

        const point = curveSurface.getControlPointMeshes()[draggedPointIndex];
        if (point) {
            const planeNormal = new THREE.Vector3(0, 1, 0);
            const planePoint = point.position.clone();
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                planeNormal,
                planePoint
            );

            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, intersectPoint);

            if (intersectPoint) {
                curveSurface.updateControlPoint(
                    draggedPointIndex,
                    intersectPoint.x,
                    intersectPoint.y,
                    intersectPoint.z
                );
                panelController.updateControlPointDisplay();
            }
        }
    } else {
        raycaster.setFromCamera(mouse, camera);
        const controlPoints = curveSurface.getControlPointMeshes();
        const intersects = raycaster.intersectObjects(controlPoints);

        if (intersects.length > 0) {
            document.body.style.cursor = 'grab';
        } else {
            const panels = curveSurface.getPanelMeshes();
            const panelIntersects = raycaster.intersectObjects(panels);
            if (panelIntersects.length > 0) {
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        }
    }
}

function onMouseUp(): void {
    if (isDraggingControlPoint) {
        isDraggingControlPoint = false;
        draggedPointIndex = null;
        controls.enabled = true;
        panelController.setMinimapInteracting(false);
        document.body.style.cursor = 'default';
    }
}

function onClick(event: MouseEvent): void {
    if (isDraggingControlPoint) return;

    updateMouse(event);
    raycaster.setFromCamera(mouse, camera);

    const panels = curveSurface.getPanelMeshes();
    const intersects = raycaster.intersectObjects(panels);

    if (intersects.length > 0) {
        const mesh = intersects[0].object as PanelMesh;
        const multiSelect = event.ctrlKey || event.metaKey;
        panelController.selectPanel(mesh.panelIndex, multiSelect);
    }
}

function onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        updateMouse(touch);
        raycaster.setFromCamera(mouse, camera);

        const controlPoints = curveSurface.getControlPointMeshes();
        const intersects = raycaster.intersectObjects(controlPoints);

        if (intersects.length > 0) {
            isDraggingControlPoint = true;
            draggedPointIndex = intersects[0].object.userData.index;
            controls.enabled = false;
            panelController.setMinimapInteracting(true);
        }
    }
}

function onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && isDraggingControlPoint) {
        event.preventDefault();
        const touch = event.touches[0];
        updateMouse(touch);

        if (draggedPointIndex !== null) {
            raycaster.setFromCamera(mouse, camera);

            const point = curveSurface.getControlPointMeshes()[draggedPointIndex];
            if (point) {
                const planeNormal = new THREE.Vector3(0, 1, 0);
                const planePoint = point.position.clone();
                const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                    planeNormal,
                    planePoint
                );

                const intersectPoint = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, intersectPoint);

                if (intersectPoint) {
                    curveSurface.updateControlPoint(
                        draggedPointIndex,
                        intersectPoint.x,
                        intersectPoint.y,
                        intersectPoint.z
                    );
                    panelController.updateControlPointDisplay();
                }
            }
        }
    }
}

function onTouchEnd(): void {
    if (isDraggingControlPoint) {
        isDraggingControlPoint = false;
        draggedPointIndex = null;
        controls.enabled = true;
        panelController.setMinimapInteracting(false);
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
    gui = new GUI({ title: '调试面板', width: 200 });
    gui.close();

    const surfaceFolder = gui.addFolder('曲面参数');
    surfaceFolder.add({ U细分: 18 }, 'U细分', 5, 40, 1).name('U细分').listen();
    surfaceFolder.add({ V细分: 22 }, 'V细分', 5, 40, 1).name('V细分').listen();

    const debugFolder = gui.addFolder('调试');
    debugFolder.add({ '显示网格': true }, '显示网格').onChange((value: boolean) => {
        curveSurface.getPanelMeshes().forEach(mesh => {
            mesh.material.wireframe = !value;
        });
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

    const delta = clock.getDelta();

    controls.update();
    lightController.update();

    if (frameCount % 5 === 0) {
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
