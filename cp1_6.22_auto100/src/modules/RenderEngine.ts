import * as THREE from 'three';
import type { 
  MoleculeRenderData, 
  AtomRenderData, 
  BondRenderData, 
  BondAngleData, 
  RenderParams 
} from '../types';

export class RenderEngine {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  private animationId: number | null = null;
  
  private moleculeGroup: THREE.Group | null = null;
  private atomsMap: Map<string, THREE.Mesh> = new Map();
  private bondsMap: Map<string, THREE.Mesh> = new Map();
  private bondAnglesGroup: THREE.Group | null = null;
  
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  
  private params: RenderParams = {
    bondScale: 1.0,
    atomScale: 1.0,
    lightIntensity: 1.0,
  };

  init(container: HTMLElement): void {
    this.container = container;
    
    this.scene = new THREE.Scene();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 2;
    canvas.height = 512;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 8);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5 * this.params.lightIntensity);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0 * this.params.lightIntensity);
    this.directionalLight.position.set(5, 10, 7);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);
    
    const backLight = new THREE.DirectionalLight(0x6366f1, 0.3 * this.params.lightIntensity);
    backLight.position.set(-5, -5, -5);
    this.scene.add(backLight);
    
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);
    
    this.bondAnglesGroup = new THREE.Group();
    this.scene.add(this.bondAnglesGroup);
    
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  addMolecule(data: MoleculeRenderData): void {
    if (!this.moleculeGroup || !this.bondAnglesGroup) return;
    
    this.clearMolecule();
    this.createAtoms(data.atoms);
    this.createBonds(data.bonds);
    this.createBondAngles(data.bondAngles);
    this.centerMolecule();
  }

  private createAtoms(atoms: AtomRenderData[]): void {
    if (!this.moleculeGroup) return;
    
    atoms.forEach((atom) => {
      const geometry = new THREE.SphereGeometry(
        atom.radius * this.params.atomScale,
        32,
        32
      );
      const material = new THREE.MeshStandardMaterial({
        color: atom.color,
        roughness: 0.3,
        metalness: 0.1,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(atom.x, atom.y, atom.z);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      sphere.userData = { type: 'atom', data: atom };
      this.moleculeGroup!.add(sphere);
      this.atomsMap.set(atom.id, sphere);
    });
  }

  private createBonds(bonds: BondRenderData[]): void {
    if (!this.moleculeGroup) return;
    
    bonds.forEach((bond) => {
      const { atom1, atom2 } = bond;
      const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
      const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length() * this.params.bondScale;
      
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      
      const cylinderGeometry = new THREE.CylinderGeometry(
        0.12 * this.params.bondScale,
        0.12 * this.params.bondScale,
        length,
        16
      );
      const cylinderMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.85,
        roughness: 0.5,
        metalness: 0.3,
      });
      
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.copy(midPoint);
      cylinder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;
      cylinder.userData = { type: 'bond', data: bond };
      this.moleculeGroup!.add(cylinder);
      this.bondsMap.set(bond.id, cylinder);
    });
  }

  private createBondAngles(bondAngles: BondAngleData[]): void {
    if (!this.bondAnglesGroup) return;
    
    bondAngles.forEach((angleData) => {
      const { atom1, centralAtom, atom2, angle } = angleData;
      
      const v1 = new THREE.Vector3(
        atom1.x - centralAtom.x,
        atom1.y - centralAtom.y,
        atom1.z - centralAtom.z
      ).normalize();
      const v2 = new THREE.Vector3(
        atom2.x - centralAtom.x,
        atom2.y - centralAtom.y,
        atom2.z - centralAtom.z
      ).normalize();
      
      const arcRadius = 0.6;
      const segments = 32;
      const arcPoints: THREE.Vector3[] = [];
      
      const angleRad = (angle * Math.PI) / 180;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const currentAngle = angleRad * t;
        const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
        
        if (axis.length() === 0) {
          axis.set(0, 0, 1);
        }
        
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, currentAngle);
        const point = v1.clone().applyQuaternion(quaternion).multiplyScalar(arcRadius);
        point.add(new THREE.Vector3(centralAtom.x, centralAtom.y, centralAtom.z));
        arcPoints.push(point);
      }
      
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
      const arcMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.9,
        linewidth: 2,
      });
      const arcLine = new THREE.Line(arcGeometry, arcMaterial);
      this.bondAnglesGroup!.add(arcLine);
      
      const midT = 0.5;
      const midAngle = angleRad * midT;
      const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
      if (axis.length() === 0) axis.set(0, 0, 1);
      const midQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, midAngle);
      const labelPos = v1.clone().applyQuaternion(midQuaternion).multiplyScalar(arcRadius + 0.3);
      labelPos.add(new THREE.Vector3(centralAtom.x, centralAtom.y, centralAtom.z));
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 128;
      canvas.height = 48;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${angle.toFixed(1)}°`, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      const labelMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.position.copy(labelPos);
      labelSprite.scale.set(0.8, 0.3, 1);
      labelSprite.renderOrder = 1000;
      this.bondAnglesGroup!.add(labelSprite);
    });
  }

  private centerMolecule(): void {
    if (!this.moleculeGroup) return;
    
    const box = new THREE.Box3().setFromObject(this.moleculeGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    this.moleculeGroup.position.sub(center);
    if (this.bondAnglesGroup) {
      this.bondAnglesGroup.position.sub(center);
    }
    
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera!.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 2.5;
    
    this.camera!.position.z = cameraZ;
  }

  private clearMolecule(): void {
    if (this.moleculeGroup) {
      while (this.moleculeGroup.children.length > 0) {
        const child = this.moleculeGroup.children[0];
        this.moleculeGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    }
    
    if (this.bondAnglesGroup) {
      while (this.bondAnglesGroup.children.length > 0) {
        const child = this.bondAnglesGroup.children[0];
        this.bondAnglesGroup.remove(child);
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        } else if (child instanceof THREE.Sprite) {
          if (child.material instanceof THREE.SpriteMaterial && child.material.map) {
            child.material.map.dispose();
          }
          child.material.dispose();
        }
      }
    }
    
    this.atomsMap.clear();
    this.bondsMap.clear();
  }

  updateParams(params: Partial<RenderParams>): void {
    this.params = { ...this.params, ...params };
    
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.5 * this.params.lightIntensity;
    }
    if (this.directionalLight) {
      this.directionalLight.intensity = 1.0 * this.params.lightIntensity;
    }
    
    this.atomsMap.forEach((mesh, id) => {
      const atomData = mesh.userData.data as AtomRenderData;
      mesh.scale.setScalar(this.params.atomScale);
      const newRadius = atomData.radius * this.params.atomScale;
      (mesh.geometry as THREE.SphereGeometry).parameters.radius = newRadius;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.SphereGeometry(newRadius, 32, 32);
    });
    
    this.bondsMap.forEach((mesh, id) => {
      const bondData = mesh.userData.data as BondRenderData;
      const length = bondData.length * this.params.bondScale;
      const radius = 0.12 * this.params.bondScale;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
    });
  }

  highlightBond(bondId: string | null): void {
    this.bondsMap.forEach((mesh, id) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (id === bondId) {
        material.color.setHex(0xffff00);
        material.emissive.setHex(0x444400);
        material.opacity = 1;
      } else {
        material.color.setHex(0x888888);
        material.emissive.setHex(0x000000);
        material.opacity = 0.85;
      }
      material.needsUpdate = true;
    });
  }

  getAtomAtPosition(
    mouse: THREE.Vector2,
    raycaster: THREE.Raycaster
  ): AtomRenderData | null {
    if (!this.camera || !this.scene) return null;
    
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(
      Array.from(this.atomsMap.values()),
      false
    );
    
    if (intersects.length > 0) {
      return intersects[0].object.userData.data as AtomRenderData;
    }
    return null;
  }

  getBondAtPosition(
    mouse: THREE.Vector2,
    raycaster: THREE.Raycaster
  ): BondRenderData | null {
    if (!this.camera || !this.scene) return null;
    
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(
      Array.from(this.bondsMap.values()),
      false
    );
    
    if (intersects.length > 0) {
      return intersects[0].object.userData.data as BondRenderData;
    }
    return null;
  }

  private handleResize = (): void => {
    if (!this.container || !this.camera || !this.renderer) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    if (this.moleculeGroup) {
      this.moleculeGroup.rotation.y += 0.003;
    }
    if (this.bondAnglesGroup) {
      this.bondAnglesGroup.rotation.y += 0.003;
    }
    
    this.render();
  };

  private render(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.handleResize);
    
    this.clearMolecule();
    
    if (this.renderer && this.container) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
    this.moleculeGroup = null;
    this.bondAnglesGroup = null;
  }

  getDomElement(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  getScene(): THREE.Scene | null {
    return this.scene;
  }
}
