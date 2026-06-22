import * as THREE from 'three';
import { ColorTheme } from './CityGenerator';

interface ThemeSkyColors {
  top: THREE.Color;
  middle: THREE.Color;
  bottom: THREE.Color;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  sunPosition: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
}

const THEME_SKY: Record<ColorTheme, ThemeSkyColors> = {
  sunset: {
    top: new THREE.Color(0x1a0a2e),
    middle: new THREE.Color(0xff6b35),
    bottom: new THREE.Color(0xffd89b),
    fogColor: new THREE.Color(0xff9966),
    fogNear: 200,
    fogFar: 600,
    sunPosition: new THREE.Vector3(150, 80, 150),
    sunColor: new THREE.Color(0xffcc66),
    sunIntensity: 1.5
  },
  cyberpunk: {
    top: new THREE.Color(0x0a0015),
    middle: new THREE.Color(0x2a0040),
    bottom: new THREE.Color(0x440066),
    fogColor: new THREE.Color(0x220033),
    fogNear: 100,
    fogFar: 400,
    sunPosition: new THREE.Vector3(-100, 40, -100),
    sunColor: new THREE.Color(0xff00ff),
    sunIntensity: 0.4
  },
  ice: {
    top: new THREE.Color(0x1e3a5f),
    middle: new THREE.Color(0x6b8fa3),
    bottom: new THREE.Color(0xc8e0f0),
    fogColor: new THREE.Color(0x88aacc),
    fogNear: 150,
    fogFar: 500,
    sunPosition: new THREE.Vector3(100, 120, 100),
    sunColor: new THREE.Color(0xe8f4ff),
    sunIntensity: 1.2
  }
};

export class SkylineEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private skyMesh: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private sunMesh: THREE.Mesh | null = null;
  private hemisphereLight: THREE.HemisphereLight | null = null;

  private currentTheme: ColorTheme = 'sunset';
  private targetColors: ThemeSkyColors | null = null;
  private startColors: ThemeSkyColors | null = null;
  private transitionStart: number = 0;
  private transitionDuration: number = 800;
  private isTransitioning: boolean = false;

  private starParticles: THREE.Points | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.setupSkyDome();
    this.setupLights();
    this.setupStars();
    this.applyTheme(this.currentTheme);
  }

  private setupSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(1000, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a0a2e) },
        middleColor: { value: new THREE.Color(0xff6b35) },
        bottomColor: { value: new THREE.Color(0xffd89b) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          vec3 color;
          if (h > 0.0) {
            color = mix(middleColor, topColor, pow(h, exponent));
          } else {
            color = mix(middleColor, bottomColor, pow(-h, exponent * 0.5));
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  private setupLights(): void {
    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    this.scene.add(this.hemisphereLight);

    this.sunLight = new THREE.DirectionalLight(0xffcc66, 1.5);
    this.sunLight.position.set(150, 80, 150);
    this.scene.add(this.sunLight);

    const sunGeo = new THREE.SphereGeometry(25, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(150, 80, 150);
    this.scene.add(this.sunMesh);
  }

  private setupStars(): void {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 900;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 50;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    this.starParticles = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starParticles);
  }

  public setTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme && !this.isTransitioning) {
      return;
    }

    const sky = THEME_SKY[theme];
    const currentSky = THEME_SKY[this.currentTheme];

    const mat = this.skyMesh!.material as THREE.ShaderMaterial;
    this.startColors = {
      top: (mat.uniforms.topColor.value as THREE.Color).clone(),
      middle: (mat.uniforms.middleColor.value as THREE.Color).clone(),
      bottom: (mat.uniforms.bottomColor.value as THREE.Color).clone(),
      fogColor: this.scene.fog ? (this.scene.fog as THREE.Fog).color.clone() : currentSky.fogColor.clone(),
      fogNear: this.scene.fog ? (this.scene.fog as THREE.Fog).near : currentSky.fogNear,
      fogFar: this.scene.fog ? (this.scene.fog as THREE.Fog).far : currentSky.fogFar,
      sunPosition: this.sunLight!.position.clone(),
      sunColor: this.sunLight!.color.clone(),
      sunIntensity: this.sunLight!.intensity
    };

    this.targetColors = {
      top: sky.top.clone(),
      middle: sky.middle.clone(),
      bottom: sky.bottom.clone(),
      fogColor: sky.fogColor.clone(),
      fogNear: sky.fogNear,
      fogFar: sky.fogFar,
      sunPosition: sky.sunPosition.clone(),
      sunColor: sky.sunColor.clone(),
      sunIntensity: sky.sunIntensity
    };

    this.transitionStart = performance.now();
    this.isTransitioning = true;
    this.currentTheme = theme;
  }

  private applyTheme(theme: ColorTheme): void {
    const sky = THEME_SKY[theme];

    if (this.skyMesh) {
      const mat = this.skyMesh.material as THREE.ShaderMaterial;
      mat.uniforms.topColor.value = sky.top.clone();
      mat.uniforms.middleColor.value = sky.middle.clone();
      mat.uniforms.bottomColor.value = sky.bottom.clone();
    }

    this.scene.fog = new THREE.Fog(sky.fogColor, sky.fogNear, sky.fogFar);

    if (this.sunLight) {
      this.sunLight.color = sky.sunColor.clone();
      this.sunLight.intensity = sky.sunIntensity;
      this.sunLight.position.copy(sky.sunPosition);
    }

    if (this.sunMesh) {
      (this.sunMesh.material as THREE.MeshBasicMaterial).color = sky.sunColor.clone();
      this.sunMesh.position.copy(sky.sunPosition);
    }

    if (this.hemisphereLight) {
      this.hemisphereLight.color = sky.top.clone();
      this.hemisphereLight.groundColor = sky.bottom.clone();
    }

    if (this.starParticles) {
      const mat = this.starParticles.material as THREE.PointsMaterial;
      mat.opacity = theme === 'cyberpunk' ? 0.8 : theme === 'sunset' ? 0.4 : 0.2;
    }
  }

  public render(time: number): void {
    if (this.isTransitioning && this.startColors && this.targetColors) {
      const t = Math.min(1, (time - this.transitionStart) / this.transitionDuration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      if (this.skyMesh) {
        const mat = this.skyMesh.material as THREE.ShaderMaterial;
        (mat.uniforms.topColor.value as THREE.Color).lerpColors(this.startColors.top, this.targetColors.top, eased);
        (mat.uniforms.middleColor.value as THREE.Color).lerpColors(this.startColors.middle, this.targetColors.middle, eased);
        (mat.uniforms.bottomColor.value as THREE.Color).lerpColors(this.startColors.bottom, this.targetColors.bottom, eased);
      }

      if (!this.scene.fog) {
        this.scene.fog = new THREE.Fog(this.startColors.fogColor, this.startColors.fogNear, this.startColors.fogFar);
      }
      const fog = this.scene.fog as THREE.Fog;
      fog.color.lerpColors(this.startColors.fogColor, this.targetColors.fogColor, eased);
      fog.near = this.startColors.fogNear + (this.targetColors.fogNear - this.startColors.fogNear) * eased;
      fog.far = this.startColors.fogFar + (this.targetColors.fogFar - this.startColors.fogFar) * eased;

      if (this.sunLight) {
        this.sunLight.color.lerpColors(this.startColors.sunColor, this.targetColors.sunColor, eased);
        this.sunLight.intensity = this.startColors.sunIntensity + (this.targetColors.sunIntensity - this.startColors.sunIntensity) * eased;
        this.sunLight.position.lerpVectors(this.startColors.sunPosition, this.targetColors.sunPosition, eased);
      }

      if (this.sunMesh) {
        (this.sunMesh.material as THREE.MeshBasicMaterial).color.lerpColors(
          this.startColors.sunColor,
          this.targetColors.sunColor,
          eased
        );
        this.sunMesh.position.lerpVectors(this.startColors.sunPosition, this.targetColors.sunPosition, eased);
      }

      if (this.hemisphereLight) {
        this.hemisphereLight.color.lerpColors(this.startColors.top, this.targetColors.top, eased);
        this.hemisphereLight.groundColor.lerpColors(this.startColors.bottom, this.targetColors.bottom, eased);
      }

      if (this.starParticles) {
        const mat = this.starParticles.material as THREE.PointsMaterial;
        const targetOpacity = this.currentTheme === 'cyberpunk' ? 0.8 : this.currentTheme === 'sunset' ? 0.4 : 0.2;
        const startOpacity = this.currentTheme === 'cyberpunk' ? (this.startColors.top.r < 0.2 ? 0.8 : 0.4) : 0.2;
        mat.opacity = startOpacity + (targetOpacity - startOpacity) * eased;
      }

      if (t >= 1) {
        this.isTransitioning = false;
      }
    }

    if (this.sunMesh) {
      const pulse = 1 + 0.05 * Math.sin(time * 0.001);
      this.sunMesh.scale.setScalar(pulse);
    }
  }

  public getCurrentTheme(): ColorTheme {
    return this.currentTheme;
  }
}
