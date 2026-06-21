export type MaterialCategory = 'wood' | 'stone' | 'fabric' | 'metal' | 'glass' | 'default';

export interface MaterialConfig {
  id: string;
  name: string;
  category: MaterialCategory;
  color: string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
}

export interface AreaConfig {
  id: string;
  name: string;
  defaultMaterialId: string;
}

export interface SnapshotData {
  before: string;
  after: string;
  areaId: string;
  materialId: string;
  areaName: string;
  materialName: string;
}

export type AreaId = 'floor' | 'wall' | 'sofa' | 'curtain' | 'table';

export interface AreaMaterialMap {
  floor: string;
  wall: string;
  sofa: string;
  curtain: string;
  table: string;
}
