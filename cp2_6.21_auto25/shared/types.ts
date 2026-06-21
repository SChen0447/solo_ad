export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  healthStatus: string;
  personalityTags: string[];
  mainImage: string;
  subImages: string[];
  createdAt: string;
}

export interface Application {
  id: string;
  petId: string;
  applicantName: string;
  contactInfo: string;
  housingType: 'apartment' | 'house';
  hasOtherPets: boolean;
  dailyCompanionHours: number;
  environmentImages: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface MatchResult {
  application: Application;
  matchScore: number;
}

export interface FollowUp {
  id: string;
  applicationId: string;
  description: string;
  rating: number;
  createdAt: string;
  isArchived: boolean;
}

export interface FollowUpReminder {
  applicationId: string;
  petName: string;
  applicantName: string;
  lastFollowUpDate: string | null;
  daysSinceAdoption: number;
}
