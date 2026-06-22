export interface Character {
  id: string;
  name: string;
  expressions: Record<string, string>;
}

export const characters: Record<string, Character> = {
  narrator: {
    id: 'narrator',
    name: '旁白',
    expressions: {
      neutral: 'rgba(100, 100, 120, 0.8)',
      sad: 'rgba(80, 80, 100, 0.8)',
      happy: 'rgba(120, 120, 140, 0.8)'
    }
  },
  hero: {
    id: 'hero',
    name: '冒险者',
    expressions: {
      neutral: 'linear-gradient(135deg, #4a90d9 0%, #2d5a8a 100%)',
      happy: 'linear-gradient(135deg, #5bb8e8 0%, #3a7ab8 100%)',
      sad: 'linear-gradient(135deg, #3a6a9a 0%, #1d3a5a 100%)',
      angry: 'linear-gradient(135deg, #d94a4a 0%, #8a2d2d 100%)',
      surprised: 'linear-gradient(135deg, #f0e68c 0%, #daa520 100%)'
    }
  },
  elf: {
    id: 'elf',
    name: '精灵',
    expressions: {
      neutral: 'linear-gradient(135deg, #7cb342 0%, #33691e 100%)',
      happy: 'linear-gradient(135deg, #9ccc65 0%, #558b2f 100%)',
      sad: 'linear-gradient(135deg, #558b2f 0%, #1b5e20 100%)',
      angry: 'linear-gradient(135deg, #ef5350 0%, #b71c1c 100%)',
      surprised: 'linear-gradient(135deg, #ba68c8 0%, #6a1b9a 100%)'
    }
  },
  elder: {
    id: 'elder',
    name: '村长',
    expressions: {
      neutral: 'linear-gradient(135deg, #8d6e63 0%, #4e342e 100%)',
      happy: 'linear-gradient(135deg, #a1887f 0%, #5d4037 100%)',
      sad: 'linear-gradient(135deg, #6d4c41 0%, #3e2723 100%)',
      angry: 'linear-gradient(135deg, #d84315 0%, #bf360c 100%)',
      surprised: 'linear-gradient(135deg, #ffb74d 0%, #f57c00 100%)'
    }
  }
};

export const backgrounds: Record<string, string> = {
  forest: 'linear-gradient(180deg, #2d5016 0%, #1a3009 50%, #0f1f05 100%)',
  deep_forest: 'linear-gradient(180deg, #1a3d0c 0%, #0d2608 50%, #060f02 100%)',
  village: 'linear-gradient(180deg, #87ceeb 0%, #e0f7fa 30%, #d4a574 70%, #8b7355 100%)',
  sacred_grove: 'linear-gradient(180deg, #4a148c 0%, #7b1fa2 30%, #311b92 70%, #1a237e 100%)',
  blooming_forest: 'linear-gradient(180deg, #81c784 0%, #a5d6a7 30%, #66bb6a 70%, #43a047 100%)',
  village_sunset: 'linear-gradient(180deg, #ff7043 0%, #ffab91 30%, #d4a574 70%, #8d6e63 100%)'
};

export const characterEmojis: Record<string, string> = {
  narrator: '📜',
  hero: '⚔️',
  elf: '🧝',
  elder: '👴'
};

export const getCharacterExpression = (characterId: string, expression: string): string => {
  const character = characters[characterId];
  if (!character) return '#555';
  return character.expressions[expression] || character.expressions.neutral || '#555';
};

export const getBackground = (backgroundId: string): string => {
  return backgrounds[backgroundId] || backgrounds.forest;
};
