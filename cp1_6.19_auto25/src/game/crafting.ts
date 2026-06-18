import { ElementType, Recipe, CraftResult } from '@/types';

export const RECIPES: Recipe[] = [
  {
    inputs: ['fire', 'fire', 'water', 'wind'],
    resultName: '爆炸药水',
    rarity: 1,
    color: '#ff6600',
  },
  {
    inputs: ['water', 'water', 'fire', 'earth'],
    resultName: '沸腾药剂',
    rarity: 1,
    color: '#ff4444',
  },
  {
    inputs: ['earth', 'earth', 'wind', 'wind'],
    resultName: '风之护符',
    rarity: 2,
    color: '#88cc44',
  },
  {
    inputs: ['fire', 'fire', 'earth', 'earth'],
    resultName: '熔岩核心',
    rarity: 2,
    color: '#cc3300',
  },
  {
    inputs: ['water', 'water', 'wind', 'wind'],
    resultName: '暴风药水',
    rarity: 2,
    color: '#4488ff',
  },
  {
    inputs: ['water', 'fire', 'earth', 'wind'],
    resultName: '贤者之石',
    rarity: 3,
    color: '#ffd700',
  },
];

function sortElements(elements: ElementType[]): string {
  return [...elements].sort().join(',');
}

export function craft(slots: (ElementType | null)[]): CraftResult | null {
  if (slots.some((s) => s === null)) return null;

  const inputKey = sortElements(slots as ElementType[]);

  for (const recipe of RECIPES) {
    const recipeKey = sortElements(recipe.inputs);
    if (inputKey === recipeKey) {
      const actualRarity = recipe.rarity + (Math.random() < 0.2 ? 1 : 0);
      return {
        name: recipe.resultName,
        rarity: Math.min(actualRarity, 3),
        color: recipe.color,
        recipe: slots as ElementType[],
      };
    }
  }

  return null;
}

export function findMatchingRecipe(slots: (ElementType | null)[]): Recipe | null {
  if (slots.some((s) => s === null)) return null;
  const inputKey = sortElements(slots as ElementType[]);
  for (const recipe of RECIPES) {
    const recipeKey = sortElements(recipe.inputs);
    if (inputKey === recipeKey) return recipe;
  }
  return null;
}
