import { FlowerData } from './genetics';

const STORAGE_KEY = 'gene_garden_progress';

export interface SaveData {
  unlockedFlowers: string[];
  flowerDetails: Record<string, FlowerData>;
  timestamp: number;
}

export function saveProgress(unlocked: FlowerData[]): void {
  const startTime = performance.now();
  
  const data: SaveData = {
    unlockedFlowers: unlocked.map(f => f.id),
    flowerDetails: unlocked.reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {} as Record<string, FlowerData>),
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[Storage] 保存失败:', e);
  }
  
  const endTime = performance.now();
  console.log(`[Storage] 保存耗时: ${(endTime - startTime).toFixed(2)}ms`);
}

export function loadProgress(): FlowerData[] | null {
  const startTime = performance.now();
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const endTime = performance.now();
      console.log(`[Storage] 读取耗时: ${(endTime - startTime).toFixed(2)}ms (无数据)`);
      return null;
    }
    
    const data: SaveData = JSON.parse(raw);
    const flowers = data.unlockedFlowers
      .map(id => data.flowerDetails[id])
      .filter(Boolean);
    
    const endTime = performance.now();
    console.log(`[Storage] 读取耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    return flowers;
  } catch (e) {
    console.error('[Storage] 读取失败:', e);
    return null;
  }
}

export function clearProgress(): void {
  const startTime = performance.now();
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[Storage] 清除失败:', e);
  }
  
  const endTime = performance.now();
  console.log(`[Storage] 清除耗时: ${(endTime - startTime).toFixed(2)}ms`);
}

export function hasSavedProgress(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
