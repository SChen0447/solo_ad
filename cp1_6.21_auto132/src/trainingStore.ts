export type BodyPart = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  icon: string;
}

export interface TrainingCard {
  id: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart: BodyPart;
  sets: number;
  reps: number;
  weight: number;
  order: number;
  date: string;
}

export interface DayStats {
  date: string;
  totalSets: number;
  totalVolume: number;
  byBodyPart: Record<BodyPart, { sets: number; volume: number }>;
}

export const BODY_PARTS: Record<BodyPart, { name: string; color: string }> = {
  chest: { name: '胸部', color: '#ff6b6b' },
  back: { name: '背部', color: '#4ecdc4' },
  shoulders: { name: '肩部', color: '#ffe66d' },
  arms: { name: '手臂', color: '#95e1d3' },
  legs: { name: '腿部', color: '#f38181' },
  core: { name: '核心', color: '#aa96da' }
};

export const EXERCISES: Record<BodyPart, Exercise[]> = {
  chest: [
    { id: 'chest-1', name: '杠铃卧推', bodyPart: 'chest', icon: '🏋️' },
    { id: 'chest-2', name: '哑铃飞鸟', bodyPart: 'chest', icon: '💪' },
    { id: 'chest-3', name: '上斜卧推', bodyPart: 'chest', icon: '📈' },
    { id: 'chest-4', name: '下斜卧推', bodyPart: 'chest', icon: '📉' },
    { id: 'chest-5', name: '双杠臂屈伸', bodyPart: 'chest', icon: '🔀' },
    { id: 'chest-6', name: '绳索夹胸', bodyPart: 'chest', icon: '🎯' },
    { id: 'chest-7', name: '俯卧撑', bodyPart: 'chest', icon: '👊' }
  ],
  back: [
    { id: 'back-1', name: '引体向上', bodyPart: 'back', icon: '🦍' },
    { id: 'back-2', name: '杠铃划船', bodyPart: 'back', icon: '🚣' },
    { id: 'back-3', name: '高位下拉', bodyPart: 'back', icon: '⬇️' },
    { id: 'back-4', name: '坐姿划船', bodyPart: 'back', icon: '🪑' },
    { id: 'back-5', name: '硬拉', bodyPart: 'back', icon: '🏋️' },
    { id: 'back-6', name: '单臂哑铃划船', bodyPart: 'back', icon: '💪' },
    { id: 'back-7', name: '直臂下压', bodyPart: 'back', icon: '🔽' }
  ],
  shoulders: [
    { id: 'shoulders-1', name: '站姿推举', bodyPart: 'shoulders', icon: '🏋️' },
    { id: 'shoulders-2', name: '哑铃侧平举', bodyPart: 'shoulders', icon: '↔️' },
    { id: 'shoulders-3', name: '哑铃前平举', bodyPart: 'shoulders', icon: '⬆️' },
    { id: 'shoulders-4', name: '面拉', bodyPart: 'shoulders', icon: '🎭' },
    { id: 'shoulders-5', name: '哑铃推举', bodyPart: 'shoulders', icon: '💪' },
    { id: 'shoulders-6', name: '反向飞鸟', bodyPart: 'shoulders', icon: '🔄' },
    { id: 'shoulders-7', name: '杠铃耸肩', bodyPart: 'shoulders', icon: '🤷' }
  ],
  arms: [
    { id: 'arms-1', name: '杠铃弯举', bodyPart: 'arms', icon: '💪' },
    { id: 'arms-2', name: '哑铃弯举', bodyPart: 'arms', icon: '🏋️' },
    { id: 'arms-3', name: '锤式弯举', bodyPart: 'arms', icon: '🔨' },
    { id: 'arms-4', name: '三头下压', bodyPart: 'arms', icon: '⬇️' },
    { id: 'arms-5', name: '仰卧臂屈伸', bodyPart: 'arms', icon: '🛏️' },
    { id: 'arms-6', name: '窄距卧推', bodyPart: 'arms', icon: '🎯' },
    { id: 'arms-7', name: '集中弯举', bodyPart: 'arms', icon: '👈' }
  ],
  legs: [
    { id: 'legs-1', name: '深蹲', bodyPart: 'legs', icon: '🦵' },
    { id: 'legs-2', name: '硬拉', bodyPart: 'legs', icon: '🏋️' },
    { id: 'legs-3', name: '腿举', bodyPart: 'legs', icon: '🦶' },
    { id: 'legs-4', name: '腿屈伸', bodyPart: 'legs', icon: '🔀' },
    { id: 'legs-5', name: '腿弯举', bodyPart: 'legs', icon: '🔁' },
    { id: 'legs-6', name: '箭步蹲', bodyPart: 'legs', icon: '🚶' },
    { id: 'legs-7', name: '提踵', bodyPart: 'legs', icon: '🦶' }
  ],
  core: [
    { id: 'core-1', name: '仰卧起坐', bodyPart: 'core', icon: '🔄' },
    { id: 'core-2', name: '卷腹', bodyPart: 'core', icon: '🌀' },
    { id: 'core-3', name: '平板支撑', bodyPart: 'core', icon: '🧱' },
    { id: 'core-4', name: '俄罗斯转体', bodyPart: 'core', icon: '🔃' },
    { id: 'core-5', name: '腿举', bodyPart: 'core', icon: '⬆️' },
    { id: 'core-6', name: '登山跑', bodyPart: 'core', icon: '🏃' },
    { id: 'core-7', name: '死虫式', bodyPart: 'core', icon: '🐛' }
  ]
};

const STORAGE_KEY = 'fitness-tracker-data';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function loadFromStorage(): TrainingCard[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(cards: TrainingCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function createCard(exercise: Exercise, date?: string): TrainingCard {
  const today = date || getTodayString();
  const cards = loadFromStorage();
  const todayCards = cards.filter(c => c.date === today);
  const maxOrder = todayCards.length > 0 ? Math.max(...todayCards.map(c => c.order)) : -1;
  
  return {
    id: generateId(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    bodyPart: exercise.bodyPart,
    sets: 3,
    reps: 10,
    weight: 20,
    order: maxOrder + 1,
    date: today
  };
}

export function addCard(card: TrainingCard): void {
  const cards = loadFromStorage();
  cards.push(card);
  saveToStorage(cards);
}

export function removeCard(cardId: string): void {
  const cards = loadFromStorage();
  const filtered = cards.filter(c => c.id !== cardId);
  saveToStorage(filtered);
}

export function updateCard(cardId: string, updates: Partial<TrainingCard>): void {
  const cards = loadFromStorage();
  const index = cards.findIndex(c => c.id === cardId);
  if (index !== -1) {
    cards[index] = { ...cards[index], ...updates };
    saveToStorage(cards);
  }
}

export function getCardsByDate(date: string): TrainingCard[] {
  const cards = loadFromStorage();
  return cards
    .filter(c => c.date === date)
    .sort((a, b) => a.order - b.order);
}

export function reorderCards(cardIds: string[], date: string): void {
  const cards = loadFromStorage();
  cardIds.forEach((id, index) => {
    const card = cards.find(c => c.id === id);
    if (card && card.date === date) {
      card.order = index;
    }
  });
  saveToStorage(cards);
}

export function calculateVolume(card: TrainingCard): number {
  return card.sets * card.reps * card.weight;
}

export function getVolumeColor(volume: number): string {
  const maxVolume = 5 * 20 * 200;
  const ratio = Math.min(volume / maxVolume, 1);
  
  const r = Math.round(144 + ratio * (139 - 144));
  const g = Math.round(238 - ratio * 238);
  const b = Math.round(144 - ratio * 144);
  
  return `rgb(${r}, ${g}, ${b})`;
}

export function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function getWeekStats(): DayStats[] {
  const weekDates = getWeekDates();
  const allCards = loadFromStorage();
  
  return weekDates.map(date => {
    const dayCards = allCards.filter(c => c.date === date);
    const byBodyPart = {} as Record<BodyPart, { sets: number; volume: number }>;
    
    (Object.keys(BODY_PARTS) as BodyPart[]).forEach(part => {
      byBodyPart[part] = { sets: 0, volume: 0 };
    });
    
    let totalSets = 0;
    let totalVolume = 0;
    
    dayCards.forEach(card => {
      const volume = calculateVolume(card);
      byBodyPart[card.bodyPart].sets += card.sets;
      byBodyPart[card.bodyPart].volume += volume;
      totalSets += card.sets;
      totalVolume += volume;
    });
    
    return { date, totalSets, totalVolume, byBodyPart };
  });
}

export function hasTrainingOnDate(date: string): boolean {
  const cards = loadFromStorage();
  return cards.some(c => c.date === date);
}
