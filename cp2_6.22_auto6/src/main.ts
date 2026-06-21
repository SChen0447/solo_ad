import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MOLECULES, MoleculeData } from '@/models/MoleculeData';
import { loadMolecule, MoleculeModel, AtomMesh, BondMesh } from '@/models/MoleculeLoader';
import { InfoPanel } from '@/ui/InfoPanel';
import { ForceGraph } from '@/ui/ForceGraph';

const container = document.getElementById('canvas-container')!;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d')!;
const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512);
bgGrad.addColorStop(0, '#0A0A2A');
bgGrad.addColorStop(1, '#1A1A3E');
bgCtx.fillStyle = bgGrad;
bgCtx.fillRect(0, 0, 2, 512);
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.rotateSpeed = 0.5;
controls.minDistance = 0.5;
controls.maxDistance = 5;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const light1 = new THREE.PointLight(0xffffff, 1.5, 50);
light1.position.set(5, 5, 5);
scene.add(light1);

const light2 = new THREE.PointLight(0xFFE4B5, 1.0, 50);
light2.position.set(-5, 2, -3);
scene.add(light2);

const light3 = new THREE.PointLight(0xADD8E6, 0.8, 50);
light3.position.set(3, -4, 2);
scene.add(light3);

const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
scene.add(ambientLight);

let currentModel: MoleculeModel | null = null;
let currentMoleculeKey = 'caffeine';
let isTransitioning = false;

const moleculeGroup = new THREE.Group();
scene.add(moleculeGroup);

let autoRotate = true;
let hoveredAtom: AtomMesh | null = null;
let hoveredBond: BondMesh | null = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const labelContainer = document.createElement('div');
labelContainer.style.position = 'absolute';
labelContainer.style.top = '0';
labelContainer.style.left = '0';
labelContainer.style.width = '100%';
labelContainer.style.height = '100%';
labelContainer.style.pointerEvents = 'none';
labelContainer.style.zIndex = '5';
container.appendChild(labelContainer);

const hoverLabel = document.createElement('div');
hoverLabel.style.position = 'absolute';
hoverLabel.style.display = 'none';
hoverLabel.style.fontSize = '14px';
hoverLabel.style.color = 'white';
hoverLabel.style.textShadow = '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';
hoverLabel.style.pointerEvents = 'none';
hoverLabel.style.fontWeight = 'bold';
labelContainer.appendChild(hoverLabel);

createUI();

const infoPanel = new InfoPanel('#canvas-container');
const forceGraph = new ForceGraph('#canvas-container');

forceGraph.setOnNodeClick((atomIndex: number) => {
  if (!currentModel) return;
  const mesh = currentModel.atomMeshes.find((a) => a.userData.atomIndex === atomIndex);
  if (!mesh) return;

  highlightAtom(mesh, true);

  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);
  smoothCameraMove(worldPos, 0.5);
});

function smoothCameraMove(target: THREE.Vector3, duration: number): void {
  const startPos = controls.target.clone();
  const startTime = performance.now();

  function animateCamera() {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);
    const eased = t * t * (3 - 2 * t);

    controls.target.lerpVectors(startPos, target, eased);

    if (t < 1) {
      requestAnimationFrame(animateCamera);
    }
  }
  animateCamera();
}

function highlightAtom(mesh: AtomMesh, blink: boolean): void {
  if (!currentModel) return;
  if (blink) {
    let count = 0;
    const originalColor = mesh.userData.originalColor;
    const interval = setInterval(() => {
      if (count % 2 === 0) {
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(0xFFD700);
      } else {
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
      }
      count++;
      if (count >= 4) {
        clearInterval(interval);
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
      }
    }, 300);
  }
  forceGraph.highlightNode(mesh.userData.atomIndex);
}

loadMoleculeByName('caffeine');

function loadMoleculeByName(name: string): void {
  const data = MOLECULES[name];
  if (!data) return;

  if (currentModel && !isTransitioning) {
    transitionMolecule(data, name);
  } else if (!currentModel) {
    const model = loadMolecule(data);
    currentModel = model;
    currentMoleculeKey = name;
    moleculeGroup.add(model.group);
    infoPanel.setMoleculeData(data);
    forceGraph.update(data);
    infoPanel.clear();
  }
}

function transitionMolecule(newData: MoleculeData, newKey: string): void {
  if (isTransitioning) return;
  isTransitioning = true;
  const oldModel = currentModel!;

  const fadeOutStart = performance.now();
  const fadeOutDuration = 300;

  function fadeOut() {
    const t = Math.min((performance.now() - fadeOutStart) / fadeOutDuration, 1);
    oldModel.group.scale.setScalar(1 - t * 0.5);
    (oldModel.group.children as THREE.Object3D[]).forEach((child) => {
      if ((child as any).material) {
        ((child as any).material as THREE.MeshStandardMaterial).transparent = true;
        ((child as any).material as THREE.MeshStandardMaterial).opacity = 1 - t;
      }
    });

    if (t < 1) {
      requestAnimationFrame(fadeOut);
    } else {
      moleculeGroup.remove(oldModel.group);
      disposeModel(oldModel);

      const model = loadMolecule(newData);
      currentModel = model;
      currentMoleculeKey = newKey;
      moleculeGroup.add(model.group);

      model.group.scale.setScalar(0.5);
      (model.group.children as THREE.Object3D[]).forEach((child) => {
        if ((child as any).material) {
          ((child as any).material as THREE.MeshStandardMaterial).transparent = true;
          ((child as any).material as THREE.MeshStandardMaterial).opacity = 0;
        }
      });

      const fadeInStart = performance.now();
      const fadeInDuration = 600;

      function fadeIn() {
        const t2 = Math.min((performance.now() - fadeInStart) / fadeInDuration, 1);
        const eased = t2 * t2 * (3 - 2 * t2);
        model.group.scale.setScalar(0.5 + eased * 0.5);
        (model.group.children as THREE.Object3D[]).forEach((child) => {
          if ((child as any).material) {
            ((child as any).material as THREE.MeshStandardMaterial).opacity = eased;
          }
        });

        if (t2 < 1) {
          requestAnimationFrame(fadeIn);
        } else {
          (model.group.children as THREE.Object3D[]).forEach((child) => {
            if ((child as any).material) {
              ((child as any).material as THREE.MeshStandardMaterial).transparent =
                ((child as any).material as THREE.MeshStandardMaterial).opacity < 1;
              if (!((child as any).material as THREE.MeshStandardMaterial).transparent) {
                ((child as any).material as THREE.MeshStandardMaterial).opacity = 1;
              }
            }
          });
          model.group.scale.setScalar(1);
          isTransitioning = false;
        }
      }
      fadeIn();

      infoPanel.setMoleculeData(newData);
      forceGraph.update(newData);
      infoPanel.clear();
    }
  }
  fadeOut();
}

function disposeModel(model: MoleculeModel): void {
  model.group.traverse((obj) => {
    if ((obj as any).geometry) {
      (obj as any).geometry.dispose();
    }
    if ((obj as any).material) {
      (obj as any).material.dispose();
    }
  });
}

function createUI(): void {
  const selector = document.createElement('select');
  selector.id = 'molecule-selector';
  selector.style.position = 'absolute';
  selector.style.left = '16px';
  selector.style.top = '16px';
  selector.style.width = '200px';
  selector.style.height = '40px';
  selector.style.background = '#1A1A3ECC';
  selector.style.color = 'white';
  selector.style.fontSize = '16px';
  selector.style.borderRadius = '8px';
  selector.style.border = '1px solid #333';
  selector.style.padding = '0 8px';
  selector.style.cursor = 'pointer';
  selector.style.zIndex = '10';
  selector.style.opacity = '0';
  selector.style.transition = 'opacity 0.3s ease-in-out';
  selector.style.outline = 'none';

  const options = [
    { value: 'caffeine', label: 'Caffeine (C₈H₁₀N₄O₂)' },
    { value: 'salicylic', label: 'Salicylic Acid (C₇H₆O₃)' },
    { value: 'aspirin', label: 'Aspirin (C₉H₈O₄)' },
  ];

  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    selector.appendChild(option);
  });

  selector.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val !== currentMoleculeKey) {
      loadMoleculeByName(val);
    }
  });

  container.appendChild(selector);

  requestAnimationFrame(() => {
    selector.style.opacity = '1';
  });
}

function onMouseMove(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (!currentModel) return;

  if (hoveredAtom) {
    const mat = hoveredAtom.material as THREE.MeshStandardMaterial;
    mat.color.setHex(hoveredAtom.userData.originalColor);
    hoveredAtom.scale.setScalar(1);
    hoveredAtom = null;
  }

  if (hoveredBond) {
    const bMat = hoveredBond.material as THREE.MeshStandardMaterial;
    bMat.color.setHex(hoveredBond.userData.originalColor);
    hoveredBond = null;
  }

  raycaster.setFromCamera(mouse, camera);

  const atomIntersects = raycaster.intersectObjects(currentModel.atomMeshes);
  if (atomIntersects.length > 0) {
    const mesh = atomIntersects[0].object as AtomMesh;
    hoveredAtom = mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(0xFFD700);
    mesh.scale.setScalar(1.2);

    hoverLabel.style.display = 'block';
    hoverLabel.style.left = `${event.clientX + 12}px`;
    hoverLabel.style.top = `${event.clientY - 12}px`;
    hoverLabel.textContent = mesh.userData.element;

    renderer.domElement.style.cursor = 'pointer';
    return;
  }

  const bondIntersects = raycaster.intersectObjects(currentModel.bondMeshes);
  if (bondIntersects.length > 0) {
    const mesh = bondIntersects[0].object as BondMesh;
    hoveredBond = mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(0xFFD700);

    hoverLabel.style.display = 'block';
    hoverLabel.style.left = `${event.clientX + 12}px`;
    hoverLabel.style.top = `${event.clientY - 12}px`;
    hoverLabel.textContent = `${mesh.userData.bondLength.toFixed(2)} Å`;

    renderer.domElement.style.cursor = 'pointer';
    return;
  }

  hoverLabel.style.display = 'none';
  renderer.domElement.style.cursor = 'default';
}

function onClick(_event: MouseEvent): void {
  if (!currentModel) return;

  if (hoveredAtom) {
    infoPanel.showAtomInfo(hoveredAtom);
    forceGraph.highlightNode(hoveredAtom.userData.atomIndex);
  } else if (hoveredBond) {
    infoPanel.showBondInfo(hoveredBond);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    event.preventDefault();
    autoRotate = !autoRotate;
  }
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);
window.addEventListener('keydown', onKeyDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(): void {
  requestAnimationFrame(animate);

  if (autoRotate && moleculeGroup) {
    moleculeGroup.rotation.y += 0.01;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
