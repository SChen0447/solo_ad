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

export function getCategory(ingredientName: string): string {
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (ingredientName.includes(key)) {
      return category;
    }
  }
  return '其他';
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

const UNIT_PRIORITY: Record<string, number> = {
  '克': 10, 'kg': 20, '千克': 20, '公斤': 20,
  'ml': 10, 'l': 20, '升': 20,
  '杯': 5, '勺': 3, '大勺': 4, '小勺': 2,
  '个': 1, '片': 1, '根': 1, '瓣': 1, '块': 1, '把': 1, '小块': 1,
};

const UNIT_CONVERSIONS: Record<string, { to: string; factor: number }[]> = {
  '千克': [{ to: '克', factor: 1000 }],
  '公斤': [{ to: '克', factor: 1000 }],
  'kg': [{ to: '克', factor: 1000 }],
  '大勺': [{ to: '勺', factor: 1 }],
  '小勺': [{ to: '勺', factor: 1 }],
  'l': [{ to: 'ml', factor: 1000 }],
  '升': [{ to: 'ml', factor: 1000 }],
};

function normalizeUnit(unit: string, amount: number): { unit: string; amount: number } {
  const conversions = UNIT_CONVERSIONS[unit];
  if (conversions) {
    const conv = conversions[0];
    return { unit: conv.to, amount: amount * conv.factor };
  }
  return { unit, amount };
}

export function mergeIngredients(ingredients: Ingredient[]): Ingredient[] {
  const normalized = ingredients.map((ing) => {
    const n = normalizeUnit(ing.unit, ing.amount);
    return { name: ing.name, amount: n.amount, unit: n.unit };
  });

  const merged = new Map<string, { amount: number; unit: string; priority: number }>();

  for (const ing of normalized) {
    const key = `${ing.name.toLowerCase()}|${ing.unit}`;
    const existing = merged.get(key);
    if (existing) {
      existing.amount += ing.amount;
    } else {
      const priority = UNIT_PRIORITY[ing.unit] ?? 0;
      merged.set(key, { amount: ing.amount, unit: ing.unit, priority });
    }
  }

  const nameGroups = new Map<string, { amount: number; unit: string; priority: number }[]>();
  for (const [key, val] of merged) {
    const [name] = key.split('|');
    if (!nameGroups.has(name)) {
      nameGroups.set(name, []);
    }
    nameGroups.get(name)!.push(val);
  }

  const result: Ingredient[] = [];
  for (const [name, entries] of nameGroups) {
    if (entries.length === 1) {
      result.push({ name, amount: entries[0].amount, unit: entries[0].unit });
    } else {
      const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
      const bestEntry = entries.reduce((best, e) =>
        e.priority > best.priority ? e : best
      , entries[0]);
      result.push({ name, amount: totalAmount, unit: bestEntry.unit });
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
