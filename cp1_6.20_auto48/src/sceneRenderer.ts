import * as THREE from 'three';
import { GameState, SongInfo } from './gameState';
import { AudioAnalyzer, SpectrumData } from './audioAnalyzer';
import { PlayerController } from './playerController';

export class SceneRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gameState: GameState;
  private audioAnalyzer: AudioAnalyzer;
  private playerController: PlayerController;

  private track: THREE.Group | null = null;
  private leftGlowStrip: THREE.Mesh | null = null;
  private rightGlowStrip: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private pointLights: THREE.PointLight[] = [];
  private backgroundParticles: THREE.Points | null = null;
  private trackParticles: THREE.Points | null = null;

  private targetBackgroundColor: THREE.Color = new THREE.Color(0x0d001a);
  private currentBackgroundColor: THREE.Color = new THREE.Color(0x0d001a);
  private targetAmbientColor: THREE.Color = new THREE.Color(0x404040);
  private currentAmbientColor: THREE.Color = new THREE.Color(0x404040);
  private colorTransitionProgress: number = 1;
  private colorTransitionDuration: number = 0.5;

  private beatGlowIntensity: number = 1;
  private beatGlowTarget: number = 1;
  private beatGlowProgress: number = 1;
  private beatGlowDuration: number = 0.15;

  private scoreDisplay: HTMLElement | null = null;
  private comboDisplay: HTMLElement | null = null;
  private songNameDisplay: HTMLElement | null = null;
  private bpmDisplay: HTMLElement | null = null;
  private spectrumContainer: HTMLElement | null = null;
  private spectrumBars: HTMLElement[] = [];
  private gameOverOverlay: HTMLElement | null = null;

  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 6, 12);
  private cameraLookAtOffset: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private targetCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();

  private trackLength: number = 200;
  private trackWidth: number = 8;
  private laneWidth: number = 2.5;
  private trackSegments: number = 50;
  private trackScrollOffset: number = 0;

  private audioContext: AudioContext | null = null;

  constructor(
    container: HTMLElement,
    playerController: PlayerController
  ) {
    this.container = container;
    this.gameState = GameState.getInstance();
    this.audioAnalyzer = AudioAnalyzer.getInstance();
    this.playerController = playerController;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.setupRenderer();
    this.setupScene();
    this.setupLights();
    this.setupTrack();
    this.setupParticles();
    this.setupUI();
    this.setupEventListeners();
    this.setupResizeHandler();
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x0d001a);
    this.scene.fog = new THREE.Fog(0x0d001a, 50, 150);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);

    const colors = [0xff00ff, 0x00ffff, 0xff00ff, 0x00ffff];
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(colors[i], 2, 50);
      light.position.set(
        (i % 2 === 0 ? -1 : 1) * 15,
        5,
        -30 + i * 20
      );
      this.pointLights.push(light);
      this.scene.add(light);
    }
  }

  private setupTrack(): void {
    this.track = new THREE.Group();

    const trackGeometry = new THREE.PlaneGeometry(this.trackWidth, this.trackLength, 1, this.trackSegments);
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a002e,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });

    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.z = -this.trackLength / 2 + 10;
    trackMesh.receiveShadow = true;
    this.track.add(trackMesh);

    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 1;
    const gradientCtx = gradientCanvas.getContext('2d')!;
    const gradient = gradientCtx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(0.5, '#ff00ff');
    gradient.addColorStop(1, '#00ffff');
    gradientCtx.fillStyle = gradient;
    gradientCtx.fillRect(0, 0, 256, 1);

    const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
    gradientTexture.wrapS = THREE.RepeatWrapping;
    gradientTexture.wrapT = THREE.RepeatWrapping;

    const lineMaterial = new THREE.MeshBasicMaterial({
      map: gradientTexture,
      transparent: true,
      opacity: 0.8
    });

    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue;
      const lineGeometry = new THREE.PlaneGeometry(0.1, this.trackLength);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * this.laneWidth, 0.01, -this.trackLength / 2 + 10);
      this.track.add(line);
    }

    const glowGeometry = new THREE.PlaneGeometry(0.5, this.trackLength);
    const leftGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.leftGlowStrip = new THREE.Mesh(glowGeometry, leftGlowMaterial);
    this.leftGlowStrip.rotation.x = -Math.PI / 2;
    this.leftGlowStrip.position.set(-this.trackWidth / 2, 0.02, -this.trackLength / 2 + 10);
    this.track.add(this.leftGlowStrip);

    const rightGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.rightGlowStrip = new THREE.Mesh(glowGeometry, rightGlowMaterial);
    this.rightGlowStrip.rotation.x = -Math.PI / 2;
    this.rightGlowStrip.position.set(this.trackWidth / 2, 0.02, -this.trackLength / 2 + 10);
    this.track.add(this.rightGlowStrip);

    for (let i = 0; i < this.trackLength; i += 5) {
      const markerGeometry = new THREE.PlaneGeometry(0.3, 0.1);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(0, 0.015, -i + 10);
      this.track.add(marker);
    }

    const gridHelper = new THREE.GridHelper(this.trackLength, this.trackSegments, 0x440066, 0x330055);
    gridHelper.position.z = -this.trackLength / 2 + 10;
    gridHelper.position.y = -0.01;
    this.track.add(gridHelper);

    this.scene.add(this.track);
  }

  private setupParticles(): void {
    const bgParticleCount = 300;
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgParticleCount * 3);
    const bgColors = new Float32Array(bgParticleCount * 3);

    for (let i = 0; i < bgParticleCount; i++) {
      bgPositions[i * 3] = (Math.random() - 0.5) * 200;
      bgPositions[i * 3 + 1] = Math.random() * 80 + 10;
      bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 300 - 50;

      const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.7, 0.8, 0.6);
      bgColors[i * 3] = color.r;
      bgColors[i * 3 + 1] = color.g;
      bgColors[i * 3 + 2] = color.b;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

    const bgMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    this.backgroundParticles = new THREE.Points(bgGeometry, bgMaterial);
    this.scene.add(this.backgroundParticles);

    const trackParticleCount = 200;
    const trackGeometry = new THREE.BufferGeometry();
    const trackPositions = new Float32Array(trackParticleCount * 3);

    for (let i = 0; i < trackParticleCount; i++) {
      trackPositions[i * 3] = (Math.random() - 0.5) * (this.trackWidth - 1);
      trackPositions[i * 3 + 1] = Math.random() * 0.3 + 0.1;
      trackPositions[i * 3 + 2] = (Math.random() - 0.5) * this.trackLength;
    }

    trackGeometry.setAttribute('position', new THREE.BufferAttribute(trackPositions, 3));

    const trackMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.2,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    });

    this.trackParticles = new THREE.Points(trackGeometry, trackMaterial);
    this.trackParticles.position.z = 10;
    this.scene.add(this.trackParticles);
  }

  private setupUI(): void {
    this.scoreDisplay = document.getElementById('scoreDisplay');
    this.comboDisplay = document.getElementById('comboDisplay');
    this.songNameDisplay = document.getElementById('songName');
    this.bpmDisplay = document.getElementById('bpmDisplay');
    this.spectrumContainer = document.getElementById('spectrumContainer');
    this.gameOverOverlay = document.getElementById('gameOverOverlay');

    if (this.spectrumContainer) {
      for (let i = 0; i < 24; i++) {
        const bar = document.createElement('div');
        bar.className = 'spectrum-bar';
        bar.style.height = '2px';
        const hue = (i / 24) * 300;
        bar.style.boxShadow = `0 0 10px hsl(${hue}, 100%, 50%)`;
        this.spectrumContainer.appendChild(bar);
        this.spectrumBars.push(bar);
      }
    }
  }

  private setupEventListeners(): void {
    this.audioAnalyzer.on('beat', this.handleBeat.bind(this));
    this.audioAnalyzer.on('spectrum', this.handleSpectrum.bind(this));
    this.gameState.on('scoreChange', this.handleScoreChange.bind(this));
    this.gameState.on('comboReset', this.handleComboReset.bind(this));
    this.gameState.on('songChange', this.handleSongChange.bind(this));
    this.gameState.on('collision', this.handleCollision.bind(this));
    this.gameState.on('statusChange', this.handleStatusChange.bind(this));
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private handleBeat(): void {
    this.beatGlowTarget = 0.2;
    this.beatGlowProgress = 0;
  }

  private handleSpectrum(data?: unknown): void {
    if (!data) return;
    const spectrum = data as SpectrumData;
    
    this.updateBackgroundColor(spectrum);
    this.updateSpectrumBars(spectrum.bands);
  }

  private updateBackgroundColor(spectrum: SpectrumData): void {
    const r = Math.floor(spectrum.low * 255);
    const g = Math.floor(spectrum.mid * 255);
    const b = Math.floor(spectrum.high * 255);
    
    this.targetBackgroundColor.setRGB(r / 510, g / 510, b / 510);
    this.targetBackgroundColor.offsetHSL(0, 0, -0.3);
    
    this.targetAmbientColor.setRGB(
      0.2 + spectrum.low * 0.3,
      0.2 + spectrum.mid * 0.3,
      0.2 + spectrum.high * 0.3
    );
    
    this.colorTransitionProgress = 0;
  }

  private updateSpectrumBars(bands: number[]): void {
    for (let i = 0; i < this.spectrumBars.length && i < bands.length; i++) {
      const height = Math.max(2, bands[i] * 80);
      this.spectrumBars[i].style.height = `${height}px`;
    }
  }

  private handleScoreChange(data?: unknown): void {
    if (!data) return;
    const { score, combo } = data as { score: number; combo: number };
    
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = score.toString();
      this.scoreDisplay.style.transform = 'scale(1.2)';
      setTimeout(() => {
        if (this.scoreDisplay) {
          this.scoreDisplay.style.transform = 'scale(1)';
        }
      }, 100);
    }
    
    if (this.comboDisplay) {
      this.comboDisplay.textContent = `Combo: ${combo}`;
      if (combo >= 10) {
        this.comboDisplay.style.color = '#ffd700';
        this.comboDisplay.style.textShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
      } else {
        this.comboDisplay.style.color = '#00ffff';
        this.comboDisplay.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
      }
    }
  }

  private handleComboReset(): void {
    if (this.comboDisplay) {
      this.comboDisplay.textContent = 'Combo: 0';
      this.comboDisplay.style.color = '#00ffff';
      this.comboDisplay.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
    }
  }

  private handleSongChange(data?: unknown): void {
    if (!data) return;
    const song = data as SongInfo | null;
    
    if (this.songNameDisplay && song) {
      this.songNameDisplay.textContent = song.name;
    }
    
    if (this.bpmDisplay && song) {
      this.bpmDisplay.textContent = `BPM: ${song.bpm}`;
    }
  }

  private handleCollision(): void {
    if (this.gameOverOverlay) {
      this.gameOverOverlay.classList.add('active');
      setTimeout(() => {
        if (this.gameOverOverlay) {
          this.gameOverOverlay.classList.remove('active');
        }
      }, 300);
    }

    this.playFailSound();
  }

  private playFailSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not available for fail sound');
    }
  }

  private handleStatusChange(data?: unknown): void {
    const status = data as string;
    const hud = document.getElementById('hud');
    
    if (status === 'playing') {
      hud?.classList.remove('hidden');
    } else {
      hud?.classList.add('hidden');
    }
  }

  update(deltaTime: number, gameSpeed: number): void {
    this.updateCamera(deltaTime);
    this.updateColors(deltaTime);
    this.updateBeatGlow(deltaTime);
    this.updateTrack(deltaTime, gameSpeed);
    this.updateParticles(deltaTime, gameSpeed);
    this.updateLights(deltaTime);

    if (this.bpmDisplay) {
      const bpm = this.audioAnalyzer.getBpm();
      if (bpm > 0) {
        this.bpmDisplay.textContent = `BPM: ${bpm}`;
      }
    }
  }

  private updateCamera(deltaTime: number): void {
    const playerMesh = this.playerController.getMesh();
    
    this.targetCameraPosition.copy(playerMesh.position).add(this.cameraOffset);
    this.targetLookAt.copy(playerMesh.position).add(this.cameraLookAtOffset);

    this.camera.position.lerp(this.targetCameraPosition, 5 * deltaTime);
    this.camera.lookAt(this.targetLookAt);

    const viewportHeight = window.innerHeight;
    const targetY = viewportHeight * 0.3;
    const screenPos = new THREE.Vector3();
    playerMesh.getWorldPosition(screenPos);
    screenPos.project(this.camera);
    const currentY = (screenPos.y + 1) / 2 * viewportHeight;
    
    const adjustment = (targetY - currentY) / viewportHeight * 10;
    this.camera.position.y += adjustment * deltaTime * 2;
  }

  private updateColors(deltaTime: number): void {
    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress += deltaTime / this.colorTransitionDuration;
      const t = Math.min(this.colorTransitionProgress, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.currentBackgroundColor.lerpColors(
        this.currentBackgroundColor,
        this.targetBackgroundColor,
        eased * 0.1
      );
      this.currentAmbientColor.lerpColors(
        this.currentAmbientColor,
        this.targetAmbientColor,
        eased * 0.1
      );

      if (this.scene.background) {
        (this.scene.background as THREE.Color).copy(this.currentBackgroundColor);
      }
      if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.copy(this.currentBackgroundColor);
      }
      if (this.ambientLight) {
        this.ambientLight.color.copy(this.currentAmbientColor);
      }
    }
  }

  private updateBeatGlow(deltaTime: number): void {
    if (this.beatGlowProgress < 1) {
      this.beatGlowProgress += deltaTime / this.beatGlowDuration;
      const t = Math.min(this.beatGlowProgress, 1);
      
      this.beatGlowIntensity = this.beatGlowTarget + (1 - this.beatGlowTarget) * (1 - t);

      if (this.leftGlowStrip && this.leftGlowStrip.material instanceof THREE.MeshBasicMaterial) {
        this.leftGlowStrip.material.opacity = 0.3 + this.beatGlowIntensity * 0.5;
      }
      if (this.rightGlowStrip && this.rightGlowStrip.material instanceof THREE.MeshBasicMaterial) {
        this.rightGlowStrip.material.opacity = 0.3 + this.beatGlowIntensity * 0.5;
      }

      if (t >= 1) {
        this.beatGlowTarget = 1;
      }
    }
  }

  private updateTrack(deltaTime: number, gameSpeed: number): void {
    if (!this.track || this.gameState.getStatus() !== 'playing') return;

    this.trackScrollOffset += gameSpeed * deltaTime * 5;

    const trackMeshes = this.track.children.filter(
      child => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial
    );

    trackMeshes.forEach(mesh => {
      if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshBasicMaterial && mesh.material.map) {
        mesh.material.map.offset.y = this.trackScrollOffset * 0.01;
      }
    });

    if (this.leftGlowStrip && this.leftGlowStrip.material instanceof THREE.MeshBasicMaterial && this.leftGlowStrip.material.map) {
      this.leftGlowStrip.material.map.offset.y = this.trackScrollOffset * 0.02;
    }
    if (this.rightGlowStrip && this.rightGlowStrip.material instanceof THREE.MeshBasicMaterial && this.rightGlowStrip.material.map) {
      this.rightGlowStrip.material.map.offset.y = this.trackScrollOffset * 0.02;
    }
  }

  private updateParticles(deltaTime: number, gameSpeed: number): void {
    if (this.trackParticles && this.gameState.getStatus() === 'playing') {
      const positions = this.trackParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;

      for (let i = 0; i < array.length; i += 3) {
        array[i + 2] += gameSpeed * deltaTime * 15;
        
        if (array[i + 2] > 20) {
          array[i + 2] = -this.trackLength / 2 + 10;
          array[i] = (Math.random() - 0.5) * (this.trackWidth - 1);
        }
      }
      positions.needsUpdate = true;
    }

    if (this.backgroundParticles) {
      const positions = this.backgroundParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;

      for (let i = 0; i < array.length; i += 3) {
        array[i + 2] += deltaTime * 2;
        array[i + 1] += Math.sin(performance.now() * 0.001 + i) * deltaTime * 0.5;
        
        if (array[i + 2] > 50) {
          array[i + 2] = -250;
        }
      }
      positions.needsUpdate = true;
    }
  }

  private updateLights(deltaTime: number): void {
    const time = performance.now() * 0.001;
    
    this.pointLights.forEach((light, i) => {
      light.position.y = 5 + Math.sin(time * 2 + i) * 2;
      light.intensity = 1.5 + Math.sin(time * 3 + i * 0.5) * 0.5;
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  reset(): void {
    this.trackScrollOffset = 0;
    this.currentBackgroundColor.setHex(0x0d001a);
    this.targetBackgroundColor.setHex(0x0d001a);
    this.currentAmbientColor.setHex(0x404040);
    this.targetAmbientColor.setHex(0x404040);
    this.beatGlowIntensity = 1;
    this.beatGlowTarget = 1;
    
    if (this.scene.background) {
      (this.scene.background as THREE.Color).setHex(0x0d001a);
    }
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.setHex(0x0d001a);
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0x404040);
    }

    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = '0';
    }
    if (this.comboDisplay) {
      this.comboDisplay.textContent = 'Combo: 0';
    }

    this.spectrumBars.forEach(bar => {
      bar.style.height = '2px';
    });

    if (this.trackParticles) {
      const positions = this.trackParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        array[i + 2] = (Math.random() - 0.5) * this.trackLength;
      }
      positions.needsUpdate = true;
    }
  }

  destroy(): void {
    this.audioAnalyzer.off('beat', this.handleBeat.bind(this));
    this.audioAnalyzer.off('spectrum', this.handleSpectrum.bind(this));
    this.gameState.off('scoreChange', this.handleScoreChange.bind(this));
    this.gameState.off('comboReset', this.handleComboReset.bind(this));
    this.gameState.off('songChange', this.handleSongChange.bind(this));
    this.gameState.off('collision', this.handleCollision.bind(this));
    this.gameState.off('statusChange', this.handleStatusChange.bind(this));

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
