import * as THREE from 'three';
import gsap from 'gsap';
import { getSceneManager } from './scene';
import { LightObject } from './roomLoader';
import { SceneManager } from './scene';

export interface LightUpdateParams {
  color?: string;
  intensity?: number;
  temperature?: number;
  duration?: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

class LightManager {
  private lights: Map<string, LightObject> = new Map();
  private selectedLights: Set<string> = new Set();
  private sceneManager: SceneManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private pulseAnimationId: number = 0;

  constructor() {
    this.sceneManager = getSceneManager();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  public setLights(lightObjects: LightObject[]): void {
    this.clearAll();
    lightObjects.forEach(lightObj => {
      this.lights.set(lightObj.id, lightObj);
    });
  }

  public getAllLights(): LightObject[] {
    return Array.from(this.lights.values());
  }

  public getLight(id: string): LightObject | undefined {
    return this.lights.get(id);
  }

  public getSelectedLights(): LightObject[] {
    const selected: LightObject[] = [];
    this.selectedLights.forEach(id => {
      const light = this.lights.get(id);
      if (light) {
        selected.push(light);
      }
    });
    return selected;
  }

  public getSelectedLightIds(): string[] {
    return Array.from(this.selectedLights);
  }

  public selectLight(id: string, multiSelect: boolean = false): void {
    if (!this.lights.has(id)) return;

    if (!multiSelect) {
      this.clearSelection();
    }

    if (!this.selectedLights.has(id)) {
      this.selectedLights.add(id);
      const lightObj = this.lights.get(id);
      if (lightObj && lightObj.helper) {
        lightObj.helper.visible = true;
        this.startPulseAnimation(lightObj.helper);
      }
    }
  }

  public deselectLight(id: string): void {
    this.selectedLights.delete(id);
    const lightObj = this.lights.get(id);
    if (lightObj && lightObj.helper) {
      lightObj.helper.visible = false;
    }
  }

  public clearSelection(): void {
    this.selectedLights.forEach(id => {
      const lightObj = this.lights.get(id);
      if (lightObj && lightObj.helper) {
        lightObj.helper.visible = false;
      }
    });
    this.selectedLights.clear();
  }

  public selectAll(): void {
    this.lights.forEach((lightObj, id) => {
      this.selectedLights.add(id);
      if (lightObj.helper) {
        lightObj.helper.visible = true;
        this.startPulseAnimation(lightObj.helper);
      }
    });
  }

  public selectLightsInBox(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): string[] {
    const container = this.sceneManager.container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);

    const selectedIds: string[] = [];

    this.lights.forEach((lightObj, id) => {
      const screenPos = this.worldToScreen(lightObj.mesh.position);
      if (screenPos) {
        const x = (screenPos.x * 0.5 + 0.5) * width;
        const y = (-screenPos.y * 0.5 + 0.5) * height;
        
        if (x >= left && x <= right && y >= top && y <= bottom) {
          if (!this.selectedLights.has(id)) {
            this.selectedLights.add(id);
            if (lightObj.helper) {
              lightObj.helper.visible = true;
              this.startPulseAnimation(lightObj.helper);
            }
          }
          selectedIds.push(id);
        }
      }
    });

    return selectedIds;
  }

  private worldToScreen(position: THREE.Vector3): THREE.Vector2 | null {
    const camera = this.sceneManager.camera;
    const vector = position.clone().project(camera);
    
    if (vector.z > 1 || vector.z < -1) {
      return null;
    }
    
    return new THREE.Vector2(vector.x, vector.y);
  }

  private startPulseAnimation(helper: THREE.Mesh): void {
    const material = helper.material as THREE.MeshBasicMaterial;
    
    gsap.to(material, {
      opacity: 0.2,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    const scale = { value: 1 };
    gsap.to(scale, {
      value: 1.3,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      onUpdate: () => {
        helper.scale.setScalar(scale.value);
      }
    });
  }

  public updateLight(id: string, params: LightUpdateParams): void {
    const lightObj = this.lights.get(id);
    if (!lightObj) return;

    const duration = params.duration !== undefined ? params.duration : 0.6;

    if (params.color !== undefined) {
      const targetColor = new THREE.Color(params.color);
      
      gsap.to(lightObj.light.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration,
        ease: 'power2.out'
      });

      lightObj.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            gsap.to(mat.emissive, {
              r: targetColor.r,
              g: targetColor.g,
              b: targetColor.b,
              duration,
              ease: 'power2.out'
            });
          }
        }
      });

      lightObj.color = params.color;
    }

    if (params.intensity !== undefined) {
      gsap.to(lightObj.light, {
        intensity: params.intensity,
        duration,
        ease: 'power2.out'
      });

      lightObj.intensity = params.intensity;
    }

    if (params.temperature !== undefined) {
      const tempColor = this.temperatureToColor(params.temperature);
      const targetColor = new THREE.Color(tempColor);

      gsap.to(lightObj.light.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration,
        ease: 'power2.out'
      });

      lightObj.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            gsap.to(mat.emissive, {
              r: targetColor.r,
              g: targetColor.g,
              b: targetColor.b,
              duration,
              ease: 'power2.out'
            });
          }
        }
      });

      lightObj.temperature = params.temperature;
      lightObj.color = tempColor;
    }
  }

  public updateSelectedLights(params: LightUpdateParams): void {
    this.selectedLights.forEach(id => {
      this.updateLight(id, params);
    });
  }

  public batchUpdate(updates: Map<string, LightUpdateParams>): void {
    updates.forEach((params, id) => {
      this.updateLight(id, params);
    });
  }

  public updateAllLights(params: LightUpdateParams): void {
    this.lights.forEach((_, id) => {
      this.updateLight(id, params);
    });
  }

  public temperatureToColor(temperature: number): string {
    const temp = temperature / 100;
    let red: number, green: number, blue: number;

    if (temp <= 66) {
      red = 255;
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
      
      if (temp <= 19) {
        blue = 0;
      } else {
        blue = temp - 10;
        blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      }
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
      
      blue = 255;
    }

    red = Math.max(0, Math.min(255, red));
    green = Math.max(0, Math.min(255, green));
    blue = Math.max(0, Math.min(255, blue));

    return `#${Math.round(red).toString(16).padStart(2, '0')}${Math.round(green).toString(16).padStart(2, '0')}${Math.round(blue).toString(16).padStart(2, '0')}`;
  }

  public hslToHex(h: number, s: number, l: number): string {
    const color = new THREE.Color().setHSL(h / 360, s / 100, l / 100);
    return `#${color.getHexString()}`;
  }

  public hexToHsl(hex: string): HSLColor {
    const color = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    return {
      h: hsl.h * 360,
      s: hsl.s * 100,
      l: hsl.l * 100
    };
  }

  public getLightConfig(): Record<string, { color: string; intensity: number; temperature: number }> {
    const config: Record<string, { color: string; intensity: number; temperature: number }> = {};
    
    this.lights.forEach((lightObj, id) => {
      config[id] = {
        color: lightObj.color,
        intensity: lightObj.intensity,
        temperature: lightObj.temperature
      };
    });

    return config;
  }

  public applyConfig(config: Record<string, { color?: string; intensity?: number; temperature?: number }>, duration: number = 1.0): void {
    Object.entries(config).forEach(([id, params]) => {
      if (this.lights.has(id)) {
        this.updateLight(id, { ...params, duration });
      }
    });
  }

  public clearAll(): void {
    this.clearSelection();
    this.lights.clear();
  }

  public pickLight(clientX: number, clientY: number): LightObject | null {
    const container = this.sceneManager.container;
    const rect = container.getBoundingClientRect();
    
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const meshes: THREE.Object3D[] = [];
    this.lights.forEach(lightObj => {
      meshes.push(lightObj.mesh);
    });

    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj) {
        if (obj.userData && obj.userData.lightId) {
          return this.lights.get(obj.userData.lightId) || null;
        }
        obj = obj.parent;
      }
    }

    return null;
  }

  public playAmbientFlash(duration: number = 0.5): void {
    const originalIntensity = this.sceneManager.getAmbientIntensity();
    
    gsap.timeline()
      .to({}, {
        duration: duration * 0.3,
        onUpdate: function() {
          const progress = this.progress();
          const intensity = originalIntensity + progress * 0.3;
          getSceneManager().setAmbientIntensity(intensity);
        }
      })
      .to({}, {
        duration: duration * 0.7,
        onUpdate: function() {
          const progress = this.progress();
          const intensity = originalIntensity + 0.3 - progress * 0.3;
          getSceneManager().setAmbientIntensity(intensity);
        },
        onComplete: () => {
          getSceneManager().setAmbientIntensity(originalIntensity);
        }
      });
  }
}

let lightManagerInstance: LightManager | null = null;

export function getLightManager(): LightManager {
  if (!lightManagerInstance) {
    lightManagerInstance = new LightManager();
  }
  return lightManagerInstance;
}

export { LightManager };
