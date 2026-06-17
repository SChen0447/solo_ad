import * as THREE from 'three';

export interface OrganData {
  name: string;
  description: string;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
  geometryType: 'sphere' | 'cylinder' | 'capsule' | 'torus';
  rotation?: [number, number, number];
  isSkeleton?: boolean;
}

const ORGAN_DATABASE: OrganData[] = [
  {
    name: '大脑',
    description: '人体神经系统中枢，负责思维、记忆与感知，控制全身活动。',
    color: '#FCE4EC',
    position: [0, 1.7, 0],
    scale: [0.22, 0.18, 0.22],
    geometryType: 'sphere',
  },
  {
    name: '心脏',
    description: '循环系统核心，通过有节律的收缩推动血液流向全身各处。',
    color: '#E53935',
    position: [0.06, 0.55, 0.08],
    scale: [0.09, 0.1, 0.08],
    geometryType: 'sphere',
  },
  {
    name: '左肺',
    description: '呼吸系统器官，进行气体交换，为血液提供氧气并排出二氧化碳。',
    color: '#F48FB1',
    position: [-0.18, 0.6, 0],
    scale: [0.13, 0.2, 0.1],
    geometryType: 'sphere',
  },
  {
    name: '右肺',
    description: '呼吸系统器官，进行气体交换，为血液提供氧气并排出二氧化碳。',
    color: '#F48FB1',
    position: [0.18, 0.6, 0],
    scale: [0.13, 0.2, 0.1],
    geometryType: 'sphere',
  },
  {
    name: '肝脏',
    description: '人体最大腺体，负责解毒、代谢和胆汁分泌，维持内环境稳定。',
    color: '#B71C1C',
    position: [0.15, 0.2, 0.04],
    scale: [0.16, 0.1, 0.1],
    geometryType: 'sphere',
  },
  {
    name: '胃',
    description: '消化系统器官，分泌胃酸和消化酶，将食物分解为食糜。',
    color: '#FFB74D',
    position: [-0.05, 0.1, 0.1],
    scale: [0.1, 0.12, 0.09],
    geometryType: 'capsule',
    rotation: [0, 0, 0.3],
  },
  {
    name: '左肾',
    description: '泌尿系统器官，过滤血液产生尿液，调节水分和电解质平衡。',
    color: '#A1887F',
    position: [-0.16, -0.05, -0.06],
    scale: [0.06, 0.08, 0.04],
    geometryType: 'sphere',
  },
  {
    name: '右肾',
    description: '泌尿系统器官，过滤血液产生尿液，调节水分和电解质平衡。',
    color: '#A1887F',
    position: [0.16, -0.05, -0.06],
    scale: [0.06, 0.08, 0.04],
    geometryType: 'sphere',
  },
  {
    name: '脊柱',
    description: '人体中轴骨骼，支撑身体、保护脊髓，由33块椎骨组成。',
    color: '#F5F5DC',
    position: [0, 0.5, -0.14],
    scale: [0.03, 0.7, 0.03],
    geometryType: 'cylinder',
    isSkeleton: true,
  },
  {
    name: '肋骨',
    description: '胸廓骨骼，保护心肺等重要器官，参与呼吸运动。',
    color: '#F5F5DC',
    position: [0, 0.5, -0.02],
    scale: [0.22, 0.22, 0.06],
    geometryType: 'torus',
    rotation: [Math.PI / 2, 0, 0],
    isSkeleton: true,
  },
  {
    name: '骨盆',
    description: '连接脊柱与下肢的骨骼结构，支撑腹腔器官并承载体重。',
    color: '#F5F5DC',
    position: [0, -0.5, 0],
    scale: [0.2, 0.08, 0.12],
    geometryType: 'sphere',
    isSkeleton: true,
  },
  {
    name: '小肠',
    description: '消化吸收的主要场所，长约6米，将食糜分解为可吸收的营养物质。',
    color: '#FFCC80',
    position: [0, -0.1, 0.06],
    scale: [0.12, 0.08, 0.06],
    geometryType: 'sphere',
  },
];

export class BodyModel {
  private group: THREE.Group;
  private organMeshes: Map<string, THREE.Mesh> = new Map();
  private skeletonMeshes: THREE.Mesh[] = [];
  private originalMaterials: Map<string, {
    color: THREE.Color;
    opacity: number;
    transparent: boolean;
    wireframe: boolean;
  }> = new Map();
  private xrayMode = false;

  constructor() {
    this.group = new THREE.Group();
    this.buildOrgans();
  }

  private createGeometry(data: OrganData): THREE.BufferGeometry {
    switch (data.geometryType) {
      case 'sphere':
        return new THREE.SphereGeometry(1, 16, 12);
      case 'cylinder':
        return new THREE.CylinderGeometry(1, 1, 1, 8);
      case 'capsule':
        return new THREE.CapsuleGeometry(0.5, 0.5, 4, 8);
      case 'torus':
        return new THREE.TorusGeometry(1, 0.15, 8, 16);
      default:
        return new THREE.SphereGeometry(1, 16, 12);
    }
  }

  private buildOrgans(): void {
    for (const data of ORGAN_DATABASE) {
      const geometry = this.createGeometry(data);
      const color = new THREE.Color(data.color);

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.6,
        metalness: 0.1,
        bumpScale: 0.02,
        transparent: false,
        opacity: 1.0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...data.position);
      mesh.scale.set(...data.scale);
      if (data.rotation) {
        mesh.rotation.set(...data.rotation);
      }
      mesh.userData = { organData: data };

      this.organMeshes.set(data.name, mesh);
      this.originalMaterials.set(data.name, {
        color: color.clone(),
        opacity: 1.0,
        transparent: false,
        wireframe: false,
      });

      if (data.isSkeleton) {
        this.skeletonMeshes.push(mesh);
      }

      this.group.add(mesh);
    }
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getOrganMeshes(): Map<string, THREE.Mesh> {
    return this.organMeshes;
  }

  getAllMeshes(): THREE.Mesh[] {
    return Array.from(this.organMeshes.values());
  }

  toggleXray(): boolean {
    this.xrayMode = !this.xrayMode;

    for (const [name, mesh] of this.organMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const original = this.originalMaterials.get(name)!;

      if (this.xrayMode) {
        const isSkeleton = (mesh.userData.organData as OrganData).isSkeleton;
        if (isSkeleton) {
          mat.color.set(0xffffff);
          mat.wireframe = true;
          mat.transparent = true;
          mat.opacity = 0.9;
        } else {
          const blueTint = new THREE.Color(0x4fc3f7);
          mat.color.copy(original.color).lerp(blueTint, 0.6);
          mat.transparent = true;
          mat.opacity = 0.3;
        }
      } else {
        mat.color.copy(original.color);
        mat.opacity = original.opacity;
        mat.transparent = original.transparent;
        mat.wireframe = original.wireframe;
      }

      mat.needsUpdate = true;
    }

    return this.xrayMode;
  }

  isXrayMode(): boolean {
    return this.xrayMode;
  }

  resetMaterials(): void {
    for (const [name, mesh] of this.organMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const original = this.originalMaterials.get(name)!;
      mat.color.copy(original.color);
      mat.opacity = original.opacity;
      mat.transparent = original.transparent;
      mat.wireframe = original.wireframe;
      mat.needsUpdate = true;
    }
    this.xrayMode = false;
  }
}
