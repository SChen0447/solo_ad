export interface PlanetData {
  id: string;
  name: string;
  englishName: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  diameter: number;
  distanceFromSun: number;
  orbitalPeriod: number;
  description: string;
  hasRings?: boolean;
}

export const sunData = {
  color: '#ffaa00',
  size: 1.5,
  name: '太阳',
  englishName: 'Sun',
  diameter: 1392700,
  description: '太阳是太阳系的中心恒星，占据了太阳系总质量的99.86%。它是一颗黄矮星，通过核聚变反应将氢转化为氦，为地球提供光和热能。太阳的直径约为139万公里，可以容纳130万个地球。'
};

export const planetsData: PlanetData[] = [
  {
    id: 'mercury',
    name: '水星',
    englishName: 'Mercury',
    color: '#b0b0b0',
    size: 0.2,
    orbitRadius: 3,
    orbitSpeed: 4.15,
    diameter: 4879,
    distanceFromSun: 57.9,
    orbitalPeriod: 88,
    description: '水星是太阳系中最小的行星，也是距离太阳最近的行星。它的表面布满陨石坑，没有大气层保护，昼夜温差极大。水星的公转周期只有88个地球日。'
  },
  {
    id: 'venus',
    name: '金星',
    englishName: 'Venus',
    color: '#e8c27a',
    size: 0.35,
    orbitRadius: 4.5,
    orbitSpeed: 1.62,
    diameter: 12104,
    distanceFromSun: 108.2,
    orbitalPeriod: 225,
    description: '金星是太阳系中最热的行星，表面温度高达465°C。它被厚厚的二氧化碳大气层包围，产生强烈的温室效应。金星是夜空中最亮的行星，被称为"启明星"或"长庚星"。'
  },
  {
    id: 'earth',
    name: '地球',
    englishName: 'Earth',
    color: '#4488ff',
    size: 0.38,
    orbitRadius: 6.5,
    orbitSpeed: 1,
    diameter: 12742,
    distanceFromSun: 149.6,
    orbitalPeriod: 365,
    description: '地球是太阳系中唯一已知存在生命的行星。它有液态水、适宜的大气层和磁场保护。地球的71%表面被水覆盖，拥有丰富的生物多样性。'
  },
  {
    id: 'mars',
    name: '火星',
    englishName: 'Mars',
    color: '#cc4422',
    size: 0.28,
    orbitRadius: 8.5,
    orbitSpeed: 0.53,
    diameter: 6779,
    distanceFromSun: 227.9,
    orbitalPeriod: 687,
    description: '火星被称为"红色星球"，因为其表面富含氧化铁。火星有太阳系最高的火山（奥林帕斯山）和最深的峡谷（水手谷）。科学家正在探索火星是否曾经存在生命。'
  },
  {
    id: 'jupiter',
    name: '木星',
    englishName: 'Jupiter',
    color: '#d4a574',
    size: 0.9,
    orbitRadius: 12,
    orbitSpeed: 0.084,
    diameter: 139820,
    distanceFromSun: 778.5,
    orbitalPeriod: 4333,
    description: '木星是太阳系中最大的行星，质量是其他所有行星总和的2.5倍。它是一颗气态巨行星，有著名的大红斑（一个持续数百年的巨型风暴）。木星拥有至少95颗卫星。'
  },
  {
    id: 'saturn',
    name: '土星',
    englishName: 'Saturn',
    color: '#e8d5a3',
    size: 0.75,
    orbitRadius: 15.5,
    orbitSpeed: 0.034,
    diameter: 116460,
    distanceFromSun: 1434,
    orbitalPeriod: 10759,
    description: '土星以其壮观的光环系统而闻名，这些光环主要由冰块和岩石碎片组成。土星是太阳系第二大行星，密度比水还低。土星拥有超过140颗已知卫星，其中土卫六有浓厚的大气层。',
    hasRings: true
  },
  {
    id: 'uranus',
    name: '天王星',
    englishName: 'Uranus',
    color: '#73c2da',
    size: 0.5,
    orbitRadius: 19,
    orbitSpeed: 0.012,
    diameter: 50724,
    distanceFromSun: 2871,
    orbitalPeriod: 30687,
    description: '天王星是一颗冰巨星，其独特之处在于它的自转轴几乎与公转轨道平行，像是"躺着"旋转。天王星呈现淡蓝绿色，这是因为其大气层中含有甲烷。'
  },
  {
    id: 'neptune',
    name: '海王星',
    englishName: 'Neptune',
    color: '#4166f5',
    size: 0.48,
    orbitRadius: 22,
    orbitSpeed: 0.006,
    diameter: 49244,
    distanceFromSun: 4495,
    orbitalPeriod: 60190,
    description: '海王星是太阳系中最远的行星，也是风速最快的行星，风速可达每小时2100公里。海王星是深蓝色的冰巨星，拥有14颗已知卫星，其中海卫一是太阳系最大的逆行卫星。'
  }
];
