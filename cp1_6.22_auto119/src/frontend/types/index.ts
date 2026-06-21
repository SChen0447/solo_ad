export type VaccineType = '狂犬病' | '猫三联' | '犬六联' | '驱虫';

export interface VaccineRecord {
  id: string;
  vaccineType: VaccineType;
  date: string;
  vetName: string;
  nextDate?: string;
}

export interface WeightRecord {
  id: string;
  date: string;
  weight: number;
}

export interface Pet {
  id: string;
  name: string;
  species: '猫' | '狗';
  breed: string;
  color: string;
  birthday: string;
  avatar: string;
  vaccines: VaccineRecord[];
  weights: WeightRecord[];
}

export interface PetWithDetails extends Pet {
  age: { years: number; months: number };
  nextVaccine: {
    date: string;
    type: VaccineType;
    daysUntil: number;
  } | null;
}

export interface Reminder {
  petId: string;
  petName: string;
  petAvatar: string;
  vaccineType: VaccineType;
  date: string;
  daysUntil: number;
  isOverdue: boolean;
  isUrgent: boolean;
}
