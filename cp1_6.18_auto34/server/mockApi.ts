import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type Emotion = 'positive' | 'negative' | 'neutral';
type Theme = 'performance' | 'feature' | 'experience' | 'price';

interface Feedback {
  id: string;
  customerName: string;
  channel: string;
  timestamp: string;
  description: string;
  emotion: Emotion;
  theme: Theme;
}

interface NewFeedback {
  customerName: string;
  channel: string;
  timestamp: string;
  description: string;
}

const positiveWords = ['好', '棒', '优秀', '满意', '喜欢', '赞', '不错', '出色', '完美', '惊喜', '流畅', '方便', '贴心', '高效', '喜欢', '感谢', '推荐', '便捷', '舒服', '顺心', 'great', 'good', 'excellent', 'love', 'amazing', 'perfect', 'satisfied', 'wonderful', 'nice', 'awesome', 'smooth', 'helpful', 'fast', 'easy'];
const negativeWords = ['差', '烂', '糟糕', '失望', '讨厌', '慢', '卡', '崩溃', '问题', '难用', '复杂', '贵', '坑', '垃圾', '无语', '后悔', '差', '烦', '难', '坏', 'bad', 'terrible', 'awful', 'slow', 'bug', 'crash', 'disappointed', 'hate', 'expensive', 'complicated', 'difficult', 'broken', 'issue', 'problem', 'annoying'];

const themeKeywords: Record<Theme, string[]> = {
  performance: ['速度', '慢', '卡', '性能', '加载', '响应', '流畅', '卡顿', 'speed', 'slow', 'fast', 'lag', 'performance', 'load', 'quick', 'responsive'],
  feature: ['功能', '缺少', '没有', '新功能', '增加', '功能太少', 'feature', 'missing', 'add', 'function', 'ability', 'feature'],
  experience: ['体验', '界面', '设计', '交互', '用户体验', '操作', '体验差', '好看', '易用', '难用', 'experience', 'interface', 'design', 'ui', 'ux', 'easy', 'difficult', 'user-friendly'],
  price: ['价格', '贵', '便宜', '性价比', '太贵', '划算', '优惠', '太贵了', 'price', 'expensive', 'cheap', 'cost', 'value', 'affordable', 'overpriced'],
};

const customerNames = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十', '郑十一', '孙十二', '钱十三', '王小明', '李小红', '刘德华', '周杰伦', '王菲', '林俊杰', '陈奕迅', '邓紫棋', '薛之谦'];
const channels = ['微信群', '邮件', '问卷', '电话', 'App内反馈', '客服聊天', '微博', '抖音', '小红书', '知乎'];
const descriptions = [
  { text: '系统响应速度很快，用起来非常流畅，体验很棒！', emotion: 'positive' as Emotion, theme: 'performance' as Theme },
  { text: '希望能增加数据导出功能，现在的功能太少了不太够用。', emotion: 'negative' as Emotion, theme: 'feature' as Theme },
  { text: '界面设计很漂亮，交互体验很舒服，点个赞！', emotion: 'positive' as Emotion, theme: 'experience' as Theme },
  { text: '价格有点贵，希望能有更多优惠活动。', emotion: 'negative' as Emotion, theme: 'price' as Theme },
  { text: '加载速度太慢了，经常卡顿，性能需要优化。', emotion: 'negative' as Emotion, theme: 'performance' as Theme },
  { text: '客服响应很快，问题解决得很及时，非常满意！', emotion: 'positive' as Emotion, theme: 'experience' as Theme },
  { text: '功能很齐全，基本需求都能满足，性价比不错。', emotion: 'positive' as Emotion, theme: 'feature' as Theme },
  { text: '整体来说还可以，中规中矩吧。', emotion: 'neutral' as Emotion, theme: 'experience' as Theme },
  { text: '这个价格能买到这样的产品，真的很划算！', emotion: 'positive' as Emotion, theme: 'price' as Theme },
  { text: 'App经常闪退，用起来很崩溃。', emotion: 'negative' as Emotion, theme: 'performance' as Theme },
  { text: '希望能支持深色模式，晚上用起来眼睛疼。', emotion: 'neutral' as Emotion, theme: 'feature' as Theme },
  { text: '操作太复杂了，新手很难上手，体验不好。', emotion: 'negative' as Emotion, theme: 'experience' as Theme },
  { text: '搜索功能很好用，找东西特别方便，赞一个！', emotion: 'positive' as Emotion, theme: 'feature' as Theme },
  { text: '价格偏高，功能一般，感觉不太值这个价。', emotion: 'negative' as Emotion, theme: 'price' as Theme },
  { text: '页面加载速度超快，一点都不卡，非常好！', emotion: 'positive' as Emotion, theme: 'performance' as Theme },
  { text: '建议增加批量操作功能，一个个点太累了。', emotion: 'neutral' as Emotion, theme: 'feature' as Theme },
  { text: '整体体验不错，继续保持！', emotion: 'positive' as Emotion, theme: 'experience' as Theme },
  { text: '太贵了！比其他家贵好多，性价比太低。', emotion: 'negative' as Emotion, theme: 'price' as Theme },
  { text: '用了半年了，一直很稳定，没出什么问题。', emotion: 'positive' as Emotion, theme: 'performance' as Theme },
  { text: '要是能支持自定义主题就好了。', emotion: 'neutral' as Emotion, theme: 'feature' as Theme },
  { text: 'The interface is very user-friendly and easy to navigate.', emotion: 'positive' as Emotion, theme: 'experience' as Theme },
  { text: '加载图片太慢了，经常要等很久。', emotion: 'negative' as Emotion, theme: 'performance' as Theme },
  { text: '功能越来越完善了，开发团队很给力！', emotion: 'positive' as Emotion, theme: 'feature' as Theme },
  { text: '价格公道，物有所值，推荐购买！', emotion: 'positive' as Emotion, theme: 'price' as Theme },
  { text: '有时候会有小bug，但不影响使用。', emotion: 'neutral' as Emotion, theme: 'performance' as Theme },
];

function analyzeEmotion(text: string): Emotion {
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word.toLowerCase())) {
      positiveScore++;
    }
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word.toLowerCase())) {
      negativeScore++;
    }
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

function analyzeTheme(text: string): Theme {
  const lowerText = text.toLowerCase();
  let bestTheme: Theme = 'experience';
  let maxCount = 0;

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    let count = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        count++;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      bestTheme = theme as Theme;
    }
  }

  return bestTheme;
}

function generateMockData(): Feedback[] {
  const feedbackList: Feedback[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const descIndex = i % descriptions.length;
    const desc = descriptions[descIndex];
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const feedback: Feedback = {
      id: uuidv4(),
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      channel: channels[Math.floor(Math.random() * channels.length)],
      timestamp: date.toISOString(),
      description: desc.text,
      emotion: desc.emotion,
      theme: desc.theme,
    };
    feedbackList.push(feedback);
  }

  return feedbackList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

let mockData: Feedback[] = generateMockData();

app.get('/api/feedback', (_req, res) => {
  res.json(mockData);
});

app.post('/api/feedback', (req, res) => {
  const newFeedbackData: NewFeedback = req.body;

  setTimeout(() => {
    const newFeedback: Feedback = {
      id: uuidv4(),
      customerName: newFeedbackData.customerName,
      channel: newFeedbackData.channel,
      timestamp: newFeedbackData.timestamp,
      description: newFeedbackData.description,
      emotion: analyzeEmotion(newFeedbackData.description),
      theme: analyzeTheme(newFeedbackData.description),
    };

    mockData = [newFeedback, ...mockData];
    res.json(mockData);
  }, 200);
});

app.listen(PORT, () => {
  console.log(`Mock API server is running on port ${PORT}`);
  console.log(`GET  /api/feedback - Get all feedback`);
  console.log(`POST /api/feedback - Add new feedback`);
});
