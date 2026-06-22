import type { Comment, KeywordResult, KeywordCategory, WeeklyDataPoint } from '@/shared/types';

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '里', '为', '什么', '吗', '吧', '呢',
  '啊', '哦', '哈', '嗯', '呀', '啦', '嘛', '么', '把', '被', '让', '给', '对',
  '从', '向', '往', '与', '及', '等', '或', '但', '而', '且', '所', '以', '因',
  '可', '能', '还', '来', '用', '时', '过', '只', '最', '更', '做', '使', '比',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it',
  'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
  'and', 'but', 'or', 'not', 'no', 'so', 'if', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'as', 'into', 'about', 'than',
]);

const SYNONYM_GROUPS: string[][] = [
  ['好', '优秀', '棒', '赞', '出色', '精良', '上乘'],
  ['差', '不好', '糟糕', '烂', '劣质', '低劣', '不行'],
  ['快', '迅速', '快捷', '飞快', '敏捷'],
  ['慢', '迟缓', '磨蹭', '龟速'],
  ['方便', '便捷', '便利', '省事'],
  ['麻烦', '繁琐', '复杂', '费事'],
  ['满意', '满足', '称心', '如意'],
  ['失望', '不满', '遗憾', '扫兴'],
  ['推荐', '种草', '安利'],
  ['退货', '退换', '退回'],
  ['质量', '品质', '做工'],
  ['价格', '价钱', '价位', '性价比'],
  ['物流', '快递', '配送', '发货'],
  ['包装', '外壳', '盒子'],
  ['服务', '客服', '售后'],
  ['好看', '漂亮', '美观', '精美', '精致'],
  ['难看', '丑', '土'],
  ['耐用', '结实', '耐造', '牢固'],
  ['易碎', '脆弱', '不结实'],
  ['舒适', '舒服', '舒心'],
  ['难受', '不舒服', '不适'],
];

const POSITIVE_WORDS = new Set([
  '好', '优秀', '棒', '赞', '出色', '精良', '上乘',
  '快', '迅速', '快捷', '飞快', '敏捷',
  '方便', '便捷', '便利', '省事',
  '满意', '满足', '称心', '如意',
  '推荐', '种草', '安利',
  '质量', '品质', '做工',
  '好看', '漂亮', '美观', '精美', '精致',
  '耐用', '结实', '耐造', '牢固',
  '舒适', '舒服', '舒心',
  '喜欢', '爱', '惊喜', '超值', '实惠',
  '正品', '靠谱', '值得', '完美', '给力',
]);

const NEGATIVE_WORDS = new Set([
  '差', '不好', '糟糕', '烂', '劣质', '低劣', '不行',
  '慢', '迟缓', '磨蹭', '龟速',
  '麻烦', '繁琐', '复杂', '费事',
  '失望', '不满', '遗憾', '扫兴',
  '退货', '退换', '退回',
  '难看', '丑', '土',
  '易碎', '脆弱', '不结实',
  '难受', '不舒服', '不适',
  '假货', '山寨', '欺骗', '坑', '垃圾',
  '差评', '投诉', '问题', '故障', '损坏',
  '异味', '刺鼻', '粗糙', '掉色', '褪色',
]);

const synonymMap = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  const mainWord = group[0];
  for (const word of group) {
    synonymMap.set(word, mainWord);
  }
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const chineseSegments = text.split(/[a-zA-Z0-9\s,.\-!?;:'"()\[\]{}<>\/\\@#$%^&*+=|~`]+/);
  for (const seg of chineseSegments) {
    if (seg.trim()) {
      const words = extractChineseWords(seg.trim());
      tokens.push(...words);
    }
  }
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  for (const w of englishWords) {
    const lower = w.toLowerCase();
    if (lower.length > 1 && !STOP_WORDS.has(lower)) {
      tokens.push(lower);
    }
  }
  return tokens;
}

function extractChineseWords(text: string): string[] {
  const words: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (/[\u4e00-\u9fff]/.test(text[i])) {
      let matched = false;
      for (let len = 4; len >= 2; len--) {
        if (i + len <= text.length) {
          const candidate = text.substring(i, i + len);
          if (isKnownPhrase(candidate)) {
            words.push(candidate);
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        const char = text[i];
        if (!STOP_WORDS.has(char)) {
          words.push(char);
        }
        i++;
      }
    } else {
      i++;
    }
  }
  return words;
}

function isKnownPhrase(phrase: string): boolean {
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(phrase)) return true;
  }
  if (POSITIVE_WORDS.has(phrase)) return true;
  if (NEGATIVE_WORDS.has(phrase)) return true;
  return false;
}

function classifyWord(word: string): KeywordCategory {
  const mainWord = synonymMap.get(word) || word;
  if (POSITIVE_WORDS.has(mainWord) || POSITIVE_WORDS.has(word)) return 'positive';
  if (NEGATIVE_WORDS.has(mainWord) || NEGATIVE_WORDS.has(word)) return 'negative';
  return 'neutral';
}

function mergeSynonym(word: string): string {
  return synonymMap.get(word) || word;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
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
  const wordFrequency = new Map<string, number>();
  const wordDates = new Map<string, string[]>();

  for (const comment of comments) {
    const tokens = tokenize(comment.content);
    for (const token of tokens) {
      const merged = mergeSynonym(token);
      if (merged.length === 0) continue;
      wordFrequency.set(merged, (wordFrequency.get(merged) || 0) + 1);
      if (!wordDates.has(merged)) {
        wordDates.set(merged, []);
      }
      wordDates.get(merged)!.push(comment.date);
    }
  }

  const results: KeywordResult[] = [];
  for (const [word, freq] of wordFrequency) {
    const category = classifyWord(word);
    const dates = wordDates.get(word) || [];
    const weeklyMap = new Map<string, number>();
    for (const dateStr of dates) {
      const weekKey = getWeekKey(dateStr);
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
    }
    const weeklyData: WeeklyDataPoint[] = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    results.push({
      word,
      frequency: freq,
      category,
      weeklyData,
    });
  }

  results.sort((a, b) => b.frequency - a.frequency);
  return results;
}
