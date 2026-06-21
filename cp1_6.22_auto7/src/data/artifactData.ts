export interface ArtifactData {
  id: string;
  year: number;
  name: string;
  description: string;
  modelType: 'jadeDisk' | 'pottery' | 'bronzeDing' | 'gold' | 'crystal';
  mainColor: number;
  cameraAngle: number;
}

export const artifactData: ArtifactData[] = [
  {
    id: 'artifact-1',
    year: -2000,
    name: '玉璧',
    description: '新石器时代玉璧，象征天圆地方，是古代重要的礼器之一，常用于祭祀活动。',
    modelType: 'jadeDisk',
    mainColor: 0x7ac69a,
    cameraAngle: 0
  },
  {
    id: 'artifact-2',
    year: -1000,
    name: '彩陶罐',
    description: '商代彩陶罐，器身绘有精美几何图案，反映了当时高超的制陶工艺水平。',
    modelType: 'pottery',
    mainColor: 0xc4784a,
    cameraAngle: 0.3
  },
  {
    id: 'artifact-3',
    year: 0,
    name: '青铜鼎',
    description: '汉代青铜鼎，鼎身刻有铭文，是国家权力的象征，具有极高的历史价值。',
    modelType: 'bronzeDing',
    mainColor: 0x8b6914,
    cameraAngle: 0.5
  },
  {
    id: 'artifact-4',
    year: 1000,
    name: '金累丝',
    description: '宋代金器，采用累丝工艺精心打造，工艺精湛，展现了宋代金银器制作的巅峰水平。',
    modelType: 'gold',
    mainColor: 0xffd700,
    cameraAngle: 0.2
  },
  {
    id: 'artifact-5',
    year: 1900,
    name: '水晶多面体',
    description: '清代水晶摆件，晶莹剔透，切割精美，是清代宫廷工艺品中的珍品。',
    modelType: 'crystal',
    mainColor: 0xa8d8ff,
    cameraAngle: 0.4
  }
];

export function formatYear(year: number): string {
  if (year < 0) {
    return `公元前${Math.abs(year)}年`;
  } else if (year === 0) {
    return '公元元年';
  } else {
    return `公元${year}年`;
  }
}
