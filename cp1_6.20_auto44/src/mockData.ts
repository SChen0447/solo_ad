import { NewsItem } from './types';

const categories = ['科技', '财经', '体育', '娱乐', '国际'];

const aiTags = ['AI精选', '深度分析', '热点追踪', '独家报道', '专家解读'];

const titlesPool: Record<string, string[]> = {
  '科技': [
    '人工智能突破：新一代大语言模型推理能力提升300%',
    '量子计算新进展：科学家实现1000量子比特稳定运行',
    '苹果发布Vision Pro 2：重量减轻40%续航翻倍',
    '特斯拉全自动驾驶获全球首个L4级认证',
    '国产芯片重大突破：7nm工艺实现大规模量产',
    'SpaceX星舰第六次试飞成功 完成轨道级回收',
    'OpenAI发布GPT-5 多模态理解能力再进化',
    '华为鸿蒙5.0正式发布 全场景生态再升级',
    '元宇宙迎来拐点：全球VR/AR出货量首次突破1亿台',
    '区块链技术新应用：央行数字人民币跨境支付落地'
  ],
  '财经': [
    'A股三大指数集体上涨 新能源板块领涨',
    '美联储宣布暂停加息 市场情绪显著回暖',
    '比特币突破15万美元 创历史新高',
    '中国GDP增速超预期 全年目标有望达成',
    '新能源汽车销量持续增长 渗透率突破60%',
    '房地产新政出台 一线城市限购政策放松',
    '人民币汇率走强 跨境资本流动保持稳定',
    '科技股集体反弹 纳斯达克指数涨超3%',
    '消费市场回暖 社会消费品零售总额同比增长',
    '养老金入市提速 长期资金助力资本市场'
  ],
  '体育': [
    '世界杯预选赛：国足2-0战胜对手 晋级形势明朗',
    'NBA总决赛：湖人队4-2夺冠 詹姆斯荣膺FMVP',
    '梅西宣布再战一届世界杯 目标卫冕冠军',
    '中国游泳队世锦赛斩获5金 创造历史最佳战绩',
    '网球大满贯：郑钦文首夺法网女单冠军',
    'F1摩纳哥站：维斯塔潘夺冠 汉密尔顿亚军',
    '电竞入亚运会正式项目 英雄联盟等8款游戏入选',
    'CBA总决赛：辽宁队成功卫冕 郭艾伦获MVP',
    '高尔夫大师赛：伍兹复出 奇迹般晋级决赛',
    '马拉松世界纪录被打破 人类突破2小时大关'
  ],
  '娱乐': [
    '春节档电影总票房突破100亿 创历史新高',
    '顶流明星官宣结婚 粉丝送祝福',
    '热门综艺收视率破纪录 第二季正式官宣',
    '国产动画电影票房破50亿 文化出海成绩亮眼',
    '金曲奖颁奖典礼落幕 多位实力派歌手获奖',
    '知名导演新作定档暑期 投资超10亿',
    '选秀节目回归 全新赛制引期待',
    '热播剧大结局 收视率创年度新高',
    '音乐节市场火爆 全国演出场次同比翻倍',
    '脱口秀综艺创新高 喜剧人才持续涌现'
  ],
  '国际': [
    '联合国气候大会达成历史性协议 碳中和目标再提速',
    '中美高层会晤 双边关系释放积极信号',
    '欧盟通过人工智能法案 全球首个AI监管框架落地',
    '金砖国家扩容 新增6个成员国',
    '全球贸易回暖 WTO上调经济增长预期',
    '国际油价持续波动 产油国达成减产协议',
    '太空探索新里程碑：人类首次登陆火星计划公布',
    '全球粮食安全状况改善 饥饿人口持续减少',
    '数字货币跨境支付系统上线 国际贸易更便捷',
    '全球可再生能源投资首超化石能源 能源转型加速'
  ]
};

const paragraphsPool = [
  '据权威机构发布的最新研究报告显示，这一突破性进展将对相关行业产生深远影响。专家分析认为，技术的进步将推动整个产业链的升级改造，预计未来三年内市场规模将实现翻倍增长。',
  '业内人士表示，这一趋势早在预期之中，但发展速度超出了多数人的预期。数据显示，今年以来相关领域的投资金额同比增长超过200%，资本持续看好行业发展前景。',
  '在接受采访时，项目负责人介绍说，团队经过多年的技术攻关，终于攻克了这一关键技术难题。该技术目前已申请多项国际专利，相关成果发表在顶级学术期刊上。',
  '市场分析机构指出，这一变化将重塑行业竞争格局。头部企业凭借技术和资金优势，有望进一步扩大市场份额，而中小企业则面临转型升级的压力。',
  '从全球范围来看，中国在该领域的发展速度令人瞩目。最新统计数据显示，中国的市场规模已占全球总量的40%以上，成为全球最大的单一市场。',
  '专家提醒，在快速发展的同时也需要关注潜在风险。监管部门应该加强引导，规范市场秩序，确保行业健康可持续发展。企业也应该加强自律，承担起应有的社会责任。',
  '普通消费者对这一变化感受最为直接。调查显示，超过80%的受访者表示已经感受到新技术带来的便利，生活质量得到了明显提升。',
  '展望未来，行业发展前景依然广阔。随着技术的不断成熟和成本的逐步下降，更多创新应用将会涌现，为经济社会发展注入新的动力。',
  '政策层面持续释放利好信号，为行业发展提供了有力支撑。多地政府出台专项扶持政策，设立产业基金，吸引优质项目落地。',
  '人才培养体系逐步完善，高校和企业合作建立了多个实训基地，为行业输送了大量高素质人才，有效缓解了人才短缺的问题。'
];

const summarySentencesPool = [
  '最新数据显示，行业整体保持高速增长态势。',
  '专家预测，未来五年市场规模有望突破万亿大关。',
  '技术创新是推动行业发展的核心驱动力。',
  '政策支持为行业发展提供了有力保障。',
  '消费者需求升级催生新的市场机遇。',
  '国际竞争加剧倒逼企业加快转型升级。',
  '产业链协同发展效应逐步显现。',
  '绿色可持续发展成为行业新方向。'
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return function() {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function generateMockArticle(articleId: number, category: string): NewsItem {
  const random = seededRandom(articleId);
  const title = titlesPool[category][(articleId - 1) % 10];
  const aiTag = aiTags[Math.floor(random() * aiTags.length)];
  
  const numParagraphs = 6 + Math.floor(random() * 5);
  const shuffledParagraphs = [...paragraphsPool].sort(() => random() - 0.5);
  const selectedParagraphs = shuffledParagraphs.slice(0, numParagraphs);
  const content = selectedParagraphs.join('\n\n');
  
  const numSentences = 2 + Math.floor(random() * 3);
  const shuffledSentences = [...summarySentencesPool].sort(() => random() - 0.5);
  const summarySentences = shuffledSentences.slice(0, numSentences);
  const summary = summarySentences.join(' ');
  
  const highlightCount = Math.min(numSentences, numParagraphs);
  const highlightIndices: number[] = [];
  const availableIndices = Array.from({ length: numParagraphs }, (_, i) => i);
  for (let i = 0; i < highlightCount; i++) {
    const idx = Math.floor(random() * availableIndices.length);
    highlightIndices.push(availableIndices[idx]);
    availableIndices.splice(idx, 1);
  }
  highlightIndices.sort((a, b) => a - b);
  
  return {
    id: articleId,
    title,
    summary,
    content,
    category,
    ai_tag: aiTag,
    highlights: highlightIndices
  };
}

export function generateMockNewsBatch(page: number, perPage: number = 10, category?: string): NewsItem[] {
  const newsList: NewsItem[] = [];
  const startId = (page - 1) * perPage + 1;
  
  for (let i = 0; i < perPage; i++) {
    const articleId = startId + i;
    const cat = category && category !== '全部' 
      ? category 
      : categories[i % categories.length];
    newsList.push(generateMockArticle(articleId, cat));
  }
  
  return newsList;
}

export function generateMockNewsDetail(id: number): NewsItem {
  const category = categories[(id - 1) % categories.length];
  return generateMockArticle(id, category);
}
