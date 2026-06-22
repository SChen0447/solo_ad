export interface Episode {
  id: string;
  title: string;
  pubDate: string;
  duration: number;
  summary: string;
  coverUrl: string;
  rating: number;
}

export interface Podcast {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  episodes: Episode[];
  lastUpdated: string;
}

const coverColors = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#10B981', '#14B8A6'],
  ['#F59E0B', '#EF4444'],
  ['#3B82F6', '#6366F1'],
  ['#8B5CF6', '#EC4899'],
  ['#22C55E', '#10B981'],
  ['#F97316', '#F59E0B'],
];

function generateCover(colorIndex: number, size: number): string {
  const [c1, c2] = coverColors[colorIndex % coverColors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${c2};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#grad)" rx="16"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="48" font-family="Arial, sans-serif" font-weight="bold">🎙</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const podcastTitles = [
  { title: '科技早知道', author: '科技周刊' },
  { title: '商业内幕', author: '商业洞察' },
  { title: '读书时间', author: '文化频道' },
  { title: '健康生活', author: '健康卫视' },
  { title: '历史那些事', author: '历史学院' },
  { title: '音乐漫谈', author: '音乐电台' },
  { title: '旅行日记', author: '行者无疆' },
  { title: '职场进阶', author: '职业规划' },
  { title: '心理访谈', author: '心灵驿站' },
  { title: '电影解说', author: '光影流年' },
];

const episodeTitleTemplates = [
  '深度解析：{topic}的未来发展趋势',
  '专访{name}：背后的故事',
  '{topic}入门指南：从零开始',
  '行业观察：{topic}正在改变什么',
  '实战分享：我们如何解决{topic}难题',
  '圆桌讨论：{topic}到底重不重要',
  '读书分享：《{book}》精华解读',
  '答疑时间：关于{topic}的十个问题',
  '年终盘点：{topic}十大事件',
  '新手必听：{topic}避坑指南',
];

const topics = ['人工智能', '区块链', '远程办公', '心理健康', '时间管理', '财务自由', '内容创作', '产品设计', '用户增长', '团队管理'];
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];
const books = ['原则', '思考，快与慢', '人类简史', '穷查理宝典', '原子习惯', '深度工作'];

function generateEpisodes(podcastId: string, colorIndex: number, count: number): Episode[] {
  const episodes: Episode[] = [];
  for (let i = 0; i < count; i++) {
    const template = episodeTitleTemplates[i % episodeTitleTemplates.length];
    const topic = topics[i % topics.length];
    const name = names[i % names.length];
    const book = books[i % books.length];
    const title = template
      .replace('{topic}', topic)
      .replace('{name}', name)
      .replace('{book}', book);
    
    const duration = Math.floor(Math.random() * 3600) + 600;
    const rating = 3 + Math.floor(Math.random() * 21) / 10;
    const pubDate = new Date(Date.now() - i * 86400000 * 3).toISOString();
    
    episodes.push({
      id: `${podcastId}-ep-${i}`,
      title,
      pubDate,
      duration,
      summary: `这是一期关于${topic}的精彩节目，我们邀请了${name}与大家分享他的见解和经验。节目时长约${Math.floor(duration / 60)}分钟，希望你会喜欢。`,
      coverUrl: generateCover(colorIndex, 200),
      rating: Math.round(rating * 10) / 10,
    });
  }
  return episodes;
}

export const mockPodcasts: Podcast[] = podcastTitles.map((item, index) => {
  const episodeCount = 8 + Math.floor(Math.random() * 15);
  return {
    id: `podcast-${index}`,
    title: item.title,
    author: item.author,
    description: `${item.title}是由${item.author}出品的一档优质播客节目，每周更新，为你带来最新鲜的内容。`,
    coverUrl: generateCover(index, 300),
    episodes: generateEpisodes(`podcast-${index}`, index, episodeCount),
    lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000).toISOString(),
  };
});

export const emptyPodcastIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16.85 18.58a9 9 0 1 0-9.7 0"/>
  <path d="M8 14a5 5 0 1 1 8 0"/>
  <circle cx="12" cy="18" r="1"/>
  <path d="M13.5 13a1.5 1.5 0 1 0-3 0"/>
</svg>`;
