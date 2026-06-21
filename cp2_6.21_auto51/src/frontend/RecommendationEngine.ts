import type { Work, MaterialPack, MaterialRecommendation } from '../shared/types';
import { fetchMaterials } from './api/MaterialAPI';

const TAG_WEIGHTS: Record<string, number> = {
  植鞣革: 1.8,
  铬鞣革: 1.8,
  十字纹: 1.5,
  原色: 1.3,
  编织: 2.0,
  手工缝线: 1.6,
  封边: 1.4,
};

const MATERIAL_TAGS = new Set(['植鞣革', '铬鞣革', '十字纹', '原色', '编织']);
const TECHNIQUE_TAGS = new Set(['手工缝线', '封边']);

const TAG_DESCRIPTIONS: Record<string, string> = {
  植鞣革: '选用意大利进口植鞣革原料，随使用时间产生自然包浆',
  铬鞣革: '搭配法国铬鞣革，触感细腻柔软',
  十字纹: '十字纹牛皮纹理清晰，质感硬朗挺括',
  原色: '保留原皮天然色泽，历久弥新',
  编织: '包含完整编织技法配件，还原作品编织细节',
  手工缝线: '配备全套手缝工具，麻线蜡线规格与作品一致',
  封边: '含专业封边液和磨边工具，打造光滑封边效果',
};

const SCORE_TEMPLATES = [
  { threshold: 90, prefix: '完美契合该作品！' },
  { threshold: 75, prefix: '非常适合制作该作品！' },
  { threshold: 60, prefix: '强烈推荐搭配此作品。' },
  { threshold: 40, prefix: '与本作品有一定关联度。' },
  { threshold: 0, prefix: '可作为入门练习的补充材料。' },
];

interface MatchAnalysis {
  matchedTags: string[];
  weightedScore: number;
  maxPossibleScore: number;
  materialMatches: string[];
  techniqueMatches: string[];
}

function analyzeMatch(workTags: string[], matTags: string[]): MatchAnalysis {
  const workTagSet = new Set(workTags);
  const matchedTags: string[] = [];
  let weightedScore = 0;
  let maxPossibleScore = 0;

  for (const tag of workTags) {
    maxPossibleScore += TAG_WEIGHTS[tag] ?? 1.0;
  }

  const materialMatches: string[] = [];
  const techniqueMatches: string[] = [];

  for (const tag of matTags) {
    if (workTagSet.has(tag)) {
      matchedTags.push(tag);
      weightedScore += TAG_WEIGHTS[tag] ?? 1.0;
      if (MATERIAL_TAGS.has(tag)) materialMatches.push(tag);
      if (TECHNIQUE_TAGS.has(tag)) techniqueMatches.push(tag);
    }
  }

  return { matchedTags, weightedScore, maxPossibleScore, materialMatches, techniqueMatches };
}

function buildRecommendReason(work: Work, mat: MaterialPack, analysis: MatchAnalysis): string {
  const { weightedScore, maxPossibleScore, materialMatches, techniqueMatches, matchedTags } = analysis;

  const normScore = maxPossibleScore > 0
    ? Math.round((weightedScore / maxPossibleScore) * 100)
    : 0;

  const tmpl = SCORE_TEMPLATES.find((t) => normScore >= t.threshold) || SCORE_TEMPLATES[SCORE_TEMPLATES.length - 1];

  const parts: string[] = [tmpl.prefix];

  if (materialMatches.length > 0) {
    const topMat = materialMatches[0];
    const desc = TAG_DESCRIPTIONS[topMat];
    if (materialMatches.length === 1) {
      parts.push(desc || `材质匹配：${topMat}`);
    } else {
      parts.push(`材质匹配：${materialMatches.join('+')}组合`);
    }
  }

  if (techniqueMatches.length > 0) {
    if (techniqueMatches.length === 1) {
      const tech = techniqueMatches[0];
      const desc = TAG_DESCRIPTIONS[tech];
      if (desc) parts.push(desc);
      else parts.push(`技法相关：${tech}`);
    } else {
      parts.push(`覆盖${techniqueMatches.join('、')}等${techniqueMatches.length}种核心技法`);
    }
  }

  if (matchedTags.length === 0) {
    parts.push('基础工具齐备，适合新手入门练习');
  } else if (materialMatches.length === 0 && techniqueMatches.length === 0 && matchedTags.length > 0) {
    const extras = matchedTags.slice(0, 2);
    parts.push(`共同标签：${extras.join('、')}`);
  }

  if (mat.components.length >= 5 && normScore >= 70) {
    parts.push(`内含${mat.components.length}件组件，开箱即做`);
  }

  return parts.slice(0, 3).join('｜');
}

export async function getRecommendations(
  workId: string,
  works: Work[]
): Promise<MaterialRecommendation[]> {
  const start = performance.now();

  const work = works.find((w) => w.id === workId);
  if (!work) return [];

  const allMaterials = await fetchMaterials();

  const analyzed = allMaterials.map((mat: MaterialPack) => {
    const analysis = analyzeMatch(work.tags, mat.tagList);
    const baseScore = work.tags.length > 0
      ? (analysis.matchedTags.length / work.tags.length) * 60
      : 0;
    const weightBonus = analysis.maxPossibleScore > 0
      ? (analysis.weightedScore / analysis.maxPossibleScore) * 40
      : 0;
    const matchScore = Math.min(100, Math.round(baseScore + weightBonus));
    const recommendReason = buildRecommendReason(work, mat, analysis);
    return { ...mat, matchScore, recommendReason };
  });

  analyzed.sort((a, b) => b.matchScore - a.matchScore);
  const top5 = analyzed.slice(0, 5);

  const elapsed = performance.now() - start;
  if (elapsed > 200) {
    console.warn(`推荐计算耗时 ${elapsed.toFixed(0)}ms，超过 200ms 限制`);
  }

  return top5;
}
