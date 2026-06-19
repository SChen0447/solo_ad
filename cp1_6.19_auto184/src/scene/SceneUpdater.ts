import { AudioEngine } from 'src/audio/AudioEngine';
import { SceneManager } from 'src/scene/SceneManager';
import { GeometryGroup, GeometryUpdateData, VisualizerMode, ColorTheme } from 'src/scene/GeometryGroup';

export class SceneUpdater {
  private audioEngine: AudioEngine;
  private sceneManager: SceneManager;
  private geometryGroup: GeometryGroup;
  private startTime: number;
  private isRunning: boolean;
  private currentVisualizerObject: THREE.Object3D | null = null;

  constructor(
    audioEngine: AudioEngine,
    sceneManager: SceneManager,
    geometryGroup: GeometryGroup
  ) {
    this.audioEngine = audioEngine;
    this.sceneManager = sceneManager;
    this.geometryGroup = geometryGroup;
    this.startTime = performance.now();
    this.isRunning = false;

    this.addGeometryToScene();
    this.setupAnimationCallback();
  }

  private addGeometryToScene(): void {
    const obj = this.geometryGroup.getObject();
    this.currentVisualizerObject = obj;
    this.sceneManager.addToScene(obj);
  }

  private setupAnimationCallback(): void {
    this.sceneManager.setAnimationCallback(() => {
      if (this.isRunning) {
        this.update();
      }
    });
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  private update(): void {
    const time = (performance.now() - this.startTime) / 1000;
    
    const frequencyData = this.audioEngine.getFrequencyData();
    const waveformData = this.audioEngine.getWaveformData();
    const averageVolume = this.audioEngine.getAverageVolume();
    const bassVolume = this.audioEngine.getBassVolume();
    const midVolume = this.audioEngine.getMidVolume();
    const trebleVolume = this.audioEngine.getTrebleVolume();

    const updateData: GeometryUpdateData = {
      frequencyData,
      waveformData,
      averageVolume,
      bassVolume,
      midVolume,
      trebleVolume,
      time
    };

    this.geometryGroup.update(updateData);
  }

  setMode(mode: VisualizerMode): void {
    if (this.currentVisualizerObject) {
      this.sceneManager.removeFromScene(this.currentVisualizerObject);
    }
    
    this.geometryGroup.setMode(mode);
    
    const obj = this.geometryGroup.getObject();
    this.currentVisualizerObject = obj;
    this.sceneManager.addToScene(obj);
  }

  setColorTheme(theme: ColorTheme): void {
    this.geometryGroup.setColorTheme(theme);
  }

  getCurrentMode(): VisualizerMode {
    return this.geometryGroup.getMode();
  }

  getCurrentTheme(): ColorTheme {
    return this.geometryGroup.getColorTheme();
  }

  dispose(): void {
    this.stop();
    if (this.currentVisualizerObject) {
      this.sceneManager.removeFromScene(this.currentVisualizerObject);
    }
    this.geometryGroup.dispose();
  }
}
