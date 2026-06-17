import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { materialManager, MaterialType, TextureType } from './material-manager';

export interface LightPosition {
  x: number;
  y: number;
  z: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private modelMesh: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;
  private lightHelper: THREE.Mesh;
  private groundPlane: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private currentMaterial: THREE.MeshStandardMaterial;
  private clock: THREE.Clock;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12121f);

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(6, 5, 6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 0.5, 0);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xfff4e0, 1.2, 40, 2);
    this.pointLight.position.set(5, 5, 5);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.set(1024, 1024);
    this.pointLight.shadow.camera.near = 0.5;
    this.pointLight.shadow.camera.far = 50;
    this.scene.add(this.pointLight);

    const lightHelperGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const lightHelperMat = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
    });
    this.lightHelper = new THREE.Mesh(lightHelperGeo, lightHelperMat);
    this.lightHelper.position.copy(this.pointLight.position);
    this.scene.add(this.lightHelper);

    this.currentMaterial = materialManager.createInitialMaterial();
    this.createModel();

    const groundGeo = new THREE.CircleGeometry(10, 64);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -1.2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    this.addEnvironmentLights();

    window.addEventListener('resize', this.onResize);
  }

  private addEnvironmentLights(): void {
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
    rimLight.position.set(0, 5, -6);
    this.scene.add(rimLight);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(50, 32, 32);
    const envMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.BackSide,
    });
    const envMesh = new THREE.Mesh(envGeo, envMat);
    envScene.add(envMesh);
    const envTexture = pmremGenerator.fromScene(envScene).texture;
    this.scene.environment = envTexture;
    pmremGenerator.dispose();
  }

  private createModel(): void {
    const geometry = new THREE.TorusKnotGeometry(0.9, 0.3, 160, 32, 2, 3);
    geometry.center();
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    this.modelMesh = new THREE.Mesh(geometry, this.currentMaterial);
    this.modelMesh.castShadow = true;
    this.modelMesh.receiveShadow = true;
    this.modelMesh.position.y = 0.2;
    this.scene.add(this.modelMesh);
  }

  public switchMaterial(materialType: MaterialType, textureType: TextureType): void {
    if (!this.modelMesh) return;
    materialManager.switchMaterial(
      this.currentMaterial,
      materialType,
      textureType,
      300
    );
  }

  public applyTexture(textureType: TextureType): void {
    materialManager.applyTexture(this.currentMaterial, textureType);
  }

  public setLightPosition(pos: LightPosition): void {
    this.pointLight.position.set(pos.x, pos.y, pos.z);
    this.lightHelper.position.set(pos.x, pos.y, pos.z);
  }

  public getLightPosition(): LightPosition {
    return {
      x: this.pointLight.position.x,
      y: this.pointLight.position.y,
      z: this.pointLight.position.z,
    };
  }

  public getCurrentMaterial(): THREE.MeshStandardMaterial {
    return this.currentMaterial;
  }

  public render(): void {
    const delta = this.clock.getDelta();
    materialManager.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    materialManager.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }
}
