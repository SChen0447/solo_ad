import { create } from 'zustand';
import * as THREE from 'three';

export interface BranchNode {
  position: THREE.Vector3;
  id: string;
  connections: string[];
}

export interface Stalactite {
  position: THREE.Vector3;
  length: number;
  radius: number;
}

export interface Stalagmite {
  position: THREE.Vector3;
  height: number;
  radius: number;
}

export interface CaveData {
  tunnelMeshes: THREE.BufferGeometry[];
  branchNodes: BranchNode[];
  stalactites: Stalactite[];
  stalagmites: Stalagmite[];
  tunnelPaths: THREE.Vector3[][];
}

export interface SliceData {
  contourPoints: THREE.Vector2[];
  densityMap: number[];
  width: number;
  height: number;
  origin: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface Particle {
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

interface CaveStore {
  complexity: number;
  branchDensity: number;
  stalactiteDensity: number;
  caveData: CaveData | null;
  isGenerating: boolean;
  generationProgress: number;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  isFlying: boolean;
  flyTarget: BranchNode | null;
  particles: Particle[];
  sliceData: SliceData | null;
  isSliceMode: boolean;
  sliceLineStart: THREE.Vector3 | null;
  sliceLineEnd: THREE.Vector3 | null;
  fps: number;
  wallProximity: number;
  panelCollapsed: boolean;

  setComplexity: (v: number) => void;
  setBranchDensity: (v: number) => void;
  setStalactiteDensity: (v: number) => void;
  setCaveData: (data: CaveData | null) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerationProgress: (v: number) => void;
  setCameraPosition: (v: THREE.Vector3) => void;
  setCameraTarget: (v: THREE.Vector3) => void;
  setIsFlying: (v: boolean) => void;
  setFlyTarget: (node: BranchNode | null) => void;
  addParticles: (p: Particle[]) => void;
  updateParticles: (dt: number) => void;
  setSliceData: (data: SliceData | null) => void;
  setIsSliceMode: (v: boolean) => void;
  setSliceLineStart: (v: THREE.Vector3 | null) => void;
  setSliceLineEnd: (v: THREE.Vector3 | null) => void;
  setFps: (v: number) => void;
  setWallProximity: (v: number) => void;
  setPanelCollapsed: (v: boolean) => void;
  generateCave: () => void;
}

export const useCaveStore = create<CaveStore>((set, get) => ({
  complexity: 5,
  branchDensity: 5,
  stalactiteDensity: 50,
  caveData: null,
  isGenerating: false,
  generationProgress: 0,
  cameraPosition: new THREE.Vector3(0, 50, 50),
  cameraTarget: new THREE.Vector3(0, 0, 0),
  isFlying: false,
  flyTarget: null,
  particles: [],
  sliceData: null,
  isSliceMode: false,
  sliceLineStart: null,
  sliceLineEnd: null,
  fps: 0,
  wallProximity: 0,
  panelCollapsed: false,

  setComplexity: (v) => set({ complexity: v }),
  setBranchDensity: (v) => set({ branchDensity: v }),
  setStalactiteDensity: (v) => set({ stalactiteDensity: v }),
  setCaveData: (data) => set({ caveData: data }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationProgress: (v) => set({ generationProgress: v }),
  setCameraPosition: (v) => set({ cameraPosition: v }),
  setCameraTarget: (v) => set({ cameraTarget: v }),
  setIsFlying: (v) => set({ isFlying: v }),
  setFlyTarget: (node) => set({ flyTarget: node }),
  addParticles: (p) => set((s) => ({ particles: [...s.particles, ...p] })),
  updateParticles: (dt) =>
    set((s) => ({
      particles: s.particles
        .map((p) => ({
          ...p,
          position: p.position.clone().add(p.velocity.clone().multiplyScalar(dt)),
          life: p.life - dt,
        }))
        .filter((p) => p.life > 0),
    })),
  setSliceData: (data) => set({ sliceData: data }),
  setIsSliceMode: (v) => set({ isSliceMode: v }),
  setSliceLineStart: (v) => set({ sliceLineStart: v }),
  setSliceLineEnd: (v) => set({ sliceLineEnd: v }),
  setFps: (v) => set({ fps: v }),
  setWallProximity: (v) => set({ wallProximity: v }),
  setPanelCollapsed: (v) => set({ panelCollapsed: v }),
  generateCave: () => {
    set({ isGenerating: true, generationProgress: 0 });
  },
}));
