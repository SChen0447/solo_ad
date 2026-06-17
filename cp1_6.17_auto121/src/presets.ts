import { PresetData } from './types';

export const presetData: PresetData[] = [
  {
    name: '平原沉积型',
    description: '典型河流冲积平原，土层较厚',
    drills: [
      {
        x: -5,
        z: -5,
        name: 'ZK001',
        strata: [
          { name: '表土层', depth: 2.5, color: '#D4A574' },
          { name: '黏土层', depth: 6.0, color: '#CD853F' },
          { name: '粉砂层', depth: 8.5, color: '#DAA520' },
          { name: '基岩层', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 3,
        z: -3,
        name: 'ZK002',
        strata: [
          { name: '表土层', depth: 2.2, color: '#D4A574' },
          { name: '黏土层', depth: 5.5, color: '#CD853F' },
          { name: '粉砂层', depth: 8.0, color: '#DAA520' },
          { name: '基岩层', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: -2,
        z: 4,
        name: 'ZK003',
        strata: [
          { name: '表土层', depth: 3.0, color: '#D4A574' },
          { name: '黏土层', depth: 6.5, color: '#CD853F' },
          { name: '粉砂层', depth: 9.0, color: '#DAA520' },
          { name: '基岩层', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 5,
        z: 5,
        name: 'ZK004',
        strata: [
          { name: '表土层', depth: 2.8, color: '#D4A574' },
          { name: '黏土层', depth: 5.8, color: '#CD853F' },
          { name: '粉砂层', depth: 8.2, color: '#DAA520' },
          { name: '基岩层', depth: 10.0, color: '#696969' }
        ]
      }
    ]
  },
  {
    name: '丘陵风化型',
    description: '风化壳发育，基岩较浅',
    drills: [
      {
        x: -6,
        z: -4,
        name: 'ZK001',
        strata: [
          { name: '腐殖土层', depth: 1.0, color: '#8B4513' },
          { name: '残积层', depth: 3.5, color: '#A0522D' },
          { name: '全风化岩', depth: 5.5, color: '#8B7355' },
          { name: '强风化岩', depth: 7.5, color: '#696969' },
          { name: '基岩', depth: 10.0, color: '#4a4a4a' }
        ]
      },
      {
        x: 2,
        z: -6,
        name: 'ZK002',
        strata: [
          { name: '腐殖土层', depth: 0.8, color: '#8B4513' },
          { name: '残积层', depth: 3.0, color: '#A0522D' },
          { name: '全风化岩', depth: 5.0, color: '#8B7355' },
          { name: '强风化岩', depth: 7.0, color: '#696969' },
          { name: '基岩', depth: 10.0, color: '#4a4a4a' }
        ]
      },
      {
        x: 4,
        z: 3,
        name: 'ZK003',
        strata: [
          { name: '腐殖土层', depth: 1.2, color: '#8B4513' },
          { name: '残积层', depth: 4.0, color: '#A0522D' },
          { name: '全风化岩', depth: 6.0, color: '#8B7355' },
          { name: '强风化岩', depth: 8.0, color: '#696969' },
          { name: '基岩', depth: 10.0, color: '#4a4a4a' }
        ]
      },
      {
        x: -4,
        z: 5,
        name: 'ZK004',
        strata: [
          { name: '腐殖土层', depth: 1.5, color: '#8B4513' },
          { name: '残积层', depth: 3.8, color: '#A0522D' },
          { name: '全风化岩', depth: 5.8, color: '#8B7355' },
          { name: '强风化岩', depth: 7.8, color: '#696969' },
          { name: '基岩', depth: 10.0, color: '#4a4a4a' }
        ]
      }
    ]
  },
  {
    name: '河谷侵蚀型',
    description: '河谷阶地，沉积层变化大',
    drills: [
      {
        x: -7,
        z: -3,
        name: 'ZK001',
        strata: [
          { name: '河漫滩沉积', depth: 1.5, color: '#D2B48C' },
          { name: '砂砾石层', depth: 4.0, color: '#BC8F8F' },
          { name: '粉质黏土', depth: 7.0, color: '#CD853F' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: -2,
        z: -5,
        name: 'ZK002',
        strata: [
          { name: '河漫滩沉积', depth: 2.0, color: '#D2B48C' },
          { name: '砂砾石层', depth: 5.0, color: '#BC8F8F' },
          { name: '粉质黏土', depth: 8.0, color: '#CD853F' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 4,
        z: -2,
        name: 'ZK003',
        strata: [
          { name: '阶地沉积', depth: 3.0, color: '#D2B48C' },
          { name: '古土壤层', depth: 4.5, color: '#8B4513' },
          { name: '砂砾石层', depth: 6.5, color: '#BC8F8F' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 6,
        z: 4,
        name: 'ZK004',
        strata: [
          { name: '阶地沉积', depth: 3.5, color: '#D2B48C' },
          { name: '古土壤层', depth: 5.0, color: '#8B4513' },
          { name: '砂砾石层', depth: 7.5, color: '#BC8F8F' },
          { name: '粉质黏土', depth: 9.0, color: '#CD853F' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: -5,
        z: 5,
        name: 'ZK005',
        strata: [
          { name: '河漫滩沉积', depth: 1.0, color: '#D2B48C' },
          { name: '砂砾石层', depth: 3.5, color: '#BC8F8F' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      }
    ]
  },
  {
    name: '岩溶地区型',
    description: '石灰岩地区，存在溶洞',
    drills: [
      {
        x: -6,
        z: -5,
        name: 'ZK001',
        strata: [
          { name: '红黏土层', depth: 3.0, color: '#B22222' },
          { name: '石灰岩层', depth: 6.0, color: '#F5F5DC' },
          { name: '溶洞充填', depth: 7.5, color: '#8B7355' },
          { name: '石灰岩', depth: 10.0, color: '#F5F5DC' }
        ]
      },
      {
        x: 0,
        z: -6,
        name: 'ZK002',
        strata: [
          { name: '红黏土层', depth: 2.5, color: '#B22222' },
          { name: '石灰岩层', depth: 5.5, color: '#F5F5DC' },
          { name: '溶洞', depth: 6.5, color: '#2F4F4F' },
          { name: '石灰岩', depth: 10.0, color: '#F5F5DC' }
        ]
      },
      {
        x: 5,
        z: -3,
        name: 'ZK003',
        strata: [
          { name: '红黏土层', depth: 3.5, color: '#B22222' },
          { name: '石灰岩层', depth: 6.5, color: '#F5F5DC' },
          { name: '溶洞充填', depth: 8.0, color: '#8B7355' },
          { name: '石灰岩', depth: 10.0, color: '#F5F5DC' }
        ]
      },
      {
        x: 3,
        z: 5,
        name: 'ZK004',
        strata: [
          { name: '红黏土层', depth: 2.0, color: '#B22222' },
          { name: '石灰岩层', depth: 5.0, color: '#F5F5DC' },
          { name: '石灰岩', depth: 10.0, color: '#F5F5DC' }
        ]
      },
      {
        x: -4,
        z: 3,
        name: 'ZK005',
        strata: [
          { name: '红黏土层', depth: 2.8, color: '#B22222' },
          { name: '石灰岩层', depth: 5.8, color: '#F5F5DC' },
          { name: '溶洞', depth: 7.2, color: '#2F4F4F' },
          { name: '石灰岩', depth: 10.0, color: '#F5F5DC' }
        ]
      }
    ]
  },
  {
    name: '滨海相沉积型',
    description: '海陆交互相，多砂层',
    drills: [
      {
        x: -6,
        z: -6,
        name: 'ZK001',
        strata: [
          { name: '海相淤泥', depth: 2.0, color: '#2F4F4F' },
          { name: '粉细砂层', depth: 4.5, color: '#F5DEB3' },
          { name: '黏土层', depth: 7.0, color: '#CD853F' },
          { name: '中粗砂层', depth: 9.0, color: '#DEB887' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 2,
        z: -5,
        name: 'ZK002',
        strata: [
          { name: '海相淤泥', depth: 1.5, color: '#2F4F4F' },
          { name: '粉细砂层', depth: 4.0, color: '#F5DEB3' },
          { name: '黏土层', depth: 6.0, color: '#CD853F' },
          { name: '中粗砂层', depth: 8.5, color: '#DEB887' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 6,
        z: 0,
        name: 'ZK003',
        strata: [
          { name: '陆相沉积', depth: 2.5, color: '#D2B48C' },
          { name: '粉细砂层', depth: 5.0, color: '#F5DEB3' },
          { name: '海陆过渡层', depth: 7.5, color: '#BC8F8F' },
          { name: '中粗砂层', depth: 9.5, color: '#DEB887' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: 0,
        z: 5,
        name: 'ZK004',
        strata: [
          { name: '海相淤泥', depth: 1.0, color: '#2F4F4F' },
          { name: '粉细砂层', depth: 3.5, color: '#F5DEB3' },
          { name: '黏土层', depth: 5.5, color: '#CD853F' },
          { name: '细砂层', depth: 8.0, color: '#F5DEB3' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      },
      {
        x: -5,
        z: 3,
        name: 'ZK005',
        strata: [
          { name: '海相淤泥', depth: 1.8, color: '#2F4F4F' },
          { name: '粉细砂层', depth: 4.2, color: '#F5DEB3' },
          { name: '黏土层', depth: 6.8, color: '#CD853F' },
          { name: '中粗砂层', depth: 8.8, color: '#DEB887' },
          { name: '基岩', depth: 10.0, color: '#696969' }
        ]
      }
    ]
  }
];
