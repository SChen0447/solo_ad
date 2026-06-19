export interface StarData {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  brightness: number;
}

export interface PlanetData {
  id: string;
  name: string;
  type: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitTilt: number;
  diameter: string;
  mass: string;
  orbitPeriod: string;
  distance: string;
  description: string;
}

export interface NebulaData {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  particleCount: number;
  radius: number;
}

const starNames = [
  '织女星', '牛郎星', '北极星', '天狼星', '参宿四', '南河三', '北河三', '五车二',
  '角宿一', '心宿二', '大角星', '轩辕十四', '天津四', '北落师门', '毕宿五', '河鼓二',
  '织女二', '紫微左垣', '天枢', '天璇', '天玑', '天权', '玉衡', '开阳',
  '摇光', '贯索四', '天棓四', '天纪二', '女床一', '辇道增七', '渐台二', '牛宿一',
  '女宿一', '虚宿一', '危宿一', '室宿一', '壁宿一', '奎宿一', '娄宿一', '胃宿一',
  '昴宿一', '毕宿一', '觜宿一', '参宿一', '井宿一', '鬼宿一', '柳宿一', '星宿一',
  '张宿一', '翼宿一', '轸宿一', '角宿一', '亢宿一', '氐宿一', '房宿一', '心宿一',
  '尾宿一', '箕宿一', '斗宿一', '牛宿二', '女宿二', '虚宿二', '危宿二', '室宿二'
];

const planetTemplates: Omit<PlanetData, 'id'>[] = [
  {
    name: '炽焰星',
    type: '类地行星',
    color: '#e74c3c',
    size: 3,
    orbitRadius: 25,
    orbitSpeed: 0.015,
    orbitTilt: 0.05,
    diameter: '12,742 km',
    mass: '5.97 × 10²⁴ kg',
    orbitPeriod: '88 地球日',
    distance: '2,500 万公里',
    description: '一颗炽热的红色行星，表面覆盖着熔岩海洋，大气层稀薄，温度极高。由于靠近恒星，它的公转速度非常快。'
  },
  {
    name: '翠蓝星',
    type: '类地行星',
    color: '#3498db',
    size: 4,
    orbitRadius: 45,
    orbitSpeed: 0.01,
    orbitTilt: 0.08,
    diameter: '12,104 km',
    mass: '4.87 × 10²⁴ kg',
    orbitPeriod: '225 地球日',
    distance: '4,500 万公里',
    description: '一颗美丽的蓝色行星，拥有广阔的海洋和浓密的大气层。表面温度适宜，被认为可能存在生命。'
  },
  {
    name: '金沙星',
    type: '类地行星',
    color: '#f39c12',
    size: 3.5,
    orbitRadius: 70,
    orbitSpeed: 0.008,
    orbitTilt: -0.03,
    diameter: '6,779 km',
    mass: '6.42 × 10²³ kg',
    orbitPeriod: '687 地球日',
    distance: '7,000 万公里',
    description: '一颗金黄色的沙漠行星，表面布满沙丘和岩石。它拥有两颗小卫星，夜空格外美丽。'
  },
  {
    name: '风暴巨星',
    type: '气态巨行星',
    color: '#e67e22',
    size: 10,
    orbitRadius: 110,
    orbitSpeed: 0.004,
    orbitTilt: 0.02,
    diameter: '139,820 km',
    mass: '1.90 × 10²⁷ kg',
    orbitPeriod: '11.86 地球年',
    distance: '1.1 亿公里',
    description: '一颗巨大的气态行星，拥有标志性的大红斑风暴，已经持续了数百年。它的卫星系统非常壮观。'
  },
  {
    name: '光环之主',
    type: '气态巨行星',
    color: '#f1c40f',
    size: 8.5,
    orbitRadius: 150,
    orbitSpeed: 0.0025,
    orbitTilt: 0.12,
    diameter: '116,460 km',
    mass: '5.68 × 10²⁶ kg',
    orbitPeriod: '29.46 地球年',
    distance: '1.5 亿公里',
    description: '以其壮丽的光环系统而闻名，光环由无数冰晶和岩石碎片组成。这颗行星拥有众多卫星。'
  },
  {
    name: '冰蓝巨星',
    type: '冰巨星',
    color: '#00bcd4',
    size: 5.5,
    orbitRadius: 190,
    orbitSpeed: 0.0015,
    orbitTilt: -0.08,
    diameter: '50,724 km',
    mass: '8.68 × 10²⁵ kg',
    orbitPeriod: '84 地球年',
    distance: '1.9 亿公里',
    description: '一颗侧躺自转的冰蓝色行星，它的自转轴几乎与公转平面平行。行星内部可能存在钻石雨。'
  },
  {
    name: '海王之星',
    type: '冰巨星',
    color: '#3f51b5',
    size: 5,
    orbitRadius: 230,
    orbitSpeed: 0.001,
    orbitTilt: 0.06,
    diameter: '49,244 km',
    mass: '1.02 × 10²⁶ kg',
    orbitPeriod: '164.8 地球年',
    distance: '2.3 亿公里',
    description: '最远的蓝色冰巨星，拥有太阳系中最快的风速，可达每小时2000公里。它的深蓝色来自大气中的甲烷。'
  }
];

function generateStars(count: number): StarData[] {
  const stars: StarData[] = [];
  const colors = [
    '#ff4444', '#ff6644', '#ffaa44', '#ffdd88',
    '#ffffff', '#aaddff', '#66aaff', '#4488ff'
  ];

  for (let i = 0; i < count; i++) {
    const radius = 150 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    const colorIndex = Math.floor(Math.random() * colors.length);
    const size = 0.5 + Math.random() * 2;
    const brightness = 0.6 + Math.random() * 0.4;

    stars.push({
      id: `star-${i}`,
      name: starNames[i % starNames.length] + (i >= starNames.length ? ` ${i - starNames.length + 1}` : ''),
      x,
      y,
      z,
      color: colors[colorIndex],
      size,
      brightness
    });
  }

  return stars;
}

function generatePlanets(): PlanetData[] {
  return planetTemplates.map((planet, index) => ({
    ...planet,
    id: `planet-${index}`
  }));
}

function generateNebulae(): NebulaData[] {
  return [
    {
      id: 'nebula-1',
      x: 100,
      y: 50,
      z: -150,
      color: '#ff66aa',
      particleCount: 600,
      radius: 60
    },
    {
      id: 'nebula-2',
      x: -120,
      y: -30,
      z: 100,
      color: '#66aaff',
      particleCount: 500,
      radius: 50
    },
    {
      id: 'nebula-3',
      x: 80,
      y: -80,
      z: -80,
      color: '#aa66ff',
      particleCount: 400,
      radius: 45
    }
  ];
}

export async function loadStarData(): Promise<StarData[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateStars(200));
    }, 300);
  });
}

export async function loadPlanetData(): Promise<PlanetData[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generatePlanets());
    }, 200);
  });
}

export async function loadNebulaData(): Promise<NebulaData[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateNebulae());
    }, 400);
  });
}

export async function loadAllCelestialData() {
  const [stars, planets, nebulae] = await Promise.all([
    loadStarData(),
    loadPlanetData(),
    loadNebulaData()
  ]);
  return { stars, planets, nebulae };
}
