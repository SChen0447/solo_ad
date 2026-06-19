import * as THREE from 'three';

export type GeometryType = 'box' | 'cylinder' | 'sphere' | 'torus' | 'cone' | 'extrude';

export interface GeometryParams {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  radialSegments?: number;
  heightSegments?: number;
  tube?: number;
  tubularSegments?: number;
  arc?: number;
}

export interface MaterialConfig {
  color: string;
  metalness: number;
  roughness: number;
}

export interface GeometryConfig {
  type: GeometryType;
  params: GeometryParams;
  material: MaterialConfig;
}

export interface Annotation {
  id: string;
  title: string;
  content: string;
  position: { x: number; y: number; z: number };
}

export interface ExplosionPart {
  id: string;
  name: string;
  offset: { x: number; y: number; z: number };
  geometry: GeometryConfig;
}

export interface Relic {
  id: string;
  name: string;
  dynasty: string;
  origin: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  description: string;
  icon: string;
  geometry: GeometryConfig;
  annotations: Annotation[];
  explosionParts?: ExplosionPart[];
}

export type ViewMode = 'free' | 'focus' | 'explosion';

export interface AppState {
  currentRelicId: string;
  viewMode: ViewMode;
  viewHistory: string[];
  isFirstVisit: boolean;
}

export interface RelicObject {
  group: THREE.Group;
  mainMesh: THREE.Mesh;
  parts: THREE.Mesh[];
  halo: THREE.Mesh;
  annotationMarkers: THREE.Mesh[];
}

export type EventCallback = (...args: unknown[]) => void;

export interface EventBusEvents {
  RELIC_SELECTED: { relicId: string };
  VIEW_MODE_CHANGED: { mode: ViewMode };
  ANNOTATION_HOVER: { annotationId: string };
  ANNOTATION_CLICKED: { annotationId: string };
  CAMERA_POSITION_UPDATED: { position: THREE.Vector3; target: THREE.Vector3 };
  LOAD_PROGRESS: { progress: number };
  LOAD_COMPLETE: void;
}
