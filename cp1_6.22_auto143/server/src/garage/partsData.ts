import { Part, PartCategory } from '../types';

const engines: Part[] = [
  {
    id: 'engine-low-torque',
    category: 'engine',
    name: '低扭引擎',
    description: '低速扭矩充沛，起步加速迅猛，适合多弯赛道',
    stats: { acceleration: 28, topSpeed: 10, grip: 0, cornering: 0 }
  },
  {
    id: 'engine-high-rev',
    category: 'engine',
    name: '高转引擎',
    description: '高转速输出强劲，极速出色，适合直线赛道',
    stats: { acceleration: 12, topSpeed: 28, grip: 0, cornering: 0 }
  },
  {
    id: 'engine-balanced',
    category: 'engine',
    name: '平衡引擎',
    description: '兼顾加速与极速，综合性能均衡',
    stats: { acceleration: 20, topSpeed: 20, grip: 0, cornering: 0 }
  },
  {
    id: 'engine-turbo',
    category: 'engine',
    name: '涡轮引擎',
    description: '涡轮增压，中段加速爆发力强',
    stats: { acceleration: 24, topSpeed: 16, grip: 0, cornering: 0 }
  }
];

const tires: Part[] = [
  {
    id: 'tire-soft',
    category: 'tire',
    name: '软胎',
    description: '抓地力极强，过弯速度快，但磨损较快',
    stats: { acceleration: 4, topSpeed: 0, grip: 22, cornering: 12 },
    color: '#ef4444'
  },
  {
    id: 'tire-hard',
    category: 'tire',
    name: '硬胎',
    description: '耐磨持久，极速表现好，抓地力一般',
    stats: { acceleration: 2, topSpeed: 6, grip: 10, cornering: 6 },
    color: '#64748b'
  },
  {
    id: 'tire-rain',
    category: 'tire',
    name: '雨胎',
    description: '湿地排水性能优秀，潮湿路面抓地力强',
    stats: { acceleration: 2, topSpeed: 2, grip: 18, cornering: 14 },
    color: '#3b82f6'
  },
  {
    id: 'tire-slick',
    category: 'tire',
    name: '光面胎',
    description: '干地专用，最大接触面积，极致抓地力',
    stats: { acceleration: 6, topSpeed: 2, grip: 26, cornering: 8 },
    color: '#1e293b'
  }
];

const suspensions: Part[] = [
  {
    id: 'suspension-soft',
    category: 'suspension',
    name: '软悬挂',
    description: '滤震优秀，越野路面舒适性高',
    stats: { acceleration: 0, topSpeed: 0, grip: 8, cornering: 14 }
  },
  {
    id: 'suspension-hard',
    category: 'suspension',
    name: '硬悬挂',
    description: '支撑性强，高速过弯侧倾小',
    stats: { acceleration: 2, topSpeed: 2, grip: 4, cornering: 20 }
  },
  {
    id: 'suspension-balanced',
    category: 'suspension',
    name: '平衡悬挂',
    description: '兼顾舒适与操控，适用多种路况',
    stats: { acceleration: 1, topSpeed: 1, grip: 6, cornering: 16 }
  },
  {
    id: 'suspension-offroad',
    category: 'suspension',
    name: '越野悬挂',
    description: '长行程设计，越野通过性极佳',
    stats: { acceleration: 0, topSpeed: 0, grip: 14, cornering: 10 }
  },
  {
    id: 'suspension-track',
    category: 'suspension',
    name: '赛道悬挂',
    description: '赛道级调校，极限过弯能力出众',
    stats: { acceleration: 1, topSpeed: 1, grip: 2, cornering: 24 }
  }
];

const wings: Part[] = [
  {
    id: 'wing-low',
    category: 'wing',
    name: '低风阻尾翼',
    description: '空气阻力小，直线极速更高',
    stats: { acceleration: 2, topSpeed: 10, grip: 0, cornering: 2 }
  },
  {
    id: 'wing-high',
    category: 'wing',
    name: '高下压力尾翼',
    description: '提供强大下压力，高速过弯稳定',
    stats: { acceleration: 0, topSpeed: 2, grip: 10, cornering: 12 }
  },
  {
    id: 'wing-balanced',
    category: 'wing',
    name: '平衡尾翼',
    description: '下压力与风阻的平衡选择',
    stats: { acceleration: 1, topSpeed: 6, grip: 5, cornering: 8 }
  },
  {
    id: 'wing-drs',
    category: 'wing',
    name: 'DRS可调尾翼',
    description: '可调节尾翼，直线与弯道兼顾',
    stats: { acceleration: 1, topSpeed: 8, grip: 6, cornering: 6 }
  }
];

export const partsLibrary: Record<PartCategory, Part[]> = {
  engine: engines,
  tire: tires,
  suspension: suspensions,
  wing: wings
};

export function findPart(category: PartCategory, partId: string): Part | undefined {
  return partsLibrary[category].find(p => p.id === partId);
}

export function getDefaultSelection() {
  return {
    engine: 'engine-balanced',
    tire: 'tire-balanced' in tires ? 'tire-hard' : 'tire-hard',
    suspension: 'suspension-balanced',
    wing: 'wing-balanced'
  };
}
