import type { Pet, Application, MatchResult } from '../../shared/types.js';

function getPetActivityLevel(pet: Pet): number {
  const tags = pet.personalityTags;
  let level = 0.5;
  for (const tag of tags) {
    if (tag === '活泼') level += 0.3;
    else if (tag === '亲人') level += 0.15;
    else if (tag === '安静') level -= 0.25;
    else if (tag === '胆小') level -= 0.15;
  }
  return Math.max(0, Math.min(1, level));
}

function getPetSpaceNeed(pet: Pet): number {
  const tags = pet.personalityTags;
  let need = 0.5;
  for (const tag of tags) {
    if (tag === '活泼') need += 0.3;
    else if (tag === '胆小') need -= 0.2;
    else if (tag === '安静') need -= 0.3;
    else if (tag === '亲人') need += 0.1;
  }
  return Math.max(0, Math.min(1, need));
}

function getPersonActivityLevel(hours: number): number {
  if (hours >= 6) return 1.0;
  if (hours >= 4) return 0.8;
  if (hours >= 3) return 0.6;
  if (hours >= 2) return 0.4;
  if (hours >= 1) return 0.2;
  return 0.1;
}

function getPersonSpaceCapacity(housingType: 'apartment' | 'house'): number {
  return housingType === 'house' ? 1.0 : 0.4;
}

export function calculateMatchScore(pet: Pet, application: Application): number {
  const tags = pet.personalityTags;
  if (tags.length === 0) return 30;

  let tagMatchScore = 0;
  for (const tag of tags) {
    let score = 0;
    switch (tag) {
      case '活泼':
        if (application.dailyCompanionHours >= 5) score = 100;
        else if (application.dailyCompanionHours >= 4) score = 85;
        else if (application.dailyCompanionHours >= 3) score = 60;
        else if (application.dailyCompanionHours >= 2) score = 35;
        else score = 10;
        break;
      case '亲人':
        if (application.dailyCompanionHours >= 4) score = 100;
        else if (application.dailyCompanionHours >= 3) score = 80;
        else if (application.dailyCompanionHours >= 2) score = 55;
        else if (application.dailyCompanionHours >= 1) score = 30;
        else score = 10;
        break;
      case '安静':
        if (application.dailyCompanionHours <= 3) score = 100;
        else if (application.dailyCompanionHours <= 5) score = 70;
        else score = 40;
        break;
      case '胆小':
        if (application.dailyCompanionHours <= 2) score = 100;
        else if (application.dailyCompanionHours <= 4) score = 65;
        else score = 30;
        break;
      default:
        score = 50;
    }
    tagMatchScore += score;
  }
  tagMatchScore = tagMatchScore / tags.length;

  const petSpaceNeed = getPetSpaceNeed(pet);
  const personSpace = getPersonSpaceCapacity(application.housingType);
  const spaceDiff = Math.abs(petSpaceNeed - personSpace);
  const envScore = Math.round(100 * (1 - spaceDiff));

  const petActivity = getPetActivityLevel(pet);
  const personActivity = getPersonActivityLevel(application.dailyCompanionHours);
  const activityDiff = Math.abs(petActivity - personActivity);
  const timeScore = Math.round(100 * (1 - activityDiff));

  const finalScore = tagMatchScore * 0.4 + envScore * 0.3 + timeScore * 0.3;
  return Math.round(Math.max(0, Math.min(100, finalScore)));
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
