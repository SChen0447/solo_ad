import type { Pet, Application, MatchResult, PersonalityTag, HousingType } from './types';

interface PersonalityProfile {
  minCompanionHours: number;
  optimalCompanionHours: number;
  preferredHousing: HousingType[];
  unfavorableHousing: HousingType[];
  prefersNoOtherPets: boolean;
  canTolerateOtherPets: boolean;
  environmentNoiseTolerance: 'low' | 'medium' | 'high';
}

const PERSONALITY_PROFILES: Record<PersonalityTag, PersonalityProfile> = {
  '活泼': {
    minCompanionHours: 2,
    optimalCompanionHours: 5,
    preferredHousing: ['独栋'],
    unfavorableHousing: ['合租'],
    prefersNoOtherPets: false,
    canTolerateOtherPets: true,
    environmentNoiseTolerance: 'high'
  },
  '胆小': {
    minCompanionHours: 1,
    optimalCompanionHours: 3,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: ['合租'],
    prefersNoOtherPets: true,
    canTolerateOtherPets: false,
    environmentNoiseTolerance: 'low'
  },
  '亲人': {
    minCompanionHours: 2,
    optimalCompanionHours: 4,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: [],
    prefersNoOtherPets: false,
    canTolerateOtherPets: true,
    environmentNoiseTolerance: 'medium'
  },
  '爱玩': {
    minCompanionHours: 3,
    optimalCompanionHours: 5,
    preferredHousing: ['独栋'],
    unfavorableHousing: ['合租'],
    prefersNoOtherPets: false,
    canTolerateOtherPets: true,
    environmentNoiseTolerance: 'high'
  },
  '安静': {
    minCompanionHours: 0.5,
    optimalCompanionHours: 2,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: [],
    prefersNoOtherPets: true,
    canTolerateOtherPets: false,
    environmentNoiseTolerance: 'low'
  },
  '独立': {
    minCompanionHours: 0.5,
    optimalCompanionHours: 2,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: [],
    prefersNoOtherPets: true,
    canTolerateOtherPets: false,
    environmentNoiseTolerance: 'low'
  }
};

const HOUSING_NOISE_LEVEL: Record<HousingType, number> = {
  '独栋': 1,
  '公寓': 2,
  '合租': 3
};

function calculateTimeScore(hours: number, personality: PersonalityTag[]): number {
  let totalScore = 0;

  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    if (hours >= profile.optimalCompanionHours) {
      totalScore += 100;
    } else if (hours >= profile.minCompanionHours) {
      const range = profile.optimalCompanionHours - profile.minCompanionHours;
      const progress = hours - profile.minCompanionHours;
      totalScore += 60 + Math.round((progress / range) * 40);
    } else if (hours >= profile.minCompanionHours * 0.5) {
      totalScore += 30;
    } else {
      totalScore += 10;
    }
  }

  return Math.round(totalScore / personality.length);
}

function calculateSpaceScore(housingType: HousingType, personality: PersonalityTag[]): number {
  let totalScore = 0;

  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    let score = 60;

    if (profile.preferredHousing.includes(housingType)) {
      score = 100;
    } else if (profile.unfavorableHousing.includes(housingType)) {
      score = 25;
    } else if (housingType === '独栋') {
      score = 90;
    } else if (housingType === '公寓') {
      score = 70;
    } else {
      score = 50;
    }

    if (profile.environmentNoiseTolerance === 'low') {
      const noiseLevel = HOUSING_NOISE_LEVEL[housingType];
      if (noiseLevel > 1) {
        score -= (noiseLevel - 1) * 15;
      }
    }

    totalScore += Math.max(score, 10);
  }

  return Math.round(totalScore / personality.length);
}

function calculatePetFriendlyScore(hasOtherPets: boolean, personality: PersonalityTag[]): number {
  if (!hasOtherPets) {
    let bonus = 0;
    for (const tag of personality) {
      if (PERSONALITY_PROFILES[tag].prefersNoOtherPets) bonus += 10;
    }
    return Math.min(100, 90 + bonus);
  }

  let totalScore = 0;
  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    if (profile.canTolerateOtherPets) {
      if (profile.prefersNoOtherPets) {
        totalScore += 65;
      } else {
        totalScore += 80;
      }
    } else {
      totalScore += 30;
    }
  }

  return Math.round(totalScore / personality.length);
}

function calculatePersonalityFitScore(personality: PersonalityTag[], app: Application): number {
  let totalFit = 0;

  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    let fit = 50;

    if (app.dailyCompanionHours >= profile.optimalCompanionHours) {
      fit += 25;
    } else if (app.dailyCompanionHours >= profile.minCompanionHours) {
      fit += 15;
    } else {
      fit -= 15;
    }

    if (profile.preferredHousing.includes(app.housingType)) {
      fit += 20;
    } else if (profile.unfavorableHousing.includes(app.housingType)) {
      fit -= 20;
    }

    if (!app.hasOtherPets && profile.prefersNoOtherPets) {
      fit += 15;
    } else if (app.hasOtherPets && !profile.canTolerateOtherPets) {
      fit -= 20;
    } else if (!app.hasOtherPets) {
      fit += 5;
    }

    totalFit += Math.min(Math.max(fit, 0), 100);
  }

  return Math.round(totalFit / personality.length);
}

function generateMatchReasons(
  pet: Pet,
  app: Application,
  timeScore: number,
  spaceScore: number,
  petFriendlyScore: number,
  personalityFitScore: number
): string[] {
  const reasons: string[] = [];

  if (timeScore >= 80) {
    reasons.push(`每日${app.dailyCompanionHours}小时陪伴时间充足`);
  } else if (timeScore >= 50) {
    reasons.push('陪伴时间基本满足需求');
  } else {
    reasons.push('陪伴时间可能不足');
  }

  if (spaceScore >= 80) {
    reasons.push(`${app.housingType}居住空间合适`);
  } else if (spaceScore >= 50) {
    reasons.push(`${app.housingType}居住空间尚可`);
  }

  if (petFriendlyScore >= 80) {
    reasons.push(app.hasOtherPets ? '与其他宠物相处融洽' : '无其他宠物干扰');
  }

  const tagReasons: string[] = [];
  for (const tag of pet.personality) {
    const profile = PERSONALITY_PROFILES[tag];
    if (tag === '活泼' && app.dailyCompanionHours >= profile.optimalCompanionHours) {
      tagReasons.push(`"${tag}"性格与高陪伴时间匹配`);
    } else if (tag === '胆小' && !app.hasOtherPets && !profile.unfavorableHousing.includes(app.housingType)) {
      tagReasons.push(`"${tag}"性格适合安静环境`);
    } else if (tag === '亲人' && app.dailyCompanionHours >= profile.minCompanionHours) {
      tagReasons.push(`"${tag}"性格与陪伴需求匹配`);
    } else if (tag === '爱玩' && app.housingType === '独栋') {
      tagReasons.push(`"${tag}"性格适合宽敞空间`);
    } else if (tag === '安静' && app.housingType === '公寓') {
      tagReasons.push(`"${tag}"性格适合公寓生活`);
    } else if (tag === '独立' && app.dailyCompanionHours <= 2) {
      tagReasons.push(`"${tag}"性格可适应较少陪伴`);
    }
  }

  if (tagReasons.length > 0) {
    reasons.push(...tagReasons.slice(0, 2));
  }

  if (personalityFitScore >= 80) {
    reasons.push('整体性格高度匹配');
  }

  return reasons.slice(0, 4);
}

export function calculateMatchScore(pet: Pet, application: Application): MatchResult {
  const timeScore = calculateTimeScore(application.dailyCompanionHours, pet.personality);
  const spaceScore = calculateSpaceScore(application.housingType, pet.personality);
  const petFriendlyScore = calculatePetFriendlyScore(application.hasOtherPets, pet.personality);
  const personalityFitScore = calculatePersonalityFitScore(pet.personality, application);

  const weightedScore =
    timeScore * 0.25 +
    spaceScore * 0.2 +
    petFriendlyScore * 0.2 +
    personalityFitScore * 0.35;

  const finalScore = Math.round(weightedScore);

  const reasons = generateMatchReasons(
    pet, application,
    timeScore, spaceScore,
    petFriendlyScore, personalityFitScore
  );

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
