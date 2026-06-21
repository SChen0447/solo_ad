import * as THREE from 'three';
import { AudioEngine, InstrumentType } from './core/AudioEngine';
import { Scene3D } from './core/Scene3D';
import { ControlPanel } from './ui/ControlPanel';
import { InstrumentManager } from './ui/InstrumentManager';

const INSTRUMENT_TYPES: InstrumentType[] = ['violin', 'cello', 'flute', 'trumpet', 'piano', 'timpani'];

class App {
  private audioEngine: AudioEngine = new AudioEngine();
  private scene3D: Scene3D = new Scene3D();
  private controlPanel: ControlPanel = new ControlPanel();
  private instrumentManager: InstrumentManager = new InstrumentManager();
  
  private canvasContainer: HTMLElement | null = null;
  private animationFrameId: number | null = null;
  private lastHeatmapUpdate: number = 0;
  
  async init(): Promise<void> {
    this.canvasContainer = document.getElementById('canvas-container');
    if (!this.canvasContainer) {
      throw new Error('Canvas container not found');
    }
    
    await this.audioEngine.init();
    this.scene3D.init(this.canvasContainer);
    
    this.controlPanel.init(document.body, this.audioEngine, this.scene3D);
    this.instrumentManager.init(this.canvasContainer, this.audioEngine, this.scene3D);
    
    this.setupCallbacks();
    this.addInstruments();
    
    this.isInitialized = true;
    
    document.addEventListener('click', () => {
      this.audioEngine.resume();
    }, { once: true });
    
    this.hideLoadingScreen();
    this.startAnimationLoop();
    
    console.log('🚀 空间音频虚拟乐器合奏模拟器已启动');
  }
  
  private setupCallbacks(): void {
    this.controlPanel.setOnResetCallback(() => {
      this.resetInstruments();
    });
    
    this.instrumentManager.setOnStageClickListener((position: THREE.Vector3) => {
      this.scene3D.moveListener(position);
      this.audioEngine.setListenerPosition(position, true);
      this.audioEngine.playClickSound();
    });
    
    this.instrumentManager.setOnInstrumentPlacedCallback(() => {
      this.audioEngine.playClickSound();
    });
  }
  
  private addInstruments(): void {
    const positions = this.scene3D.getRandomInstrumentPositions();
    
    INSTRUMENT_TYPES.forEach((type, index) => {
      const config = this.audioEngine.getInstrumentConfig(type);
      const position = positions[type] || new THREE.Vector3(
        (index - 2.5) * 2,
        0.5,
        0
      );
      
      this.audioEngine.addInstrument(type, type, position);
      this.scene3D.addInstrument(type, type, position, config.color);
      
      setTimeout(() => {
        this.audioEngine.playNote(type);
      }, 500 + index * 200);
    });
  }
  
  private resetInstruments(): void {
    INSTRUMENT_TYPES.forEach((type) => {
      this.audioEngine.stopNote(type);
    });
    
    this.scene3D.clearHeatmap();
    
    const positions = this.scene3D.getRandomInstrumentPositions();
    
    INSTRUMENT_TYPES.forEach((type, index) => {
      const position = positions[type];
      if (position) {
        const delay = index * 80;
        this.scene3D.moveInstrument(type, position, true, delay, () => {
          const currentPos = this.scene3D.getInstrumentPosition(type);
          if (currentPos) {
            this.audioEngine.updatePosition(type, currentPos);
          }
        });
        
        setTimeout(() => {
          this.audioEngine.playNote(type);
        }, 800 + index * 100);
      }
    });
    
    const centerPosition = new THREE.Vector3(0, 0.5, 0);
    this.scene3D.moveListener(centerPosition);
    this.audioEngine.setListenerPosition(centerPosition, true);
  }
  
  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      this.scene3D.render();
      
      const now = performance.now();
      if (now - this.lastHeatmapUpdate >= 33) {
        this.scene3D.updateHeatmap((point: THREE.Vector3) => {
          return this.audioEngine.getVolumeAtPoint(point);
        });
        this.lastHeatmapUpdate = now;
      }
    };
    
    animate();
  }
  
  private hideLoadingScreen(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => {
        loading.remove();
      }, 500);
    }
  }
  
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.audioEngine.destroy();
    this.scene3D.destroy();
    this.controlPanel.destroy();
    this.instrumentManager.destroy();
  }
}

const app = new App();

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await app.init();
  } catch (error) {
    console.error('初始化失败:', error);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.textContent = '初始化失败，请刷新页面重试';
      loading.style.color = '#e94560';
    }
  }
});

window.addEventListener('beforeunload', () => {
  app.destroy();
});
