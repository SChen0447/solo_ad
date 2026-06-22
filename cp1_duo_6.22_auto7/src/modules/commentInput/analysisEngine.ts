import type { Comment, KeywordResult, KeywordCategory, WeeklyDataPoint } from '@/shared/types';

const STOP_WORDS: readonly string[] = [
  '的', '了', '是', '在', '我', '有', '和', '就', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
  '自己', '这', '他', '她', '它', '们', '那', '里', '为', '什么', '吗', '吧', '呢',
  '啊', '哦', '哈', '嗯', '呀', '啦', '嘛', '么', '把', '被', '让', '给', '对',
  '从', '向', '往', '与', '及', '等', '或', '但', '而', '且', '所', '以', '因',
  '可', '能', '还', '来', '用', '时', '过', '只', '最', '更', '做', '使', '比',
  '还是', '其实', '就是', '已经', '还有', '如果', '因为', '所以', '虽然', '但是',
  '而且', '然后', '之后', '以前', '现在', '之后', '感觉', '觉得', '这个', '那个',
  '这些', '那些', '一下', '一点', '一些', '什么', '怎么', '怎样', '怎么样',
];

const NEGATION_WORDS: readonly string[] = [
  '不', '没', '没有', '非', '未', '别', '莫', '勿', '无',
  '不是', '不行', '不好', '不可以', '不能', '不会', '不要', '不曾',
  '并不', '并不', '并未', '绝不', '决不', '从不', '从未',
];

const POSITIVE_DICT: Readonly<Record<string, number>> = {
  '好': 2, '优秀': 3, '棒': 2, '赞': 2, '出色': 3, '精良': 3, '上乘': 3,
  '不错': 2, '可以': 1, '满意': 2, '满足': 2, '称心': 2, '如意': 2,
  '惊喜': 2, '超值': 3, '实惠': 2, '划算': 2, '便宜': 2,
  '快': 2, '迅速': 3, '快捷': 3, '飞快': 3, '敏捷': 2, '及时': 2,
  '方便': 2, '便捷': 3, '便利': 2, '省事': 2, '省心': 2,
  '推荐': 2, '种草': 2, '安利': 2, '值得': 2, '靠谱': 2,
  '质量好': 3, '品质': 2, '做工好': 3, '细致': 2, '精细': 3,
  '好看': 2, '漂亮': 3, '美观': 3, '精美': 3, '精致': 3, '大气': 2,
  '耐用': 3, '结实': 2, '耐造': 2, '牢固': 3, '坚固': 3,
  '舒适': 2, '舒服': 2, '舒心': 2, '合身': 2, '合适': 2,
  '正品': 3, '完美': 3, '给力': 2, '喜欢': 2, '爱': 2, '爱了': 3,
  '清楚': 2, '清晰': 3, '流畅': 2, '顺畅': 2,
  '香': 2, '好喝': 2, '好吃': 2, '新鲜': 2,
  '热情': 2, '周到': 2, '耐心': 2, '专业': 2,
  '简单': 2, '容易': 2, '轻松': 2,
};

const NEGATIVE_DICT: Readonly<Record<string, number>> = {
  '差': 3, '糟糕': 3, '烂': 3, '劣质': 3, '低劣': 3,
  '慢': 3, '迟缓': 3, '磨蹭': 2, '龟速': 3, '拖沓': 2,
  '麻烦': 2, '繁琐': 3, '复杂': 2, '费事': 2, '费劲': 2,
  '失望': 3, '不满': 2, '遗憾': 2, '扫兴': 3, '后悔': 3,
  '退货': 2, '退换': 2, '退回': 2, '换货': 2,
  '难看': 3, '丑': 3, '土': 2, '丑爆': 3,
  '易碎': 3, '脆弱': 2, '不结实': 3, '易坏': 3,
  '难受': 2, '不舒服': 2, '不适': 2, '磨脚': 2, '勒': 2,
  '假货': 3, '山寨': 3, '欺骗': 3, '坑': 3, '垃圾': 3, '次品': 3,
  '差评': 3, '投诉': 3, '问题': 2, '故障': 3, '损坏': 3, '坏': 2,
  '异味': 2, '刺鼻': 3, '粗糙': 2, '掉色': 3, '褪色': 2, '起球': 2,
  '难用': 3, '卡顿': 2, '卡': 2, '发热': 2,
  '贵': 2, '贵了': 2, '不值': 3,
  '小': 1, '大': 1, '紧': 1, '松': 1, '短': 1, '长': 1,
  '不专业': 3, '态度差': 3, '敷衍': 2,
};

const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['好', '不错', '优秀', '棒', '赞', '出色', '精良', '上乘', '可以'],
  ['差', '糟糕', '烂', '劣质', '低劣', '不行'],
  ['快', '迅速', '快捷', '飞快', '敏捷', '及时'],
  ['慢', '迟缓', '磨蹭', '龟速', '拖沓'],
  ['方便', '便捷', '便利', '省事', '省心'],
  ['麻烦', '繁琐', '复杂', '费事', '费劲'],
  ['满意', '满足', '称心', '如意'],
  ['失望', '不满', '遗憾', '扫兴', '后悔'],
  ['推荐', '种草', '安利', '值得'],
  ['退货', '退换', '退回', '换货'],
  ['质量', '品质', '做工', '细致', '精细'],
  ['价格', '价钱', '价位', '性价比'],
  ['物流', '快递', '配送', '发货'],
  ['包装', '外壳', '盒子'],
  ['服务', '客服', '售后', '态度'],
  ['好看', '漂亮', '美观', '精美', '精致', '大气'],
  ['难看', '丑', '土', '丑爆'],
  ['耐用', '结实', '耐造', '牢固', '坚固'],
  ['易碎', '脆弱', '不结实', '易坏'],
  ['舒适', '舒服', '舒心', '合身', '合适'],
  ['难受', '不舒服', '不适'],
  ['喜欢', '爱', '爱了'],
  ['便宜', '实惠', '划算', '超值'],
  ['贵', '贵了', '不值'],
];

const synonymToCanonical: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const group of SYNONYM_GROUPS) {
    const canonical = group[0];
    for (const w of group) {
      m.set(w, canonical);
    }
  }
  return m;
})();

const ALL_DICT_WORDS: readonly string[] = Array.from(new Set([
  ...Object.keys(POSITIVE_DICT),
  ...Object.keys(NEGATIVE_DICT),
  ...synonymToCanonical.keys(),
])).sort((a, b) => b.length - a.length);

const MAX_WORD_LEN = ALL_DICT_WORDS.reduce((m, w) => Math.max(m, w.length), 2);

const STOP_WORDS_SET = new Set(STOP_WORDS);
const NEGATION_SET = new Set(NEGATION_WORDS);

interface SegmentToken {
  text: string;
  index: number;
  isSentiment?: boolean;
  isNegation?: boolean;
}

function buildDictTrie(): Map<string, boolean> {
  return new Map(ALL_DICT_WORDS.map(w => [w, true]));
}

const DICT_TRIE = buildDictTrie();

function segmentChinese(text: string): SegmentToken[] {
  const result: SegmentToken[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (/[\s,.\-!?;:'"()\[\]{}<>\/\\@#$%^&*+=|~`，。、；：""''！？（）【】《》…—]+/.test(ch)) {
      result.push({ text: ch, index: i });
      i++;
      continue;
    }

    if (/[a-zA-Z0-9]/.test(ch)) {
      let j = i;
      while (j < len && /[a-zA-Z0-9]/.test(text[j])) j++;
      result.push({ text: text.substring(i, j).toLowerCase(), index: i });
      i = j;
      continue;
    }

    if (/[\u4e00-\u9fff]/.test(ch)) {
      let matched = false;
      const maxTry = Math.min(MAX_WORD_LEN, len - i);

      for (let tryLen = maxTry; tryLen >= 2; tryLen--) {
        const candidate = text.substring(i, i + tryLen);
        if (DICT_TRIE.has(candidate)) {
          const isSentiment = POSITIVE_DICT[candidate] !== undefined || NEGATIVE_DICT[candidate] !== undefined;
          const isNegation = NEGATION_SET.has(candidate);
          result.push({ text: candidate, index: i, isSentiment, isNegation });
          i += tryLen;
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (!STOP_WORDS_SET.has(ch)) {
          result.push({ text: ch, index: i });
        }
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

function isNegated(tokens: SegmentToken[], sentimentIndex: number): boolean {
  const WINDOW = 2;
  const start = Math.max(0, sentimentIndex - WINDOW);
  let hasNegation = false;
  let lastSentenceBreak = -1;

  for (let k = sentimentIndex - 1; k >= start; k--) {
    const t = tokens[k];
    if (/[,.!?;，。、！？；：]/.test(t.text)) {
      lastSentenceBreak = k;
      break;
    }
  }

  const windowStart = Math.max(start, lastSentenceBreak + 1);
  for (let k = sentimentIndex - 1; k >= windowStart; k--) {
    const t = tokens[k];
    if (t.isNegation || NEGATION_SET.has(t.text)) {
      hasNegation = !hasNegation;
    }
  }
  return hasNegation;
}

interface ExtractedKeyword {
  word: string;
  rawScore: number;
  category: KeywordCategory;
  date: string;
}

function extractKeywordsFromComment(comment: Comment): ExtractedKeyword[] {
  const tokens = segmentChinese(comment.content);
  const keywordMap = new Map<string, { score: number; cat: KeywordCategory }>();

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    const posDict = POSITIVE_DICT[token.text];
    const negDict = NEGATIVE_DICT[token.text];

    if (posDict !== undefined || negDict !== undefined) {
      const negated = isNegated(tokens, idx);

      let baseCat: KeywordCategory = 'neutral';
      let baseScore = 0;

      if (posDict !== undefined) {
        baseCat = negated ? 'negative' : 'positive';
        baseScore = posDict;
      } else if (negDict !== undefined) {
        baseCat = negated ? 'positive' : 'negative';
        baseScore = negDict;
      }

      const canonical = synonymToCanonical.get(token.text) || token.text;
      const existing = keywordMap.get(canonical);
      if (existing) {
        existing.score += baseScore;
      } else {
        keywordMap.set(canonical, { score: baseScore, cat: baseCat });
      }
    }
  }

  const results: ExtractedKeyword[] = [];
  for (const [word, info] of keywordMap.entries()) {
    results.push({
      word,
      rawScore: info.score,
      category: info.cat,
      date: comment.date,
    });
  }
  return results;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function analyzeComments(comments: Comment[]): KeywordResult[] {
  const wordAgg = new Map<string, {
    frequency: number;
    scoreSum: number;
    posVotes: number;
    negVotes: number;
    weekly: Map<string, number>;
  }>();

  for (const comment of comments) {
    const keywords = extractKeywordsFromComment(comment);
    for (const kw of keywords) {
      let agg = wordAgg.get(kw.word);
      if (!agg) {
        agg = {
          frequency: 0,
          scoreSum: 0,
          posVotes: 0,
          negVotes: 0,
          weekly: new Map(),
        };
        wordAgg.set(kw.word, agg);
      }
      agg.frequency++;
      agg.scoreSum += kw.rawScore;
      if (kw.category === 'positive') agg.posVotes++;
      else if (kw.category === 'negative') agg.negVotes++;

      const wk = getWeekKey(kw.date);
      agg.weekly.set(wk, (agg.weekly.get(wk) || 0) + 1);
    }
  }

  const results: KeywordResult[] = [];
  for (const [word, agg] of wordAgg.entries()) {
    let category: KeywordCategory = 'neutral';
    if (agg.posVotes > agg.negVotes) category = 'positive';
    else if (agg.negVotes > agg.posVotes) category = 'negative';

    const weeklyData: WeeklyDataPoint[] = Array.from(agg.weekly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    results.push({
      word,
      frequency: agg.frequency,
      category,
      weeklyData,
    });
  }

  results.sort((a, b) => b.frequency - a.frequency);
  return results;
}
