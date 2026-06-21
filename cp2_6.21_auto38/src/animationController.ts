import * as THREE from 'three';
import { ForestScene, TreeInstance } from './forestScene';

export class AnimationController {
  private forestScene: ForestScene;
  private time: number = 0;
  private dayNightCycleTime: number = 0;
  private dayNightCycleDuration: number = 180;
  
  private duskColor: THREE.Color = new THREE.Color(0xff9800);
  private nightColor: THREE.Color = new THREE.Color(0x1a237e);
  private currentBgColor: THREE.Color = new THREE.Color(0xff9800);
  
  private sunStartPos: THREE.Vector3 = new THREE.Vector3(50, 80, 30);
  private sunEndPos: THREE.Vector3 = new THREE.Vector3(-50, 10, -30);
  
  private sunStartColor: THREE.Color = new THREE.Color(0xffcc80);
  private sunEndColor: THREE.Color = new THREE.Color(0x404080);
  
  private ambientStartColor: THREE.Color = new THREE.Color(0x404060);
  private ambientEndColor: THREE.Color = new THREE.Color(0x101020);
  
  private windStrength: number = 1.0;
  private maxWindStrength: number = 1.0;
  private minWindStrength: number = 0.3;

  constructor(forestScene: ForestScene) {
    this.forestScene = forestScene;
    this.updateDayNightCycle(0);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    this.dayNightCycleTime += deltaTime;
    
    if (this.dayNightCycleTime >= this.dayNightCycleDuration) {
      this.dayNightCycleTime = 0;
    }
    
    const t = this.dayNightCycleTime / this.dayNightCycleDuration;
    this.updateDayNightCycle(t);
    this.updateWindStrength(t);
    this.updateTreeSway(deltaTime, this.time);
  }

  private updateWindStrength(t: number): void {
    this.windStrength = this.maxWindStrength - (this.maxWindStrength - this.minWindStrength) * t;
  }

  private updateDayNightCycle(t: number): void {
    const scene = this.forestScene.getScene();
    const sunLight = this.forestScene.getSunLight();
    const ambientLight = this.forestScene.getAmbientLight();
    
    const easedT = this.easeInOutCubic(t);
    
    this.currentBgColor.copy(this.duskColor).lerp(this.nightColor, easedT);
    scene.background = this.currentBgColor;
    
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(this.currentBgColor);
      scene.fog.density = 0.015 + easedT * 0.01;
    }
    
    if (sunLight) {
      const sunPos = new THREE.Vector3().lerpVectors(this.sunStartPos, this.sunEndPos, easedT);
      sunLight.position.copy(sunPos);
      
      const sunColor = this.sunStartColor.clone().lerp(this.sunEndColor, easedT);
      sunLight.color.copy(sunColor);
      sunLight.intensity = 1.0 - easedT * 0.6;
    }
    
    if (ambientLight) {
      const ambientColor = this.ambientStartColor.clone().lerp(this.ambientEndColor, easedT);
      ambientLight.color.copy(ambientColor);
      ambientLight.intensity = 0.5 - easedT * 0.3;
    }
  }

  private updateTreeSway(deltaTime: number, time: number): void {
    const trees = this.forestScene.getTrees();
    const wind = this.windStrength;
    
    trees.forEach(tree => {
      const effectiveFrequency = tree.data.swayFrequency * wind;
      const effectiveAmplitude = tree.data.swayAmplitude * wind;
      
      const swayAngle = Math.sin(time * effectiveFrequency + tree.data.swayOffset) * effectiveAmplitude;
      const swayAngleX = Math.cos(time * effectiveFrequency * 0.7 + tree.data.swayOffset * 1.3) * effectiveAmplitude * 0.7;
      
      tree.data.group.rotation.z = swayAngle;
      tree.data.group.rotation.x = swayAngleX;
      
      this.updateBranchSway(tree, time, wind);
    });
  }

  private updateBranchSway(tree: TreeInstance, time: number, wind: number): void {
    const crown = tree.data.group.children.find(c => c.userData.isCrown);
    if (crown) {
      const effectiveFrequency = tree.data.swayFrequency * wind;
      const effectiveAmplitude = tree.data.swayAmplitude * wind;
      
      const swayX = Math.sin(time * effectiveFrequency + tree.data.swayOffset) * effectiveAmplitude * 3;
      const swayZ = Math.cos(time * effectiveFrequency * 0.8 + tree.data.swayOffset) * effectiveAmplitude * 2;
      crown.position.x = swayX;
      crown.position.z = swayZ;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getCurrentBgColor(): THREE.Color {
    return this.currentBgColor.clone();
  }

  getDayNightProgress(): number {
    return this.dayNightCycleTime / this.dayNightCycleDuration;
  }

  getTime(): number {
    return this.time;
  }

  getWindStrength(): number {
    return this.windStrength;
  }

  setDayNightCycleDuration(seconds: number): void {
    this.dayNightCycleDuration = seconds;
  }
}
