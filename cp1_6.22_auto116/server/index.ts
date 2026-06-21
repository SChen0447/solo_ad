import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Holiday {
  id: string;
  name: string;
  date: string;
  country: string;
  countryFlag: string;
  description: string;
}

interface Activity {
  id: string;
  holidayId: string;
  date: string;
  title: string;
  note: string;
  likes: number;
  liked: boolean;
  comments: string[];
  createdAt: number;
}

const holidays: Holiday[] = [
  {
    id: 'holiday-1',
    name: '中国春节',
    date: '2026-02-17',
    country: '中国',
    countryFlag: '🇨🇳',
    description: '中华民族最重要的传统节日，阖家团圆共庆新春'
  },
  {
    id: 'holiday-2',
    name: '巴西狂欢节',
    date: '2026-02-14',
    country: '巴西',
    countryFlag: '🇧🇷',
    description: '世界最盛大的狂欢庆典，桑巴舞与彩车游行的盛宴'
  },
  {
    id: 'holiday-3',
    name: '德国啤酒节',
    date: '2026-09-19',
    country: '德国',
    countryFlag: '🇩🇪',
    description: '慕尼黑盛大民俗节日，品尝啤酒与巴伐利亚美食'
  },
  {
    id: 'holiday-4',
    name: '日本樱花季',
    date: '2026-04-01',
    country: '日本',
    countryFlag: '🇯🇵',
    description: '春季赏樱盛会，粉色花海下的浪漫传统习俗'
  },
  {
    id: 'holiday-5',
    name: '印度排灯节',
    date: '2026-10-28',
    country: '印度',
    countryFlag: '🇮🇳',
    description: '光明战胜黑暗，千家万户点亮彩灯庆祝新年'
  },
  {
    id: 'holiday-6',
    name: '墨西哥亡灵节',
    date: '2026-11-02',
    country: '墨西哥',
    countryFlag: '🇲🇽',
    description: '用万寿菊花瓣与美食迎接逝去亲人的灵魂归来'
  },
  {
    id: 'holiday-7',
    name: '美国独立日',
    date: '2026-07-04',
    country: '美国',
    countryFlag: '🇺🇸',
    description: '庆祝国家独立，烟花表演与爱国游行遍布全国'
  },
  {
    id: 'holiday-8',
    name: '法国国庆日',
    date: '2026-07-14',
    country: '法国',
    countryFlag: '🇫🇷',
    description: '纪念攻占巴士底狱，香榭丽舍大街盛大阅兵庆典'
  }
];

let activities: Activity[] = [];

app.get('/api/holidays', (req: Request, res: Response) => {
  res.json(holidays);
});

app.get('/api/activities', (req: Request, res: Response) => {
  res.json(activities);
});

app.post('/api/activities', (req: Request, res: Response) => {
  const { holidayId, date, title, note } = req.body;
  
  if (!date || !title) {
    return res.status(400).json({ error: '日期和标题是必填项' });
  }

  const newActivity: Activity = {
    id: uuidv4(),
    holidayId: holidayId || '',
    date,
    title,
    note: note || '',
    likes: 0,
    liked: false,
    comments: [],
    createdAt: Date.now()
  };

  activities.push(newActivity);
  res.status(201).json(newActivity);
});

app.post('/api/activities/:id/like', (req: Request, res: Response) => {
  const { id } = req.params;
  const activity = activities.find(a => a.id === id);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  activity.liked = !activity.liked;
  activity.likes += activity.liked ? 1 : -1;
  res.json(activity);
});

app.post('/api/activities/:id/comment', (req: Request, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;
  const activity = activities.find(a => a.id === id);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  activity.comments.push(comment.trim());
  res.json(activity);
});

app.delete('/api/activities/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = activities.findIndex(a => a.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const deleted = activities.splice(index, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
