export interface BeanType {
  id: string;
  name: string;
  gradient: string;
  colorStart: string;
  colorEnd: string;
}

export interface CurvePoint {
  time: number;
  temp: number;
}

export interface FlavorScore {
  name: string;
  score: number;
  note: string;
}

export interface RoastBatch {
  id: number;
  userId: number;
  beanId: string;
  date: string;
  duration: number;
  inTemp: number;
  outTemp: number;
  curveData: CurvePoint[];
  flavors: FlavorScore[];
  notes: string;
  createdAt?: string;
}

export const BEAN_TYPES: BeanType[] = [
  { id: 'yirgacheffe', name: '埃塞俄比亚耶加雪菲', gradient: 'linear-gradient(135deg, #87CEEB, #40E0D0)', colorStart: '#87CEEB', colorEnd: '#40E0D0' },
  { id: 'huila', name: '哥伦比亚蕙兰', gradient: 'linear-gradient(135deg, #FFD700, #FF69B4)', colorStart: '#FFD700', colorEnd: '#FF69B4' },
  { id: 'bluemountain', name: '牙买加蓝山', gradient: 'linear-gradient(135deg, #4A3728, #2F4F2F)', colorStart: '#4A3728', colorEnd: '#2F4F2F' },
  { id: 'mandheling', name: '印尼曼特宁', gradient: 'linear-gradient(135deg, #556B2F, #2F4F4F)', colorStart: '#556B2F', colorEnd: '#2F4F4F' },
  { id: 'guji', name: '埃塞俄比亚古吉', gradient: 'linear-gradient(135deg, #FF6347, #FFD700)', colorStart: '#FF6347', colorEnd: '#FFD700' },
  { id: 'panama', name: '巴拿马瑰夏', gradient: 'linear-gradient(135deg, #E6E6FA, #9370DB)', colorStart: '#E6E6FA', colorEnd: '#9370DB' },
  { id: 'costa', name: '哥斯达黎加', gradient: 'linear-gradient(135deg, #DAA520, #CD853F)', colorStart: '#DAA520', colorEnd: '#CD853F' },
  { id: 'kenya', name: '肯尼亚AA', gradient: 'linear-gradient(135deg, #DC143C, #8B0000)', colorStart: '#DC143C', colorEnd: '#8B0000' },
  { id: 'sumatra', name: '苏门答腊', gradient: 'linear-gradient(135deg, #2F4F4F, #1C1C1C)', colorStart: '#2F4F4F', colorEnd: '#1C1C1C' },
  { id: 'brazil', name: '巴西喜拉多', gradient: 'linear-gradient(135deg, #D2691E, #8B4513)', colorStart: '#D2691E', colorEnd: '#8B4513' },
  { id: 'guatemala', name: '危地马拉安提瓜', gradient: 'linear-gradient(135deg, #6B8E23, #556B2F)', colorStart: '#6B8E23', colorEnd: '#556B2F' },
  { id: 'yunnan', name: '云南保山', gradient: 'linear-gradient(135deg, #BC8F8F, #A0522D)', colorStart: '#BC8F8F', colorEnd: '#A0522D' },
  { id: 'kona', name: '夏威夷科纳', gradient: 'linear-gradient(135deg, #FF8C00, #8B4513)', colorStart: '#FF8C00', colorEnd: '#8B4513' },
  { id: 'salvador', name: '萨尔瓦多', gradient: 'linear-gradient(135deg, #D2B48C, #8B7355)', colorStart: '#D2B48C', colorEnd: '#8B7355' },
  { id: 'tanzania', name: '坦桑尼亚AA', gradient: 'linear-gradient(135deg, #9ACD32, #6B8E23)', colorStart: '#9ACD32', colorEnd: '#6B8E23' },
];

export const FLAVOR_DIMENSIONS = [
  '酸度',
  '甜度',
  '苦度',
  '醇厚度',
  '回甘',
  '果香',
  '花香',
  '烤坚果香',
];
