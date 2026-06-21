import type { Work, MaterialPack, MaterialRecommendation } from '../shared/types';
import { fetchMaterials } from './api/MaterialAPI';

const MATERIAL_TAGS = ['植鞣革', '铬鞣革', '十字纹', '原色', '编织'];
const TECHNIQUE_TAGS = ['手工缝线', '封边'];

function buildRecommendReason(workTags: string[], matchedTags: string[]): string {
  if (matchedTags.length === 0) return '基础入门推荐';

  const reasons: string[] = [];
  const matchedMat = matchedTags.filter((t) => MATERIAL_TAGS.includes(t));
  const matchedTech = matchedTags.filter((t) => TECHNIQUE_TAGS.includes(t));

  if (matchedMat.length > 0) {
    reasons.push(`材质匹配：${matchedMat.join('、')}`);
  }
  if (matchedTech.length > 0) {
    reasons.push(`技法相关：${matchedTech.join('、')}`);
  }
  if (reasons.length === 0) {
    reasons.push(`相关标签：${matchedTags.slice(0, 2).join('、')}`);
  }

  return reasons.join('；');
}

export async function getRecommendations(
  workId: string,
  works: Work[]
): Promise<MaterialRecommendation[]> {
  const start = performance.now();

  const work = works.find((w) => w.id === workId);
  if (!work) return [];

  const workTags = new Set(work.tags);
  const allMaterials = await fetchMaterials();

  const scored: MaterialRecommendation[] = allMaterials.map((mat: MaterialPack) => {
    const matchedTags = mat.tagList.filter((t) => workTags.has(t));
    const matchScore = Math.round((matchedTags.length / work.tags.length) * 100);
    const recommendReason = buildRecommendReason(work.tags, matchedTags);
    return { ...mat, matchScore, recommendReason };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top5 = scored.slice(0, 5);

  const elapsed = performance.now() - start;
  if (elapsed > 200) {
    console.warn(`推荐计算耗时 ${elapsed.toFixed(0)}ms，超过 200ms 限制`);
  }

  return top5;
}
