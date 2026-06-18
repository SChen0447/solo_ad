import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '@/core/EventBus';

export interface TreeData {
  id: string;
  position: { x: number; y: number; z: number };
  initialAge: number;
  initialHeight: number;
  initialCrownRadius: number;
  growthRate: number;
  currentHeight: number;
  currentCrownRadius: number;
  animationState: 'growing' | 'idle' | 'shrinking' | 'removing';
  animationProgress: number;
}

export interface BuildingData {
  id: string;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  depth: number;
}

interface VegetationState {
  trees: TreeData[];
  buildings: BuildingData[];
  currentYear: number;
  transparency: number;
  selectedTreeId: string | null;
  showConfirmDialog: boolean;

  addTree: (x: number, z: number) => void;
  removeTree: (id: string, animate?: boolean) => void;
  selectTree: (id: string | null) => void;
  setYear: (year: number) => void;
  setTransparency: (value: number) => void;
  updateTreeDimensions: (
    id: string,
    height: number,
    crownRadius: number
  ) => void;
  setTreeAnimationState: (
    id: string,
    state: TreeData['animationState'],
    progress?: number
  ) => void;