import type { Pet, Application, MatchResult, PersonalityTag, HousingType } from './types';

interface PersonalityProfile {
  optimalCompanionHours: number;
  minCompanionHours: number;
  preferredHousing: HousingType[];
  unfavorableHousing: HousingType[];
  prefersNoOtherPets: boolean;
  canTolerateOtherPets: boolean;
  noiseTolerance: 'low' | 'medium' | 'high';
  timeDecayFactor: number;
  spaceDecayFactor: number;
}

const PERSONALITY_PROFILES: Record<PersonalityTag, PersonalityProfile> = {
  '活泼': {
    optimalCompanionHours: 5,
    minCompanionHours: 1.5,
    preferredHousing: ['独栋'],
    unfavorableHousing: ['合租'],
    prefersNoOtherPets: false,
    canTolerateOtherPets: true,
    noiseTolerance: 'high',
    timeDecayFactor: 0.8,
    spaceDecayFactor: 1.2
  },
  '胆小': {
    optimalCompanionHours: 3,
    minCompanionHours: 0.5,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: ['合租'],
    prefersNoOtherPets: true,
    canTolerateOtherPets: false,
    noiseTolerance: 'low',
    timeDecayFactor: 0.5,
    spaceDecayFactor: 1.5
  },
  '亲人': {
    optimalCompanionHours: 4,
    minCompanionHours: 1,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: [],
    prefersNoOtherPets: false,
    canTolerateOtherPets: true,
    noiseTolerance: 'medium',
    timeDecayFactor: 0.6,
    spaceDecayFactor: 0.8
  },
  '爱玩': {
    optimalCompanionHours: 5,
    minCompanionHours: 2,
    preferredHousing: ['独栋'],
    unfavorableHousing: ['合租'],
    prefersNoOtherPets: false,
    canTolerateOtherPets: true,
    noiseTolerance: 'high',
    timeDecayFactor: 0.9,
    spaceDecayFactor: 1.3
  },
  '安静': {
    optimalCompanionHours: 2,
    minCompanionHours: 0.3,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: [],
    prefersNoOtherPets: true,
    canTolerateOtherPets: false,
    noiseTolerance: 'low',
    timeDecayFactor: 0.4,
    spaceDecayFactor: 0.5
  },
  '独立': {
    optimalCompanionHours: 2,
    minCompanionHours: 0.5,
    preferredHousing: ['公寓', '独栋'],
    unfavorableHousing: [],
    prefersNoOtherPets: true,
    canTolerateOtherPets: false,
    noiseTolerance: 'low',
    timeDecayFactor: 0.3,
    spaceDecayFactor: 0.4
  }
};

const HOUSING_BASE_SCORE: Record<HousingType, number> = {
  '独栋': 100,
  '公寓': 75,
  '合租': 55
};

const NOISE_LEVEL: Record<HousingType, number> = {
  '独栋': 1,
  '公寓': 2,
  '合租': 3
};

function smoothDecay(
  current: number,
  optimal: number,
  min: number,
  decayFactor: number
): number {
  if (current >= optimal) return 100;
  if (current <= 0) return 0;

  const ratio = current / optimal;
  const decay = Math.pow(1 - ratio, decayFactor);
  const score = 100 * (1 - decay);

  if (current < min) {
    const minRatio = current / min;
    return Math.round(score * (0.3 + 0.7 * minRatio));
  }

  return Math.round(score);
}

function calculateTimeScore(hours: number, personality: PersonalityTag[]): number {
  if (personality.length === 0) {
    return hours >= 2 ? 80 : 60;
  }

  let totalScore = 0;
  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    const score = smoothDecay(
      hours,
      profile.optimalCompanionHours,
      profile.minCompanionHours,
      profile.timeDecayFactor
    );
    totalScore += score;
  }

  return Math.round(totalScore / personality.length);
}

function calculateSpaceScore(housingType: HousingType, personality: PersonalityTag[]): number {
  if (personality.length === 0) {
    return HOUSING_BASE_SCORE[housingType];
  }

  let totalScore = 0;

  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    let baseScore = HOUSING_BASE_SCORE[housingType];

    if (profile.preferredHousing.includes(housingType)) {
      baseScore = Math.min(100, baseScore + 15);
    }
    if (profile.unfavorableHousing.includes(housingType)) {
      const penalty = 20 * profile.spaceDecayFactor;
      baseScore = Math.max(25, baseScore - penalty);
    }

    if (profile.noiseTolerance === 'low') {
      const noise = NOISE_LEVEL[housingType];
      if (noise > 1) {
        baseScore -= (noise - 1) * 10;
      }
    } else if (profile.noiseTolerance === 'medium') {
      const noise = NOISE_LEVEL[housingType];
      if (noise > 2) {
        baseScore -= 8;
      }
    }

    totalScore += Math.max(baseScore, 20);
  }

  return Math.round(totalScore / personality.length);
}

function calculatePetFriendlyScore(hasOtherPets: boolean, personality: PersonalityTag[]): number {
  if (!hasOtherPets) {
    let bonus = 0;
    for (const tag of personality) {
      if (PERSONALITY_PROFILES[tag].prefersNoOtherPets) {
        bonus += 8;
      }
    }
    return Math.min(100, 85 + bonus);
  }

  if (personality.length === 0) return 60;

  let totalScore = 0;
  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    if (profile.canTolerateOtherPets) {
      if (profile.prefersNoOtherPets) {
        totalScore += 65;
      } else {
        totalScore += 82;
      }
    } else {
      totalScore += 35;
    }
  }

  return Math.round(totalScore / personality.length);
}

function calculatePersonalityFit(personality: PersonalityTag[], app: Application): number {
  if (personality.length === 0) return 60;

  let totalFit = 0;

  for (const tag of personality) {
    const profile = PERSONALITY_PROFILES[tag];
    let fit = 50;

    const timeScore = smoothDecay(
      app.dailyCompanionHours,
      profile.optimalCompanionHours,
      profile.minCompanionHours,
      profile.timeDecayFactor
    );
    fit += (timeScore - 50) * 0.5;

    if (profile.preferredHousing.includes(app.housingType)) {
      fit += 15;
    } else if (profile.unfavorableHousing.includes(app.housingType)) {
      fit -= 15;
    }

    if (!app.hasOtherPets && profile.prefersNoOtherPets) {
      fit += 12;
    } else if (app.hasOtherPets && !profile.canTolerateOtherPets) {
      fit -= 18;
    } else if (!app.hasOtherPets) {
      fit += 4;
    }

    if (profile.noiseTolerance === 'low' && NOISE_LEVEL[app.housingType] <= 1) {
      fit += 8;
    }

    totalFit += Math.min(Math.max(fit, 15), 100);
  }

  return Math.round(totalFit / personality.length);
}

function generateMatchReasons(
  pet: Pet,
  app: Application,
  timeScore: number,
  spaceScore: number,
  petFriendlyScore: number,
  personalityFit: number
): string[] {
  const reasons: string[] = [];

  if (timeScore >= 85) {
    reasons.push(`每日${app.dailyCompanionHours}小时陪伴时间充足`);
  } else if (timeScore >= 60) {
    reasons.push('陪伴时间基本满足');
  } else {
    reasons.push('陪伴时间略显不足');
  }

  if (spaceScore >= 80) {
    reasons.push(`${app.housingType}居住空间合适`);
  } else if (spaceScore >= 55) {
    reasons.push(`${app.housingType}居住空间尚可`);
  }

  if (petFriendlyScore >= 75) {
    reasons.push(app.hasOtherPets ? '与其他宠物相处融洽' : '无其他宠物干扰');
  }

  const strongMatches: string[] = [];
  for (const tag of pet.personality) {
    const profile = PERSONALITY_PROFILES[tag];

    if (app.dailyCompanionHours >= profile.optimalCompanionHours * 0.8) {
      strongMatches.push(`"${tag}"性格与陪伴节奏契合`);
    }

    if (tag === '胆小' && !app.hasOtherPets && !profile.unfavorableHousing.includes(app.housingType)) {
      strongMatches.push(`"${tag}"性格适合安静环境`);
    }
    if (tag === '活泼' && app.housingType === '独栋') {
      strongMatches.push(`"${tag}"性格有充足活动空间`);
    }
    if (tag === '独立' && app.dailyCompanionHours <= profile.optimalCompanionHours) {
      strongMatches.push(`"${tag}"性格可适应自主生活`);
    }
  }

  reasons.push(...strongMatches.slice(0, 2));

  if (personalityFit >= 80) {
    reasons.push('性格契合度高');
  }

  return reasons.slice(0, 4);
}

export function calculateMatchScore(pet: Pet, application: Application): MatchResult {
  const timeScore = calculateTimeScore(application.dailyCompanionHours, pet.personality);
  const spaceScore = calculateSpaceScore(application.housingType, pet.personality);
  const petFriendlyScore = calculatePetFriendlyScore(application.hasOtherPets, pet.personality);
  const personalityFit = calculatePersonalityFit(pet.personality, application);

  const weightedScore =
    timeScore * 0.28 +
    spaceScore * 0.22 +
    petFriendlyScore * 0.18 +
    personalityFit * 0.32;

  const finalScore = Math.round(weightedScore);

  const reasons = generateMatchReasons(
    pet, application,
    timeScore, spaceScore,
    petFriendlyScore, personalityFit
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
