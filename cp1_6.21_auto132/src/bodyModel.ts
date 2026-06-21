import * as THREE from 'three';
import type { BodyPart } from './trainingStore';

export interface BodyPartClickEvent {
  bodyPart: BodyPart;
  screenX: number;
  screenY: number;
}

type ClickCallback = (event: BodyPartClickEvent) => void;

export class BodyModel {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private bodyParts: Map<BodyPart, THREE.Group>;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  private activePart: BodyPart | null = null;
  private onClickCallback: ClickCallback | null = null;
  private animationId: number | null = null;
  private container: HTMLElement;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: 0, y: 0 };
  private currentRotation: { x: number; y: number } = { x: 0, y: 0 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.bodyParts = new Map();
    this.originalMaterials = new Map();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.buildBodyModel();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 0, 5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8888, 0.2);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);
  }

  private createBodyPart(
    part: BodyPart,
    meshes: THREE.Mesh[],
    position: THREE.Vector3
  ): void {
    const group = new THREE.Group();
    group.name = part;
    group.userData.bodyPart = part;

    meshes.forEach(mesh => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.bodyPart = part;
      group.add(mesh);
      this.originalMaterials.set(mesh, mesh.material);
    });

    group.position.copy(position);
    this.bodyParts.set(part, group);
    this.scene.add(group);
  }

  private buildBodyModel(): void {
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      metalness: 0.1
    });

    const torsoMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.7,
      metalness: 0.1
    });

    const shortsMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.6,
      metalness: 0.2
    });

    const headGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.y = 0;
    this.createBodyPart('shoulders', [head], new THREE.Vector3(0, 3.2, 0));

    const neckGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.5, 16);
    const neck = new THREE.Mesh(neckGeo, skinMaterial);
    neck.position.y = -0.6;
    this.createBodyPart('shoulders', [neck], new THREE.Vector3(0, 2.7, 0));

    const shoulderGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const leftShoulder = new THREE.Mesh(shoulderGeo, skinMaterial);
    leftShoulder.position.set(-1.4, 0.8, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, skinMaterial);
    rightShoulder.position.set(1.4, 0.8, 0);

    const upperChestGeo = new THREE.BoxGeometry(2.2, 0.9, 1);
    const upperChest = new THREE.Mesh(upperChestGeo, torsoMaterial);
    upperChest.position.y = 0.4;
    upperChest.scale.set(1, 0.9, 0.85);

    this.createBodyPart('chest', [upperChest, leftShoulder, rightShoulder], new THREE.Vector3(0, 1.8, 0));

    const midTorsoGeo = new THREE.BoxGeometry(2.1, 1.1, 0.9);
    const midTorso = new THREE.Mesh(midTorsoGeo, torsoMaterial);
    midTorso.position.y = -0.6;

    const lowerTorsoGeo = new THREE.BoxGeometry(2, 0.8, 0.85);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, torsoMaterial);
    lowerTorso.position.y = -1.55;

    this.createBodyPart('core', [midTorso, lowerTorso], new THREE.Vector3(0, 0.4, 0));

    const upperBackGeo = new THREE.BoxGeometry(2.2, 1, 0.5);
    const upperBack = new THREE.Mesh(upperBackGeo, torsoMaterial);
    upperBack.position.set(0, 0.4, -0.55);
    upperBack.scale.set(1, 0.9, 0.5);

    const midBackGeo = new THREE.BoxGeometry(2.1, 1.1, 0.45);
    const midBack = new THREE.Mesh(midBackGeo, torsoMaterial);
    midBack.position.set(0, -0.6, -0.5);

    const lowerBackGeo = new THREE.BoxGeometry(1.8, 0.8, 0.4);
    const lowerBack = new THREE.Mesh(lowerBackGeo, torsoMaterial);
    lowerBack.position.set(0, -1.55, -0.48);

    this.createBodyPart('back', [upperBack, midBack, lowerBack], new THREE.Vector3(0, 0.4, 0));

    const leftUpperArmGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.4, 16);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, skinMaterial);
    leftUpperArm.position.set(-2, -0.1, 0);
    leftUpperArm.rotation.z = 0.25;

    const leftLowerArmGeo = new THREE.CylinderGeometry(0.26, 0.3, 1.3, 16);
    const leftLowerArm = new THREE.Mesh(leftLowerArmGeo, skinMaterial);
    leftLowerArm.position.set(-2.5, -1.4, 0);
    leftLowerArm.rotation.z = 0.15;

    const rightUpperArmGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.4, 16);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, skinMaterial);
    rightUpperArm.position.set(2, -0.1, 0);
    rightUpperArm.rotation.z = -0.25;

    const rightLowerArmGeo = new THREE.CylinderGeometry(0.26, 0.3, 1.3, 16);
    const rightLowerArm = new THREE.Mesh(rightLowerArmGeo, skinMaterial);
    rightLowerArm.position.set(2.5, -1.4, 0);
    rightLowerArm.rotation.z = -0.15;

    this.createBodyPart(
      'arms',
      [leftUpperArm, leftLowerArm, rightUpperArm, rightLowerArm],
      new THREE.Vector3(0, 0, 0)
    );

    const hipsGeo = new THREE.BoxGeometry(2.1, 0.6, 1);
    const hips = new THREE.Mesh(hipsGeo, shortsMaterial);
    hips.position.y = -2.1;
    this.createBodyPart('legs', [hips], new THREE.Vector3(0, -1.2, 0));

    const leftThighGeo = new THREE.CylinderGeometry(0.42, 0.48, 1.8, 16);
    const leftThigh = new THREE.Mesh(leftThighGeo, shortsMaterial);
    leftThigh.position.set(-0.7, -3.1, 0);

    const leftCalfGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.6, 16);
    const leftCalf = new THREE.Mesh(leftCalfGeo, skinMaterial);
    leftCalf.position.set(-0.7, -4.8, 0);

    const rightThighGeo = new THREE.CylinderGeometry(0.42, 0.48, 1.8, 16);
    const rightThigh = new THREE.Mesh(rightThighGeo, shortsMaterial);
    rightThigh.position.set(0.7, -3.1, 0);

    const rightCalfGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.6, 16);
    const rightCalf = new THREE.Mesh(rightCalfGeo, skinMaterial);
    rightCalf.position.set(0.7, -4.8, 0);

    const leftFootGeo = new THREE.BoxGeometry(0.5, 0.25, 0.9);
    const leftFoot = new THREE.Mesh(leftFootGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    leftFoot.position.set(-0.7, -5.75, 0.15);

    const rightFootGeo = new THREE.BoxGeometry(0.5, 0.25, 0.9);
    const rightFoot = new THREE.Mesh(rightFootGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    rightFoot.position.set(0.7, -5.75, 0.15);

    this.createBodyPart(
      'legs',
      [leftThigh, leftCalf, rightThigh, rightCalf, leftFoot, rightFoot],
      new THREE.Vector3(0, -1.2, 0)
    );
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.handleCanvasClick.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = false;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.isDragging = true;
    }

    if (event.buttons === 1) {
      this.targetRotation.y += deltaX * 0.01;
      this.targetRotation.x += deltaY * 0.01;
      this.targetRotation.x = Math.max(-0.5, Math.min(0.5, this.targetRotation.x));
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseUp(): void {
    setTimeout(() => {
      this.isDragging = false;
    }, 0);
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes: THREE.Mesh[] = [];
    this.bodyParts.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          allMeshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(allMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const bodyPart = mesh.userData.bodyPart as BodyPart;
      if (bodyPart && this.onClickCallback) {
        this.onClickCallback({
          bodyPart,
          screenX: event.clientX,
          screenY: event.clientY
        });
      }
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public highlightPart(part: BodyPart): void {
    this.deactivateAll();
    this.activePart = part;

    const group = this.bodyParts.get(part);
    if (!group) return;

    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        const glowMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ff88,
          emissive: 0x00ff44,
          emissiveIntensity: 0.6,
          roughness: 0.3,
          metalness: 0.5
        });
        child.material = glowMaterial;
      }
    });
  }

  public deactivateAll(): void {
    this.activePart = null;
    this.bodyParts.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const original = this.originalMaterials.get(child);
          if (original) {
            child.material = original;
          }
        }
      });
    });
  }

  public onClick(callback: ClickCallback): void {
    this.onClickCallback = callback;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

    this.bodyParts.forEach(group => {
      group.rotation.y = this.currentRotation.y;
      group.rotation.x = this.currentRotation.x;
    });

    const time = Date.now() * 0.001;
    if (this.activePart) {
      const group = this.bodyParts.get(this.activePart);
      if (group) {
        group.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            if (material.emissiveIntensity !== undefined) {
              material.emissiveIntensity = 0.4 + Math.sin(time * 4) * 0.3;
            }
          }
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.handleCanvasClick.bind(this));
  }
}
