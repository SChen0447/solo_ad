import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import * as THREE from 'three';

export type BooleanMode = 'union' | 'intersect' | 'subtract';

export class BooleanEngine {
  private evaluator: Evaluator;

  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.attributes = ['position', 'normal'];
    this.evaluator.useGroups = false;
  }

  evaluate(
    geometryA: THREE.BufferGeometry,
    matrixA: THREE.Matrix4,
    geometryB: THREE.BufferGeometry,
    matrixB: THREE.Matrix4,
    mode: BooleanMode
  ): THREE.BufferGeometry | null {
    try {
      const brushA = new Brush(geometryA);
      brushA.matrixAutoUpdate = false;
      brushA.matrixWorld.copy(matrixA);
      brushA.matrix.copy(matrixA);

      const brushB = new Brush(geometryB);
      brushB.matrixAutoUpdate = false;
      brushB.matrixWorld.copy(matrixB);
      brushB.matrix.copy(matrixB);

      const operation = this.mapMode(mode);
      const result = this.evaluator.evaluate(brushA, brushB, operation);

      if (result && result.geometry) {
        result.geometry.computeVertexNormals();
        return result.geometry;
      }
      return null;
    } catch (e) {
      console.warn('BooleanEngine: CSG evaluation failed', e);
      return null;
    }
  }

  private mapMode(mode: BooleanMode): number {
    switch (mode) {
      case 'union':
        return ADDITION;
      case 'intersect':
        return INTERSECTION;
      case 'subtract':
        return SUBTRACTION;
      default:
        return ADDITION;
    }
  }
}
