import * as THREE from 'three';
import gsap from 'gsap';
import { GeologyLoader } from './data/GeologyLoader';
import { GeologyLayer } from './data/GeologyInterfaces';
import { SceneManager } from './renderer/SceneManager';
import { CrossSection } from './renderer/CrossSection';
import { SidePanel } from './ui/SidePanel';

const container = document.getElementById('canvas-container') as HTMLElement;
if (!container) {
  throw new Error('canvas-container 元素未找到');
}

const appContainer = document.getElementById('app') as HTMLElement;

const loader = new GeologyLoader();
const geologyData = loader.loadSync();

const sceneManager = new SceneManager(container);
sceneManager.buildFromData(geologyData);
sceneManager.start();

const crossSection = new CrossSection(geologyData, sceneManager);

const sidePanel = new SidePanel(appContainer || document.body, {
  onDepthInput: (depth: number) => {
    crossSection.updatePlane(depth);
  },
  onDepthChange: (depth: number) => {
    const result = crossSection.applyDepth(depth);
    sidePanel.updateLayerList(result);
  },
  onResetView: () => {
    const { startPos, startTarget, endPos, endTarget } = sceneManager.resetCamera();

    const camObj = {
      px: startPos.x,
      py: startPos.y,
      pz: startPos.z,
      tx: startTarget.x,
      ty: startTarget.y,
      tz: startTarget.z
    };

    gsap.to(camObj, {
      px: endPos.x,
      py: endPos.y,
      pz: endPos.z,
      tx: endTarget.x,
      ty: endTarget.y,
      tz: endTarget.z,
      duration: 1.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        const pos = new THREE.Vector3(camObj.px, camObj.py, camObj.pz);
        const tgt = new THREE.Vector3(camObj.tx, camObj.ty, camObj.tz);
        sceneManager.applyCameraState(pos, tgt);
      }
    });
  }
});

sidePanel.setLayers(geologyData.layers);
sidePanel.setMaxDepth(crossSection.getMaxDepth());

const initialDepth = Math.round(crossSection.getMaxDepth() * 0.4);
sidePanel.setInitialDepth(initialDepth);
const initResult = crossSection.applyDepth(initialDepth);
sidePanel.updateLayerList(initResult);

sceneManager.setOnLayerClick((layer: GeologyLayer, screenPos: { x: number; y: number }) => {
  sidePanel.showPopup(
    layer.name,
    layer.color,
    `${layer.topDepth}m ~ ${layer.bottomDepth}m`,
    `${layer.density} kg/m³`,
    layer.era,
    screenPos
  );
});

document.addEventListener('pointerdown', (e) => {
  if (!sidePanel.isPopupVisible()) return;
  const target = e.target as HTMLElement;
  if (sidePanel.isClickInsidePopup(target)) return;
  if (target.tagName === 'CANVAS') return;
  if (target.closest('.geology-reset-btn')) return;
  if (target.closest('.geology-side-panel')) return;
  sidePanel.hidePopup();
  sceneManager.clearHighlight();
});
