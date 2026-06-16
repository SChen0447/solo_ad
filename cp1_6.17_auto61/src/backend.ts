export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ResidueInfo {
  name: string;
  index: number;
  type: 'nonpolar' | 'polar' | 'acidic' | 'basic';
  sidechain_color: [number, number, number];
  backbone_color: [number, number, number] | null;
}

export interface KeyFrame {
  progress: number;
  ca_coords: number[][];
  sidechain_coords: number[][];
  phis: number[];
  psis: number[];
}

export interface FoldResponse {
  sequence_name: string;
  sequence_type: 'alpha' | 'beta' | 'coil';
  n_residues: number;
  residues: ResidueInfo[];
  keyframes: KeyFrame[];
  target_phis: number[];
  target_psis: number[];
}

export interface SequenceInfo {
  id: number;
  name: string;
  type: string;
  length: number;
}

export class BackendClient {
  private baseUrl = '/api';

  constructor(baseUrl?: string) {
    if (baseUrl) this.baseUrl = baseUrl;
  }

  async getFoldData(sequenceId: number): Promise<FoldResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/fold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sequence_id: sequenceId }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data as FoldResponse;
    } catch (error) {
      console.warn('后端API不可用，使用内置模拟数据:', error);
      return this.getMockFoldData(sequenceId);
    }
  }

  async getSequences(): Promise<SequenceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sequences`);
      if (!response.ok) throw new Error('Failed');
      return await response.json();
    } catch {
      return [
        { id: 0, name: '纯α-螺旋（丙氨酸）', type: 'alpha', length: 15 },
        { id: 1, name: 'β-折叠（缬氨酸-丝氨酸交替）', type: 'beta', length: 16 },
        { id: 2, name: '随机卷曲（甘氨酸-脯氨酸）', type: 'coil', length: 16 },
      ];
    }
  }

  private getMockFoldData(seqId: number): FoldResponse {
    const configs = [
      { name: '纯α-螺旋（丙氨酸）', type: 'alpha' as const, residues: Array(15).fill('ALA'), phi: -57, psi: -47 },
      { name: 'β-折叠（缬氨酸-丝氨酸交替）', type: 'beta' as const, residues: Array(16).fill(0).map((_, i) => i % 2 === 0 ? 'VAL' : 'SER'), phi: -139, psi: 135 },
      { name: '随机卷曲（甘氨酸-脯氨酸）', type: 'coil' as const, residues: Array(16).fill(0).map((_, i) => i % 2 === 0 ? 'GLY' : 'PRO'), phi: 0, psi: 0 },
    ];

    const cfg = configs[seqId] || configs[0];
    const n = cfg.residues.length;
    const targetPhis = new Array(n).fill(0);
    const targetPsis = new Array(n).fill(0);

    if (cfg.type === 'coil') {
      const seed = seqId * 1000;
      for (let i = 1; i < n - 1; i++) {
        targetPhis[i] = ((Math.sin(seed + i * 13.37) + 1) * 120) - 120;
        targetPsis[i] = ((Math.cos(seed + i * 7.91) + 1) * 150) - 150;
      }
    } else {
      for (let i = 1; i < n - 1; i++) {
        targetPhis[i] = cfg.phi;
        targetPsis[i] = cfg.psi;
      }
    }

    const linear = this.generateLinearChain(n);
    const progresses = [0.0, 0.25, 0.5, 0.75, 1.0];
    const keyframes: KeyFrame[] = progresses.map(p => {
      const coords = this.foldChain(linear, targetPhis, targetPsis, p);
      const phis = targetPhis.map(v => this.normalizeAngle(v * p));
      const psis = targetPsis.map(v => this.normalizeAngle(v * p));
      const sidechains = this.generateSidechains(coords, cfg.residues);
      return { progress: p, ca_coords: coords, sidechain_coords: sidechains, phis, psis };
    });

    const resTypes: Record<string, ResidueInfo['type']> = {
      ALA: 'nonpolar', VAL: 'nonpolar', SER: 'polar', GLY: 'nonpolar', PRO: 'nonpolar',
    };
    const typeColors: Record<ResidueInfo['type'], [number, number, number]> = {
      nonpolar: [1, 1, 1], polar: [0.2, 0.9, 0.3], acidic: [1, 0.2, 0.2], basic: [0.2, 0.4, 1],
    };
    const residues: ResidueInfo[] = cfg.residues.map((r, i) => ({
      name: r,
      index: i,
      type: resTypes[r] || 'nonpolar',
      sidechain_color: typeColors[resTypes[r] || 'nonpolar'],
      backbone_color: null,
    }));

    return {
      sequence_name: cfg.name,
      sequence_type: cfg.type,
      n_residues: n,
      residues,
      keyframes,
      target_phis: targetPhis,
      target_psis: targetPsis,
    };
  }

  private generateLinearChain(n: number): number[][] {
    const coords: number[][] = [];
    const bondLen = 3.8;
    for (let i = 0; i < n; i++) {
      coords.push([i * bondLen, 0, 0]);
    }
    return coords;
  }

  private normalizeAngle(deg: number): number {
    let d = deg;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  private vSub(a: number[], b: number[]): number[] { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  private vAdd(a: number[], b: number[]): number[] { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  private vScale(v: number[], s: number): number[] { return [v[0] * s, v[1] * s, v[2] * s]; }
  private vLen(v: number[]): number { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
  private vNorm(v: number[]): number[] { const l = this.vLen(v); return l < 1e-10 ? [0, 0, 0] : this.vScale(v, 1 / l); }
  private vCross(a: number[], b: number[]): number[] { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  private deg2rad(d: number): number { return d * Math.PI / 180; }

  private rotMat(axis: number[], angle: number): number[][] {
    const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    const [x, y, z] = axis;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  }

  private matVec(m: number[][], v: number[]): number[] {
    return [
      m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
      m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
      m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ];
  }

  private applyRotation(coords: number[][], startIdx: number, pivot: number[], axis: number[], angleDeg: number): number[][] {
    const mat = this.rotMat(axis, this.deg2rad(angleDeg));
    const newCoords = coords.map(c => [...c]);
    for (let j = startIdx; j < newCoords.length; j++) {
      const rel = this.vSub(newCoords[j], pivot);
      const rot = this.matVec(mat, rel);
      newCoords[j] = this.vAdd(pivot, rot);
    }
    return newCoords;
  }

  private foldChain(linear: number[][], tPhis: number[], tPsis: number[], progress: number): number[][] {
    const n = linear.length;
    let coords = linear.map(c => [...c]);

    for (let i = 1; i < n - 1; i++) {
      const tPhi = tPhis[i] * progress;
      const tPsi = tPsis[i] * progress;

      if (i < n - 2) {
        const pivot = coords[i];
        const axis = this.vNorm(this.vSub(coords[i + 1], pivot));
        coords = this.applyRotation(coords, i + 2, pivot, axis, tPhi);
      }

      if (i > 0) {
        const pivot = coords[i];
        const prevAxis = this.vNorm(this.vSub(pivot, coords[i - 1]));
        coords = this.applyRotation(coords, i + 1, pivot, prevAxis, tPsi);
      }
    }

    return coords;
  }

  private generateSidechains(coords: number[][], residues: string[]): number[][] {
    const sidechainLens: Record<string, number> = { ALA: 1.0, VAL: 1.3, SER: 1.2, GLY: 0.5, PRO: 1.1 };
    return coords.map((c, i) => {
      const n = coords.length;
      let bondDir: number[];
      if (i < n - 1) {
        bondDir = this.vNorm(this.vSub(coords[i + 1], c));
      } else {
        bondDir = this.vNorm(this.vSub(c, coords[i - 1]));
      }
      const up = [0, 1, 0];
      let perp = this.vCross(bondDir, up);
      if (this.vLen(perp) < 0.1) perp = [0, 0, 1];
      perp = this.vNorm(perp);
      const len = sidechainLens[residues[i]] || 1.0;
      return this.vAdd(c, this.vScale(perp, len));
    });
  }
}
