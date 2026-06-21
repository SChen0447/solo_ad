export enum MaterialType {
  DIFFUSE = 'diffuse',
  SPECULAR = 'specular',
  TRANSPARENT = 'transparent',
  BUMP = 'bump'
}

export enum EnvironmentPreset {
  OUTDOOR_NOON = 'outdoor_noon',
  INDOOR_WARM = 'indoor_warm',
  FLUORESCENT = 'fluorescent',
  CANDLELIGHT = 'candlelight'
}

export interface EnvironmentConfig {
  id: EnvironmentPreset;
  name: string;
  colorTemp: number;
  colorHex: string;
  ambientColor: string;
  lightPosition: { x: number; y: number; z: number };
  lightType: 'directional' | 'point' | 'spot';
  shadowIntensity: number;
  ambientIntensity: number;
  lightIntensity: number;
  secondaryLights?: Array<{
    position: { x: number; y: number; z: number };
    color: string;
    intensity: number;
    type: 'directional' | 'point' | 'spot';
  }>;
}

export interface LightingParams {
  horizontalAngle: number;
  elevationAngle: number;
  lightIntensity: number;
  ambientIntensity: number;
}

export interface GeometryMaterials {
  sphere: MaterialType;
  cube: MaterialType;
  torusKnot: MaterialType;
}

export const ENVIRONMENT_PRESETS: Record<EnvironmentPreset, EnvironmentConfig> = {
  [EnvironmentPreset.OUTDOOR_NOON]: {
    id: EnvironmentPreset.OUTDOOR_NOON,
    name: '室外正午',
    colorTemp: 6500,
    colorHex: '#e6f3ff',
    ambientColor: '#87ceeb',
    lightPosition: { x: 5, y: 10, z: 5 },
    lightType: 'directional',
    shadowIntensity: 0.8,
    ambientIntensity: 0.6,
    lightIntensity: 2.0,
    secondaryLights: [
      {
        position: { x: -8, y: 6, z: -5 },
        color: '#b0d4f1',
        intensity: 0.4,
        type: 'directional'
      }
    ]
  },
  [EnvironmentPreset.INDOOR_WARM]: {
    id: EnvironmentPreset.INDOOR_WARM,
    name: '室内暖射灯',
    colorTemp: 3200,
    colorHex: '#ffd700',
    ambientColor: '#4a3728',
    lightPosition: { x: -6, y: 8, z: 4 },
    lightType: 'spot',
    shadowIntensity: 0.6,
    ambientIntensity: 0.3,
    lightIntensity: 2.5,
    secondaryLights: [
      {
        position: { x: 6, y: 8, z: -4 },
        color: '#ffb347',
        intensity: 1.2,
        type: 'spot'
      }
    ]
  },
  [EnvironmentPreset.FLUORESCENT]: {
    id: EnvironmentPreset.FLUORESCENT,
    name: '冷色荧光灯',
    colorTemp: 4000,
    colorHex: '#f0f8ff',
    ambientColor: '#2c3e50',
    lightPosition: { x: 0, y: 12, z: 0 },
    lightType: 'directional',
    shadowIntensity: 0.5,
    ambientIntensity: 0.7,
    lightIntensity: 1.8,
    secondaryLights: [
      {
        position: { x: -10, y: 10, z: 0 },
        color: '#c8e0f0',
        intensity: 0.8,
        type: 'point'
      },
      {
        position: { x: 10, y: 10, z: 0 },
        color: '#c8e0f0',
        intensity: 0.8,
        type: 'point'
      }
    ]
  },
  [EnvironmentPreset.CANDLELIGHT]: {
    id: EnvironmentPreset.CANDLELIGHT,
    name: '昏暗烛光',
    colorTemp: 1800,
    colorHex: '#ff6b35',
    ambientColor: '#1a0a05',
    lightPosition: { x: 0, y: 3, z: 0 },
    lightType: 'point',
    shadowIntensity: 0.9,
    ambientIntensity: 0.1,
    lightIntensity: 3.0,
    secondaryLights: [
      {
        position: { x: -3, y: 2, z: 2 },
        color: '#ff4500',
        intensity: 1.0,
        type: 'point'
      },
      {
        position: { x: 3, y: 2, z: -2 },
        color: '#ff4500',
        intensity: 1.0,
        type: 'point'
      }
    ]
  }
};

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  [MaterialType.DIFFUSE]: '漫反射',
  [MaterialType.SPECULAR]: '镜面',
  [MaterialType.TRANSPARENT]: '透明',
  [MaterialType.BUMP]: '凹凸纹理'
};
