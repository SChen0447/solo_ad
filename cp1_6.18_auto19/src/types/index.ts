import * as THREE from 'three';

export interface BuildingData {
  id: string;
  x: number;
  z: number;
  floorHeight: number;
  floorCount: number;
  facadeColor: string;
  cornerRadius: number;
  width: number;
  depth: number;
  windowType: 'grid' | 'floor';
  rotation: number;
}

export interface SceneParams {
  streetWidth: number;
  floorHeight: number;
  floorCount: number;
  facadeColor: string;
  cornerRadius: number;
  skylineOffset: number;
  weatherPreset: 'sunny' | 'cloudy' | 'dusk';
}

export interface WeatherPreset {
  name: string;
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  shadowSoftness: number;
  sunPosition: [number, number, number];
}

export interface OcclusionResult {
  buildingId: string;
  occlusionRate: number;
  intersectionPoints: THREE.Vector3[];
}

export interface SkylinePoint {
  x: number;
  height: number;
  buildingId: string;
}

export interface PresetFile {
  version: '1.0';
  sceneParams: SceneParams;
  buildings: BuildingData[];
}
