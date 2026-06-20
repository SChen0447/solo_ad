import {
  EnvironmentParams,
  PlantInstance,
  PlantType,
  PlantStructure,
  generatePlantStructure,
  computePlantHeight,
  computeEnvScoreForPlant,
} from './plantEngine';

export type SceneId = 'rainforest' | 'temperate' | 'desert';

export interface ScenePreset {
  id: SceneId;
  name: string;
  groundColor: string;
  defaultEnv: EnvironmentParams;
  plantDistribution: Record<PlantType, number>;
  targetCount: number;
}

export const SCENE_PRESETS: Record<SceneId, ScenePreset> = {
  rainforest: {
    id: 'rainforest',
    name: '热带雨林',
    groundColor: '#4a7c59',
    defaultEnv: {
      light: 1.2,
      moisture: 85,
      temperature: 28,
    },
    plantDistribution: {
      tree: 0.5,
      shrub: 0.3,
      grass: 0.2,
    },
    targetCount: 180,
  },
  temperate: {
    id: 'temperate',
    name: '温带森林',
    groundColor: '#8b6b4a',
    defaultEnv: {
      light: 0.9,
      moisture: 55,
      temperature: 18,
    },
    plantDistribution: {
      tree: 0.35,
      shrub: 0.4,
      grass: 0.25,
    },
    targetCount: 120,
  },
  desert: {
    id: 'desert',
    name: '荒漠',
    groundColor: '#d4b896',
    defaultEnv: {
      light: 1.4,
      moisture: 15,
      temperature: 35,
    },
    plantDistribution: {
      tree: 0.1,
      shrub: 0.35,
      grass: 0.55,
    },
    targetCount: 60,
  },
};

export function getScenePreset(id: SceneId): ScenePreset {
  return SCENE_PRESETS[id];
}

export interface LoadSceneResult {
  preset: ScenePreset;
  env: EnvironmentParams;
  distribution: Record<PlantType, number>;
  targetCount: number;
}

export function loadScene(id: SceneId): LoadSceneResult {
  const preset = getScenePreset(id);
  return {
    preset,
    env: { ...preset.defaultEnv },
    distribution: { ...preset.plantDistribution },
    targetCount: preset.targetCount,
  };
}

export interface ExportPlantRecord {
  id: string;
  type: PlantType;
  position: [number, number, number];
  scale: number;
  height: number;
  branchLevels: number;
  envScore: number;
  params: {
    branchAngle: number;
    internodeLength: number;
    leafCount: number;
    recursionDepth: number;
  };
}

export interface ExportData {
  exportTime: string;
  exportVersion: string;
  sceneType: SceneId;
  sceneName: string;
  environment: EnvironmentParams;
  totalPlants: number;
  plants: ExportPlantRecord[];
  stats: {
    byType: Record<PlantType, number>;
    avgHeight: number;
    avgEnvScore: number;
    totalArea: number;
  };
}

export function exportData(
  sceneId: SceneId,
  env: EnvironmentParams,
  plants: PlantInstance[],
  growthFrames: number
): ExportData {
  const byType: Record<PlantType, number> = { tree: 0, shrub: 0, grass: 0 };
  let totalHeight = 0;
  let totalScore = 0;

  const structureCache = new Map<string, PlantStructure>();

  const records: ExportPlantRecord[] = plants.map((p) => {
    byType[p.type]++;

    const cacheKey = `${p.type}_${p.params.recursionDepth}_${p.params.branchAngle.toFixed(1)}`;
    let structure = structureCache.get(cacheKey);
    if (!structure) {
      structure = generatePlantStructure(p.type, p.params);
      structureCache.set(cacheKey, structure);
    }

    const height = computePlantHeight(structure, p.scale, growthFrames);
    const score = computeEnvScoreForPlant(p, env);

    totalHeight += height;
    totalScore += score;

    return {
      id: p.id,
      type: p.type,
      position: [...p.position] as [number, number, number],
      scale: Number(p.scale.toFixed(3)),
      height: Number(height.toFixed(3)),
      branchLevels: structure.branchLevels,
      envScore: Number(score.toFixed(3)),
      params: {
        branchAngle: Number(p.params.branchAngle.toFixed(2)),
        internodeLength: Number(p.params.internodeLength.toFixed(3)),
        leafCount: p.params.leafCount,
        recursionDepth: p.params.recursionDepth,
      },
    };
  });

  const validCount = records.length || 1;

  return {
    exportTime: new Date().toISOString(),
    exportVersion: '1.0.0',
    sceneType: sceneId,
    sceneName: SCENE_PRESETS[sceneId].name,
    environment: { ...env },
    totalPlants: records.length,
    plants: records,
    stats: {
      byType,
      avgHeight: Number((totalHeight / validCount).toFixed(3)),
      avgEnvScore: Number((totalScore / validCount).toFixed(3)),
      totalArea: 2500,
    },
  };
}

export function downloadJSON(data: ExportData, filename?: string): void {
  const name =
    filename ||
    `plant_community_${data.sceneType}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.style.display = 'none';
    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('[dataManager] Failed to download JSON:', err);
    throw err;
  }
}

export function hexToThreeColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

export function lerpColorHex(hexA: string, hexB: string, t: number): string {
  const a = hexToThreeColor(hexA);
  const b = hexToThreeColor(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t * 255);
  const g = Math.round(a[1] + (b[1] - a[1]) * t * 255);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}
