import type { Work, MaterialPack, MaterialRecommendation } from '../shared/types';
import { fetchMaterials } from './api/MaterialAPI';

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
    return { ...mat, matchScore };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top5 = scored.slice(0, 5);

  const elapsed = performance.now() - start;
  if (elapsed > 200) {
    console.warn(`推荐计算耗时 ${elapsed.toFixed(0)}ms，超过 200ms 限制`);
  }

  return top5;
}
