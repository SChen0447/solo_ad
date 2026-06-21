import { v4 as uuidv4 } from 'uuid';

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

const VACCINE_RULES: Record<VaccineType, (vaccines: VaccineRecord[], _currentDate: string) => string | null> = {
  '狂犬病': (vaccines, _currentDate) => {
    const sorted = [...vaccines].filter(v => v.vaccineType === '狂犬病').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sorted.length === 0) return null;
    const last = new Date(sorted[0].date);
    last.setFullYear(last.getFullYear() + 1);
    return last.toISOString().split('T')[0];
  },
  '猫三联': (vaccines, _currentDate) => {
    const catVaccines = [...vaccines].filter(v => v.vaccineType === '猫三联').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (catVaccines.length === 0) return null;
    if (catVaccines.length === 1) {
      const first = new Date(catVaccines[0].date);
      first.setDate(first.getDate() + 21);
      return first.toISOString().split('T')[0];
    }
    const last = new Date(catVaccines[catVaccines.length - 1].date);
    last.setFullYear(last.getFullYear() + 1);
    return last.toISOString().split('T')[0];
  },
  '犬六联': (vaccines, _currentDate) => {
    const dogVaccines = [...vaccines].filter(v => v.vaccineType === '犬六联').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (dogVaccines.length === 0) return null;
    if (dogVaccines.length === 1) {
      const first = new Date(dogVaccines[0].date);
      first.setDate(first.getDate() + 21);
      return first.toISOString().split('T')[0];
    }
    if (dogVaccines.length === 2) {
      const second = new Date(dogVaccines[1].date);
      second.setDate(second.getDate() + 21);
      return second.toISOString().split('T')[0];
    }
    const last = new Date(dogVaccines[dogVaccines.length - 1].date);
    last.setFullYear(last.getFullYear() + 1);
    return last.toISOString().split('T')[0];
  },
  '驱虫': (vaccines, _currentDate) => {
    const sorted = [...vaccines].filter(v => v.vaccineType === '驱虫').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sorted.length === 0) return null;
    const last = new Date(sorted[0].date);
    last.setMonth(last.getMonth() + 3);
    return last.toISOString().split('T')[0];
  },
};

let pets: Pet[] = [];

const initializeMockData = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const fiveDaysLater = new Date(today);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
  const twoDaysOverdue = new Date(today);
  twoDaysOverdue.setDate(twoDaysOverdue.getDate() - 2);

  pets = [
    {
      id: uuidv4(),
      name: '小橘',
      species: '猫',
      breed: '橘猫',
      color: '橘白',
      birthday: '2022-03-15',
      avatar: '🐱',
      vaccines: [
        {
          id: uuidv4(),
          vaccineType: '猫三联',
          date: oneYearAgo.toISOString().split('T')[0],
          vetName: '李医生',
        },
        {
          id: uuidv4(),
          vaccineType: '狂犬病',
          date: oneYearAgo.toISOString().split('T')[0],
          vetName: '李医生',
        },
        {
          id: uuidv4(),
          vaccineType: '驱虫',
          date: thirtyDaysAgo.toISOString().split('T')[0],
          vetName: '王医生',
        },
      ],
      weights: [
        { id: uuidv4(), date: threeMonthsAgo.toISOString().split('T')[0], weight: 4.2 },
        { id: uuidv4(), date: thirtyDaysAgo.toISOString().split('T')[0], weight: 4.5 },
        { id: uuidv4(), date: tenDaysAgo.toISOString().split('T')[0], weight: 4.7 },
        { id: uuidv4(), date: yesterday.toISOString().split('T')[0], weight: 4.8 },
      ],
    },
    {
      id: uuidv4(),
      name: '旺财',
      species: '狗',
      breed: '金毛',
      color: '金色',
      birthday: '2021-06-20',
      avatar: '🐕',
      vaccines: [
        {
          id: uuidv4(),
          vaccineType: '犬六联',
          date: tenDaysAgo.toISOString().split('T')[0],
          vetName: '张医生',
        },
        {
          id: uuidv4(),
          vaccineType: '狂犬病',
          date: twoDaysOverdue.toISOString().split('T')[0],
          vetName: '张医生',
        },
        {
          id: uuidv4(),
          vaccineType: '驱虫',
          date: thirtyDaysAgo.toISOString().split('T')[0],
          vetName: '王医生',
        },
      ],
      weights: [
        { id: uuidv4(), date: threeMonthsAgo.toISOString().split('T')[0], weight: 25.0 },
        { id: uuidv4(), date: thirtyDaysAgo.toISOString().split('T')[0], weight: 26.5 },
        { id: uuidv4(), date: tenDaysAgo.toISOString().split('T')[0], weight: 27.2 },
        { id: uuidv4(), date: yesterday.toISOString().split('T')[0], weight: 27.5 },
      ],
    },
  ];

  pets.forEach(pet => {
    pet.vaccines.forEach(vaccine => {
      vaccine.nextDate = calculateNextVaccineDate(pet.vaccines, vaccine.vaccineType) ?? undefined;
    });
  });
};

const calculateNextVaccineDate = (vaccines: VaccineRecord[], vaccineType: VaccineType): string | null => {
  const rule = VACCINE_RULES[vaccineType];
  if (!rule) return null;
  return rule(vaccines, new Date().toISOString().split('T')[0]);
};

const calculateAge = (birthday: string): { years: number; months: number } => {
  const birthDate = new Date(birthday);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months };
};

const getNextVaccineInfo = (pet: Pet): { date: string; type: VaccineType; daysUntil: number } | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let earliestNext: { date: string; type: VaccineType; daysUntil: number } | null = null;

  for (const vaccine of pet.vaccines) {
    if (vaccine.nextDate) {
      const nextDate = new Date(vaccine.nextDate);
      nextDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (!earliestNext || daysUntil < earliestNext.daysUntil) {
        earliestNext = {
          date: vaccine.nextDate,
          type: vaccine.vaccineType,
          daysUntil,
        };
      }
    }
  }

  return earliestNext;
};

export const petModel = {
  init: () => {
    initializeMockData();
  },

  getAllPets: (): Pet[] => {
    return pets;
  },

  getPetById: (id: string): Pet | undefined => {
    return pets.find(p => p.id === id);
  },

  createPet: (petData: Omit<Pet, 'id' | 'vaccines' | 'weights'>): Pet => {
    const newPet: Pet = {
      id: uuidv4(),
      ...petData,
      vaccines: [],
      weights: [],
    };
    pets.push(newPet);
    return newPet;
  },

  updatePet: (id: string, updates: Partial<Omit<Pet, 'id' | 'vaccines' | 'weights'>>): Pet | undefined => {
    const petIndex = pets.findIndex(p => p.id === id);
    if (petIndex === -1) return undefined;
    pets[petIndex] = { ...pets[petIndex], ...updates };
    return pets[petIndex];
  },

  deletePet: (id: string): boolean => {
    const initialLength = pets.length;
    pets = pets.filter(p => p.id !== id);
    return pets.length < initialLength;
  },

  addVaccine: (petId: string, vaccineData: Omit<VaccineRecord, 'id' | 'nextDate'>): Pet | undefined => {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return undefined;

    const newVaccine: VaccineRecord = {
      id: uuidv4(),
      ...vaccineData,
    };
    pet.vaccines.push(newVaccine);

    pet.vaccines.forEach(v => {
      v.nextDate = calculateNextVaccineDate(pet.vaccines, v.vaccineType) ?? undefined;
    });

    return pet;
  },

  addWeight: (petId: string, weightData: Omit<WeightRecord, 'id'>): Pet | undefined => {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return undefined;

    const newWeight: WeightRecord = {
      id: uuidv4(),
      ...weightData,
    };
    pet.weights.push(newWeight);
    return pet;
  },

  calculateAge,
  getNextVaccineInfo,
  calculateNextVaccineDate,
};
