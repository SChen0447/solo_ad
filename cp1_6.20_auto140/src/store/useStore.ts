import { create } from 'zustand';
import type { SpeciesData, StageName } from '@/utils/plantGrowth';

interface EnvironmentState {
  light: number;
  water: number;
  nutrient: number;
}

interface PlantStore {
  species: SpeciesData | null;
  speciesList: SpeciesData[];
  currentStage: StageName;
  stageIndex: number;
  stageProgress: number;
  overallProgress: number;
  isComplete: boolean;
  environment: EnvironmentState;
  setSpecies: (species: SpeciesData) => void;
  setSpeciesList: (list: SpeciesData[]) => void;
  setGrowthState: (state: { currentStage: StageName; stageIndex: number; stageProgress: number; overallProgress: number; isComplete: boolean }) => void;
  setEnvironment: (env: Partial<EnvironmentState>) => void;
}

export const usePlantStore = create<PlantStore>((set) => ({
  species: null,
  speciesList: [],
  currentStage: 'seed' as StageName,
  stageIndex: 0,
  stageProgress: 0,
  overallProgress: 0,
  isComplete: false,
  environment: {
    light: 60,
    water: 50,
    nutrient: 40,
  },
  setSpecies: (species) => set({ species, currentStage: 'seed' as StageName, stageIndex: 0, stageProgress: 0, overallProgress: 0, isComplete: false }),
  setSpeciesList: (speciesList) => set({ speciesList }),
  setGrowthState: (state) => set(state),
  setEnvironment: (env) => set((s) => ({ environment: { ...s.environment, ...env } })),
}));
