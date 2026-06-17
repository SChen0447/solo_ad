export interface DepthRange {
  min: number;
  max: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface RockLayerData {
  id: string;
  name: string;
  type: string;
  gridSize: number;
  baseDepth: number;
  thickness: number;
  amplitude: number;
  frequency: number;
  colorTop: string;
  colorBottom: string;
  opacity: number;
  depthRange: DepthRange;
  density: number;
  porosity: number;
  compressiveStrength: number;
  minerals: string[];
  description: string;
}

export interface OreDimensions {
  length: number;
  width: number;
  height: number;
}

export interface OreBodyData {
  id: string;
  name: string;
  type: string;
  form: string;
  center: Vector3;
  dimensions: OreDimensions;
  rotation: Vector3;
  color: string;
  metalness: number;
  roughness: number;
  depthRange: DepthRange;
  density: number;
  reserves: number;
  grade: number;
  miningDifficulty: string;
  porosity: number;
  compressiveStrength: number;
  minerals: string[];
  description: string;
  controlPoints: Vector3[];
}

export interface GeologyData {
  rockLayers: RockLayerData[];
  oreBody: OreBodyData;
}

export interface RockLayerMeshData {
  id: string;
  data: RockLayerData;
  vertices: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
  normals: Float32Array;
}

export interface OreBodyMeshData {
  id: string;
  data: OreBodyData;
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
}
