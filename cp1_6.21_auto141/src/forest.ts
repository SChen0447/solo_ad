import * as THREE from 'three';
import { Tree } from './tree';
import { TreeSpecies } from './season';

export class Forest {
  public scene: THREE.Scene;
  public trees: Tree[] = [];
  public group: THREE.Group;
  private currentMonth: number = 1;
  private targetMonth: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.createForest();
  }

  private createForest(): void {
    const layouts: { species: TreeSpecies; pos: THREE.Vector3; rotY: number }[] = [
      { species: 'pine',   pos: new THREE.Vector3(-7, 0, -5),  rotY: 0.3 },
      { species: 'pine',   pos: new THREE.Vector3(-9, 0, 2),   rotY: -0.4 },
      { species: 'maple',  pos: new THREE.Vector3(3, 0, -4),   rotY: 1.1 },
      { species: 'maple',  pos: new THREE.Vector3(7, 0, 1),    rotY: -0.8 },
      { species: 'birch',  pos: new THREE.Vector3(-2, 0, 4),   rotY: 0.5 },
      { species: 'birch',  pos: new THREE.Vector3(0, 0, -7),   rotY: -1.2 },
      { species: 'oak',    pos: new THREE.Vector3(8, 0, -6),   rotY: 0.7 },
      { species: 'oak',    pos: new THREE.Vector3(-5, 0, 6),   rotY: -0.3 },
      { species: 'cherry', pos: new THREE.Vector3(4, 0, 5),    rotY: 1.5 },
      { species: 'cherry', pos: new THREE.Vector3(-4, 0, -1),  rotY: -0.6 }
    ];

    for (const layout of layouts) {
      const tree = new Tree(layout.species, layout.pos);
      tree.group.rotation.y = layout.rotY;
      this.trees.push(tree);
      this.group.add(tree.group);
    }

    this.addGroundDecorations();
  }

  private addGroundDecorations(): void {
    const rockPositions = [
      { x: -6, z: 3, s: 0.5 },
      { x: 5, z: -2, s: 0.35 },
      { x: 2, z: 7, s: 0.3 },
      { x: -3, z: -6, s: 0.4 },
      { x: 8, z: 4, s: 0.25 }
    ];
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      roughness: 0.95,
      flatShading: true
    });
    for (const rp of rockPositions) {
      const geo = new THREE.DodecahedronGeometry(rp.s, 0);
      const rock = new THREE.Mesh(geo, rockMat);
      rock.position.set(rp.x, rp.s * 0.4, rp.z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x5a8a3a,
      roughness: 0.9,
      flatShading: true
    });
    const grassPositions = this.generateRandomPoints(40, 11);
    for (const gp of grassPositions) {
      const height = 0.2 + Math.random() * 0.3;
      const geo = new THREE.ConeGeometry(0.06, height, 4, 1);
      const grass = new THREE.Mesh(geo, grassMat);
      grass.position.set(gp.x, height * 0.5, gp.z);
      grass.rotation.y = Math.random() * Math.PI;
      this.group.add(grass);
    }
  }

  private generateRandomPoints(count: number, radius: number): { x: number; z: number }[] {
    const points: { x: number; z: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * (radius - 2);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const tooClose = this.trees.some(t => {
        const dx = t.position.x - x;
        const dz = t.position.z - z;
        return Math.sqrt(dx * dx + dz * dz) < 2.5;
      });
      if (!tooClose) {
        points.push({ x, z });
      }
    }
    return points;
  }

  public setMonth(month: number): void {
    this.targetMonth = month;
  }

  public update(delta: number): void {
    this.currentMonth += (this.targetMonth - this.currentMonth) * Math.min(1, delta * 4);
    const deltaFactor = Math.min(1, delta * 60);
    for (const tree of this.trees) {
      tree.update(this.currentMonth, deltaFactor);
    }
  }

  public getAllInteractables(): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    for (const tree of this.trees) {
      result.push(...tree.getInteractables());
    }
    return result;
  }

  public clearHighlights(): void {
    for (const tree of this.trees) {
      tree.setHighlight(false);
    }
  }

  public getTreeByObject(obj: THREE.Object3D): Tree | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData && current.userData.tree) {
        return current.userData.tree as Tree;
      }
      current = current.parent;
    }
    return null;
  }
}
