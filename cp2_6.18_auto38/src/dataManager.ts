export interface TimelineRecord {
  id: string;
  date: string;
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  tags: string[];
}

export interface YearGroup {
  year: number;
  records: TimelineRecord[];
  collapsed: boolean;
}

const availableTags = ['旅行', '工作', '家人', '学习', '美食', '运动', '阅读', '电影', '音乐', '科技'];

const titles = [
  '东京之旅第一天', '项目启动会议', '家庭聚餐', 'React高级课程学习',
  '新餐厅探店', '马拉松比赛', '读完《百年孤独》', '电影院看《奥本海默》',
  '演唱会现场', '新iPhone发布', '周末爬山', '季度总结报告',
  '爸妈生日会', 'TypeScript入门', '米其林三星体验', '健身房打卡',
  '《三体》三部曲', '电影节开幕式', '学弹吉他', 'AI技术分享会',
  '云南自驾游', '产品上线发布', '春节团圆', '在线课程学习',
  '成都美食之旅', '篮球友谊赛', '逛书店淘书', '音乐节狂欢',
  '摄影爱好者聚会', '智能家居改造', '西藏行', '年度复盘',
  '孩子毕业典礼', '技术博客写作', '意大利餐厅约会', '晨跑坚持100天',
  '读书分享会', '话剧演出', '黑胶唱片收藏', '黑客松比赛',
  '北海道滑雪', '晋升答辩', '老同学聚会', 'Coursera证书',
  '韩国料理制作', '乒乓球比赛', '旧书交换活动', '独立电影放映',
  '学习钢琴', '开源项目贡献'
];

const descriptions = [
  '这是一段非常难忘的经历，学到了很多东西，也认识了很多有趣的朋友。整个过程充满了惊喜和感动，让我对生活有了新的认识。',
  '今天完成了一个重要的里程碑，团队合作非常愉快。大家齐心协力，克服了重重困难，最终取得了令人满意的成果。',
  '记录下这个美好的瞬间，希望以后还能有更多这样的时刻。生活中的小确幸往往最值得珍藏和回味。',
  '学习了新的知识和技能，感觉自己又进步了一点。持续学习是保持竞争力的关键，也是个人成长的必经之路。',
  '尝试了新的事物，虽然有点紧张但结果很满意。走出舒适区才能发现更广阔的世界，遇见更好的自己。',
  '和朋友们度过了愉快的一天，笑声不断。友谊是人生最宝贵的财富之一，值得用心去经营和珍惜。',
  '大自然的美景让人心旷神怡，忘记了所有烦恼。在繁忙的生活中，偶尔停下来感受自然的美好是很有必要的。',
  '工作上取得了突破，特别有成就感。每一份努力都会有回报，坚持就是胜利。',
  '和家人在一起的时光总是那么温馨和美好。家是永远的港湾，家人是最坚实的后盾。',
  '今天的经历让我对未来充满了期待和憧憬。保持积极的心态，每一天都是新的开始。'
];

const imagePrompts = [
  'beautiful sunrise over mountains landscape photography',
  'modern city street view at night with neon lights',
  'cozy cafe interior with warm lighting',
  'nature forest path in autumn with fallen leaves',
  'beach sunset with golden hour light',
  'snow covered mountain peaks in winter',
  'cherry blossoms in spring park',
  'rainy city street with reflections',
  'desert sand dunes under clear sky',
  'waterfall in tropical rainforest'
];

function getImageUrl(index: number): string {
  const prompt = encodeURIComponent(imagePrompts[index % imagePrompts.length]);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_16_9`;
}

function generateRandomDate(startYear: number, endYear: number): string {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function generateRandomTags(): string[] {
  const numTags = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...availableTags].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numTags);
}

function generateMockRecords(count: number): TimelineRecord[] {
  const records: TimelineRecord[] = [];

  for (let i = 0; i < count; i++) {
    const hasImage = Math.random() > 0.3;
    const hasUrl = Math.random() > 0.5;

    records.push({
      id: `record-${i + 1}`,
      date: generateRandomDate(2020, 2025),
      title: titles[i % titles.length],
      description: descriptions[i % descriptions.length],
      imageUrl: hasImage ? getImageUrl(i) : undefined,
      url: hasUrl ? `https://example.com/record-${i + 1}` : undefined,
      tags: generateRandomTags()
    });
  }

  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const mockRecords: TimelineRecord[] = generateMockRecords(50);

export function groupByYear(records: TimelineRecord[]): YearGroup[] {
  const groups = new Map<number, TimelineRecord[]>();

  records.forEach(record => {
    const year = new Date(record.date).getFullYear();
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year)!.push(record);
  });

  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, records]) => ({
      year,
      records: records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      collapsed: false
    }));
}

export function getYears(records: TimelineRecord[]): number[] {
  const years = new Set(records.map(r => new Date(r.date).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

export function findFirstRecordOfYear(records: TimelineRecord[], year: number): TimelineRecord | undefined {
  return records
    .filter(r => new Date(r.date).getFullYear() === year)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function filterByTag(records: TimelineRecord[], tag: string): TimelineRecord[] {
  return records.filter(record => record.tags.includes(tag));
}

export function getAllTags(records: TimelineRecord[]): string[] {
  const tagSet = new Set<string>();
  records.forEach(record => record.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}
