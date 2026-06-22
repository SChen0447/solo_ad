import { Gift, MatchSuggestion } from './types';
import { v4 as uuidv4 } from 'uuid';

export function generateMatchSuggestions(gifts: Gift[], maxResults = 5): MatchSuggestion[] {
  const availableGifts = gifts.filter((g) => g.status === 'available');
  const suggestions: MatchSuggestion[] = [];
  const matchedPairs = new Set<string>();

  for (let i = 0; i < availableGifts.length; i++) {
    for (let j = i + 1; j < availableGifts.length; j++) {
      const gift1 = availableGifts[i];
      const gift2 = availableGifts[j];

      if (gift1.owner === gift2.owner) continue;

      const { score, reasons } = calculateMatchScore(gift1, gift2);

      if (score > 0) {
        const pairKey = [gift1.id, gift2.id].sort().join('|');
        if (!matchedPairs.has(pairKey)) {
          matchedPairs.add(pairKey);
          suggestions.push({
            id: uuidv4(),
            gift1,
            gift2,
            matchScore: score,
            reasons,
          });
        }
      }
    }
  }

  suggestions.sort((a, b) => b.matchScore - a.matchScore);
  return suggestions.slice(0, maxResults);
}

function calculateMatchScore(
  gift1: Gift,
  gift2: Gift
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (gift1.category === gift2.category) {
    score += 40;
    reasons.push('类别相同');
  }

  if (gift1.city === gift2.city) {
    score += 30;
    reasons.push('同城交换');
  }

  const valueDiff = Math.abs(gift1.value - gift2.value);
  const avgValue = (gift1.value + gift2.value) / 2;
  const valueRatio = valueDiff / avgValue;

  if (valueRatio <= 0.2) {
    score += 30;
    reasons.push('价值相近 (±20%)');
  } else if (valueRatio <= 0.5) {
    score += 15;
    reasons.push('价值略有差异');
  }

  return { score, reasons };
}
