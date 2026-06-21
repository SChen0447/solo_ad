export interface FlashCardData {
  id: string;
  source: string;
  sourceType: 'book' | 'article';
  excerpt: string;
  annotation: string;
  tags: string[];
  createdAt: number;
}

export interface TagItem {
  name: string;
  color: string;
}

const STORAGE_KEY = 'flashcards';
const CUSTOM_TAGS_KEY = 'customTags';

const PRESET_TAGS: TagItem[] = [
  { name: '哲学', color: '#6366F1' },
  { name: '心理学', color: '#8B5CF6' },
  { name: '科技', color: '#3B82F6' },
  { name: '文学', color: '#EC4899' },
  { name: '历史', color: '#F59E0B' },
  { name: '设计', color: '#10B981' },
  { name: '商业', color: '#EF4444' },
  { name: '科学', color: '#06B6D4' },
  { name: '艺术', color: '#F472B6' },
  { name: '社会学', color: '#8B5CF6' },
  { name: '经济', color: '#14B8A6' },
  { name: '教育', color: '#F97316' },
];

const TAG_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#3B82F6', '#06B6D4',
  '#F97316', '#14B8A6', '#F472B6', '#A78BFA',
];

let colorIndex = 0;

function getNextColor(): string {
  const color = TAG_COLORS[colorIndex % TAG_COLORS.length];
  colorIndex++;
  return color;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getAllCards(): FlashCardData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FlashCardData[];
  } catch {
    return [];
  }
}

export function saveCards(cards: FlashCardData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addCard(card: Omit<FlashCardData, 'id' | 'createdAt'>): FlashCardData {
  const newCard: FlashCardData = {
    ...card,
    id: generateId(),
    createdAt: Date.now(),
  };
  const cards = getAllCards();
  cards.unshift(newCard);
  saveCards(cards);
  return newCard;
}

export function deleteCard(id: string): void {
  const cards = getAllCards().filter(c => c.id !== id);
  saveCards(cards);
}

export function filterByTag(cards: FlashCardData[], tag: string): FlashCardData[] {
  if (!tag) return cards;
  return cards.filter(c => c.tags.includes(tag));
}

export function findRelated(cardId: string, cards: FlashCardData[]): FlashCardData[] {
  const source = cards.find(c => c.id === cardId);
  if (!source || source.tags.length === 0) return [];

  const scored = cards
    .filter(c => c.id !== cardId)
    .map(c => {
      const sharedTags = c.tags.filter(t => source.tags.includes(t));
      return { card: c, score: sharedTags.length };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.card.createdAt - b.card.createdAt);

  return scored.map(item => item.card);
}

export function findRandomRelated(cards: FlashCardData[]): FlashCardData[] {
  if (cards.length < 2) return cards;

  const cardsWithTags = cards.filter(c => c.tags.length > 0);
  if (cardsWithTags.length < 2) return cardsWithTags;

  const randomIndex = Math.floor(Math.random() * cardsWithTags.length);
  const source = cardsWithTags[randomIndex];

  const related = findRelated(source.id, cards);
  if (related.length === 0) return [source];

  const selected = related.slice(0, 5);
  const result = [source, ...selected.filter(r => !selected.some(s => s.id === r.id))];
  result.sort((a, b) => a.createdAt - b.createdAt);

  return result;
}

export function getPresetTags(): TagItem[] {
  return [...PRESET_TAGS];
}

export function getCustomTags(): TagItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TagItem[];
  } catch {
    return [];
  }
}

export function addCustomTag(name: string): TagItem {
  const trimmed = name.trim();
  if (!trimmed) return { name: '', color: '' };

  const existing = [...getPresetTags(), ...getCustomTags()];
  if (existing.find(t => t.name === trimmed)) {
    return existing.find(t => t.name === trimmed)!;
  }

  const newTag: TagItem = { name: trimmed, color: getNextColor() };
  const customTags = getCustomTags();
  customTags.push(newTag);
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(customTags));
  return newTag;
}

export function getAllTags(): TagItem[] {
  return [...getPresetTags(), ...getCustomTags()];
}

export function searchTags(query: string): TagItem[] {
  if (!query.trim()) return getAllTags();
  const q = query.trim().toLowerCase();
  return getAllTags().filter(t => t.name.toLowerCase().includes(q));
}
