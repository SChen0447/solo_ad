export type PersonalityTag = '亲人' | '活泼' | '胆小' | '安静' | '独立' | '爱玩';

export type HousingType = '公寓' | '独栋' | '合租';

export type ApplicationStatus = '待审核' | '通过' | '驳回';

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  health: string;
  personality: PersonalityTag[];
  mainImage: string;
  images: string[];
  description: string;
  adoptable: boolean;
  createdAt: string;
}

export interface Application {
  id: string;
  petId: string;
  applicantName: string;
  contact: string;
  housingType: HousingType;
  hasOtherPets: boolean;
  dailyCompanionHours: number;
  livingEnvImages: string[];
  status: ApplicationStatus;
  createdAt: string;
  matched?: boolean;
}

export interface MatchResult {
  applicationId: string;
  applicantName: string;
  contact: string;
  housingType: HousingType;
  hasOtherPets: boolean;
  dailyCompanionHours: number;
  matchScore: number;
  matchReasons: string[];
}

export interface FollowUpRecord {
  id: string;
  applicationId: string;
  petId: string;
  date: string;
  description: string;
  rating: number;
}

export interface AdoptionRecord {
  id: string;
  applicationId: string;
  petId: string;
  applicantName: string;
  petName: string;
  adoptedAt: string;
  followUps: FollowUpRecord[];
  archived: boolean;
  nextFollowUpDate: string;
}
