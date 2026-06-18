import type { Ingredient, ShoppingGroup } from '../types';

const CATEGORY_MAP: Record<string, string> = {
  '白菜': '蔬菜', '青菜': '蔬菜', '菠菜': '蔬菜', '生菜': '蔬菜', '西兰花': '蔬菜',
  '西红柿': '蔬菜', '番茄': '蔬菜', '黄瓜': '蔬菜', '茄子': '蔬菜', '青椒': '蔬菜',
  '红椒': '蔬菜', '土豆': '蔬菜', '胡萝卜': '蔬菜', '洋葱': '蔬菜', '大蒜': '蔬菜',
  '葱': '蔬菜', '姜': '蔬菜', '蘑菇': '蔬菜', '香菇': '蔬菜', '金针菇': '蔬菜',
  '豆芽': '蔬菜', '豆腐': '蔬菜', '豆角': '蔬菜', '豌豆': '蔬菜', '玉米': '蔬菜',
  '南瓜': '蔬菜', '冬瓜': '蔬菜', '丝瓜': '蔬菜', '苦瓜': '蔬菜', '芹菜': '蔬菜',
  '韭菜': '蔬菜', '香菜': '蔬菜', '白萝卜': '蔬菜', '红萝卜': '蔬菜',

  '猪肉': '肉禽', '牛肉': '肉禽', '羊肉': '肉禽', '鸡肉': '肉禽', '鸡腿': '肉禽',
  '鸡胸': '肉禽', '鸡翅': '肉禽', '鸭肉': '肉禽', '鹅肉': '肉禽', '火腿': '肉禽',
  '培根': '肉禽', '香肠': '肉禽', '腊肉': '肉禽', '鱼': '肉禽', '虾': '肉禽',
  '蟹': '肉禽', '虾仁': '肉禽', '鸡蛋': '肉禽', '鸭蛋': '肉禽', '鹌鹑蛋': '肉禽',

  '盐': '调料', '糖': '调料', '酱油': '调料', '生抽': '调料', '老抽': '调料',
  '醋': '调料', '料酒': '调料', '蚝油': '调料', '味精': '调料', '鸡精': '调料',
  '胡椒粉': '调料', '花椒': '调料', '八角': '调料', '桂皮': '调料', '香叶': '调料',
  '辣椒': '调料', '辣椒酱': '调料', '豆瓣酱': '调料', '芝麻酱': '调料', '花生酱': '调料',
  '番茄酱': '调料', '沙拉酱': '调料', '芥末': '调料', '咖喱': '调料', '淀粉': '调料',
  '面粉': '调料', '生粉': '调料', '小苏打': '调料', '酵母': '调料', '黄油': '调料',
  '食用油': '调料', '橄榄油': '调料', '香油': '调料', '麻油': '调料',

  '米': '主食', '面': '主食', '面条': '主食', '米饭': '主食', '面包': '主食',
  '馒头': '主食', '饺子': '主食', '包子': '主食', '年糕': '主食', '粉丝': '主食',
  '粉条': '主食', '米线': '主食', '意大利面': '主食', '通心粉': '主食',
};

const INGREDIENT_ALIASES: Record<string, string> = {
  '西红柿': '番茄',
  '洋柿子': '番茄',
  '马铃薯': '土豆',
  '洋芋': '土豆',
  '地瓜': '红薯',
  '番薯': '红薯',
  '甘薯': '红薯',
  '白薯': '红薯',
  '高丽菜': '卷心菜',
  '包菜': '卷心菜',
  '圆白菜': '卷心菜',
  '莲花白': '卷心菜',
  '花菜': '花椰菜',
  '菜花': '花椰菜',
  '西蓝花': '西兰花',
  '蒜': '大蒜',
  '蒜头': '大蒜',
  '葱': '大葱',
  '香葱': '大葱',
  '姜': '生姜',
  '黄姜': '生姜',
  '蛋': '鸡蛋',
  '鸡子': '鸡蛋',
  '芫荽': '香菜',
  '芫茜': '香菜',
  '油': '食用油',
  '菜油': '食用油',
  '豆油': '食用油',
  '植物油': '食用油',
  '生抽': '酱油',
  '老抽': '酱油',
  '味精': '鸡精',
  '味素': '鸡精',
  '料酒': '黄酒',
  '米酒': '黄酒',
};

export function getCategory(ingredientName: string): string {
  const canonical = getCanonicalName(ingredientName);
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (canonical.includes(key) || ingredientName.includes(key)) {
      return category;
    }
  }
  return '其他';
}

export function getCanonicalName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  return INGREDIENT_ALIASES[trimmed] ?? INGREDIENT_ALIASES[name.trim()] ?? name.trim();
}

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function formatFraction(value: number): string {
  if (value === 0) return '0';

  if (Number.isInteger(value)) {
    return value.toString();
  }

  const tolerance = 1e-6;
  const maxDenominator = 64;

  const intPart = Math.floor(value);
  const fracPart = value - intPart;

  let bestNum = 0;
  let bestDen = 1;
  let bestErr = Math.abs(fracPart);

  for (let den = 2; den <= maxDenominator; den++) {
    const num = Math.round(fracPart * den);
    const err = Math.abs(fracPart - num / den);
    if (err < bestErr) {
      bestNum = num;
      bestDen = den;
      bestErr = err;
    }
    if (bestErr < tolerance) break;
  }

  if (bestErr > 0.01) {
    const rounded = Math.round(value * 10) / 10;
    if (Number.isInteger(rounded)) return rounded.toString();
    return rounded.toFixed(1);
  }

  const g = gcd(bestNum, bestDen);
  const num = bestNum / g;
  const den = bestDen / g;

  if (intPart === 0) {
    return `${num}/${den}`;
  }

  return `${intPart} ${num}/${den}`;
}

export function formatIngredientAmount(amount: number, unit: string): string {
  const formattedAmount = formatFraction(amount);
  if (!unit) return formattedAmount;
  return `${formattedAmount}${unit}`;
}

type UnitType = 'weight' | 'volume' | 'count' | 'other';

interface UnitInfo {
  type: UnitType;
  priority: number;
  toBase: number;
  baseUnit: string;
}

const UNIT_INFO: Record<string, UnitInfo> = {
  '克': { type: 'weight', priority: 10, toBase: 1, baseUnit: '克' },
  '千克': { type: 'weight', priority: 30, toBase: 1000, baseUnit: '克' },
  '公斤': { type: 'weight', priority: 30, toBase: 1000, baseUnit: '克' },
  'kg': { type: 'weight', priority: 30, toBase: 1000, baseUnit: '克' },
  '斤': { type: 'weight', priority: 20, toBase: 500, baseUnit: '克' },
  '两': { type: 'weight', priority: 15, toBase: 50, baseUnit: '克' },

  'ml': { type: 'volume', priority: 10, toBase: 1, baseUnit: 'ml' },
  '毫升': { type: 'volume', priority: 10, toBase: 1, baseUnit: 'ml' },
  'l': { type: 'volume', priority: 30, toBase: 1000, baseUnit: 'ml' },
  '升': { type: 'volume', priority: 30, toBase: 1000, baseUnit: 'ml' },

  '杯': { type: 'volume', priority: 25, toBase: 240, baseUnit: 'ml' },
  '大勺': { type: 'volume', priority: 18, toBase: 15, baseUnit: 'ml' },
  '汤匙': { type: 'volume', priority: 18, toBase: 15, baseUnit: 'ml' },
  '勺': { type: 'volume', priority: 15, toBase: 10, baseUnit: 'ml' },
  '小勺': { type: 'volume', priority: 12, toBase: 5, baseUnit: 'ml' },
  '茶匙': { type: 'volume', priority: 12, toBase: 5, baseUnit: 'ml' },

  '个': { type: 'count', priority: 10, toBase: 1, baseUnit: '个' },
  '片': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
  '根': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
  '瓣': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
  '块': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
  '把': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
  '小块': { type: 'count', priority: 3, toBase: 1, baseUnit: '个' },
  '只': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
  '颗': { type: 'count', priority: 5, toBase: 1, baseUnit: '个' },
};

function getUnitInfo(unit: string): UnitInfo {
  return UNIT_INFO[unit] ?? { type: 'other', priority: 1, toBase: 1, baseUnit: unit };
}

function toBaseUnit(unit: string, amount: number): { amount: number; baseUnit: string; type: UnitType } {
  const info = getUnitInfo(unit);
  return {
    amount: amount * info.toBase,
    baseUnit: info.baseUnit,
    type: info.type,
  };
}

function fromBaseUnit(baseUnit: string, baseAmount: number, targetUnit: string): number {
  const info = getUnitInfo(targetUnit);
  if (info.baseUnit !== baseUnit) return baseAmount;
  return baseAmount / info.toBase;
}

export function mergeIngredients(ingredients: Ingredient[]): Ingredient[] {
  const canonicalMap = new Map<
    string,
    Map<string, { baseAmount: number; originalUnits: Map<string, number> }>
  >();

  for (const ing of ingredients) {
    const canonicalName = getCanonicalName(ing.name);
    const { baseAmount, baseUnit, type } = toBaseUnit(ing.unit, ing.amount);

    if (!canonicalMap.has(canonicalName)) {
      canonicalMap.set(canonicalName, new Map());
    }
    const unitGroups = canonicalMap.get(canonicalName)!;

    const groupKey = type === 'other' ? ing.unit : baseUnit;

    if (!unitGroups.has(groupKey)) {
      unitGroups.set(groupKey, { baseAmount: 0, originalUnits: new Map() });
    }
    const group = unitGroups.get(groupKey)!;
    group.baseAmount += type === 'other' ? ing.amount : baseAmount;

    const unitKey = ing.unit;
    const currentPriority = getUnitInfo(unitKey).priority;
    const existingBest = group.originalUnits;
    if (!existingBest.has(unitKey)) {
      existingBest.set(unitKey, currentPriority);
    }
  }

  const result: Ingredient[] = [];

  for (const [canonicalName, unitGroups] of canonicalMap) {
    for (const [, group] of unitGroups) {
      let bestUnit = '';
      let bestPriority = -1;

      for (const [unit, priority] of group.originalUnits) {
        if (priority > bestPriority) {
          bestPriority = priority;
          bestUnit = unit;
        }
      }

      const bestInfo = getUnitInfo(bestUnit);
      const displayAmount = bestInfo.type === 'other'
        ? group.baseAmount
        : fromBaseUnit(bestInfo.baseUnit, group.baseAmount, bestUnit);

      result.push({
        name: canonicalName,
        amount: Math.round(displayAmount * 1000) / 1000,
        unit: bestUnit,
      });
    }
  }

  return result;
}

export function groupByCategory(
  ingredients: Ingredient[],
  completedMap: Record<string, boolean> = {}
): ShoppingGroup[] {
  const groups = new Map<string, ShoppingGroup>();

  for (const ing of ingredients) {
    const category = getCategory(ing.name);
    if (!groups.has(category)) {
      groups.set(category, { category, items: [], collapsed: false });
    }
    groups.get(category)!.items.push({
      ...ing,
      category,
      completed: completedMap[`${ing.name}|${ing.unit}`] || false,
    });
  }

  const categoryOrder = ['蔬菜', '肉禽', '主食', '调料', '其他'];
  return categoryOrder
    .map((cat) => groups.get(cat))
    .filter((g): g is ShoppingGroup => g !== undefined)
    .concat(
      Array.from(groups.values()).filter(
        (g) => !categoryOrder.includes(g.category)
      )
    );
}
