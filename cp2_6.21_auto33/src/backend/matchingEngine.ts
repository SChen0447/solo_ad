import type { Pet, Application, MatchResult, PersonalityTag, HousingType } from './types';

const PERSONALITY_WEIGHTS: Record<PersonalityTag, number> = {
  '亲人': 0.25,
  '活泼': 0.25,
  '胆小': 0.2,
  '安静': 0.15,
  '独立': 0.15,
  '爱玩': 0.2
};

const HOUSING_SCORES: Record<HousingType, number> = {
  '独栋': 100,
  '公寓': 70,
  '合租': 50
};

function calculateTimeScore(hours: number, personality: PersonalityTag[]): number {
  const needsTime = personality.some(p => p === '活泼' || p === '爱玩' || p === '亲人');
  const independent = personality.some(p => p === '独立' || p === '安静');

  if (needsTime) {
    if (hours >= 4) return 100;
    if (hours >= 2) return 70;
    if (hours >= 1) return 40;
    return 10;
  }

  if (independent) {
    if (hours >= 1) return 100;
    if (hours >= 0.5) return 80;
    return 60;
  }

  if (hours >= 2) return 100;
  if (hours >= 1) return 70;
  return 40;
}

function calculateSpaceScore(housingType: HousingType, personality: PersonalityTag[]): number {
  const needsSpace = personality.some(p => p === '活泼' || p === '爱玩');
  const baseScore = HOUSING_SCORES[housingType];

  if (needsSpace && housingType === '公寓') {
    return Math.max(baseScore - 15, 40);
  }
  if (needsSpace && housingType === '合租') {
    return Math.max(baseScore - 10, 30);
  }

  return baseScore;
}

function calculatePetFriendlyScore(hasOtherPets: boolean, personality: PersonalityTag[]): number {
  const friendly = personality.some(p => p === '亲人');
  const notFriendly = personality.some(p => p === '胆小' || p === '独立');

  if (!hasOtherPets) return 100;

  if (friendly) return 85;
  if (notFriendly) return 40;
  return 70;
}

function generateMatchReasons(
  pet: Pet,
  app: Application,
  timeScore: number,
  spaceScore: number,
  petFriendlyScore: number
): string[] {
  const reasons: string[] = [];

  if (timeScore >= 80) {
    reasons.push(`每日${app.dailyCompanionHours}小时陪伴时间充足`);
  } else if (timeScore >= 50) {
    reasons.push(`陪伴时间基本满足需求`);
  }

  if (spaceScore >= 80) {
    reasons.push(`${app.housingType}居住空间合适`);
  } else if (spaceScore >= 50) {
    reasons.push(`${app.housingType}居住空间尚可`);
  }

  if (petFriendlyScore >= 80) {
    reasons.push(app.hasOtherPets ? '与其他宠物相处融洽' : '无其他宠物干扰');
  }

  const matchingTraits = pet.personality.filter(p => {
    if (p === '亲人' && app.dailyCompanionHours >= 2) return true;
    if (p === '活泼' && app.housingType === '独栋') return true;
    if (p === '安静' && app.housingType === '公寓') return true;
    if (p === '独立' && app.dailyCompanionHours < 2) return true;
    return false;
  });

  if (matchingTraits.length > 0) {
    reasons.push(`性格匹配：${matchingTraits.join('、')}`);
  }

  return reasons.slice(0, 3);
}

export function calculateMatchScore(pet: Pet, application: Application): MatchResult {
  const timeScore = calculateTimeScore(application.dailyCompanionHours, pet.personality);
  const spaceScore = calculateSpaceScore(application.housingType, pet.personality);
  const petFriendlyScore = calculatePetFriendlyScore(application.hasOtherPets, pet.personality);

  const avgPersonalityWeight = pet.personality.reduce(
    (sum, p) => sum + PERSONALITY_WEIGHTS[p],
    0
  ) / pet.personality.length;

  const weightedScore =
    timeScore * 0.4 + spaceScore * 0.35 + petFriendlyScore * 0.25;

  const finalScore = Math.round(weightedScore * (0.8 + avgPersonalityWeight * 0.4));

  const reasons = generateMatchReasons(pet, application, timeScore, spaceScore, petFriendlyScore);

  return {
    applicationId: application.id,
    applicantName: application.applicantName,
    contact: application.contact,
    housingType: application.housingType,
    hasOtherPets: application.hasOtherPets,
    dailyCompanionHours: application.dailyCompanionHours,
    matchScore: Math.min(Math.max(finalScore, 0), 100),
    matchReasons: reasons.length > 0 ? reasons : ['基本条件符合']
  };
}

export function getMatchesForPet(
  petId: string,
  pets: Pet[],
  applications: Application[]
): MatchResult[] {
  const pet = pets.find(p => p.id === petId);
  if (!pet) return [];

  const approvedApps = applications.filter(
    app => app.petId === petId && app.status === '通过'
  );

  return approvedApps
    .map(app => calculateMatchScore(pet, app))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}
