import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type POICategory = 'nature' | 'culture' | 'food';

interface POI {
  id: string;
  name: string;
  city: string;
  category: POICategory;
  duration: number;
  description: string;
  suggestedTime: string;
}

interface Activity {
  id: string;
  name: string;
  type: 'poi' | 'food' | 'transport';
  startTime: string;
  endTime: string;
  duration: number;
  category?: POICategory;
  notes?: string;
}

interface Conflict {
  id: string;
  activityIds: [string, string];
  type: 'overlap' | 'tight_gap';
  message: string;
  suggestion: string;
}

const poisData: POI[] = [
  { id: 'p1', name: '故宫博物院', city: '北京', category: 'culture', duration: 180, description: '明清两代皇家宫殿', suggestedTime: '09:00' },
  { id: 'p2', name: '长城（八达岭）', city: '北京', category: 'nature', duration: 240, description: '万里长城著名段落', suggestedTime: '08:00' },
  { id: 'p3', name: '颐和园', city: '北京', category: 'nature', duration: 150, description: '皇家园林典范', suggestedTime: '09:30' },
  { id: 'p4', name: '天坛公园', city: '北京', category: 'culture', duration: 120, description: '明清帝王祭天场所', suggestedTime: '08:30' },
  { id: 'p5', name: '南锣鼓巷', city: '北京', category: 'food', duration: 90, description: '老北京胡同美食街', suggestedTime: '18:00' },
  { id: 'p6', name: '王府井大街', city: '北京', category: 'food', duration: 120, description: '著名商业街', suggestedTime: '19:00' },
  { id: 'p7', name: '外滩', city: '上海', category: 'culture', duration: 120, description: '万国建筑博览群', suggestedTime: '18:00' },
  { id: 'p8', name: '东方明珠塔', city: '上海', category: 'culture', duration: 120, description: '上海地标电视塔', suggestedTime: '10:00' },
  { id: 'p9', name: '豫园', city: '上海', category: 'culture', duration: 120, description: '江南古典园林', suggestedTime: '09:00' },
  { id: 'p10', name: '南京路步行街', city: '上海', category: 'food', duration: 120, description: '中华商业第一街', suggestedTime: '14:00' },
  { id: 'p11', name: '田子坊', city: '上海', category: 'food', duration: 90, description: '创意产业聚集区', suggestedTime: '15:00' },
  { id: 'p12', name: '迪士尼乐园', city: '上海', category: 'nature', duration: 480, description: '主题乐园', suggestedTime: '09:00' },
  { id: 'p13', name: '西湖', city: '杭州', category: 'nature', duration: 240, description: '人间天堂', suggestedTime: '09:00' },
  { id: 'p14', name: '灵隐寺', city: '杭州', category: 'culture', duration: 120, description: '千年古刹', suggestedTime: '08:00' },
  { id: 'p15', name: '河坊街', city: '杭州', category: 'food', duration: 120, description: '历史文化特色街区', suggestedTime: '18:00' },
  { id: 'p16', name: '宋城', city: '杭州', category: 'culture', duration: 240, description: '宋文化主题公园', suggestedTime: '14:00' },
  { id: 'p17', name: '成都大熊猫繁育研究基地', city: '成都', category: 'nature', duration: 180, description: '大熊猫保护研究中心', suggestedTime: '08:00' },
  { id: 'p18', name: '锦里古街', city: '成都', category: 'food', duration: 120, description: '川西民俗古街', suggestedTime: '18:00' },
  { id: 'p19', name: '宽窄巷子', city: '成都', category: 'food', duration: 120, description: '清朝古街道', suggestedTime: '16:00' },
  { id: 'p20', name: '武侯祠', city: '成都', category: 'culture', duration: 120, description: '三国遗迹博物馆', suggestedTime: '10:00' },
  { id: 'p21', name: '杜甫草堂', city: '成都', category: 'culture', duration: 90, description: '诗圣故居', suggestedTime: '09:00' },
  { id: 'p22', name: '春熙路', city: '成都', category: 'food', duration: 120, description: '繁华商业街', suggestedTime: '19:00' },
  { id: 'p23', name: '大雁塔', city: '西安', category: 'culture', duration: 90, description: '唐代古塔', suggestedTime: '09:00' },
  { id: 'p24', name: '兵马俑博物馆', city: '西安', category: 'culture', duration: 180, description: '世界第八大奇迹', suggestedTime: '08:30' },
  { id: 'p25', name: '回民街', city: '西安', category: 'food', duration: 120, description: '西安美食聚集地', suggestedTime: '18:00' },
  { id: 'p26', name: '西安城墙', city: '西安', category: 'culture', duration: 150, description: '明代古城墙', suggestedTime: '17:00' },
  { id: 'p27', name: '华清宫', city: '西安', category: 'culture', duration: 150, description: '唐代皇家温泉行宫', suggestedTime: '10:00' },
  { id: 'p28', name: '大唐不夜城', city: '西安', category: 'food', duration: 120, description: '唐风步行街', suggestedTime: '20:00' },
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

app.get('/api/pois', (req, res) => {
  const { city, category } = req.query;
  let filtered = [...poisData];

  if (city) {
    filtered = filtered.filter(p => p.city === city);
  }
  if (category) {
    const cats = (category as string).split(',');
    filtered = filtered.filter(p => cats.includes(p.category));
  }

  res.json(filtered);
});

app.get('/api/cities', (_req, res) => {
  const cities = Array.from(new Set(poisData.map(p => p.city)));
  res.json(cities);
});

app.post('/api/check-conflicts', (req, res) => {
  const { activities } = req.body as { activities: Activity[] };
  const conflicts: Conflict[] = [];

  if (!activities || activities.length < 2) {
    return res.json({ conflicts });
  }

  const sorted = [...activities].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime);
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      if (bStart < aEnd) {
        const overlapMinutes = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
        conflicts.push({
          id: uuidv4(),
          activityIds: [a.id, b.id],
          type: 'overlap',
          message: `「${a.name}」和「${b.name}」时间重叠 ${overlapMinutes} 分钟`,
          suggestion: `建议将「${b.name}」延后至 ${minutesToTime(aEnd + 15)} 开始，或缩短「${a.name}」的时长`,
        });
      } else if (bStart - aEnd < 30) {
        const gapMinutes = bStart - aEnd;
        conflicts.push({
          id: uuidv4(),
          activityIds: [a.id, b.id],
          type: 'tight_gap',
          message: `「${a.name}」和「${b.name}」间隔仅 ${gapMinutes} 分钟，可能交通时间不足`,
          suggestion: `建议将「${b.name}」延后至 ${minutesToTime(aEnd + 30)} 开始，预留充足交通时间`,
        });
      }
    }
  }

  res.json({ conflicts });
});

app.post('/api/generate-itinerary', (req, res) => {
  const { startDate, endDate, city, categories = ['nature', 'culture', 'food'] } = req.body as {
    startDate: string;
    endDate: string;
    city: string;
    categories?: POICategory[];
  };

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: Activity[][] = [];

  const cityPOIs = poisData.filter(p => p.city === city && categories.includes(p.category));

  const current = new Date(start);
  let poiIndex = 0;

  while (current <= end) {
    const dayActivities: Activity[] = [];
    let currentTime = 480;

    const dayPOIs = cityPOIs.slice(poiIndex, poiIndex + 4);
    poiIndex += 4;

    for (const poi of dayPOIs) {
      const startT = currentTime;
      const endT = currentTime + poi.duration;
      dayActivities.push({
        id: uuidv4(),
        name: poi.name,
        type: 'poi',
        startTime: minutesToTime(startT),
        endTime: minutesToTime(endT),
        duration: poi.duration,
        category: poi.category,
        notes: poi.description,
      });
      currentTime = endT + 45;

      if (currentTime > 1380) break;
    }

    const lunchStart = Math.max(720, currentTime - (dayActivities.length * 45));
    const lunchEnd = lunchStart + 60;
    dayActivities.push({
      id: uuidv4(),
      name: '午餐',
      type: 'food',
      startTime: minutesToTime(lunchStart),
      endTime: minutesToTime(lunchEnd),
      duration: 60,
      notes: '推荐当地特色餐厅',
    });

    const dinnerStart = 1140;
    dayActivities.push({
      id: uuidv4(),
      name: '晚餐',
      type: 'food',
      startTime: minutesToTime(dinnerStart),
      endTime: minutesToTime(dinnerStart + 90),
      duration: 90,
      notes: '推荐当地特色餐厅',
    });

    dayActivities.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    days.push(dayActivities);

    current.setDate(current.getDate() + 1);
  }

  res.json({ days });
});

app.listen(PORT, () => {
  console.log(`Trip Planner API server running on http://localhost:${PORT}`);
});
