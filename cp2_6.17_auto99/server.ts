import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5678;

app.use(cors());
app.use(bodyParser.json());

interface Inspiration {
  id: string;
  text: string;
  note: string;
  tags: string[];
  timestamp: number;
}

interface GeneratedInspiration {
  text: string;
}

const collection: Inspiration[] = [];

const templates = [
  '一个关于{subject}的{genre}故事大纲',
  '一个结合{elementA}与{elementB}的APP概念',
  '一款以{subject}为主角的{genre}游戏设计',
  '一个围绕{elementA}展开的{subject}品牌营销方案',
  '一种用{elementB}解决{problem}的创新方案',
  '一个{genre}风格的{subject}插画创意',
  '一个将{elementA}与{subject}融合的产品设计',
  '一部关于{subject}与{elementB}的纪录片选题',
  '一个以{problem}为核心矛盾的{genre}短剧脚本',
  '一个{subject}主题的{genre}沉浸式展览方案',
  '一款{genre}类型的{subject}学习工具原型',
  '一个融合{elementA}和{elementB}的建筑设计概念',
];

const subjects = [
  '猫', '老书店', '宇航员', '会说话的植物', '最后一条鲸鱼',
  '古董钟表店', '城市里的狐狸', '海底图书馆', '时间修复师', '梦境快递员',
  '会飞的邮筒', '末日幸存者', '影子收集者', '外星交换生', '记忆当铺',
  '复古街机厅', '云端牧羊人', '深夜便利店店员', '魔法面包师', '星星猎人',
];

const genres = [
  '奇幻冒险', '悬疑推理', '治愈日常', '赛博朋克', '温情治愈',
  '蒸汽朋克', '科幻惊悚', '浪漫喜剧', '古风玄幻', '黑色幽默',
  '后现代主义', '温情成长', '反乌托邦', '都市传说', '青春校园',
];

const elementsA = [
  '咖啡', '复古音乐', '手写信件', '老电影胶片', '老式收音机',
  '折纸艺术', '街角涂鸦', '手工皮具', '老式打字机', '天文望远镜',
  '黑胶唱片', '炼金术', '水晶球', '古老地图', '蒸汽火车',
];

const elementsB = [
  '时间旅行', '平行宇宙', '记忆删除', '心灵感应', '瞬间移动',
  '预知未来', '空间折叠', '永生诅咒', '语言魔法', '梦境入侵',
  '灵魂互换', '重力反转', '天气操控', '动物对话', '回溯时光',
];

const problems = [
  '城市孤独感', '信息过载焦虑', '记忆力衰退', '睡眠质量差', '环保意识薄弱',
  '跨代沟通障碍', '社交恐惧症', '工作倦怠感', '创意枯竭', '传统文化流失',
  '时间管理困难', '空间利用率低', '心理健康忽视', '人际信任缺失', '阅读习惯衰退',
];

const defaultTagsPool = [
  '创意写作', 'APP设计', '游戏开发', '品牌策划', '产品创新',
  '视觉艺术', '影视制作', '展览策划', '教育工具', '建筑设计',
  '奇幻', '科幻', '治愈', '悬疑', '浪漫',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template: string): string {
  return template
    .replace('{subject}', pickRandom(subjects))
    .replace('{genre}', pickRandom(genres))
    .replace('{elementA}', pickRandom(elementsA))
    .replace('{elementB}', pickRandom(elementsB))
    .replace('{problem}', pickRandom(problems));
}

app.get('/api/inspiration', (_req: Request, res: Response<GeneratedInspiration>) => {
  const template = pickRandom(templates);
  const text = fillTemplate(template);
  res.json({ text });
});

app.get('/api/inspiration/collection', (_req: Request, res: Response<Inspiration[]>) => {
  res.json(collection);
});

app.post('/api/inspiration/collection', (req: Request, res: Response<Inspiration | { error: string }>) => {
  try {
    const { text, note, tags } = req.body as Partial<Pick<Inspiration, 'text' | 'note' | 'tags'>>;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: '缺少灵感文本字段' });
      return;
    }

    const safeNote = typeof note === 'string' ? note : '';
    const safeTags = Array.isArray(tags)
      ? tags.filter((t): t is string => typeof t === 'string').slice(0, 3)
      : [];

    const existingIndex = collection.findIndex((item) => item.text === text);
    if (existingIndex !== -1) {
      collection[existingIndex].note = safeNote;
      collection[existingIndex].tags = safeTags;
      res.json(collection[existingIndex]);
      return;
    }

    const newItem: Inspiration = {
      id: uuidv4(),
      text,
      note: safeNote,
      tags: safeTags,
      timestamp: Date.now(),
    };

    collection.unshift(newItem);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.delete('/api/inspiration/collection/:id', (req: Request, res: Response<{ success: boolean } | { error: string }>) => {
  try {
    const { id } = req.params;
    const index = collection.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: '未找到该灵感记录' });
      return;
    }
    collection.splice(index, 1);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(PORT, () => {
  console.log(`灵感服务器正在运行: http://localhost:${PORT}`);
});
