import type { Pet, Application, MatchResult } from '../../shared/types.js';

export function calculateMatchScore(pet: Pet, application: Application): number {
  const tags = pet.personalityTags;
  let tagScore = 0;
  let envScore = 0;
  let timeScore = 0;

  if (tags.length === 0) return 0;

  for (const tag of tags) {
    switch (tag) {
      case '活泼':
        if (application.dailyCompanionHours >= 4) tagScore += 100;
        else if (application.dailyCompanionHours >= 2) tagScore += 60;
        else tagScore += 20;
        break;
      case '亲人':
        if (application.dailyCompanionHours >= 3) tagScore += 100;
        else if (application.dailyCompanionHours >= 1) tagScore += 60;
        else tagScore += 20;
        break;
      case '胆小':
        tagScore += application.housingType === 'house' ? 100 : 60;
        break;
      case '安静':
        tagScore += application.housingType === 'apartment' ? 100 : 60;
        break;
      default:
        tagScore += 50;
    }
  }
  tagScore = tagScore / tags.length;

  const hasActiveTag = tags.includes('活泼') || tags.includes('亲人');
  const hasQuietTag = tags.includes('安静') || tags.includes('胆小');

  if (hasActiveTag) {
    envScore = application.housingType === 'house' ? 100 : 50;
  } else if (hasQuietTag) {
    envScore = application.housingType === 'apartment' ? 100 : 50;
  } else {
    envScore = 70;
  }

  const needsHighCompanion = tags.includes('活泼') || tags.includes('亲人');
  if (needsHighCompanion) {
    if (application.dailyCompanionHours >= 4) timeScore = 100;
    else if (application.dailyCompanionHours >= 2) timeScore = 70;
    else timeScore = 30;
  } else {
    if (application.dailyCompanionHours >= 2) timeScore = 100;
    else if (application.dailyCompanionHours >= 1) timeScore = 70;
    else timeScore = 40;
  }

  return Math.round((tagScore * 0.4 + envScore * 0.3 + timeScore * 0.3));
}

export function findMatchesForPet(
  pet: Pet,
  applications: Application[],
  topN: number = 5
): MatchResult[] {
  return applications
    .filter((app) => app.petId === pet.id && app.status === 'pending')
    .map((app) => ({
      application: app,
      matchScore: calculateMatchScore(pet, app),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, topN);
}
