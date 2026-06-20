export type EventType = 'culture' | 'tech' | 'politics';

export interface HistoryEvent {
  id: string;
  year: number;
  date: string;
  month: number;
  day: number;
  title: string;
  type: EventType;
  description: string;
  importance: 1 | 2 | 3 | 4 | 5;
}

export interface YearData {
  year: number;
  events: HistoryEvent[];
}

const CULTURE_TITLES: readonly string[] = [
  '《哈利·波特》系列完结', '漫威宇宙首部电影上映', '《江南Style》全球爆红',
  '《权力的游戏》首播', '《冰雪奇缘》票房破纪录', '《星战7》回归大银幕',
  '《黑豹》获奥斯卡提名', '《寄生虫》摘得金棕榈', '《鱿鱼游戏》风靡全球',
  '《瞬息全宇宙》横扫奥斯卡', '北京奥运会开幕式惊艳世界',
  '伦敦奥运会精彩举办', '里约奥运会圣火传递', '东京奥运会延期后举办',
  '卡塔尔世界杯揭幕', '《魔兽世界》新资料片上线', '《英雄联盟》S赛开幕',
  '《原神》全球公测', '《塞尔达传说：王国之泪》发售', 'NFT艺术热潮兴起',
  '流媒体平台全面普及', '4K超高清电视普及', 'Tiktok席卷全球市场',
  'AI绘画工具横空出世', '《流浪地球》开启中国科幻元年',
  '《三体》英文版获雨果奖', '《三体》Netflix剧集上线',
  '《庆余年》收视口碑双丰收', '《狂飙》引发全民热议',
  'AI生成音乐兴起', '沉浸式展览成文化新潮流'
];

const TECH_TITLES: readonly string[] = [
  'iPhone初代震撼发布', 'Android系统正式发布', '云计算概念开始普及',
  'Windows 7操作系统发布', 'iPad开辟平板新时代', '4G网络商用启动',
  '特斯拉Model S量产交付', '比特币价格首次突破1000美元',
  '深度学习引爆AI革命', 'Windows 10全球发布', 'AlphaGo击败李世石',
  '5G标准正式冻结', '比特币突破2万美元大关', '华为发布首款5G手机',
  'SpaceX龙飞船载人首飞', 'GPT-3模型惊艳问世', '马斯克收购Twitter',
  'ChatGPT引爆生成式AI浪潮', 'GPT-4发布多模态能力',
  '苹果Vision Pro发布', '量子计算取得重大突破',
  'Web3.0概念火热传播', '元宇宙概念全面爆发',
  '无人驾驶出租车投入运营', '固态电池技术突破',
  '可控核聚变点火里程碑', '脑机接口临床试验展开',
  '可再生能源装机首超化石能源', '国产大飞机C919商业首航',
  '嫦娥探月工程圆满成功', '北斗三号全球组网完成',
  '天问一号着陆火星', '国产操作系统生态持续完善',
  '人形机器人走进现实', '6G技术研发正式启动'
];

const POLITICS_TITLES: readonly string[] = [
  '奥巴马当选美国总统', '金融危机席卷全球', 'G20峰会首次升级',
  '英国脱欧公投通过', '特朗普当选美国总统', '巴黎协定达成签署',
  '新冠疫情全球爆发', '美国大选引发争议', '特朗普遭国会弹劾',
  '俄乌冲突全面爆发', '中东局势持续动荡', '北约峰会再扩员',
  '联合国气候大会召开', '一带一路倡议深入推进',
  'RCEP协定正式生效', '金砖国家扩员进程启动',
  '中美高层战略对话', '上合组织新成员国加入',
  '欧盟一体化面临新挑战', '全球粮食安全问题凸显',
  '能源转型引发地缘博弈', '全球数字治理规则讨论展开',
  '中国空间站全面建成', '亚太经合组织成功举办',
  '东盟合作迈向新高度', '全球反恐形势依旧复杂',
  '核不扩散体系面临压力', '北极航道开发竞争升温',
  '太空军事化引发担忧', '全球减碳进程艰难推进'
];

const DESCRIPTIONS_PREFIXES: readonly string[] = [
  '这一事件标志着一个全新时代的开启，对后续发展产生了深远影响。',
  '此事在全球范围内引发广泛讨论与关注，改变了许多人的生活轨迹。',
  '这是一次具有里程碑意义的突破，为相关领域开辟了全新的可能性。',
  '该事件影响波及多个领域，成为年度最受瞩目的焦点之一。',
  '在此背景下，各方力量重新洗牌，塑造了未来数年的发展格局。',
  '这项创新成果一经推出，便迅速获得市场与业界的高度认可。',
  '事件发生后，相关政策与规则进行了重大调整，影响持续至今。',
  '这不仅是一个节点，更是一段波澜壮阔历程的最佳注脚。'
];

function mulberry32(seed: number): () => number {
  return function (): number {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne<T>(arr: readonly T[], rand: () => number): T {
  const idx = Math.floor(rand() * arr.length);
  const val = arr[idx];
  if (val === undefined) {
    throw new Error('Array index out of bounds');
  }
  return val;
}

function buildDescription(type: EventType, rand: () => number): string {
  const core: Record<EventType, string[]> = {
    culture: ['作品票房口碑双丰收', '文化影响力跨出圈层', '成为一代人的集体记忆', '在艺术表达上大胆创新'],
    tech: ['技术方案逐步走向成熟', '产业化进程显著加速', '推动相关产业链全面重构', '在关键指标上超越前代'],
    politics: ['多方力量展开博弈', '后续影响仍在持续发酵', '各方纷纷表态立场鲜明', '推动国际秩序深度调整']
  };
  const base = pickOne(DESCRIPTIONS_PREFIXES, rand);
  const tail = pickOne(core[type] as readonly string[], rand);
  return `${base}${tail}，其长期价值仍有待时间检验。`;
}

function generateDate(year: number, index: number, total: number, rand: () => number): { month: number; day: number; dateStr: string } {
  const baseMonth = Math.max(1, Math.min(12, Math.floor(((index + 0.5) / total) * 12) + Math.floor(rand() * 2) + 1));
  const month = baseMonth > 12 ? 12 : baseMonth < 1 ? 1 : baseMonth;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daySeed = Math.floor(rand() * daysInMonth) + 1;
  const day = Math.max(1, Math.min(daysInMonth, daySeed));
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { month, day, dateStr };
}

export function generateHistoryData(numYears: number = 20, currentYear: number = new Date().getFullYear()): YearData[] {
  const startYear = currentYear - numYears + 1;
  const rand = mulberry32(currentYear * 1000 + numYears * 7);
  const usedTitles = new Set<string>();

  const result: YearData[] = [];

  for (let offset = 0; offset < numYears; offset++) {
    const year = startYear + offset;
    const eventCount = 6 + Math.floor(rand() * 5);
    const events: HistoryEvent[] = [];

    for (let i = 0; i < eventCount; i++) {
      const typeRoll = rand();
      let type: EventType;
      if (typeRoll < 0.38) type = 'culture';
      else if (typeRoll < 0.74) type = 'tech';
      else type = 'politics';

      const pool: readonly string[] = type === 'culture' ? CULTURE_TITLES
        : type === 'tech' ? TECH_TITLES
        : POLITICS_TITLES;

      let title: string;
      let attempts = 0;
      do {
        title = pickOne(pool, rand);
        attempts++;
      } while (usedTitles.has(`${year}-${title}`) && attempts < 10);
      usedTitles.add(`${year}-${title}`);

      const { month, day, dateStr } = generateDate(year, i, eventCount, rand);

      const impRoll = rand();
      let importance: 1 | 2 | 3 | 4 | 5 = 3;
      if (impRoll < 0.06) importance = 5;
      else if (impRoll < 0.22) importance = 4;
      else if (impRoll < 0.70) importance = 3;
      else if (impRoll < 0.90) importance = 2;
      else importance = 1;

      events.push({
        id: `evt-${year}-${i}-${Math.floor(rand() * 10000)}`,
        year,
        date: dateStr,
        month,
        day,
        title,
        type,
        description: buildDescription(type, rand),
        importance
      });
    }

    events.sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });

    result.push({
      year,
      events
    });
  }

  result.sort((a, b) => a.year - b.year);
  return result;
}

export function flattenEvents(years: readonly YearData[]): HistoryEvent[] {
  const out: HistoryEvent[] = [];
  for (const y of years) {
    for (const e of y.events) {
      out.push(e);
    }
  }
  return out;
}
