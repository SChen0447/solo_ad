import { create } from 'zustand';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { PoemData, POEMS, getRandomPoem } from './poemData';

export interface Particle {
  id: string;
  poemId: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  size: number;
  baseSize: number;
  phase: number;
  opacity: number;
  isExploding: boolean;
  explosionTime: number;
  normal: THREE.Vector3;
}

export interface PoemGroup {
  id: string;
  poemData: PoemData;
  particles: Particle[];
  centerPosition: THREE.Vector3;
  targetCenterPosition: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: number;
  isHighlighted: boolean;
  highlightTime: number;
  isFusing: boolean;
  fuseProgress: number;
}

export interface OrbitingParticle {
  id: string;
  position: THREE.Vector3;
  color: THREE.Color;
  radius: number;
  angle: number;
  speed: number;
  inclination: number;
}

export interface ConnectionLine {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
}

export interface CoreSphere {
  rotation: THREE.Euler;
  rotationSpeed: number;
}

interface AppState {
  poemGroups: PoemGroup[];
  isDrawing: boolean;
  currentPath: THREE.Vector3[];
  drawCount: number;
  selectedPoemId: string | null;
  showScroll: boolean;
  scrollPoem: PoemData | null;
  isFusing: boolean;
  coreSphere: CoreSphere | null;
  orbitingParticles: OrbitingParticle[];
  connectionLines: ConnectionLine[];
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  recentPoemIds: string[];
  audioPlaying: boolean;

  startDrawing: (point: THREE.Vector3) => void;
  addDrawPoint: (point: THREE.Vector3) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  addPoemGroup: (path: THREE.Vector3[]) => void;
  removeAllPoems: () => void;
  selectParticle: (poemId: string) => void;
  hideScroll: () => void;
  resetCamera: () => void;
  updatePoemGroup: (id: string, updates: Partial<PoemGroup>) => void;
  triggerFusion: (poemIds: string[]) => void;
  updateFusionProgress: (progress: number) => void;
  completeFusion: () => void;
  setAudioPlaying: (playing: boolean) => void;
  initializeDefaultPoems: () => void;
}

const WARM_COLORS = ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];

function generateRandomPosition(radius: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = radius * (0.7 + Math.random() * 0.3);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function createParticlesForPoem(
  poemData: PoemData,
  center: THREE.Vector3,
  path?: THREE.Vector3[]
): Particle[] {
  const particles: Particle[] = [];
  const colorPool = WARM_COLORS.map(c => new THREE.Color(c));
  
  poemData.particlePositions.forEach((pos, index) => {
    const targetPos = new THREE.Vector3(
      center.x + pos.x * 2,
      center.y + pos.y * 2,
      center.z
    );
    
    let startPos: THREE.Vector3;
    let normal: THREE.Vector3;
    
    if (path && path.length > 1) {
      const pathIndex = Math.min(Math.floor((index / poemData.particleCount) * path.length), path.length - 1);
      startPos = path[pathIndex].clone();
      
      const prevIndex = Math.max(0, pathIndex - 1);
      const nextIndex = Math.min(path.length - 1, pathIndex + 1);
      const tangent = new THREE.Vector3()
        .subVectors(path[nextIndex], path[prevIndex])
        .normalize();
      normal = new THREE.Vector3(-tangent.y, tangent.x, tangent.z).normalize();
      if (Math.random() > 0.5) normal.negate();
    } else {
      startPos = targetPos.clone();
      normal = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
    }
    
    const speed = 0.5 + Math.random() * 1.5;
    const velocity = normal.clone().multiplyScalar(speed);
    
    const baseSize = 0.2 + Math.random() * 0.4;
    const color = colorPool[Math.floor(Math.random() * colorPool.length)];
    
    particles.push({
      id: uuidv4(),
      poemId: poemData.id,
      position: startPos,
      targetPosition: targetPos,
      velocity,
      color: color.clone(),
      baseColor: color.clone(),
      size: baseSize,
      baseSize,
      phase: Math.random() * Math.PI * 2,
      opacity: 1,
      isExploding: !!path,
      explosionTime: 0,
      normal
    });
  });
  
  return particles;
}

function createPoemGroup(poemData: PoemData, path?: THREE.Vector3[]): PoemGroup {
  const center = path && path.length > 0
    ? path[Math.floor(path.length / 2)].clone()
    : generateRandomPosition(6);
  
  return {
    id: poemData.id,
    poemData,
    particles: createParticlesForPoem(poemData, center, path),
    centerPosition: center.clone(),
    targetCenterPosition: center.clone(),
    rotation: new THREE.Euler(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    ),
    rotationSpeed: 0.05,
    isHighlighted: false,
    highlightTime: 0,
    isFusing: false,
    fuseProgress: 0
  };
}

export const useStore = create<AppState>((set, get) => ({
  poemGroups: [],
  isDrawing: false,
  currentPath: [],
  drawCount: 0,
  selectedPoemId: null,
  showScroll: false,
  scrollPoem: null,
  isFusing: false,
  coreSphere: null,
  orbitingParticles: [],
  connectionLines: [],
  cameraPosition: new THREE.Vector3(0, 0, 12),
  cameraTarget: new THREE.Vector3(0, 0, 0),
  recentPoemIds: [],
  audioPlaying: false,

  startDrawing: (point: THREE.Vector3) => {
    set({ isDrawing: true, currentPath: [point.clone()] });
  },

  addDrawPoint: (point: THREE.Vector3) => {
    const { isDrawing, currentPath } = get();
    if (!isDrawing) return;
    
    const lastPoint = currentPath[currentPath.length - 1];
    if (lastPoint && point.distanceTo(lastPoint) > 0.05) {
      set({ currentPath: [...currentPath, point.clone()] });
    }
  },

  finishDrawing: () => {
    const { currentPath, drawCount, recentPoemIds } = get();
    if (currentPath.length < 3) {
      set({ isDrawing: false, currentPath: [] });
      return;
    }
    
    const newPoemData = getRandomPoem();
    const newPoemGroup = createPoemGroup(newPoemData, currentPath);
    
    const newRecentIds = [...recentPoemIds, newPoemData.id].slice(-3);
    const newDrawCount = drawCount + 1;
    
    set({
      poemGroups: [...get().poemGroups, newPoemGroup],
      isDrawing: false,
      currentPath: [],
      drawCount: newDrawCount,
      recentPoemIds: newRecentIds
    });
    
    if (newDrawCount > 0 && newDrawCount % 3 === 0 && newRecentIds.length === 3) {
      setTimeout(() => {
        get().triggerFusion(newRecentIds);
      }, 1000);
    }
  },

  cancelDrawing: () => {
    set({ isDrawing: false, currentPath: [] });
  },

  addPoemGroup: (path: THREE.Vector3[]) => {
    const poemData = getRandomPoem();
    const group = createPoemGroup(poemData, path);
    set(state => ({ poemGroups: [...state.poemGroups, group] }));
  },

  removeAllPoems: () => {
    set({
      poemGroups: [],
      drawCount: 0,
      recentPoemIds: [],
      coreSphere: null,
      orbitingParticles: [],
      connectionLines: [],
      isFusing: false,
      showScroll: false,
      scrollPoem: null,
      selectedPoemId: null
    });
    get().initializeDefaultPoems();
  },

  selectParticle: (poemId: string) => {
    const { poemGroups } = get();
    const group = poemGroups.find(g => g.id === poemId);
    if (!group) return;
    
    set(state => ({
      poemGroups: state.poemGroups.map(g => ({
        ...g,
        isHighlighted: g.id === poemId,
        highlightTime: g.id === poemId ? 2 : g.highlightTime
      })),
      selectedPoemId: poemId,
      showScroll: true,
      scrollPoem: group.poemData
    }));
    
    setTimeout(() => {
      set(state => ({
        poemGroups: state.poemGroups.map(g => ({
          ...g,
          isHighlighted: false,
          highlightTime: 0
        })),
        selectedPoemId: null
      }));
    }, 2000);
  },

  hideScroll: () => {
    set({ showScroll: false });
  },

  resetCamera: () => {
    set({
      cameraPosition: new THREE.Vector3(0, 0, 12),
      cameraTarget: new THREE.Vector3(0, 0, 0)
    });
  },

  updatePoemGroup: (id: string, updates: Partial<PoemGroup>) => {
    set(state => ({
      poemGroups: state.poemGroups.map(g =>
        g.id === id ? { ...g, ...updates } : g
      )
    }));
  },

  triggerFusion: (poemIds: string[]) => {
    const { poemGroups } = get();
    const fusingGroups = poemGroups.filter(g => poemIds.includes(g.id));
    
    if (fusingGroups.length < 3) return;
    
    fusingGroups.forEach(group => {
      group.targetCenterPosition = new THREE.Vector3(0, 0, 0);
      group.isFusing = true;
    });
    
    set({
      isFusing: true,
      poemGroups: poemGroups.map(g =>
        poemIds.includes(g.id)
          ? { ...g, isFusing: true, targetCenterPosition: new THREE.Vector3(0, 0, 0) }
          : g
      )
    });
  },

  updateFusionProgress: (progress: number) => {
    const { poemGroups, isFusing } = get();
    if (!isFusing) return;
    
    const lines: ConnectionLine[] = [];
    const fusingParticles: Particle[] = [];
    
    poemGroups.forEach(group => {
      if (group.isFusing) {
        fusingParticles.push(...group.particles);
      }
    });
    
    for (let i = 0; i < fusingParticles.length; i++) {
      for (let j = i + 1; j < fusingParticles.length; j++) {
        const dist = fusingParticles[i].position.distanceTo(fusingParticles[j].position);
        if (dist < 1.2) {
          const color = fusingParticles[i].color.clone()
            .lerp(fusingParticles[j].color, 0.5);
          lines.push({
            start: fusingParticles[i].position,
            end: fusingParticles[j].position,
            color,
            opacity: 0.3
          });
        }
      }
    }
    
    set({ connectionLines: lines });
  },

  completeFusion: () => {
    const { poemGroups } = get();
    const fusingGroups = poemGroups.filter(g => g.isFusing);
    
    const orbiting: OrbitingParticle[] = [];
    for (let i = 0; i < 26; i++) {
      const group = fusingGroups[i % fusingGroups.length];
      orbiting.push({
        id: uuidv4(),
        position: new THREE.Vector3(),
        color: new THREE.Color(group.poemData.primaryColor),
        radius: 1.5 + Math.random() * 1.5,
        angle: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.2,
        inclination: (Math.random() - 0.5) * Math.PI
      });
    }
    
    set({
      isFusing: false,
      coreSphere: {
        rotation: new THREE.Euler(0, 0, 0),
        rotationSpeed: 0.02
      },
      orbitingParticles: orbiting,
      connectionLines: [],
      poemGroups: poemGroups.map(g => ({
        ...g,
        isFusing: false,
        fuseProgress: 1
      }))
    });
  },

  setAudioPlaying: (playing: boolean) => {
    set({ audioPlaying: playing });
  },

  initializeDefaultPoems: () => {
    const defaultGroups: PoemGroup[] = POEMS.map(poem => createPoemGroup(poem));
    set({ poemGroups: defaultGroups });
  }
}));
