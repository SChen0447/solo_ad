import * as THREE from 'three';
import { ControlPoint, TubeParams } from './types';
import { CurveManager, CurveObject3D } from './curveManager';

export class TubeGenerator {
  private curveManager: CurveManager;

  constructor(curveManager: CurveManager) {
    this.curveManager = curveManager;
  }

  private buildCatmullRom(points: ControlPoint[]): THREE.CatmullRomCurve3 {
    const vectors = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5);
  }

  generateForCurve(obj: CurveObject3D): void {
    if (obj.controlPoints.length < 2) return;

    if (obj.tubeMesh) {
      obj.group.remove(obj.tubeMesh);
      obj.tubeMesh.geometry.dispose();
      (obj.tubeMesh.material as THREE.Material).dispose();
      obj.tubeMesh = null;
    }

    const curve = this.buildCatmullRom(obj.controlPoints);
    const tubularSeg = Math.max(6, obj.params.tubularSegments * Math.max(1, obj.controlPoints.length - 1));

    const geometry = new THREE.TubeGeometry(
      curve,
      tubularSeg,
      obj.params.radius,
      obj.params.radialSegments,
      false
    );

    this.applyUVTiling(geometry, obj.params.uvTiling);
    geometry.computeVertexNormals();

    const color = new THREE.Color(obj.params.color);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { curveId: obj.id, originalColor: obj.params.color };

    obj.tubeMesh = mesh;
    obj.group.add(mesh);
    obj.originalColor = color.clone();

    this.curveManager.updateOutline(obj);
  }

  private applyUVTiling(geometry: THREE.BufferGeometry, tiling: number): void {
    if (tiling <= 1) return;
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    if (!uv) return;

    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i) * tiling;
      uv.setX(i, u);
    }
    uv.needsUpdate = true;
  }

  regenerateById(id: string): boolean {
    const obj = this.curveManager.getCurveById(id);
    if (!obj) return false;
    this.generateForCurve(obj);
    return true;
  }

  regenerateSelected(): boolean {
    const obj = this.curveManager.getSelectedCurve();
    if (!obj) return false;
    this.generateForCurve(obj);
    return true;
  }

  regenerateAll(): void {
    this.curveManager['curves'].forEach((obj: CurveObject3D) => {
      this.generateForCurve(obj);
    });
  }

  setHovered(obj: CurveObject3D, hovered: boolean): void {
    if (!obj.tubeMesh || obj.isHovered === hovered) return;
    obj.isHovered = hovered;
    const material = obj.tubeMesh.material as THREE.MeshStandardMaterial;

    if (hovered) {
      const warmColor = obj.originalColor.clone();
      warmColor.offsetHSL(0.02, 0.08, 0.12);
      material.color.copy(warmColor);
      material.emissive = new THREE.Color(0xffaa44);
      material.emissiveIntensity = 0.12;
      material.needsUpdate = true;
    } else {
      material.color.copy(obj.originalColor);
      material.emissive = new THREE.Color(0x000000);
      material.emissiveIntensity = 0;
      material.needsUpdate = true;
    }
  }

  getTooltipData(obj: CurveObject3D): { name: string; radius: number; segments: number } {
    return {
      name: obj.name,
      radius: obj.params.radius,
      segments: obj.params.tubularSegments
    };
  }
}
