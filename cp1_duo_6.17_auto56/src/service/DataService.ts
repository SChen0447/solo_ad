import axios, { AxiosInstance } from 'axios';

export interface Atom {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  from: number;
  to: number;
  type: number;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  description: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface MoleculeListItem {
  id: string;
  name: string;
  formula: string;
  description: string;
  atom_count: number;
  bond_count: number;
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
}

export interface SavedMarker {
  id: number;
  moleculeId: string;
  moleculeName: string;
  cameraPosition: CameraState;
  cameraRotation: CameraState;
  zoom: number;
  note: string;
  createdAt: string;
}

export const ELEMENT_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x333333,
  N: 0x3050f8,
  O: 0xff0d0d,
  F: 0x90e050,
  P: 0xff8000,
  S: 0xffff30,
  Cl: 0x1ff01f,
  Br: 0xa62929,
  I: 0x940094,
  He: 0xd9ffff,
  Ne: 0xb3e3f5,
  Ar: 0x84d1f0,
  B: 0xffa500,
  Si: 0xdac28a
};

export const ELEMENT_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.5,
  N: 0.45,
  O: 0.42,
  F: 0.4,
  P: 0.6,
  S: 0.58,
  Cl: 0.55,
  Br: 0.65,
  I: 0.75,
  He: 0.28,
  Ne: 0.38,
  Ar: 0.5,
  B: 0.46,
  Si: 0.62
};

export const ELEMENT_NAMES: Record<string, string> = {
  H: '氢',
  C: '碳',
  N: '氮',
  O: '氧',
  F: '氟',
  P: '磷',
  S: '硫',
  Cl: '氯',
  Br: '溴',
  I: '碘',
  He: '氦',
  Ne: '氖',
  Ar: '氩',
  B: '硼',
  Si: '硅'
};

export const BOND_COLORS: Record<number, number> = {
  1: 0x888888,
  2: 0xaaaaaa,
  3: 0xcccccc
};

const DEFAULT_API_BASE = 'http://localhost:5000';

export class DataService {
  private client: AxiosInstance;
  private useMock: boolean = false;

  constructor(apiBase?: string) {
    const base = apiBase || DEFAULT_API_BASE;
    this.client = axios.create({
      baseURL: base,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.checkBackend();
  }

  private async checkBackend(): Promise<void> {
    try {
      await this.client.get('/api/health');
      this.useMock = false;
    } catch {
      this.useMock = true;
      console.warn('[DataService] 后端未启动，使用内置模拟数据');
    }
  }

  async getMoleculesList(): Promise<MoleculeListItem[]> {
    if (this.useMock) {
      return this.getMockMoleculesList();
    }
    try {
      const response = await this.client.get<MoleculeListItem[]>('/api/molecules');
      return response.data;
    } catch (error) {
      console.warn('[DataService] 获取分子列表失败，使用模拟数据:', error);
      this.useMock = true;
      return this.getMockMoleculesList();
    }
  }

  async getMolecule(id: string): Promise<MoleculeData | null> {
    if (this.useMock) {
      return this.getMockMolecule(id);
    }
    try {
      const response = await this.client.get<MoleculeData>(`/api/molecule/${id}`);
      return response.data;
    } catch (error) {
      console.warn('[DataService] 获取分子数据失败，使用模拟数据:', error);
      this.useMock = true;
      return this.getMockMolecule(id);
    }
  }

  async saveMarker(data: {
    moleculeId: string;
    cameraPosition: CameraState;
    cameraRotation: CameraState;
    zoom: number;
    note?: string;
  }): Promise<{ success: boolean; marker?: SavedMarker; total: number }> {
    const payload = {
      ...data,
      createdAt: new Date().toISOString()
    };
    if (this.useMock) {
      return this.saveMockMarker(payload);
    }
    try {
      const response = await this.client.post('/api/save-molecule', payload);
      return response.data;
    } catch (error) {
      console.warn('[DataService] 保存标记失败:', error);
      return this.saveMockMarker(payload);
    }
  }

  async getMarkers(moleculeId?: string): Promise<SavedMarker[]> {
    if (this.useMock) {
      return this.getMockMarkers(moleculeId);
    }
    try {
      const params = moleculeId ? { moleculeId } : {};
      const response = await this.client.get<SavedMarker[]>('/api/markers', { params });
      return response.data;
    } catch (error) {
      console.warn('[DataService] 获取标记失败:', error);
      return this.getMockMarkers(moleculeId);
    }
  }

  getElementColor(element: string): number {
    return ELEMENT_COLORS[element] || 0x888888;
  }

  getElementRadius(element: string): number {
    return ELEMENT_RADII[element] || 0.4;
  }

  getElementName(element: string): string {
    return ELEMENT_NAMES[element] || element;
  }

  private mockMarkers: SavedMarker[] = [];

  private saveMockMarker(payload: any): { success: boolean; marker?: SavedMarker; total: number } {
    const marker: SavedMarker = {
      id: this.mockMarkers.length + 1,
      ...payload
    };
    this.mockMarkers.push(marker);
    return { success: true, marker, total: this.mockMarkers.length };
  }

  private getMockMarkers(moleculeId?: string): SavedMarker[] {
    if (moleculeId) {
      return this.mockMarkers.filter(m => m.moleculeId === moleculeId);
    }
    return this.mockMarkers;
  }

  private getMockMoleculesList(): MoleculeListItem[] {
    return [
      { id: 'water', name: '水 (H₂O)', formula: 'H2O', description: '水分子，生命之源', atom_count: 3, bond_count: 2 },
      { id: 'methane', name: '甲烷 (CH₄)', formula: 'CH4', description: '最简单的烷烃，天然气主要成分', atom_count: 5, bond_count: 4 },
      { id: 'ammonia', name: '氨 (NH₃)', formula: 'NH3', description: '氨分子，三角锥形结构', atom_count: 4, bond_count: 3 },
      { id: 'co2', name: '二氧化碳 (CO₂)', formula: 'CO2', description: '线性分子，温室气体', atom_count: 3, bond_count: 2 },
      { id: 'ethanol', name: '乙醇 (C₂H₆O)', formula: 'C2H6O', description: '酒精，常见有机溶剂', atom_count: 9, bond_count: 8 },
      { id: 'benzene', name: '苯 (C₆H₆)', formula: 'C6H6', description: '芳香烃，平面六元环', atom_count: 12, bond_count: 12 },
      { id: 'caffeine', name: '咖啡因 (C₈H₁₀N₄O₂)', formula: 'C8H10N4O2', description: '生物碱，中枢神经兴奋剂', atom_count: 24, bond_count: 25 },
      { id: 'acetic-acid', name: '乙酸 (C₂H₄O₂)', formula: 'C2H4O2', description: '食醋的主要成分', atom_count: 8, bond_count: 7 },
      { id: 'aspirin', name: '阿司匹林 (C₉H₈O₄)', formula: 'C9H8O4', description: '乙酰水杨酸，常用解热镇痛药', atom_count: 21, bond_count: 21 },
      { id: 'glucose', name: '葡萄糖 (C₆H₁₂O₆)', formula: 'C6H12O6', description: '人体重要能量来源，六元环结构', atom_count: 24, bond_count: 24 }
    ];
  }

  private getMockMolecule(id: string): MoleculeData | null {
    const mockDB: Record<string, MoleculeData> = {
      water: {
        id: 'water', name: '水 (H₂O)', formula: 'H2O', description: '水分子，生命之源',
        atoms: [
          { element: 'O', x: 0.0, y: 0.0, z: 0.0 },
          { element: 'H', x: 0.757, y: 0.586, z: 0.0 },
          { element: 'H', x: -0.757, y: 0.586, z: 0.0 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 },
          { from: 0, to: 2, type: 1 }
        ]
      },
      methane: {
        id: 'methane', name: '甲烷 (CH₄)', formula: 'CH4', description: '最简单的烷烃',
        atoms: [
          { element: 'C', x: 0.0, y: 0.0, z: 0.0 },
          { element: 'H', x: 0.629, y: 0.629, z: 0.629 },
          { element: 'H', x: -0.629, y: -0.629, z: 0.629 },
          { element: 'H', x: -0.629, y: 0.629, z: -0.629 },
          { element: 'H', x: 0.629, y: -0.629, z: -0.629 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 0, to: 2, type: 1 },
          { from: 0, to: 3, type: 1 }, { from: 0, to: 4, type: 1 }
        ]
      },
      ammonia: {
        id: 'ammonia', name: '氨 (NH₃)', formula: 'NH3', description: '氨分子',
        atoms: [
          { element: 'N', x: 0.0, y: 0.0, z: 0.0 },
          { element: 'H', x: 0.938, y: -0.313, z: 0.0 },
          { element: 'H', x: -0.469, y: -0.313, z: 0.812 },
          { element: 'H', x: -0.469, y: -0.313, z: -0.812 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 0, to: 2, type: 1 }, { from: 0, to: 3, type: 1 }
        ]
      },
      co2: {
        id: 'co2', name: '二氧化碳 (CO₂)', formula: 'CO2', description: '线性分子',
        atoms: [
          { element: 'C', x: 0.0, y: 0.0, z: 0.0 },
          { element: 'O', x: 1.163, y: 0.0, z: 0.0 },
          { element: 'O', x: -1.163, y: 0.0, z: 0.0 }
        ],
        bonds: [
          { from: 0, to: 1, type: 2 }, { from: 0, to: 2, type: 2 }
        ]
      },
      ethanol: {
        id: 'ethanol', name: '乙醇 (C₂H₆O)', formula: 'C2H6O', description: '酒精',
        atoms: [
          { element: 'C', x: -0.726, y: -0.045, z: 0.0 },
          { element: 'C', x: 0.726, y: 0.045, z: 0.0 },
          { element: 'O', x: 1.447, y: -1.170, z: 0.0 },
          { element: 'H', x: -1.133, y: 0.486, z: 0.890 },
          { element: 'H', x: -1.133, y: 0.486, z: -0.890 },
          { element: 'H', x: -0.997, y: -1.080, z: 0.0 },
          { element: 'H', x: 1.130, y: 0.559, z: 0.890 },
          { element: 'H', x: 1.130, y: 0.559, z: -0.890 },
          { element: 'H', x: 2.367, y: -1.038, z: 0.0 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 1, to: 2, type: 1 },
          { from: 0, to: 3, type: 1 }, { from: 0, to: 4, type: 1 },
          { from: 0, to: 5, type: 1 }, { from: 1, to: 6, type: 1 },
          { from: 1, to: 7, type: 1 }, { from: 2, to: 8, type: 1 }
        ]
      },
      benzene: {
        id: 'benzene', name: '苯 (C₆H₆)', formula: 'C6H6', description: '芳香烃',
        atoms: [
          { element: 'C', x: 1.395, y: 0.0, z: 0.0 },
          { element: 'C', x: 0.697, y: 1.208, z: 0.0 },
          { element: 'C', x: -0.697, y: 1.208, z: 0.0 },
          { element: 'C', x: -1.395, y: 0.0, z: 0.0 },
          { element: 'C', x: -0.697, y: -1.208, z: 0.0 },
          { element: 'C', x: 0.697, y: -1.208, z: 0.0 },
          { element: 'H', x: 2.481, y: 0.0, z: 0.0 },
          { element: 'H', x: 1.240, y: 2.150, z: 0.0 },
          { element: 'H', x: -1.240, y: 2.150, z: 0.0 },
          { element: 'H', x: -2.481, y: 0.0, z: 0.0 },
          { element: 'H', x: -1.240, y: -2.150, z: 0.0 },
          { element: 'H', x: 1.240, y: -2.150, z: 0.0 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 1, to: 2, type: 2 },
          { from: 2, to: 3, type: 1 }, { from: 3, to: 4, type: 2 },
          { from: 4, to: 5, type: 1 }, { from: 5, to: 0, type: 2 },
          { from: 0, to: 6, type: 1 }, { from: 1, to: 7, type: 1 },
          { from: 2, to: 8, type: 1 }, { from: 3, to: 9, type: 1 },
          { from: 4, to: 10, type: 1 }, { from: 5, to: 11, type: 1 }
        ]
      },
      caffeine: {
        id: 'caffeine', name: '咖啡因 (C₈H₁₀N₄O₂)', formula: 'C8H10N4O2', description: '生物碱',
        atoms: [
          { element: 'N', x: 0.970, y: -1.092, z: -0.117 },
          { element: 'C', x: 0.371, y: -0.080, z: 0.077 },
          { element: 'N', x: 1.484, y: 0.927, z: 0.013 },
          { element: 'C', x: 1.097, y: 2.200, z: 0.102 },
          { element: 'C', x: 2.943, y: 0.604, z: -0.178 },
          { element: 'C', x: -0.835, y: 0.203, z: 0.277 },
          { element: 'N', x: -1.625, y: -0.828, z: 0.278 },
          { element: 'C', x: -0.627, y: -1.886, z: 0.083 },
          { element: 'N', x: -2.776, y: 0.875, z: 0.495 },
          { element: 'C', x: -1.724, y: 1.452, z: 0.446 },
          { element: 'O', x: 0.501, y: 3.303, z: 0.188 },
          { element: 'O', x: -3.256, y: 1.919, z: 0.693 },
          { element: 'C', x: 2.158, y: -1.668, z: -0.285 },
          { element: 'C', x: 0.108, y: -2.874, z: 0.008 },
          { element: 'C', x: 3.885, y: 1.810, z: -0.335 },
          { element: 'C', x: -1.871, y: 2.974, z: 0.589 },
          { element: 'H', x: 3.054, y: -1.483, z: -1.344 },
          { element: 'H', x: 2.785, y: -1.288, z: 0.505 },
          { element: 'H', x: 1.799, y: -2.730, z: -0.176 },
          { element: 'H', x: -0.249, y: -3.299, z: 0.940 },
          { element: 'H', x: 1.051, y: -3.418, z: -0.050 },
          { element: 'H', x: -0.532, y: -2.743, z: -0.850 },
          { element: 'H', x: 4.810, y: 1.423, z: 0.105 },
          { element: 'H', x: 3.829, y: 2.789, z: 0.159 },
          { element: 'H', x: 3.935, y: 1.984, z: -1.424 },
          { element: 'H', x: -2.909, y: 3.250, z: 0.406 },
          { element: 'H', x: -1.349, y: 3.458, z: 1.422 },
          { element: 'H', x: -1.213, y: 3.341, z: -0.280 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 0, to: 7, type: 1 }, { from: 0, to: 12, type: 1 },
          { from: 1, to: 2, type: 2 }, { from: 1, to: 5, type: 1 }, { from: 2, to: 3, type: 1 },
          { from: 2, to: 4, type: 1 }, { from: 3, to: 10, type: 2 }, { from: 4, to: 14, type: 1 },
          { from: 5, to: 6, type: 1 }, { from: 5, to: 9, type: 2 }, { from: 6, to: 7, type: 2 },
          { from: 7, to: 13, type: 1 }, { from: 8, to: 9, type: 1 }, { from: 8, to: 11, type: 2 },
          { from: 9, to: 15, type: 1 }, { from: 13, to: 19, type: 1 }, { from: 13, to: 20, type: 1 },
          { from: 13, to: 21, type: 1 }, { from: 14, to: 22, type: 1 }, { from: 14, to: 23, type: 1 },
          { from: 14, to: 24, type: 1 }, { from: 15, to: 25, type: 1 }, { from: 15, to: 26, type: 1 },
          { from: 15, to: 27, type: 1 }
        ]
      },
      'acetic-acid': {
        id: 'acetic-acid', name: '乙酸 (C₂H₄O₂)', formula: 'C2H4O2', description: '食醋成分',
        atoms: [
          { element: 'C', x: -0.634, y: -0.000, z: 0.0 },
          { element: 'C', x: 0.778, y: 0.000, z: 0.0 },
          { element: 'O', x: 1.367, y: 1.082, z: 0.0 },
          { element: 'O', x: 1.367, y: -1.082, z: 0.0 },
          { element: 'H', x: 2.367, y: -1.028, z: 0.0 },
          { element: 'H', x: -0.982, y: 0.527, z: 0.891 },
          { element: 'H', x: -0.982, y: 0.527, z: -0.891 },
          { element: 'H', x: -0.982, y: -1.055, z: 0.0 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 1, to: 2, type: 2 }, { from: 1, to: 3, type: 1 },
          { from: 3, to: 4, type: 1 }, { from: 0, to: 5, type: 1 }, { from: 0, to: 6, type: 1 },
          { from: 0, to: 7, type: 1 }
        ]
      },
      aspirin: {
        id: 'aspirin', name: '阿司匹林 (C₉H₈O₄)', formula: 'C9H8O4', description: '解热镇痛药',
        atoms: [
          { element: 'C', x: 2.331, y: 0.940, z: 0.0 },
          { element: 'C', x: 2.590, y: -0.437, z: 0.0 },
          { element: 'C', x: 1.315, y: -1.241, z: 0.0 },
          { element: 'C', x: -0.032, y: -0.679, z: 0.0 },
          { element: 'C', x: -0.324, y: 0.734, z: 0.0 },
          { element: 'C', x: 0.953, y: 1.502, z: 0.0 },
          { element: 'C', x: -1.422, y: 1.511, z: 0.0 },
          { element: 'C', x: -2.773, y: 0.826, z: 0.0 },
          { element: 'C', x: -3.036, y: -0.611, z: 0.0 },
          { element: 'O', x: 3.516, y: 1.704, z: 0.0 },
          { element: 'O', x: 1.458, y: 2.831, z: 0.0 },
          { element: 'O', x: -4.198, y: -1.208, z: 0.0 },
          { element: 'O', x: -1.934, y: -1.292, z: 0.0 },
          { element: 'H', x: 3.579, y: -0.876, z: 0.0 },
          { element: 'H', x: 1.490, y: -2.308, z: 0.0 },
          { element: 'H', x: 4.458, y: 1.347, z: 0.0 },
          { element: 'H', x: 1.805, y: 3.502, z: 0.0 },
          { element: 'H', x: -3.514, y: 1.429, z: 0.0 },
          { element: 'H', x: -1.420, y: 2.591, z: 0.0 }
        ],
        bonds: [
          { from: 0, to: 1, type: 2 }, { from: 0, to: 5, type: 1 }, { from: 0, to: 9, type: 1 },
          { from: 1, to: 2, type: 1 }, { from: 1, to: 13, type: 1 }, { from: 2, to: 3, type: 2 },
          { from: 2, to: 14, type: 1 }, { from: 3, to: 4, type: 1 }, { from: 4, to: 5, type: 2 },
          { from: 4, to: 6, type: 1 }, { from: 5, to: 10, type: 1 }, { from: 6, to: 7, type: 1 },
          { from: 6, to: 18, type: 1 }, { from: 7, to: 8, type: 1 }, { from: 7, to: 17, type: 1 },
          { from: 8, to: 11, type: 2 }, { from: 8, to: 12, type: 1 }, { from: 9, to: 15, type: 1 },
          { from: 10, to: 16, type: 1 }
        ]
      },
      glucose: {
        id: 'glucose', name: '葡萄糖 (C₆H₁₂O₆)', formula: 'C6H12O6', description: '能量来源',
        atoms: [
          { element: 'C', x: 0.000, y: 1.512, z: 0.339 },
          { element: 'C', x: 1.438, y: 1.217, z: -0.116 },
          { element: 'C', x: 1.888, y: -0.280, z: 0.148 },
          { element: 'C', x: 0.946, y: -1.072, z: -0.702 },
          { element: 'C', x: -0.486, y: -0.772, z: -0.248 },
          { element: 'C', x: -1.026, y: 0.722, z: -0.517 },
          { element: 'O', x: 0.169, y: 0.651, z: 1.421 },
          { element: 'O', x: 2.197, y: 1.712, z: 0.706 },
          { element: 'O', x: 1.940, y: -0.381, z: 1.586 },
          { element: 'O', x: 1.131, y: -2.464, z: -0.514 },
          { element: 'O', x: -1.309, y: -1.451, z: -1.137 },
          { element: 'O', x: -0.781, y: 1.812, z: -1.422 },
          { element: 'H', x: -0.195, y: 2.529, z: -0.025 },
          { element: 'H', x: 1.463, y: 1.445, z: -1.187 },
          { element: 'H', x: 2.898, y: -0.623, z: -0.136 },
          { element: 'H', x: 0.999, y: -0.756, z: -1.745 },
          { element: 'H', x: -1.072, y: -1.085, z: 0.793 },
          { element: 'H', x: -2.111, y: 0.857, z: -0.454 },
          { element: 'H', x: -0.657, y: 0.121, z: 1.637 },
          { element: 'H', x: 2.042, y: 2.636, z: 0.512 },
          { element: 'H', x: 1.195, y: -0.049, z: 1.826 },
          { element: 'H', x: 1.022, y: -2.719, z: 0.373 },
          { element: 'H', x: -2.254, y: -1.539, z: -0.976 },
          { element: 'H', x: -1.051, y: 2.749, z: -1.231 }
        ],
        bonds: [
          { from: 0, to: 1, type: 1 }, { from: 0, to: 6, type: 1 }, { from: 0, to: 12, type: 1 },
          { from: 1, to: 2, type: 1 }, { from: 1, to: 7, type: 1 }, { from: 1, to: 13, type: 1 },
          { from: 2, to: 3, type: 1 }, { from: 2, to: 8, type: 1 }, { from: 2, to: 14, type: 1 },
          { from: 3, to: 4, type: 1 }, { from: 3, to: 9, type: 1 }, { from: 3, to: 15, type: 1 },
          { from: 4, to: 5, type: 1 }, { from: 4, to: 10, type: 1 }, { from: 4, to: 16, type: 1 },
          { from: 5, to: 6, type: 1 }, { from: 5, to: 11, type: 1 }, { from: 5, to: 17, type: 1 },
          { from: 6, to: 18, type: 1 }, { from: 7, to: 19, type: 1 }, { from: 8, to: 20, type: 1 },
          { from: 9, to: 21, type: 1 }, { from: 10, to: 22, type: 1 }, { from: 11, to: 23, type: 1 }
        ]
      }
    };
    return mockDB[id] || null;
  }
}
