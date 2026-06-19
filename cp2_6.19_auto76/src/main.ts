import { TerrainEditor } from './TerrainEditor';

const container = document.getElementById('canvas-container');
if (!container) {
  throw new Error('Canvas container not found');
}

new TerrainEditor(container);
