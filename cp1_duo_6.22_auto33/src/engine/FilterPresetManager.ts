import { FilterPreset, BUILTIN_PRESETS, STORAGE_KEY } from '@/types';
import { eventBus } from '@/utils/EventBus';
import { filterEngine } from './FilterEngine';

class FilterPresetManager {
  private presets: FilterPreset[] = [];

  constructor() {
    this.loadPresets();
  }

  private loadPresets(): void {
    const builtInWithIds: FilterPreset[] = BUILTIN_PRESETS.map((preset, index) => ({
      ...preset,
      id: `builtin_${index}`,
      createdAt: Date.now(),
      order: index,
      thumbnail: filterEngine.generateThumbnail(preset.params),
    }));

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customPresets: FilterPreset[] = JSON.parse(stored);
        customPresets.forEach((p, index) => {
          p.order = BUILTIN_PRESETS.length + index;
          if (!p.thumbnail) {
            p.thumbnail = filterEngine.generateThumbnail(p.params);
          }
        });
        this.presets = [...builtInWithIds, ...customPresets];
      } else {
        this.presets = builtInWithIds;
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
      this.presets = builtInWithIds;
    }

    this.sortPresets();
  }

  private saveCustomPresets(): void {
    const customPresets = this.presets.filter((p) => !p.isBuiltIn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  }

  private sortPresets(): void {
    this.presets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  getAllPresets(): FilterPreset[] {
    return [...this.presets];
  }

  getPresetById(id: string): FilterPreset | undefined {
    return this.presets.find((p) => p.id === id);
  }

  validateName(name: string): { valid: boolean; error?: string } {
    const trimmed = name.trim();
    
    if (trimmed.length < 3 || trimmed.length > 20) {
      return { valid: false, error: '名称长度需在3-20字符之间' };
    }

    const exists = this.presets.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { valid: false, error: '该名称已存在，请使用其他名称' };
    }

    return { valid: true };
  }

  savePreset(name: string, params: FilterPreset['params']): FilterPreset | null {
    const validation = this.validateName(name);
    if (!validation.valid) {
      console.error(validation.error);
      return null;
    }

    const newPreset: FilterPreset = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      params: { ...params },
      isBuiltIn: false,
      createdAt: Date.now(),
      order: this.presets.length,
      thumbnail: filterEngine.generateThumbnail(params),
    };

    this.presets.push(newPreset);
    this.saveCustomPresets();
    this.sortPresets();
    
    eventBus.emit('PRESETS_UPDATED', this.getAllPresets());
    eventBus.emit('PRESET_SAVED', newPreset);
    
    return newPreset;
  }

  deletePreset(id: string): boolean {
    const preset = this.presets.find((p) => p.id === id);
    if (!preset) {
      return false;
    }

    if (preset.isBuiltIn) {
      console.error('Cannot delete built-in preset');
      return false;
    }

    this.presets = this.presets.filter((p) => p.id !== id);
    this.saveCustomPresets();
    
    eventBus.emit('PRESETS_UPDATED', this.getAllPresets());
    eventBus.emit('PRESET_DELETED', id);
    
    return true;
  }

  reorderPresets(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.presets.length) return;
    if (toIndex < 0 || toIndex >= this.presets.length) return;

    const [removed] = this.presets.splice(fromIndex, 1);
    this.presets.splice(toIndex, 0, removed);

    this.presets.forEach((preset, index) => {
      preset.order = index;
    });

    this.saveCustomPresets();
    eventBus.emit('PRESETS_UPDATED', this.getAllPresets());
  }
}

export const filterPresetManager = new FilterPresetManager();
