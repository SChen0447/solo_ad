import { v4 as uuidv4 } from 'uuid';
import type { ParseResult, EventNode, Character, Relationship } from '../types';

const DATE_PATTERN = /(\d{4}年\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月|第[一二三四五六七八九十百千0-9]{1,5}章|第[一二三四五六七八九十百千0-9]{1,5}节|春|夏|秋|冬|春季|夏季|秋季|冬季|清晨|早晨|上午|中午|下午|傍晚|晚上|深夜|凌晨)/g;

const TITLE_PATTERN = /(先生|女士|小姐|夫人|太太|公子|姑娘|大侠|侠客|伯爵|公爵|侯爵|子爵|男爵|国王|王后|王子|公主|皇帝|皇后|太监|总管|师傅|徒弟|老师|学生|医生|护士|警察|律师|法官)/g;

const NAME_PATTERN = /["']?([\u4e00-\u9fa5]{2,4}(?:·[\u4e00-\u9fa5]{2,4})*)["']?/g;

const EVENT_TRIGGERS = [
  '发生了', '出现了', '遇到了', '决定', '开始', '结束', '因此', '后来',
  '与此同时', '突然', '就在这时', '第二天', '第三天', '不久之后',
  '过了一会儿', '接着', '然后', '于是', '所以', '但是', '然而',
  '终于', '最终', '最后', '从此', '此后', '期间', '其间'
];

const LOCATION_PATTERN = /在([\u4e00-\u9fa5]{2,15}(?:公园|城堡|森林|城市|村庄|宫殿|城堡|学校|医院|公司|家里|家中|房间|客厅|卧室|厨房|花园|庭院|街道|路口|码头|车站|机场|海边|湖边|山顶|山谷|洞穴))/g;

const EVENT_TYPE_KEYWORDS: Record<string, string[]> = {
  meeting: ['遇见', '见面', '相遇', '重逢', '认识', '介绍'],
  conflict: ['吵架', '打架', '争吵', '冲突', '战争', '打斗', '争执'],
  turning: ['改变', '转变', '决定', '选择', '转折点', '从此'],
  ending: ['结束', '最后', '最终', '结局', '尾声']
};

const CHARACTER_COLORS = [
  '#e8a87c', '#c38d9e', '#85b79d', '#7c9eb2', '#b58db6',
  '#d4a574', '#88b04b', '#f67280', '#c06c84', '#6c5b7b',
  '#355c7d', '#f8b195', '#f67280', '#c06c84', '#6c5b7b'
];

const MAX_EVENTS = 200;

function assignColorToCharacter(index: number): string {
  return CHARACTER_COLORS[index % CHARACTER_COLORS.length];
}

interface MatchResult {
  text: string;
  index: number;
  length: number;
}

function matchAll(text: string, regex: RegExp): MatchResult[] {
  const results: MatchResult[] = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      text: match[0],
      index: match.index,
      length: match[0].length
    });
  }
  return results;
}

function extractDates(text: string): MatchResult[] {
  return matchAll(text, DATE_PATTERN);
}

function extractTitles(text: string): MatchResult[] {
  return matchAll(text, TITLE_PATTERN);
}

function extractLocations(text: string): MatchResult[] {
  const results: MatchResult[] = [];
  let match;
  LOCATION_PATTERN.lastIndex = 0;
  while ((match = LOCATION_PATTERN.exec(text)) !== null) {
    results.push({
      text: match[1],
      index: match.index + 1,
      length: match[1].length
    });
  }
  return results;
}

function extractCharacters(text: string): Character[] {
  const characterMap = new Map<string, { name: string; count: number }>();
  
  const titles = extractTitles(text);
  
  for (const title of titles) {
    const beforeText = text.substring(Math.max(0, title.index - 10), title.index);
    const nameMatch = beforeText.match(/([\u4e00-\u9fa5]{2,4})$/);
    if (nameMatch) {
      const fullName = nameMatch[1] + title.text;
      const existing = characterMap.get(fullName) || { name: fullName, count: 0 };
      existing.count++;
      characterMap.set(fullName, existing);
    }
  }
  
  NAME_PATTERN.lastIndex = 0;
  let nameMatch;
  while ((nameMatch = NAME_PATTERN.exec(text)) !== null) {
    const name = nameMatch[1];
    if (name.length >= 2 && name.length <= 8) {
      const existing = characterMap.get(name) || { name, count: 0 };
      existing.count++;
      characterMap.set(name, existing);
    }
  }
  
  const sortedCharacters = Array.from(characterMap.values())
    .filter(c => c.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
  
  return sortedCharacters.map((c, index) => ({
    id: uuidv4(),
    name: c.name,
    color: assignColorToCharacter(index),
    eventCount: 0
  }));
}

function findNearestDate(text: string, position: number, dates: MatchResult[]): string | null {
  let nearest: MatchResult | null = null;
  let minDistance = Infinity;
  
  for (const date of dates) {
    if (date.index <= position) {
      const distance = position - date.index;
      if (distance < minDistance) {
        minDistance = distance;
        nearest = date;
      }
    }
  }
  
  return nearest ? nearest.text : null;
}

function findNearestLocation(position: number, locations: MatchResult[]): string | null {
  for (const loc of locations) {
    if (Math.abs(loc.index - position) < 50) {
      return loc.text;
    }
  }
  return null;
}

function findCharactersInRange(text: string, start: number, end: number, characters: Character[]): string[] {
  const foundIds: Set<string> = new Set();
  const segment = text.substring(start, end);
  
  for (const char of characters) {
    if (segment.includes(char.name)) {
      foundIds.add(char.id);
    }
  }
  
  return Array.from(foundIds);
}

function determineEventType(segment: string): EventNode['type'] {
  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (segment.includes(keyword)) {
        return type as EventNode['type'];
      }
    }
  }
  return 'default';
}

function extractEvents(text: string, characters: Character[]): EventNode[] {
  const events: EventNode[] = [];
  const dates = extractDates(text);
  const locations = extractLocations(text);
  
  const sentences = text.split(/[。！？!?\n]/);
  let currentPosition = 0;
  
  for (const sentence of sentences) {
    if (events.length >= MAX_EVENTS) break;
    
    const sentenceStart = currentPosition;
    const sentenceEnd = currentPosition + sentence.length;
    currentPosition = sentenceEnd + 1;
    
    if (sentence.trim().length < 5) continue;
    
    const hasTrigger = EVENT_TRIGGERS.some(trigger => sentence.includes(trigger));
    const hasCharacter = characters.some(char => sentence.includes(char.name));
    
    if (!hasTrigger && !hasCharacter) continue;
    
    const contextStart = Math.max(0, sentenceStart - 20);
    const contextEnd = Math.min(text.length, sentenceEnd + 20);
    const contextSegment = text.substring(contextStart, contextEnd);
    
    const timestamp = findNearestDate(text, sentenceStart, dates);
    const location = findNearestLocation(sentenceStart, locations);
    const charIds = findCharactersInRange(text, sentenceStart, sentenceEnd + 1, characters);
    const type = determineEventType(contextSegment);
    
    const title = sentence.trim().slice(0, 30) + (sentence.length > 30 ? '...' : '');
    const description = sentence.trim();
    
    events.push({
      id: uuidv4(),
      title,
      description,
      timestamp,
      order: events.length,
      characterIds: charIds,
      location,
      type
    });
  }
  
  if (events.length === 0 && characters.length > 0) {
    for (let i = 0; i < Math.min(5, characters.length); i++) {
      const char = characters[i];
      events.push({
        id: uuidv4(),
        title: `${char.name}登场`,
        description: `${char.name}在故事中出现`,
        timestamp: null,
        order: i,
        characterIds: [char.id],
        location: null,
        type: 'default'
      });
    }
  }
  
  return events;
}

function extractRelationships(events: EventNode[]): Relationship[] {
  const relationshipMap = new Map<string, Relationship>();
  
  for (const event of events) {
    const chars = event.characterIds;
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        const id1 = chars[i];
        const id2 = chars[j];
        const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
        
        const existing = relationshipMap.get(key);
        if (existing) {
          existing.eventCount++;
        } else {
          relationshipMap.set(key, {
            characterId1: id1 < id2 ? id1 : id2,
            characterId2: id1 < id2 ? id2 : id1,
            eventCount: 1
          });
        }
      }
    }
  }
  
  return Array.from(relationshipMap.values())
    .filter(r => r.eventCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount);
}

function updateCharacterEventCounts(
  characters: Character[],
  events: EventNode[]
): Character[] {
  return characters.map(char => ({
    ...char,
    eventCount: events.filter(e => e.characterIds.includes(char.id)).length
  }));
}

export function parseText(rawText: string): ParseResult {
  const startTime = performance.now();
  
  if (!rawText || rawText.trim().length === 0) {
    return {
      events: [],
      characters: [],
      relationships: []
    };
  }
  
  const trimmedText = rawText.trim();
  
  let characters = extractCharacters(trimmedText);
  let events = extractEvents(trimmedText, characters);
  characters = updateCharacterEventCounts(characters, events);
  const relationships = extractRelationships(events);
  
  const elapsed = performance.now() - startTime;
  console.debug(`文本解析完成，耗时: ${elapsed.toFixed(2)}ms, 事件: ${events.length}, 人物: ${characters.length}`);
  
  return {
    events,
    characters,
    relationships
  };
}

export function parseTextAsync(rawText: string): Promise<ParseResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(parseText(rawText));
    }, 0);
  });
}
