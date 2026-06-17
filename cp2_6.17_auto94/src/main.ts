import { parseText, type SceneObject, type SceneData } from './textParser';
import {
  init as initScene,
  buildScene,
  reshuffle,
  setOnObjectSelect,
  updateObjectColor,
  updateObjectPosition,
  dispose as disposeScene
} from './sceneBuilder';
import {
  initUI,
  updateSelectedObject,
  showLoading,
  hideLoading,
  getCurrentText
} from './uiManager';

let currentSceneData: SceneData | null = null;

async function handleGenerate(text: string): Promise<void> {
  const startTime = performance.now();

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    const sceneData = parseText(text);
    currentSceneData = sceneData;

    await buildScene(sceneData);

    const elapsed = performance.now() - startTime;
    console.log(`场景生成完成，耗时: ${elapsed.toFixed(2)}ms`);
    console.log(`物体数量: ${sceneData.objects.length}`);
  } catch (error) {
    console.error('场景生成失败:', error);
  } finally {
    hideLoading();
    updateSelectedObject(null);
  }
}

function handleReshuffle(): void {
  reshuffle();
}

function handleColorChange(id: string, color: string): void {
  updateObjectColor(id, color);
}

function handlePositionChange(id: string, position: { x: number; y: number; z: number }): void {
  updateObjectPosition(id, position);
}

function handleObjectSelect(obj: SceneObject | null): void {
  updateSelectedObject(obj);
}

function init(): void {
  const sceneContainer = document.getElementById('sceneContainer');
  if (!sceneContainer) {
    console.error('找不到场景容器元素');
    return;
  }

  initScene(sceneContainer);

  initUI({
    onGenerate: handleGenerate,
    onReshuffle: handleReshuffle,
    onColorChange: handleColorChange,
    onPositionChange: handlePositionChange
  });

  setOnObjectSelect(handleObjectSelect);

  const defaultText = getCurrentText();
  if (defaultText) {
    showLoading();
    handleGenerate(defaultText);
  }

  window.addEventListener('beforeunload', () => {
    disposeScene();
  });
}

document.addEventListener('DOMContentLoaded', init);
