import { Atom, AlignmentResult } from '@/types';

export class AlignAnalyzer {
  private threshold: number = 0.5;

  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  getThreshold(): number {
    return this.threshold;
  }

  align(coords1: number[][], coords2: number[][]): AlignmentResult {
    const n = Math.min(coords1.length, coords2.length);
    
    if (n < 3) {
      return this.calculateOffsets(coords1, coords2);
    }

    const centroid1 = this.calculateCentroid(coords1, n);
    const centroid2 = this.calculateCentroid(coords2, n);

    const centered1 = this.centerCoords(coords1, centroid1, n);
    const centered2 = this.centerCoords(coords2, centroid2, n);

    const H = this.calculateCrossCovariance(centered1, centered2, n);
    const { rotation, reflection } = this.kabschAlgorithm(H);

    const translatedCentroid = this.transformPoint(centroid2, rotation, centroid1);
    const translation = [
      centroid1[0] - translatedCentroid[0],
      centroid1[1] - translatedCentroid[1],
      centroid1[2] - translatedCentroid[2],
    ];

    const transformedCoords2 = centered2.map((coord) => 
      this.transformPoint(coord, rotation, translation)
    );

    const offsets: { offset: number; index: number }[] = [];
    let sumSq = 0;

    for (let i = 0; i < n; i++) {
      const dx = centered1[i][0] - transformedCoords2[i][0];
      const dy = centered1[i][1] - transformedCoords2[i][1];
      const dz = centered1[i][2] - transformedCoords2[i][2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      sumSq += distance * distance;
      offsets.push({ offset: distance, index: i });
    }

    const rmsd = Math.sqrt(sumSq / n);

    const diffIndices = offsets
      .filter(o => o.offset > this.threshold)
      .map(o => o.index);

    return {
      offsets,
      rmsd,
      diffIndices,
      transformation: {
        rotation,
        translation,
      },
    };
  }

  private calculateOffsets(coords1: number[][], coords2: number[][]): AlignmentResult {
    const n = Math.min(coords1.length, coords2.length);
    const offsets: { offset: number; index: number }[] = [];
    let sumSq = 0;

    for (let i = 0; i < n; i++) {
      const dx = coords1[i][0] - coords2[i][0];
      const dy = coords1[i][1] - coords2[i][1];
      const dz = coords1[i][2] - coords2[i][2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      sumSq += distance * distance;
      offsets.push({ offset: distance, index: i });
    }

    const rmsd = n > 0 ? Math.sqrt(sumSq / n) : 0;
    const diffIndices = offsets
      .filter(o => o.offset > this.threshold)
      .map(o => o.index);

    return { offsets, rmsd, diffIndices };
  }

  private calculateCentroid(coords: number[][], n: number): number[] {
    let sumX = 0, sumY = 0, sumZ = 0;
    for (let i = 0; i < n; i++) {
      sumX += coords[i][0];
      sumY += coords[i][1];
      sumZ += coords[i][2];
    }
    return [sumX / n, sumY / n, sumZ / n];
  }

  private centerCoords(coords: number[][], centroid: number[], n: number): number[][] {
    const centered: number[][] = [];
    for (let i = 0; i < n; i++) {
      centered.push([
        coords[i][0] - centroid[0],
        coords[i][1] - centroid[1],
        coords[i][2] - centroid[2],
      ]);
    }
    return centered;
  }

  private calculateCrossCovariance(A: number[][], B: number[][], n: number): number[][] {
    const H: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          H[j][k] += A[i][j] * B[i][k];
        }
      }
    }

    return H;
  }

  private kabschAlgorithm(H: number[][]): { rotation: number[][]; reflection: boolean } {
    const { U, S, Vt } = this.svd3x3(H);
    const V = this.transpose3x3(Vt);
    const Ut = this.transpose3x3(U);

    let d = this.determinant3x3(V) * this.determinant3x3(Ut);
    
    if (d < 0) {
      V[0][2] = -V[0][2];
      V[1][2] = -V[1][2];
      V[2][2] = -V[2][2];
      d = -d;
    }

    const rotation = this.multiply3x3(V, Ut);

    return {
      rotation,
      reflection: d < 0,
    };
  }

  private svd3x3(A: number[][]): { U: number[][]; S: number[]; Vt: number[][] } {
    const AtA = this.multiply3x3(this.transpose3x3(A), A);
    const AAt = this.multiply3x3(A, this.transpose3x3(A));

    const { eigenvalues: eigVals, eigenvectors: V } = this.eigen3x3(AtA);
    const { eigenvectors: U } = this.eigen3x3(AAt);

    const S = eigVals.map(v => Math.sqrt(Math.max(0, v)));

    const sortedIndices = [0, 1, 2].sort((a, b) => S[b] - S[a]);
    
    const sortedS = sortedIndices.map(i => S[i]);
    const sortedV = [
      [V[0][sortedIndices[0]], V[0][sortedIndices[1]], V[0][sortedIndices[2]]],
      [V[1][sortedIndices[0]], V[1][sortedIndices[1]], V[1][sortedIndices[2]]],
      [V[2][sortedIndices[0]], V[2][sortedIndices[1]], V[2][sortedIndices[2]]],
    ];
    const sortedU = [
      [U[0][sortedIndices[0]], U[0][sortedIndices[1]], U[0][sortedIndices[2]]],
      [U[1][sortedIndices[0]], U[1][sortedIndices[1]], U[1][sortedIndices[2]]],
      [U[2][sortedIndices[0]], U[2][sortedIndices[1]], U[2][sortedIndices[2]]],
    ];

    const Vt = this.transpose3x3(sortedV);

    return { U: sortedU, S: sortedS, Vt };
  }

  private eigen3x3(A: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const a = A[0][0], b = A[0][1], c = A[0][2];
    const d = A[1][0], e = A[1][1], f = A[1][2];
    const g = A[2][0], h = A[2][1], i = A[2][2];

    const p1 = b * b + c * c + f * f;
    
    if (p1 === 0) {
      const eigenvalues = [a, e, i].sort((x, y) => y - x);
      const eigenvectors = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      return { eigenvalues, eigenvectors };
    }

    const q = (a + e + i) / 3;
    const p2 = (a - q) * (a - q) + (e - q) * (e - q) + (i - q) * (i - q) + 2 * p1;
    const p = Math.sqrt(p2 / 6);
    
    const B = [
      [(a - q) / p, b / p, c / p],
      [d / p, (e - q) / p, f / p],
      [g / p, h / p, (i - q) / p],
    ];
    
    const r = this.determinant3x3(B) / 2;

    let phi: number;
    if (r <= -1) {
      phi = Math.PI / 3;
    } else if (r >= 1) {
      phi = 0;
    } else {
      phi = Math.acos(r) / 3;
    }

    const eig1 = q + 2 * p * Math.cos(phi);
    const eig2 = q + 2 * p * Math.cos(phi + (2 * Math.PI / 3));
    const eig3 = q + 2 * p * Math.cos(phi + (4 * Math.PI / 3));

    const eigenvalues = [eig1, eig2, eig3].sort((x, y) => y - x);
    
    const eigenvectors = eigenvalues.map(eig => 
      this.findEigenvector(A, eig)
    );

    return { eigenvalues, eigenvectors };
  }

  private findEigenvector(A: number[][], eigenvalue: number): number[] {
    const B = [
      [A[0][0] - eigenvalue, A[0][1], A[0][2]],
      [A[1][0], A[1][1] - eigenvalue, A[1][2]],
      [A[2][0], A[2][1], A[2][2] - eigenvalue],
    ];

    const v1 = this.crossProduct(B[0], B[1]);
    const v2 = this.crossProduct(B[0], B[2]);
    const v3 = this.crossProduct(B[1], B[2]);

    let best = v1;
    let bestLen = this.vectorLength(v1);

    if (this.vectorLength(v2) > bestLen) {
      best = v2;
      bestLen = this.vectorLength(v2);
    }
    if (this.vectorLength(v3) > bestLen) {
      best = v3;
      bestLen = this.vectorLength(v3);
    }

    if (bestLen < 1e-10) {
      return [1, 0, 0];
    }

    return this.normalizeVector(best);
  }

  private crossProduct(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private vectorLength(v: number[]): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  private normalizeVector(v: number[]): number[] {
    const len = this.vectorLength(v);
    if (len < 1e-10) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  private transpose3x3(M: number[][]): number[][] {
    return [
      [M[0][0], M[1][0], M[2][0]],
      [M[0][1], M[1][1], M[2][1]],
      [M[0][2], M[1][2], M[2][2]],
    ];
  }

  private multiply3x3(A: number[][], B: number[][]): number[][] {
    return [
      [
        A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
        A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
        A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
      ],
      [
        A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
        A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
        A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
      ],
      [
        A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
        A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
        A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2],
      ],
    ];
  }

  private determinant3x3(M: number[][]): number {
    return (
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
      M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
      M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    );
  }

  private transformPoint(
    point: number[],
    rotation: number[][],
    translation: number[]
  ): number[] {
    return [
      rotation[0][0] * point[0] + rotation[0][1] * point[1] + rotation[0][2] * point[2] + translation[0],
      rotation[1][0] * point[0] + rotation[1][1] * point[1] + rotation[1][2] * point[2] + translation[1],
      rotation[2][0] * point[0] + rotation[2][1] * point[1] + rotation[2][2] * point[2] + translation[2],
    ];
  }

  atomsToCoords(atoms: Atom[]): number[][] {
    return atoms.map(atom => [atom.x, atom.y, atom.z]);
  }
}
