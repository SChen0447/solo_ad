import { SceneManager } from './scene/SceneManager';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

root.style.position = 'relative';
root.style.width = '100%';
root.style.height = '100%';

const sceneManager = new SceneManager(root);

sceneManager.setOnParamsChange((params) => {
  sceneManager.regenerateTerrain(params);
});

sceneManager.start();
