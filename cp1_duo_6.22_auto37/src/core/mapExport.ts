import { mapDataManager } from './mapData';

export function exportMapToJson(): void {
  const start = performance.now();
  const data = mapDataManager.getData();
  const json = JSON.stringify(data);
  const elapsed = performance.now() - start;

  if (elapsed > 100) {
    console.warn(`Map export took ${elapsed.toFixed(1)}ms (target <100ms)`);
  }

  const timestamp = Date.now();
  const filename = `map_export_${timestamp}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
