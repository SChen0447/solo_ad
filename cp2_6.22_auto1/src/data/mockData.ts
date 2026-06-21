import type { Podcast, Episode } from '../types';

const coverUrls = [
  'https://picsum.photos/seed/podcast1/400/400',
  'https://picsum.photos/seed/podcast2/400/400',
  'https://picsum.photos/seed/podcast3/400/400',
  'https://picsum.photos/seed/podcast4/400/400',
  'https://picsum.photos/seed/podcast5/400/400',
  'https://picsum.photos/seed/podcast6/400/400',
  'https://picsum.photos/seed/podcast7/400/400',
  'https://picsum.photos/seed/podcast8/400/400',
  'https://picsum.photos/seed/podcast9/400/400',
  'https://picsum.photos/seed/podcast10/400/400',
  'https://picsum.photos/seed/podcast11/400/400',
  'https://picsum.photos/seed/podcast12/400/400'
];

const podcastTitles = [
  { title: '科技前沿观察', author: '张伟博士', desc: '深度解析最新科技趋势，探讨AI、云计算、区块链等前沿技术的应用与未来。' },
  { title: '商业思维录', author: '李明', desc: '每周邀请知名企业家分享商业洞察，解析成功案例背后的逻辑与策略。' },
  { title: '深夜读书馆', author: '王芳', desc: '每晚半小时，带你精读一本好书，涵盖文学、历史、哲学、心理学等领域。' },
  { title: '健康生活指南', author: '陈医生', desc: '专业医生为你解读健康知识，涵盖饮食、运动、睡眠、心理等全方位健康话题。' },
  { title: '编程进阶之路', author: 'Alex Chen', desc: '从入门到精通，分享编程技巧、架构设计、职业发展，助你成为优秀工程师。' },
  { title: '世界历史漫谈', author: '历史教授张', desc: '生动有趣地讲述世界历史故事，带你穿越时空了解人类文明的发展脉络。' },
  { title: '创业者说', author: '创业邦', desc: '真实创业者的口述历史，记录他们的成功与失败、喜悦与迷茫。' },
  { title: '音乐漫游记', author: '音乐DJ小林', desc: '每期一个音乐主题，精选世界各地的好音乐，陪你度过美好时光。' },
  { title: '心理学与生活', author: '李教授', desc: '用通俗的语言讲解心理学知识，帮助你更好地了解自己，理解他人。' },
  { title: '旅行故事集', author: '背包客阿杰', desc: '来自世界各地的旅行见闻，分享独特的文化体验和人生感悟。' },
  { title: '电影深度解析', author: '影评人老周', desc: '解构经典电影的叙事手法、镜头语言和主题内涵，带你看懂好电影。' },
  { title: '金融投资入门', author: '财经分析师刘', desc: '从零开始学投资，讲解股票、基金、债券等基础知识，培养正确的理财观念。' }
];

const episodeTitleTemplates = [
  ['深度解析：{topic}的未来发展趋势', '专家访谈：{topic}行业的机遇与挑战', '新手入门：如何快速了解{topic}', '{topic}实战：从理论到应用的完整指南', '前沿观察：2024年{topic}的三大突破'],
  ['成功案例：{topic}是如何改变行业的', '避坑指南：{topic}常见的5个误区', '对比分析：{topic}与传统方案的优劣', '未来展望：{topic}在未来5年的发展预测', '深度对话：{topic}领域的先行者分享经验'],
  ['{topic}的核心原理详解', '如何用{topic}解决实际问题', '{topic}初学者最常问的10个问题', '实战分享：我用{topic}做了什么项目', '{topic}学习路线图：从入门到精通']
];

const topicPool = [
  '人工智能', '大语言模型', 'Web3.0', '元宇宙', '量子计算',
  '自动驾驶', '新能源', '可持续发展', '远程办公', '数字营销',
  '个人成长', '时间管理', '情绪管理', '批判性思维', '创造力',
  '价值投资', '资产配置', '风险管理', '财务自由', '经济周期'
];

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

function randomDuration(): number {
  return Math.floor(600 + Math.random() * 2400);
}

function randomRating(): number {
  return Math.round((3 + Math.random() * 2) * 10) / 10;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockPodcasts(): Podcast[] {
  return podcastTitles.map((item, index) => {
    const episodeCount = 6 + Math.floor(Math.random() * 10);
    return {
      id: `podcast-${index + 1}`,
      title: item.title,
      description: item.desc,
      coverUrl: coverUrls[index % coverUrls.length],
      author: item.author,
      subscribed: false,
      lastUpdated: randomDate(new Date(2024, 0, 1), new Date()),
      episodeCount
    };
  });
}

export function generateMockEpisodes(podcasts: Podcast[]): Map<string, Episode[]> {
  const episodesMap = new Map<string, Episode[]>();

  podcasts.forEach((podcast) => {
    const episodes: Episode[] = [];
    const templates = getRandomItem(episodeTitleTemplates);
    const count = podcast.episodeCount;

    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const topic = getRandomItem(topicPool);
      const title = template.replace('{topic}', topic);
      const episodeIndex = count - i;

      episodes.push({
        id: `${podcast.id}-ep-${i + 1}`,
        podcastId: podcast.id,
        title: `第${episodeIndex}期：${title}`,
        publishDate: randomDate(
          new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
        ),
        duration: randomDuration(),
        summary: `这是关于"${title}"的详细内容。在本期节目中，我们将深入探讨相关话题，分享实用的见解和经验。节目内容丰富，适合对该领域感兴趣的听众收听。`,
        coverUrl: podcast.coverUrl.replace(/\/seed\/[^/]+\//, `/seed/${podcast.id}-ep${i + 1}/`),
        rating: randomRating()
      });
    }

    episodesMap.set(podcast.id, episodes);
  });

  return episodesMap;
}
