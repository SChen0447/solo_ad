import { create } from 'zustand';
import type {
  DataNebulaState,
  Particle,
  FieldInfo,
  MappingConfig,
  FilterRange,
  Filters
} from '@/types';
import { parseJSONData, generateSampleData, createInitialParticles } from '@/utils/dataLoader';
import { calculateParticleProperties } from '@/utils/particleSystem';

const defaultMapping: MappingConfig = {
  xAxis: '',
  yAxis: '',
  zAxis: '',
  colorField: '',
  sizeField: '',
  colorScheme: 'viridis',
  sizeRange: [0.5, 3.0],
  positionRange: [-18, 18]
};

const defaultFilters: Filters = {};

const initialState = {
  particles: [] as Particle[],
  fields: [] as FieldInfo[],
  datasetName: '示例数据集',
  mapping: { ...defaultMapping },
  filters: { ...defaultFilters },
  ui: {
    panelCollapsed: false,
    selectedParticleId: null,
    isEntryAnimating: true,
    cameraResetTrigger: 0,
    transitionDuration: 0.5
  }
};

export const useNebulaStore = create<DataNebulaState>((set, get) => ({
  ...initialState,

  loadJSON: (json: any[], name = '自定义数据集') => {
    const { fields, numericFields } = parseJSONData(json);
    
    const mapping = { ...defaultMapping };
    if (numericFields.length >= 1) mapping.xAxis = numericFields[0].name;
    if (numericFields.length >= 2) mapping.yAxis = numericFields[1].name;
    if (numericFields.length >= 3) mapping.zAxis = numericFields[2].name;
    if (numericFields.length >= 4) mapping.colorField = numericFields[3].name;
    if (numericFields.length >= 5) mapping.sizeField = numericFields[4].name;
    else if (numericFields.length >= 1) mapping.sizeField = numericFields[0].name;

    const filters: Filters = {};
    numericFields.forEach(f => {
      if (f.min !== undefined && f.max !== undefined) {
        filters[f.name] = { min: f.min, max: f.max };
      }
    });

    const baseParticles = createInitialParticles(json, fields);
    const particles = calculateParticleProperties(baseParticles, fields, mapping, filters);

    set({
      particles,
      fields,
      datasetName: name,
      mapping,
      filters,
      ui: { ...get().ui, isEntryAnimating: true, selectedParticleId: null }
    });
  },

  loadSampleData: () => {
    const sampleData = generateSampleData(1200);
    get().loadJSON(sampleData, '示例星云数据集');
  },

  setMapping: (partial: Partial<MappingConfig>) => {
    const { mapping, particles, fields, filters } = get();
    const newMapping = { ...mapping, ...partial };
    const updatedParticles = calculateParticleProperties(particles, fields, newMapping, filters);
    set({ mapping: newMapping, particles: updatedParticles });
  },

  setFilter: (field: string, range: FilterRange) => {
    const { filters, particles, fields, mapping } = get();
    const newFilters = { ...filters, [field]: range };
    const updatedParticles = calculateParticleProperties(particles, fields, mapping, newFilters);
    set({ filters: newFilters, particles: updatedParticles });
  },

  resetFilters: () => {
    const { fields, particles, mapping } = get();
    const newFilters: Filters = {};
    fields.forEach(f => {
      if (f.type === 'numeric' && f.min !== undefined && f.max !== undefined) {
        newFilters[f.name] = { min: f.min, max: f.max };
      }
    });
    const updatedParticles = calculateParticleProperties(particles, fields, mapping, newFilters);
    set({ filters: newFilters, particles: updatedParticles });
  },

  selectParticle: (id: string | null) => {
    const { particles } = get();
    const updated = particles.map(p => ({
      ...p,
      isSelected: p.id === id
    }));
    set({
      particles: updated,
      ui: { ...get().ui, selectedParticleId: id }
    });
  },

  togglePanel: () => {
    set({ ui: { ...get().ui, panelCollapsed: !get().ui.panelCollapsed } });
  },

  triggerCameraReset: () => {
    set({ ui: { ...get().ui, cameraResetTrigger: get().ui.cameraResetTrigger + 1 } });
  },

  recalculateParticles: () => {
    const { particles, fields, mapping, filters } = get();
    const updated = calculateParticleProperties(particles, fields, mapping, filters);
    set({ particles: updated });
  }
}));
