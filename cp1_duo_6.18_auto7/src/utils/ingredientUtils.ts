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

export function formatFraction(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  const fractions: { val: number; str: string }[] = [
    { val: 0.125, str: '1/8' },
    { val: 0.25, str: '1/4' },
    { val: 0.333, str: '1/3' },
    { val: 0.375, str: '3/8' },
    { val: 0.5, str: '1/2' },
    { val: 0.625, str: '5/8' },
    { val: 0.666, str: '2/3' },
    { val: 0.75, str: '3/4' },
    { val: 0.875, str: '7/8' },
  ];

  const intPart = Math.floor(value);
  const fracPart = value - intPart;

  let closestFrac = fractions[0];
  let minDiff = Math.abs(fracPart - closestFrac.val);

  for (const frac of fractions) {
    const diff = Math.abs(fracPart - frac.val);
    if (diff < minDiff) {
      minDiff = diff;
      closestFrac = frac;
    }
  }

  if (minDiff > 0.05) {
    return value.toFixed(1).replace(/\.0$/, '');
  }

  if (intPart === 0) {
    return closestFrac.str;
  }

  return `${intPart} ${closestFrac.str}`;
}

export function mergeIngredients(ingredients: Ingredient[]): Ingredient[] {
  const merged = new Map<string, { amount: number; unit: string }>();

  for (const ing of ingredients) {
    const key = `${ing.name.toLowerCase()}|${ing.unit}`;
    const existing = merged.get(key);
    if (existing) {
      existing.amount += ing.amount;
    } else {
      merged.set(key, { amount: ing.amount, unit: ing.unit });
    }
  }

  const result: Ingredient[] = [];
  const nameMap = new Map<string, { amount: number; unit: string }>();

  for (const [key, val] of merged) {
    const [name] = key.split('|');
    const existing = nameMap.get(name);
    if (!existing || val.amount > existing.amount) {
      nameMap.set(name, val);
    }
  }

  for (const [name, val] of nameMap) {
    result.push({ name, amount: val.amount, unit: val.unit });
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
