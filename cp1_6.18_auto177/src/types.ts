import * as THREE from 'three';

export interface GalleryWall {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  size: THREE.Vector2;
  color: string;
}

export interface Artwork {
  id: string;
  index: number;
  title: string;
  textureDataUrl?: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export interface CursorState {
  isHovering: boolean;
  hoveredArtworkId: string | null;
  isDragging: boolean;
}

export interface CameraState {
  distance: number;
  theta: number;
  phi: number;
  targetDistance: number;
  targetTheta: number;
  targetPhi: number;
  velocityTheta: number;
  velocityPhi: number;
}

export interface GalleryStore {
  artworks: Artwork[];
  selectedArtworkId: string | null;
  cursorState: CursorState;
  cameraState: CameraState;
  ringRotation: number;
  selectArtwork: (id: string | null) => void;
  setHoveredArtwork: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  updateCamera: (updates: Partial<CameraState>) => void;
  setRingRotation: (rotation: number) => void;
}

export interface RippleEffect {
  id: string;
  artworkId: string;
  startTime: number;
}
