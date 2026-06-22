export interface GroupResult {
  groups: {
    theme: string;
    keywords: string[];
    summary: string;
    todos: string[];
  }[];
}

interface TokenMap {
  [token: string]: number[];
}

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
  '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些', '什么',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
  'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
  'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'they', 'them', 'their', 'about', 'up', 'also', 'much',
]);

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const enWords = lower.match(/[a-z]{2,}/g) || [];
  const zhWords = lower.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const all = [...enWords, ...zhWords];
  return all.filter((w) => !STOP_WORDS.has(w));
}

function computeSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach((t) => {
    if (setB.has(t)) intersection++;
  });
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function buildTokenMap(texts: string[]): { tokenMap: TokenMap; tokenLists: string[][] } {
  const tokenLists = texts.map(tokenize);
  const tokenMap: TokenMap = {};
  tokenLists.forEach((tokens, idx) => {
    tokens.forEach((t) => {
      if (!tokenMap[t]) tokenMap[t] = [];
      tokenMap[t].push(idx);
    });
  });
  return { tokenMap, tokenLists };
}

function clusterBySimilarity(
  tokenLists: string[][],
  minGroups: number,
  maxGroups: number
): number[][] {
  const n = tokenLists.length;
  if (n === 0) return [];
  if (n <= minGroups) return tokenLists.map((_, i) => [i]);

  const similarityMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = computeSimilarity(tokenLists[i], tokenLists[j]);
      similarityMatrix[i][j] = sim;
      similarityMatrix[j][i] = sim;
    }
  }

  let clusters: number[][] = tokenLists.map((_, i) => [i]);

  while (clusters.length > minGroups) {
    let bestI = -1;
    let bestJ = -1;
    let bestSim = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        let totalSim = 0;
        let count = 0;
        for (const a of clusters[i]) {
          for (const b of clusters[j]) {
            totalSim += similarityMatrix[a][b];
            count++;
          }
        }
        const avgSim = count > 0 ? totalSim / count : 0;
        if (avgSim > bestSim) {
          bestSim = avgSim;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestSim < 0.01 || clusters.length <= maxGroups) break;

    const merged = [...clusters[bestI], ...clusters[bestJ]];
    const newClusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
    newClusters.push(merged);
    clusters = newClusters;
  }

  if (clusters.length > maxGroups) {
    clusters = clusters.slice(0, maxGroups);
  }

  return clusters;
}

function extractTopKeywords(tokenLists: string[][], indices: number[], topN: number): string[] {
  const freq: Record<string, number> = {};
  indices.forEach((idx) => {
    tokenLists[idx].forEach((t) => {
      freq[t] = (freq[t] || 0) + 1;
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

const THEME_TEMPLATES: Record<string, string> = {
  default: '主题：{keywords}',
};

const TODO_TEMPLATES = [
  '梳理{keyword}的关键流程和依赖关系',
  '为{keyword}制定具体的执行计划和时间表',
  '评估{keyword}所需的资源和人力投入',
  '确定{keyword}的负责人和协作方式',
  '建立{keyword}的效果评估和反馈机制',
];

function generateSummary(keywords: string[]): string {
  const kw = keywords.join('、');
  return `该主题围绕「${kw}」展开，涉及多个关联方向。建议团队集中讨论核心要点，明确优先级和执行路径，确保关键想法得到有效落地。`;
}

function generateTodos(keywords: string[]): string[] {
  const selected = TODO_TEMPLATES.slice(0, 3);
  return selected.map((tmpl) => {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)] || '该方向';
    return tmpl.replace('{keyword}', keyword);
  });
}

export function groupNotes(texts: string[]): GroupResult {
  if (texts.length === 0) {
    return { groups: [] };
  }

  const { tokenLists } = buildTokenMap(texts);
  const minGroups = Math.min(3, texts.length);
  const maxGroups = Math.min(5, texts.length);
  const clusters = clusterBySimilarity(tokenLists, minGroups, maxGroups);

  const groups = clusters.map((indices) => {
    const keywords = extractTopKeywords(tokenLists, indices, 5);
    const theme = keywords.length > 0
      ? keywords.slice(0, 3).join(' · ')
      : THEME_TEMPLATES.default.replace('{keywords}', '未分类');
    const summary = generateSummary(keywords);
    const todos = generateTodos(keywords);

    return {
      theme,
      keywords,
      summary,
      todos,
    };
  });

  return { groups };
}
