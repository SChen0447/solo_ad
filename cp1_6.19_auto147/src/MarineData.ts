export interface MarineCreature {
  id: string;
  name: string;
  scientificName: string;
  depthRange: [number, number];
  size: number;
  color: number;
  glowColor: number;
  food: string;
  description: string;
  funFact: string;
  swimSpeed: number;
  swingFrequency: number;
  pathRadius: number;
  modelType: 'fish' | 'turtle' | 'shark' | 'jellyfish' | 'whale' | 'dolphin' | 'octopus' | 'ray';
}

export interface DepthLayer {
  min: number;
  max: number;
  name: string;
  lightIntensity: number;
  particleDensity: number;
  ambientColor: string;
  fogDensity: number;
}

export interface EnvironmentData {
  temperature: number;
  lightIntensity: number;
  pressure: number;
  visibility: number;
}

export const depthLayers: DepthLayer[] = [
  { min: 0, max: 10, name: '表层', lightIntensity: 1.0, particleDensity: 0.3, ambientColor: '#1e90ff', fogDensity: 0.01 },
  { min: 10, max: 50, name: '透光层', lightIntensity: 0.8, particleDensity: 0.4, ambientColor: '#1565c0', fogDensity: 0.015 },
  { min: 50, max: 150, name: '弱光层', lightIntensity: 0.4, particleDensity: 0.6, ambientColor: '#0d47a1', fogDensity: 0.025 },
  { min: 150, max: 300, name: '中层', lightIntensity: 0.15, particleDensity: 0.8, ambientColor: '#072d6e', fogDensity: 0.04 },
  { min: 300, max: 500, name: '深层', lightIntensity: 0.05, particleDensity: 1.0, ambientColor: '#031634', fogDensity: 0.06 }
];

export const marineCreatures: MarineCreature[] = [
  {
    id: 'turtle-1',
    name: '绿海龟',
    scientificName: 'Chelonia mydas',
    depthRange: [0, 50],
    size: 1.2,
    color: 0x2d8a3e,
    glowColor: 0xffd700,
    food: '海草、海藻',
    description: '绿海龟是现存最古老的爬行动物之一，寿命可达80年以上。它们拥有流线型的外壳和桨状的鳍肢，非常适合在海洋中生活。',
    funFact: '绿海龟可以在水下憋气长达7小时！',
    swimSpeed: 0.8,
    swingFrequency: 1.5,
    pathRadius: 15,
    modelType: 'turtle'
  },
  {
    id: 'dolphin-1',
    name: '宽吻海豚',
    scientificName: 'Tursiops truncatus',
    depthRange: [0, 100],
    size: 2.5,
    color: 0x808080,
    glowColor: 0xffaa00,
    food: '鱼类、乌贼',
    description: '宽吻海豚是非常聪明的海洋哺乳动物，具有复杂的社会结构和交流方式。它们常常成群结队地活动。',
    funFact: '海豚可以通过回声定位来探测周围环境，精度堪比声呐！',
    swimSpeed: 2.0,
    swingFrequency: 3.0,
    pathRadius: 20,
    modelType: 'dolphin'
  },
  {
    id: 'fish-1',
    name: '小丑鱼',
    scientificName: 'Amphiprion ocellaris',
    depthRange: [1, 30],
    size: 0.3,
    color: 0xff6600,
    glowColor: 0xffff00,
    food: '浮游生物、藻类',
    description: '小丑鱼因其鲜艳的颜色和独特的生活方式而闻名，它们与海葵建立了互利共生的关系。',
    funFact: '所有小丑鱼出生时都是雄性，群体中最大的个体会转变为雌性！',
    swimSpeed: 1.2,
    swingFrequency: 5.0,
    pathRadius: 8,
    modelType: 'fish'
  },
  {
    id: 'fish-2',
    name: '蓝唐王鱼',
    scientificName: 'Paracanthurus hepatus',
    depthRange: [2, 40],
    size: 0.4,
    color: 0x1e90ff,
    glowColor: 0x00ffff,
    food: '浮游生物、藻类',
    description: '蓝唐王鱼以其鲜艳的蓝色身体和黄色尾巴而闻名，是珊瑚礁中最美丽的鱼类之一。',
    funFact: '蓝唐王鱼在夜间会改变颜色，变得更加暗淡以躲避捕食者！',
    swimSpeed: 1.5,
    swingFrequency: 4.5,
    pathRadius: 10,
    modelType: 'fish'
  },
  {
    id: 'shark-1',
    name: '大白鲨',
    scientificName: 'Carcharodon carcharias',
    depthRange: [10, 200],
    size: 5.0,
    color: 0x696969,
    glowColor: 0x88ccff,
    food: '海豹、海狮、鱼类',
    description: '大白鲨是海洋中最顶级的掠食者之一，拥有锋利的牙齿和惊人的嗅觉，可以探测到数公里外的猎物。',
    funFact: '大白鲨拥有多达300颗牙齿，一生中会更换数千颗牙齿！',
    swimSpeed: 2.5,
    swingFrequency: 2.0,
    pathRadius: 30,
    modelType: 'shark'
  },
  {
    id: 'ray-1',
    name: '蝠鲼',
    scientificName: 'Manta birostris',
    depthRange: [20, 150],
    size: 4.0,
    color: 0x2f4f4f,
    glowColor: 0x00ccff,
    food: '浮游生物、小鱼',
    description: '蝠鲼是世界上最大的鳐鱼，翼展可达9米。它们优雅地在水中"飞翔"，通过滤食获取食物。',
    funFact: '蝠鲼的大脑是所有鱼类中最大的之一，具有复杂的行为和社交能力！',
    swimSpeed: 1.0,
    swingFrequency: 1.0,
    pathRadius: 25,
    modelType: 'ray'
  },
  {
    id: 'octopus-1',
    name: '章鱼',
    scientificName: 'Octopus vulgaris',
    depthRange: [50, 200],
    size: 1.5,
    color: 0xff6b6b,
    glowColor: 0xff88cc,
    food: '甲壳类、贝类、鱼类',
    description: '章鱼是最聪明的无脊椎动物，拥有出色的伪装能力和问题解决能力，可以使用工具。',
    funFact: '章鱼有三颗心脏，两颗负责给鳃供血，一颗负责给全身供血！',
    swimSpeed: 0.6,
    swingFrequency: 2.5,
    pathRadius: 12,
    modelType: 'octopus'
  },
  {
    id: 'whale-1',
    name: '抹香鲸',
    scientificName: 'Physeter macrocephalus',
    depthRange: [100, 500],
    size: 12.0,
    color: 0x4a4a4a,
    glowColor: 0x66aaff,
    food: '大王乌贼、深海鱼类',
    description: '抹香鲸是世界上最大的齿鲸，能够潜入深海捕食。它们的头部占身体的三分之一，拥有动物界最大的大脑。',
    funFact: '抹香鲸可以潜入2000米深的海域，憋气时间长达2小时！',
    swimSpeed: 1.2,
    swingFrequency: 0.8,
    pathRadius: 40,
    modelType: 'whale'
  },
  {
    id: 'jellyfish-1',
    name: '月亮水母',
    scientificName: 'Aurelia aurita',
    depthRange: [50, 300],
    size: 0.8,
    color: 0xe6e6fa,
    glowColor: 0x88ffff,
    food: '浮游生物、小鱼',
    description: '月亮水母是最常见的水母种类之一，身体透明呈伞状，通过收缩身体来推进。',
    funFact: '水母没有大脑、心脏和骨骼，但已经在地球上生存了超过6亿年！',
    swimSpeed: 0.3,
    swingFrequency: 1.2,
    pathRadius: 10,
    modelType: 'jellyfish'
  },
  {
    id: 'jellyfish-2',
    name: '发光水母',
    scientificName: 'Aequorea victoria',
    depthRange: [200, 500],
    size: 0.5,
    color: 0x99ffcc,
    glowColor: 0x39ff14,
    food: '浮游生物',
    description: '发光水母能够发出绿色荧光，是生物发光研究的重要物种。',
    funFact: '发光水母体内的绿色荧光蛋白(GFP)是现代生物学研究的重要工具！',
    swimSpeed: 0.2,
    swingFrequency: 1.0,
    pathRadius: 8,
    modelType: 'jellyfish'
  },
  {
    id: 'fish-3',
    name: '深海琵琶鱼',
    scientificName: 'Melanocetus johnsonii',
    depthRange: [300, 500],
    size: 0.6,
    color: 0x1a1a2e,
    glowColor: 0x39ff14,
    food: '小鱼、甲壳类',
    description: '深海琵琶鱼生活在黑暗的深海中，雌性头顶有一个发光的"钓竿"用来引诱猎物。',
    funFact: '雄性琵琶鱼比雌性小得多，一生中会附着在雌性身上，最终融合成为一体！',
    swimSpeed: 0.4,
    swingFrequency: 2.0,
    pathRadius: 10,
    modelType: 'fish'
  },
  {
    id: 'fish-4',
    name: '灯笼鱼',
    scientificName: 'Myctophidae',
    depthRange: [150, 400],
    size: 0.2,
    color: 0x000080,
    glowColor: 0x00ffff,
    food: '浮游生物',
    description: '灯笼鱼是深海中最常见的鱼类之一，身体上有许多发光器官，可以发出生物光。',
    funFact: '灯笼鱼每天会进行垂直迁移，夜晚到浅海觅食，白天回到深海躲避捕食者！',
    swimSpeed: 0.8,
    swingFrequency: 4.0,
    pathRadius: 12,
    modelType: 'fish'
  },
  {
    id: 'shark-2',
    name: '哥布林鲨鱼',
    scientificName: 'Mitsukurina owstoni',
    depthRange: [200, 500],
    size: 3.0,
    color: 0x8b4513,
    glowColor: 0x4488ff,
    food: '深海鱼类、鱿鱼',
    description: '哥布林鲨鱼是一种非常罕见的深海鲨鱼，拥有独特的长鼻子和可伸缩的下颚，被称为"活化石"。',
    funFact: '哥布林鲨鱼的下颚可以快速伸出捕获猎物，速度快到肉眼几乎看不见！',
    swimSpeed: 0.5,
    swingFrequency: 1.5,
    pathRadius: 20,
    modelType: 'shark'
  }
];

export function getDepthLayer(depth: number): DepthLayer {
  return depthLayers.find(layer => depth >= layer.min && depth < layer.max) || depthLayers[depthLayers.length - 1];
}

export function getCreaturesAtDepth(depth: number): MarineCreature[] {
  return marineCreatures.filter(creature => 
    depth >= creature.depthRange[0] && depth <= creature.depthRange[1]
  );
}

export function calculateEnvironmentData(depth: number): EnvironmentData {
  const temperature = Math.max(2, 28 - depth * 0.05);
  const lightIntensity = Math.max(0.01, 1 - depth / 500);
  const pressure = 1 + depth / 10;
  const visibility = Math.max(5, 50 - depth * 0.09);
  
  return { temperature, lightIntensity, pressure, visibility };
}

export function interpolateColor(depth: number, shallowColor: number, deepColor: number): number {
  const t = Math.min(1, depth / 500);
  const r1 = (shallowColor >> 16) & 255;
  const g1 = (shallowColor >> 8) & 255;
  const b1 = shallowColor & 255;
  const r2 = (deepColor >> 16) & 255;
  const g2 = (deepColor >> 8) & 255;
  const b2 = deepColor & 255;
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return (r << 16) | (g << 8) | b;
}
