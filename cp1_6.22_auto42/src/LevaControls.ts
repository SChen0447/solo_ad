import { useControls } from 'leva';

export interface PlantParams {
  lightDirection: number;
  growthSpeed: number;
  maxDepth: number;
  branchAngle: number;
  trunkColor: string;
  leafColor: string;
}

export const defaultParams: PlantParams = {
  lightDirection: 180,
  growthSpeed: 1.0,
  maxDepth: 4,
  branchAngle: 30,
  trunkColor: '#8B4513',
  leafColor: '#228B22'
};

export function useLevaControls() {
  return useControls({
    '光照方向': {
      value: defaultParams.lightDirection,
      min: 0,
      max: 360,
      step: 1,
      label: '光照方向'
    },
    '生长速度': {
      value: defaultParams.growthSpeed,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: '生长速度'
    },
    '最大分支深度': {
      value: defaultParams.maxDepth,
      min: 1,
      max: 6,
      step: 1,
      label: '最大分支深度'
    },
    '分支角度': {
      value: defaultParams.branchAngle,
      min: 15,
      max: 60,
      step: 1,
      label: '分支角度'
    },
    '树干颜色': {
      value: defaultParams.trunkColor,
      label: '树干颜色'
    },
    '树叶颜色': {
      value: defaultParams.leafColor,
      label: '树叶颜色'
    }
  });
}
