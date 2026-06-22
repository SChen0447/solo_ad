import * as THREE from 'three';
import { Atom, Bond, DisplayMode, CPK_COLORS, ATOM_RADII, MoleculeGroup } from '@/types';

export class MoleculeBuilder {
  private readonly WIREFRAME_COLOR = 0x60A5FA;
  private readonly BOND_RADIUS = 0.15;

  build(
    atoms: Atom[],
    bonds: Bond[],
    mode: DisplayMode,
    moleculeId: string,
    moleculeName: string
  ): MoleculeGroup {
    const group = new THREE.Group() as MoleculeGroup;
    const atomMeshes = new Map<number, THREE.Mesh>();

    group.userData = {
      moleculeId,
      moleculeName,
      mode,
      atoms,
      bonds,
      atomMeshes,
    };

    if (mode === 'wireframe') {
      this.buildWireframe(atoms, bonds, group, atomMeshes);
    } else {
      this.buildStick(atoms, bonds, group, atomMeshes);
    }

    return group;
  }

  private buildWireframe(
    atoms: Atom[],
    bonds: Bond[],
    group: MoleculeGroup,
    atomMeshes: Map<number, THREE.Mesh>
  ): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color(this.WIREFRAME_COLOR);

    for (const bond of bonds) {
      const atom1 = atoms[bond.atom1];
      const atom2 = atoms[bond.atom2];
      
      positions.push(atom1.x, atom1.y, atom1.z);
      positions.push(atom2.x, atom2.y, atom2.z);
      
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute.fromArray(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute.fromArray(colors, 3));

    const material = new THREE.LineBasicMaterial({
      color: this.WIREFRAME_COLOR,
      vertexColors: true,
      transparent: true,
      opacity: 1,
    });

    const lineSegments = new THREE.LineSegments(geometry, material);
    group.add(lineSegments);
    group.userData.bondSegments = lineSegments;

    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    
    for (const atom of atoms) {
      const atomColor = new THREE.Color(CPK_COLORS[atom.type] || '#888888');
      const sphereMaterial = new THREE.MeshPhongMaterial({
        color: atomColor,
        transparent: true,
        opacity: 1,
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(atom.x, atom.y, atom.z);
      sphere.userData = {
        atomIndex: atom.index,
        atomType: atom.type,
        moleculeId: group.userData.moleculeId,
        moleculeName: group.userData.moleculeName,
        isAtom: true,
      };
      atomMeshes.set(atom.index, sphere);
      group.add(sphere);
    }
  }

  private buildStick(
    atoms: Atom[],
    bonds: Bond[],
    group: MoleculeGroup,
    atomMeshes: Map<number, THREE.Mesh>
  ): void {
    const sphereGeometries: Map<string, THREE.SphereGeometry> = new Map();
    
    for (const atom of atoms) {
      const radius = ATOM_RADII[atom.type] || 0.4;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      sphereGeometries.set(atom.type, geometry);
    }

    for (const atom of atoms) {
      const atomColor = new THREE.Color(CPK_COLORS[atom.type] || '#888888');
      const radius = ATOM_RADII[atom.type] || 0.4;
      const geometry = sphereGeometries.get(atom.type) || new THREE.SphereGeometry(radius, 32, 32);
      
      const material = new THREE.MeshPhongMaterial({
        color: atomColor,
        shininess: 50,
        transparent: true,
        opacity: 1,
      });
      
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(atom.x, atom.y, atom.z);
      sphere.userData = {
        atomIndex: atom.index,
        atomType: atom.type,
        moleculeId: group.userData.moleculeId,
        moleculeName: group.userData.moleculeName,
        isAtom: true,
        baseRadius: radius,
      };
      
      atomMeshes.set(atom.index, sphere);
      group.add(sphere);
    }

    const cylinderGeometry = new THREE.CylinderGeometry(this.BOND_RADIUS, this.BOND_RADIUS, 1, 8);
    
    for (const bond of bonds) {
      const atom1 = atoms[bond.atom1];
      const atom2 = atoms[bond.atom2];
      
      const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
      const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      
      const material = new THREE.MeshPhongMaterial({
        color: this.WIREFRAME_COLOR,
        transparent: true,
        opacity: 1,
      });
      
      const cylinder = new THREE.Mesh(cylinderGeometry, material);
      cylinder.scale.y = length;
      
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      cylinder.position.copy(midPoint);
      
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      quaternion.setFromUnitVectors(up, direction.clone().normalize());
      cylinder.quaternion.copy(quaternion);
      
      cylinder.userData = {
        isBond: true,
        atom1: bond.atom1,
        atom2: bond.atom2,
        moleculeId: group.userData.moleculeId,
      };
      
      group.add(cylinder);
    }
  }

  buildDiffMarker(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.3, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.6,
      emissive: 0xef4444,
      emissiveIntensity: 0.3,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.userData = {
      isDiffMarker: true,
      blinkSpeed: 0.5,
      blinkPhase: Math.random() * Math.PI * 2,
    };
    return marker;
  }

  static animateDiffMarkers(
    diffMarkers: THREE.Group, time: number, speedMultiplier: number = 1
  ): void {
    diffMarkers.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.userData.isDiffMarker) {
        const blinkSpeed = mesh.userData.blinkSpeed || 0.5;
        const phase = time * (2 * Math.PI / blinkSpeed) + (mesh.userData.blinkPhase || 0);
        const opacity = 0.3 + 0.3 * (1 + Math.sin(phase * speedMultiplier)) / 2;
        const material = mesh.material as THREE.MeshPhongMaterial;
        material.opacity = opacity;
      }
    });
  }

  static async transitionMode(
    oldGroup: MoleculeGroup,
    newGroup: MoleculeGroup,
    duration: number = 300
  ): Promise<void> {
    const startTime = performance.now();
    
    oldGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        (obj.material as THREE.Material).transparent = true;
      }
    });
    
    newGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const material = obj.material as THREE.Material;
        material.transparent = true;
        material.opacity = 0;
      }
    });
    newGroup.scale.set(0.5, 0.5, 0.5);

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOut(progress);

        oldGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            (obj.material as THREE.Material).opacity = 1 - eased;
          }
        });
        oldGroup.scale.setScalar(1 - eased * 0.5);

        newGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            (obj.material as THREE.Material).opacity = eased;
          }
        });
        newGroup.scale.setScalar(0.5 + eased * 0.5);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          oldGroup.visible = false;
          resolve();
        }
      };
      animate();
    });
  }

  private static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  static highlightAtom(mesh: THREE.Mesh): void {
    if (!mesh.userData.highlighted) {
      const material = mesh.material as THREE.MeshPhongMaterial;
      mesh.userData.highlighted = true;
      mesh.userData.originalColor = material.color.clone();
      mesh.userData.originalScale = mesh.scale.clone();
      
      const brighterColor = material.color.clone().multiplyScalar(1.3);
      material.color.copy(brighterColor);
      mesh.scale.multiplyScalar(1.2);
      material.emissive = new THREE.Color(0x60A5FA);
      material.emissiveIntensity = 0.3;
    }
  }

  static unhighlightAtom(mesh: THREE.Mesh): void {
    if (mesh.userData.highlighted) {
      const material = mesh.material as THREE.MeshPhongMaterial;
      mesh.userData.highlighted = false;
      
      if (mesh.userData.originalColor) {
        material.color.copy(mesh.userData.originalColor);
      }
      if (mesh.userData.originalScale) {
        mesh.scale.copy(mesh.userData.originalScale);
      }
      material.emissiveIntensity = 0;
    }
  }
}
