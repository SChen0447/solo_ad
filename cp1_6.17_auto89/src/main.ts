import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import axios from 'axios';

import { ParticleSystem, ParticleParameters } from './particleSystem';
import { ParameterPanel } from './parameterPanel';

interface PresetData {
  name: string;
  icon: string;
  parameters: ParticleParameters;
  custom?: boolean;
}

interface PresetsMap {
  [key: string]: PresetData;
}

class NebulaApp {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private composer: EffectComposer | null = null;
  private particleSystem: ParticleSystem | null = null;
  private parameterPanel: ParameterPanel | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight: THREE.PointLight | null = null;
  private haloSprite: THREE.Sprite | null = null;
  
  private container: HTMLElement | null = null;
  private panelContainer: HTMLElement | null = null;
  private presetSelect: HTMLSelectElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private saveModal: HTMLElement | null = null;
  private presetNameInput: HTMLInputElement | null = null;
  private cancelSaveBtn: HTMLButtonElement | null = null;
  private confirmSaveBtn: HTMLButtonElement | null = null;
  
  private clock: THREE.Clock = new THREE.Clock();
  private animationId: number = 0;
  private currentPreset: string = 'spiral';
  private presets: PresetsMap = {};
  private backgroundColor: THREE.Color = new THREE.Color('#0a0515');
  private targetBackgroundColor: THREE.Color = new THREE.Color('#0a0515');
  private isTransitioningBackground: boolean = false;
  private backgroundTransitionStart: number = 0;
  
  private autoRotateSpeed: number = 0.3;
  
  constructor() {
    this.init();
  }
  
  private init(): void {
    this.container = document.getElementById('scene-container');
    this.panelContainer = document.getElementById('panel-container');
    this.presetSelect = document.getElementById('presetSelect') as HTMLSelectElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.saveModal = document.getElementById('save-modal') as HTMLElement;
    this.presetNameInput = document.getElementById('presetNameInput') as HTMLInputElement;
    this.cancelSaveBtn = document.getElementById('cancelSaveBtn') as HTMLButtonElement;
    this.confirmSaveBtn = document.getElementById('confirmSaveBtn') as HTMLButtonElement;
    
    if (!this.container || !this.panelContainer) {
      console.error('Required elements not found');
      return;
    }
    
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLights();
    this.initGrid();
    this.initHalo();
    this.initPostProcessing();
    this.loadPresets();
    this.initParticleSystem();
    this.initParameterPanel();
    this.initEventListeners();
    this.animate();
    
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = this.backgroundColor;
    this.scene.fog = new THREE.FogExp2('#0a0515', 0.02);
  }
  
  private initCamera(): void {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 0, 0);
  }
  
  private initRenderer(): void {
    if (!this.container) return;
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  private initControls(): void {
    if (!this.camera || !this.renderer) return;
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
  }
  
  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene?.add(this.ambientLight);
    
    this.pointLight = new THREE.PointLight(0x00d4ff, 1, 50);
    this.pointLight.position.set(0, 0, 0);
    this.scene?.add(this.pointLight);
  }
  
  private initGrid(): void {
    const gridSize = 30;
    const gridDivisions = 30;
    
    this.gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      new THREE.Color(0x333344),
      new THREE.Color(0x222233)
    );
    this.gridHelper.material.opacity = 0.15;
    this.gridHelper.material.transparent = true;
    this.scene?.add(this.gridHelper);
  }
  
  private initHalo(): void {
    const haloTexture = this.createHaloTexture();
    const haloMaterial = new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0x00d4ff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6
    });
    
    this.haloSprite = new THREE.Sprite(haloMaterial);
    this.haloSprite.scale.set(8, 8, 1);
    this.scene?.add(this.haloSprite);
  }
  
  private createHaloTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(0, 212, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(0, 100, 200, 0.4)');
    gradient.addColorStop(0.6, 'rgba(50, 0, 100, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  private initPostProcessing(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    
    const width = this.container?.clientWidth || window.innerWidth;
    const height = this.container?.clientHeight || window.innerHeight;
    
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.8,
      0.4,
      0.85
    );
    this.composer.addPass(bloomPass);
  }
  
  private loadPresets(): void {
    axios.get('http://localhost:5000/api/presets')
      .then((response) => {
        this.presets = response.data;
        this.updatePresetSelect();
      })
      .catch((error) => {
        console.warn('Failed to load presets from backend, using defaults', error);
        this.presets = {
          spiral: {
            name: '螺旋星云',
            icon: '🌀',
            parameters: {
              particleCount: 20000,
              rotationSpeed: 1.5,
              colorOffset: 0,
              noiseStrength: 0.4,
              spreadRadius: 6,
              backgroundColor: '#0a0515',
              spiralArms: 4,
              spiralTightness: 0.8,
              pulseSpeed: 0.5,
              pulseIntensity: 0.2,
              type: 'spiral'
            }
          },
          ring: {
            name: '环状星云',
            icon: '💫',
            parameters: {
              particleCount: 25000,
              rotationSpeed: 2.0,
              colorOffset: 180,
              noiseStrength: 0.2,
              spreadRadius: 7,
              backgroundColor: '#050a15',
              ringThickness: 0.3,
              ringRadius: 5,
              pulseSpeed: 0.8,
              pulseIntensity: 0.3,
              type: 'ring'
            }
          },
          diffuse: {
            name: '弥漫星云',
            icon: '🌌',
            parameters: {
              particleCount: 30000,
              rotationSpeed: 0.5,
              colorOffset: 280,
              noiseStrength: 0.8,
              spreadRadius: 8,
              backgroundColor: '#0a0a1e',
              cloudDensity: 0.6,
              pulseSpeed: 0.3,
              pulseIntensity: 0.15,
              type: 'diffuse'
            }
          }
        };
        this.updatePresetSelect();
      });
  }
  
  private updatePresetSelect(): void {
    if (!this.presetSelect) return;
    
    this.presetSelect.innerHTML = '';
    
    Object.entries(this.presets).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${preset.icon} ${preset.name}`;
      if (key === this.currentPreset) {
        option.selected = true;
      }
      this.presetSelect?.appendChild(option);
    });
  }
  
  private initParticleSystem(): void {
    if (!this.scene) return;
    
    const defaultParams: ParticleParameters = {
      particleCount: 20000,
      rotationSpeed: 1.5,
      colorOffset: 0,
      noiseStrength: 0.4,
      spreadRadius: 6,
      backgroundColor: '#0a0515',
      spiralArms: 4,
      spiralTightness: 0.8,
      pulseSpeed: 0.5,
      pulseIntensity: 0.2,
      type: 'spiral'
    };
    
    this.particleSystem = new ParticleSystem(this.scene, defaultParams);
  }
  
  private initParameterPanel(): void {
    if (!this.panelContainer) return;
    
    const defaultParams: ParticleParameters = {
      particleCount: 20000,
      rotationSpeed: 1.5,
      colorOffset: 0,
      noiseStrength: 0.4,
      spreadRadius: 6,
      backgroundColor: '#0a0515',
      pulseSpeed: 0.5,
      pulseIntensity: 0.2,
      type: 'spiral'
    };
    
    this.parameterPanel = new ParameterPanel({
      container: this.panelContainer,
      initialParameters: defaultParams,
      onParameterChange: (params) => this.onParameterChange(params)
    });
  }
  
  private initEventListeners(): void {
    this.presetSelect?.addEventListener('change', (e) => {
      const presetKey = (e.target as HTMLSelectElement).value;
      this.switchPreset(presetKey);
    });
    
    this.saveBtn?.addEventListener('click', () => {
      this.showSaveModal();
    });
    
    this.cancelSaveBtn?.addEventListener('click', () => {
      this.hideSaveModal();
    });
    
    this.confirmSaveBtn?.addEventListener('click', () => {
      this.savePreset();
    });
    
    this.saveModal?.addEventListener('click', (e) => {
      if (e.target === this.saveModal) {
        this.hideSaveModal();
      }
    });
  }
  
  private onParameterChange(params: Partial<ParticleParameters>): void {
    if (this.particleSystem?.getIsTransitioning()) return;
    
    this.particleSystem?.updateParameters(params);
    
    if (params.backgroundColor) {
      this.animateBackgroundColor(params.backgroundColor);
    }
  }
  
  private switchPreset(presetKey: string): void {
    if (!this.presets[presetKey] || !this.particleSystem) return;
    
    if (this.particleSystem.getIsTransitioning()) return;
    
    this.currentPreset = presetKey;
    const preset = this.presets[presetKey];
    
    this.parameterPanel?.setLocked(true);
    
    if (preset.parameters.backgroundColor) {
      this.animateBackgroundColor(preset.parameters.backgroundColor);
    }
    
    this.particleSystem.transitionToPreset(preset.parameters, 1500).then(() => {
      this.parameterPanel?.setLocked(false);
      this.parameterPanel?.updateParameters(preset.parameters);
    });
  }
  
  private animateBackgroundColor(targetColor: string): void {
    this.targetBackgroundColor = new THREE.Color(targetColor);
    this.backgroundTransitionStart = performance.now();
    this.isTransitioningBackground = true;
  }
  
  private showSaveModal(): void {
    if (!this.saveModal) return;
    
    this.saveModal.style.display = 'flex';
    
    requestAnimationFrame(() => {
      this.saveModal?.classList.add('visible');
    });
    
    this.presetNameInput?.focus();
  }
  
  private hideSaveModal(): void {
    if (!this.saveModal) return;
    
    this.saveModal.classList.remove('visible');
    
    setTimeout(() => {
      if (this.saveModal) {
        this.saveModal.style.display = 'none';
      }
    }, 300);
    
    if (this.presetNameInput) {
      this.presetNameInput.value = '';
    }
  }
  
  private savePreset(): void {
    const presetName = this.presetNameInput?.value.trim();
    
    if (!presetName) {
      alert('请输入预设名称');
      return;
    }
    
    const defaultParams: ParticleParameters = {
      particleCount: 20000,
      rotationSpeed: 1.5,
      colorOffset: 0,
      noiseStrength: 0.4,
      spreadRadius: 6,
      pulseSpeed: 0.5,
      pulseIntensity: 0.2,
      type: 'custom'
    };
    
    const currentParams: ParticleParameters = { 
      ...defaultParams,
      ...this.particleSystem?.getParameters()
    };
    
    axios.post('http://localhost:5000/api/save', {
      name: presetName,
      parameters: currentParams
    })
      .then((response) => {
        if (response.data.success) {
          this.presets[response.data.key] = response.data.preset;
          this.updatePresetSelect();
          this.hideSaveModal();
          this.showToast('预设保存成功！');
        }
      })
      .catch((error) => {
        console.error('Failed to save preset:', error);
        const key = `custom_${presetName.replace(/\s+/g, '_').toLowerCase()}`;
        this.presets[key] = {
          name: presetName,
          icon: '⭐',
          parameters: { ...currentParams },
          custom: true
        };
        this.updatePresetSelect();
        this.hideSaveModal();
        this.showToast('预设已保存（本地）');
      });
  }
  
  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2000);
  }
  
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    if (this.isTransitioningBackground) {
      const duration = 1000;
      const elapsed = performance.now() - this.backgroundTransitionStart;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutQuad(progress);
      
      const r = this.backgroundColor.r + (this.targetBackgroundColor.r - this.backgroundColor.r) * eased;
      const g = this.backgroundColor.g + (this.targetBackgroundColor.g - this.backgroundColor.g) * eased;
      const b = this.backgroundColor.b + (this.targetBackgroundColor.b - this.backgroundColor.b) * eased;
      
      if (this.scene) {
        this.scene.background = new THREE.Color(r, g, b);
        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.color = new THREE.Color(r, g, b);
        }
      }
      
      this.updateHaloColor(new THREE.Color(r, g, b));
      
      if (progress >= 1) {
        this.isTransitioningBackground = false;
        this.backgroundColor.copy(this.targetBackgroundColor);
      }
    }
    
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }
    
    if (this.haloSprite) {
      const pulse = 1 + Math.sin(elapsedTime * 0.5) * 0.1;
      this.haloSprite.scale.set(8 * pulse, 8 * pulse, 1);
    }
    
    if (this.pointLight) {
      const intensity = 1 + Math.sin(elapsedTime * 2) * 0.2;
      this.pointLight.intensity = intensity;
    }
    
    if (this.gridHelper && this.camera) {
      const distance = this.camera.position.length();
      const scale = Math.max(0.5, Math.min(2, distance / 15));
      this.gridHelper.scale.set(scale, 1, scale);
    }
    
    if (this.controls) {
      this.controls.update();
    }
    
    if (this.composer) {
      this.composer.render();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  private updateHaloColor(bgColor: THREE.Color): void {
    if (!this.haloSprite) return;
    
    const hue = { h: 0, s: 0, l: 0 };
    bgColor.getHSL(hue);
    
    const haloHue = (hue.h + 0.5) % 1;
    const haloColor = new THREE.Color().setHSL(haloHue, 0.8, 0.6);
    
    (this.haloSprite.material as THREE.SpriteMaterial).color = haloColor;
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  private onWindowResize(): void {
    if (!this.container || !this.camera || !this.renderer || !this.composer) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
  
  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    
    this.particleSystem?.dispose();
    this.parameterPanel?.dispose();
    
    this.renderer?.dispose();
    this.composer?.dispose();
    
    window.removeEventListener('resize', () => this.onWindowResize());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NebulaApp();
});
