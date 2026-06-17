import { getLightManager } from '../core/lightManager';
import { SceneData } from '../api/sceneApi';
import sceneApi from '../api/sceneApi';
import { getSceneManager } from '../core/scene';

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  icon: string;
  lights: Record<string, { color: string; intensity: number; temperature: number }>;
}

class LightSceneManager {
  private presets: PresetScene[] = [];
  private savedScenes: SceneData[] = [];
  private storageKey = 'smartLighting_scenes';

  constructor() {
    this.initPresets();
    this.loadSavedScenesFromStorage();
  }

  private initPresets(): void {
    this.presets = [
      {
        id: 'warm-cozy',
        name: '温馨暖黄',
        description: '温暖舒适的暖黄色调，营造温馨的居家氛围',
        primaryColor: '#FFD700',
        secondaryColor: '#FF8C00',
        icon: '☀',
        lights: {}
      },
      {
        id: 'cool-work',
        name: '冷白工作',
        description: '明亮的冷白色光，适合专注工作和学习',
        primaryColor: '#E0F7FA',
        secondaryColor: '#00BCD4',
        icon: '💡',
        lights: {}
      },
      {
        id: 'party-colorful',
        name: '派对炫彩',
        description: '绚丽多彩的灯光效果，点燃派对热情',
        primaryColor: '#FF4081',
        secondaryColor: '#7C4DFF',
        icon: '🎉',
        lights: {}
      },
      {
        id: 'reading-focus',
        name: '阅读聚焦',
        description: '集中的阅读照明，保护眼睛提升专注度',
        primaryColor: '#FFF8E1',
        secondaryColor: '#FFB300',
        icon: '📖',
        lights: {}
      },
      {
        id: 'midnight-blue',
        name: '午夜蓝调',
        description: '深邃的蓝色调，宁静而神秘的夜间氛围',
        primaryColor: '#1A237E',
        secondaryColor: '#3F51B5',
        icon: '🌙',
        lights: {}
      },
      {
        id: 'sunset-glow',
        name: '日落余晖',
        description: '温暖的橙红色调，宛如日落时分的柔美光线',
        primaryColor: '#FF5722',
        secondaryColor: '#FF9800',
        icon: '🌅',
        lights: {}
      }
    ];
  }

  public getPresets(): PresetScene[] {
    return this.presets;
  }

  public getPresetById(id: string): PresetScene | undefined {
    return this.presets.find(p => p.id === id);
  }

  public async applyPreset(presetId: string, roomId: string): Promise<void> {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return;

    const lightManager = getLightManager();
    const allLights = lightManager.getAllLights();
    
    const lightConfig = this.generatePresetConfig(presetId, allLights);
    
    lightManager.applyConfig(lightConfig, 1.0);
    lightManager.playAmbientFlash(0.5);
  }

  private generatePresetConfig(
    presetId: string,
    lights: { id: string; type: string }[]
  ): Record<string, { color: string; intensity: number; temperature: number }> {
    const config: Record<string, { color: string; intensity: number; temperature: number }> = {};

    lights.forEach(light => {
      switch (presetId) {
        case 'warm-cozy':
          config[light.id] = {
            color: '#FFE4B5',
            intensity: this.getIntensityByType(light.type, 0.6),
            temperature: 2800
          };
          break;
        case 'cool-work':
          config[light.id] = {
            color: '#F0F8FF',
            intensity: this.getIntensityByType(light.type, 0.9),
            temperature: 5500
          };
          break;
        case 'party-colorful':
          config[light.id] = {
            color: this.getPartyColor(light.id),
            intensity: this.getIntensityByType(light.type, 0.8),
            temperature: 4500
          };
          break;
        case 'reading-focus':
          if (light.type === 'tablelamp' || light.type === 'floorlamp' || light.type === 'spotlight') {
            config[light.id] = {
              color: '#FFFACD',
              intensity: 0.85,
              temperature: 4200
            };
          } else {
            config[light.id] = {
              color: '#F5F5DC',
              intensity: 0.25,
              temperature: 3500
            };
          }
          break;
        case 'midnight-blue':
          config[light.id] = {
            color: '#4169E1',
            intensity: this.getIntensityByType(light.type, 0.25),
            temperature: 2000
          };
          break;
        case 'sunset-glow':
          config[light.id] = {
            color: '#FF8C00',
            intensity: this.getIntensityByType(light.type, 0.55),
            temperature: 2200
          };
          break;
        default:
          config[light.id] = {
            color: '#FFFFFF',
            intensity: 0.5,
            temperature: 4500
          };
      }
    });

    return config;
  }

  private getIntensityByType(type: string, baseIntensity: number): number {
    switch (type) {
      case 'chandelier':
        return baseIntensity * 1.2;
      case 'tablelamp':
        return baseIntensity * 0.8;
      case 'spotlight':
        return baseIntensity * 0.9;
      case 'ledstrip':
        return baseIntensity * 0.6;
      case 'floorlamp':
        return baseIntensity * 0.9;
      default:
        return baseIntensity;
    }
  }

  private getPartyColor(lightId: string): string {
    const colors = ['#FF4081', '#7C4DFF', '#00BCD4', '#8BC34A', '#FF9800', '#E91E63'];
    const hash = lightId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  public async saveCurrentScene(name: string, roomId: string): Promise<SceneData> {
    const lightManager = getLightManager();
    const sceneManager = getSceneManager();
    const lightConfig = lightManager.getLightConfig();
    const thumbnail = sceneManager.getScreenshot();

    const sceneData: SceneData = {
      name: name.slice(0, 20),
      roomId,
      lights: lightConfig,
      thumbnail
    };

    try {
      const savedScene = await sceneApi.createScene(sceneData);
      this.savedScenes.push(savedScene);
      this.saveScenesToStorage();
      return savedScene;
    } catch (error) {
      console.warn('Failed to save scene to server, using local storage', error);
      const localScene: SceneData = {
        ...sceneData,
        id: `local_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      this.savedScenes.push(localScene);
      this.saveScenesToStorage();
      return localScene;
    }
  }

  public async loadScene(sceneId: string): Promise<void> {
    const scene = this.savedScenes.find(s => s.id === sceneId);
    if (!scene) return;

    const lightManager = getLightManager();
    lightManager.applyConfig(scene.lights, 0.8);
    lightManager.playAmbientFlash(0.3);
  }

  public getSavedScenes(): SceneData[] {
    return this.savedScenes.filter(s => !s.roomId || s.roomId === this.getCurrentRoomId());
  }

  public getAllSavedScenes(): SceneData[] {
    return this.savedScenes;
  }

  public async deleteScene(sceneId: string): Promise<void> {
    const index = this.savedScenes.findIndex(s => s.id === sceneId);
    if (index === -1) return;

    if (!sceneId.startsWith('local_')) {
      try {
        await sceneApi.deleteScene(sceneId);
      } catch (error) {
        console.warn('Failed to delete scene from server', error);
      }
    }

    this.savedScenes.splice(index, 1);
    this.saveScenesToStorage();
  }

  private getCurrentRoomId(): string {
    try {
      const roomLoaderModule = require('../core/roomLoader');
      return roomLoaderModule.default.getCurrentRoomId();
    } catch {
      return '';
    }
  }

  private loadSavedScenesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.savedScenes = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load scenes from localStorage', error);
      this.savedScenes = [];
    }
  }

  private saveScenesToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.savedScenes));
    } catch (error) {
      console.warn('Failed to save scenes to localStorage', error);
    }
  }

  public async syncWithServer(): Promise<void> {
    try {
      const serverScenes = await sceneApi.getScenes();
      const localIds = new Set(this.savedScenes.filter(s => !s.id?.startsWith('local_')).map(s => s.id));
      
      serverScenes.forEach(serverScene => {
        if (!localIds.has(serverScene.id)) {
          this.savedScenes.push(serverScene);
        }
      });

      this.saveScenesToStorage();
    } catch (error) {
      console.warn('Failed to sync scenes with server', error);
    }
  }
}

let lightSceneManagerInstance: LightSceneManager | null = null;

export function getLightSceneManager(): LightSceneManager {
  if (!lightSceneManagerInstance) {
    lightSceneManagerInstance = new LightSceneManager();
  }
  return lightSceneManagerInstance;
}

export { LightSceneManager };
