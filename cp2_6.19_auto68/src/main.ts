import { TerrainEditor } from './TerrainEditor';

function bootstrap(): void {
  new TerrainEditor('canvas-container');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
