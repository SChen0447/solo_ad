export interface FragmentData {
  id: string
  name: string
  material: string
  excavatedPosition: { x: number; y: number; z: number }
  region: string
  modelPosition: { x: number; y: number; z: number }
  modelRotation: { x: number; y: number; z: number }
  shape: 'cylinder' | 'sphere' | 'box' | 'cone'
  scale: { x: number; y: number; z: number }
  color: string
}

export const fragmentData: FragmentData[] = [
  {
    id: 'frag-001',
    name: '瓶口碎片A',
    material: '陶土',
    excavatedPosition: { x: 1.2, y: 0.5, z: 0.8 },
    region: '瓶颈碎片',
    modelPosition: { x: 0, y: 1.8, z: 0 },
    modelRotation: { x: 0, y: 0, z: 0 },
    shape: 'cylinder',
    scale: { x: 0.6, y: 0.15, z: 0.6 },
    color: '#a67c52'
  },
  {
    id: 'frag-002',
    name: '瓶身碎片B',
    material: '釉彩陶土',
    excavatedPosition: { x: -0.5, y: 0.3, z: 1.1 },
    region: '瓶身碎片',
    modelPosition: { x: 0.5, y: 0.8, z: 0 },
    modelRotation: { x: 0, y: 0.3, z: 0.1 },
    shape: 'cylinder',
    scale: { x: 0.8, y: 0.4, z: 0.25 },
    color: '#8b5a2b'
  },
  {
    id: 'frag-003',
    name: '瓶身碎片C',
    material: '釉彩陶土',
    excavatedPosition: { x: 0.8, y: 0.2, z: -0.6 },
    region: '瓶身碎片',
    modelPosition: { x: -0.4, y: 0.6, z: 0.3 },
    modelRotation: { x: -0.2, y: -0.4, z: 0.15 },
    shape: 'cylinder',
    scale: { x: 0.7, y: 0.5, z: 0.3 },
    color: '#9c6b3d'
  },
  {
    id: 'frag-004',
    name: '瓶底碎片D',
    material: '粗陶土',
    excavatedPosition: { x: -0.9, y: 0.1, z: -0.3 },
    region: '瓶底碎片',
    modelPosition: { x: 0, y: -0.5, z: 0 },
    modelRotation: { x: 0, y: 0.2, z: 0 },
    shape: 'cylinder',
    scale: { x: 0.9, y: 0.2, z: 0.9 },
    color: '#7a5230'
  },
  {
    id: 'frag-005',
    name: '瓶肩碎片E',
    material: '釉彩陶土',
    excavatedPosition: { x: 0.3, y: 0.6, z: 0.9 },
    region: '瓶肩碎片',
    modelPosition: { x: 0.2, y: 1.3, z: -0.2 },
    modelRotation: { x: 0.3, y: 0.1, z: -0.1 },
    shape: 'cone',
    scale: { x: 0.5, y: 0.4, z: 0.5 },
    color: '#b8860b'
  },
  {
    id: 'frag-006',
    name: '口沿碎片F',
    material: '细陶土',
    excavatedPosition: { x: 1.5, y: 0.4, z: -0.2 },
    region: '瓶颈碎片',
    modelPosition: { x: -0.3, y: 1.7, z: 0.2 },
    modelRotation: { x: 0.1, y: -0.5, z: 0.2 },
    shape: 'cylinder',
    scale: { x: 0.4, y: 0.1, z: 0.2 },
    color: '#cd853f'
  },
  {
    id: 'frag-007',
    name: '腹部碎片G',
    material: '釉彩陶土',
    excavatedPosition: { x: -0.7, y: 0.4, z: 0.5 },
    region: '瓶身碎片',
    modelPosition: { x: 0.3, y: 0.3, z: -0.4 },
    modelRotation: { x: -0.15, y: 0.6, z: -0.05 },
    shape: 'cylinder',
    scale: { x: 0.6, y: 0.35, z: 0.2 },
    color: '#d2691e'
  },
  {
    id: 'frag-008',
    name: '底座碎片H',
    material: '粗陶土',
    excavatedPosition: { x: 0.1, y: 0.05, z: -1.0 },
    region: '瓶底碎片',
    modelPosition: { x: 0.25, y: -0.4, z: -0.3 },
    modelRotation: { x: 0.2, y: 0.3, z: 0.1 },
    shape: 'cylinder',
    scale: { x: 0.5, y: 0.15, z: 0.5 },
    color: '#8b4513'
  }
]
