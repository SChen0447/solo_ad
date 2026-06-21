import { v4 as uuidv4 } from 'uuid';

export type InstrumentType = 'violin' | 'piano' | 'flute' | 'guitar' | 'cello' | 'harp';

export type ToneType = 'arpeggio' | 'longnote' | 'scale' | 'chord' | 'pluck' | 'strum';

export interface ExhibitData {
  id: string;
  name: string;
  type: InstrumentType;
  era: string;
  origin: string;
  description: string;
  color: number;
  toneType: ToneType;
  position: { x: number; z: number };
}

const WARM_COLORS = [
  0xffbf66, // 琥珀色
  0xcd7f32, // 红铜色
  0xb76e79, // 玫瑰金
  0xe8a87c, // 暖杏色
  0xd4a574, // 古铜色
  0xc9a86c  // 金棕色
];

const EXHIBITS_DATA: Omit<ExhibitData, 'id' | 'position'>[] = [
  {
    name: '古典小提琴',
    type: 'violin',
    era: '1720年',
    origin: '意大利·克雷莫纳',
    description: '斯特拉迪瓦里时期经典作品，音色明亮通透，富有表现力，被誉为弦乐器之王。',
    color: WARM_COLORS[0],
    toneType: 'scale'
  },
  {
    name: '三角钢琴',
    type: 'piano',
    era: '1890年',
    origin: '德国·莱比锡',
    description: '维多利亚时代钢琴制造巅峰之作，音域宽广，音色饱满浑厚，适合演奏古典曲目。',
    color: WARM_COLORS[1],
    toneType: 'arpeggio'
  },
  {
    name: '银质长笛',
    type: 'flute',
    era: '1850年',
    origin: '法国·巴黎',
    description: '波姆体系改良长笛，音色清澈悠扬，如月光流水般柔美，是木管家族的高音天使。',
    color: WARM_COLORS[2],
    toneType: 'longnote'
  },
  {
    name: '古典吉他',
    type: 'guitar',
    era: '1910年',
    origin: '西班牙·马德里',
    description: '西班牙手工古典吉他，音色温暖醇厚，表现力丰富，是弹拨乐器中的优雅绅士。',
    color: WARM_COLORS[3],
    toneType: 'pluck'
  },
  {
    name: '交响大提琴',
    type: 'cello',
    era: '1840年',
    origin: '奥地利·维也纳',
    description: '交响乐团核心低音乐器，音色深沉浑厚，富有歌唱性，被誉为乐器中的男中音。',
    color: WARM_COLORS[4],
    toneType: 'longnote'
  },
  {
    name: '凯尔特竖琴',
    type: 'harp',
    era: '1780年',
    origin: '爱尔兰·都柏林',
    description: '凯尔特民族传统乐器，音色空灵清澈，如泉水叮咚，充满神秘的田园诗意。',
    color: WARM_COLORS[5],
    toneType: 'arpeggio'
  }
];

export function loadExhibits(): ExhibitData[] {
  const exhibits: ExhibitData[] = [];
  const count = EXHIBITS_DATA.length;
  const arcRadius = 3.5;
  const startAngle = -Math.PI / 3;
  const arcSpan = (Math.PI * 2) / 3;
  
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (arcSpan * i) / (count - 1);
    const x = Math.sin(angle) * arcRadius;
    const z = Math.cos(angle) * arcRadius - 1;
    
    exhibits.push({
      ...EXHIBITS_DATA[i],
      id: uuidv4(),
      position: { x, z }
    });
  }
  
  return exhibits;
}
