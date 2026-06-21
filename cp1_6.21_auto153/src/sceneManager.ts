import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BuildingFactory, BuildingStyle } from './buildingFactory';

const GROUND_RADIUS = 100;

export interface SkylineParams {
  density: number;
  style: BuildingStyle;
  skyColor: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private buildingFactory: BuildingFactory;
  private groundGrid: THREE.GridHelper;
  private skyMesh: THREE.Mesh;
  private currentParams: SkylineParams;
  private light: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;
  private autoRotateSpeed: number = 5;
  private autoRotating: boolean = true;
  private fullRotationActive: boolean = false;
  private fullRotationAngle: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentParams = {
      density: 0.5,
      style: 'modern',
      skyColor: 0x0a0a2e,
    };

    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.003);

    const gridSize = GROUND_RADIUS * 2;
    const divisions = Math.floor(gridSize / 5);
    this.groundGrid = new THREE.GridHelper(gridSize, divisions, 0x555555, 0x444444);
    (this.groundGrid.material as THREE.LineBasicMaterial).transparent = true;
    (this.groundGrid.material as THREE.LineBasicMaterial).opacity = 0.6;
    this.scene.add(this.groundGrid);

    const groundCircle = new THREE.Mesh(
      new THREE.CircleGeometry(GROUND_RADIUS, 64),
      new THREE.MeshPhongMaterial({
        color: 0x111122,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    groundCircle.rotation.x = -Math.PI / 2;
    groundCircle.position.y = -0.05;
    groundCircle.receiveShadow = true;
    this.scene.add(groundCircle);

    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a2e) },
        bottomColor: { value: new THREE.Color(0x000000) },
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
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skyMesh);

    this.light = new THREE.PointLight(0xffeedd, 1.5, 300);
    this.light.position.set(-40, 80, -40);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 1024;
    this.light.shadow.mapSize.height = 1024;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 300;
    this.scene.add(this.light);

    this.ambientLight = new THREE.AmbientLight(0x222244, 0.4);
    this.scene.add(this.ambientLight);

    this.buildingFactory = new BuildingFactory(this.scene as unknown as THREE.Group);
    this.buildingFactory.generateBuildings({
      density: this.currentParams.density,
      style: this.currentParams.style,
    });
  }

  update(params: SkylineParams): void {
    const densityChanged = params.density !== this.currentParams.density;
    const styleChanged = params.style !== this.currentParams.style;
    const skyChanged = params.skyColor !== this.currentParams.skyColor;

    if (densityChanged) {
      this.buildingFactory.generateBuildings({
        density: params.density,
        style: params.style,
      });
      this.updateGridColor(params.density);
    } else if (styleChanged) {
      this.buildingFactory.updateStyle(params.style);
    }

    if (skyChanged) {
      this.updateSkyColor(params.skyColor);
    }

    this.currentParams = { ...params };
  }

  updateDelta(delta: number): void {
    this.buildingFactory.update(delta);
    TWEEN.update();
  }

  getAutoRotateAngle(delta: number): number {
    if (this.fullRotationActive) {
      this.fullRotationAngle += delta * (Math.PI * 2) / 8;
      if (this.fullRotationAngle >= Math.PI * 2) {
        this.fullRotationActive = false;
        this.fullRotationAngle = 0;
        this.buildingFactory.setTwinkling(false);
        this.autoRotating = true;
        return 0;
      }
      return delta * (Math.PI * 2) / 8;
    }
    if (this.autoRotating) {
      return (this.autoRotateSpeed * Math.PI) / 180 * delta;
    }
    return 0;
  }

  startFullRotation(): void {
    if (!this.fullRotationActive) {
      this.fullRotationActive = true;
      this.fullRotationAngle = 0;
      this.autoRotating = false;
      this.buildingFactory.setTwinkling(true);
    }
  }

  setAutoRotating(active: boolean): void {
    if (!this.fullRotationActive) {
      this.autoRotating = active;
    }
  }

  isFullRotating(): boolean {
    return this.fullRotationActive;
  }

  getCurrentParams(): SkylineParams {
    return { ...this.currentParams };
  }

  private updateSkyColor(color: number): void {
    const newTop = new THREE.Color(color);
    const mat = this.skyMesh.material as THREE.ShaderMaterial;
    new TWEEN.Tween(mat.uniforms.topColor.value)
      .to({ r: newTop.r, g: newTop.g, b: newTop.b }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();

    if (this.scene.fog instanceof THREE.FogExp2) {
      new TWEEN.Tween(this.scene.fog.color)
        .to({ r: newTop.r * 0.5, g: newTop.g * 0.5, b: newTop.b * 0.5 }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    }
  }

  private updateGridColor(density: number): void {
    const t = (density - 0.2) / 0.6;
    const darkGray = new THREE.Color(0x333333);
    const lightGray = new THREE.Color(0x888888);
    const targetColor = darkGray.clone().lerp(lightGray, t);

    const mat = this.groundGrid.material as THREE.LineBasicMaterial;
    new TWEEN.Tween(mat.color)
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();
  }
}
