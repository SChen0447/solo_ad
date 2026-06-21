import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type ViewMode = 'single' | 'sideBySide' | 'overlay'

export interface FossilModelData {
  name: string
  displayName: string
  icon: string
  color: number
}

export const FOSSIL_MODELS: FossilModelData[] = [
  { name: 'tyrannosaurus', displayName: '暴龙颅骨', icon: '🦖', color: 0x8B7355 },
  { name: 'triceratops', displayName: '三角龙头盾', icon: '🦏', color: 0x9B8465 },
  { name: 'stegosaurus', displayName: '剑龙背板', icon: '🐉', color: 0xAB9475 }
]

export class SceneManager {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  container: HTMLElement
  
  fossilGroups: Map<string, THREE.Group> = new Map()
  fossilMaterials: Map<string, THREE.MeshPhysicalMaterial> = new Map()
  fossilOriginalMaterials: Map<string, THREE.MeshPhysicalMaterial> = new Map()
  controls: Map<string, OrbitControls> = new Map()
  glowMeshes: Map<string, THREE.Mesh> = new Map()
  shadowMeshes: Map<string, THREE.Mesh> = new Map()
  internalBones: Map<string, THREE.LineSegments> = new Map()
  
  selectedModel: string | null = null
  viewMode: ViewMode = 'single'
  modelOpacities: Map<string, number> = new Map()
  
  raycaster: THREE.Raycaster = new THREE.Raycaster()
  mouse: THREE.Vector2 = new THREE.Vector2()
  
  gridHelper: THREE.GridHelper | null = null
  
  private _bumpTexture: THREE.Texture | null = null
  
  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
