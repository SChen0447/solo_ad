import { getCustomerOrders, getDrink, getAllDrinks } from './database';

interface OrderItem {
  drink_id: number;
  drink_name: string;
  created_at: number;
}

interface Transaction {
  items: number[];
}

interface Recommendation {
  drinkIds: number[];
  drinkNames: string[];
  confidence: number;
  support: number;
  reason: string;
}

function generateTransactions(orders: OrderItem[]): Transaction[] {
  const sessionMap = new Map<number, Set<number>>();

  for (const order of orders) {
    const sessionKey = Math.floor(order.created_at / (30 * 60 * 1000));
    if (!sessionMap.has(sessionKey)) {
      sessionMap.set(sessionKey, new Set());
    }
    sessionMap.get(sessionKey)!.add(order.drink_id);
  }

  return Array.from(sessionMap.values()).map((items) => ({
    items: Array.from(items),
  }));
}

function getSingleItemSupport(transactions: Transaction[], minSupport: number): Map<number, number> {
  const itemCounts = new Map<number, number>();
  const total = transactions.length;

  for (const transaction of transactions) {
    for (const item of transaction.items) {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }
  }

  const frequentItems = new Map<number, number>();
  for (const [item, count] of itemCounts) {
    const support = count / total;
    if (support >= minSupport) {
      frequentItems.set(item, support);
    }
  }

  return frequentItems;
}

function generateCandidatePairs(frequentItems: number[]): number[][] {
  const pairs: number[][] = [];
  for (let i = 0; i < frequentItems.length; i++) {
    for (let j = i + 1; j < frequentItems.length; j++) {
      pairs.push([frequentItems[i], frequentItems[j]]);
    }
  }
  return pairs;
}

function getPairSupport(transactions: Transaction[], candidates: number[][]): Map<string, number> {
  const pairCounts = new Map<string, number>();
  const total = transactions.length;

  for (const transaction of transactions) {
    const itemSet = new Set(transaction.items);
    for (const pair of candidates) {
      if (itemSet.has(pair[0]) && itemSet.has(pair[1])) {
        const key = pair.sort((a, b) => a - b).join(',');
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const result = new Map<string, number>();
  for (const [key, count] of pairCounts) {
    result.set(key, count / total);
  }

  return result;
}

export function calculateRecommendations(customerId: string): Recommendation[] {
  const orders = getCustomerOrders(customerId, 30) as unknown as OrderItem[];

  if (orders.length < 3) {
    return generateDefaultRecommendations();
  }

  const transactions = generateTransactions(orders);
  const minSupport = 0.1;
  const minConfidence = 0.3;

  const singleSupport = getSingleItemSupport(transactions, minSupport);
  const frequentItems = Array.from(singleSupport.keys());

  if (frequentItems.length < 2) {
    return generateDefaultRecommendations();
  }

  const candidatePairs = generateCandidatePairs(frequentItems);
  const pairSupport = getPairSupport(transactions, candidatePairs);

  const recommendations: Recommendation[] = [];

  for (const [key, support] of pairSupport) {
    const items = key.split(',').map(Number);
    const itemA = items[0];
    const itemB = items[1];

    const supportA = singleSupport.get(itemA)!;
    const supportB = singleSupport.get(itemB)!;

    const confidenceAB = support / supportA;
    const confidenceBA = support / supportB;

    const maxConfidence = Math.max(confidenceAB, confidenceBA);

    if (maxConfidence >= minConfidence) {
      const drinkA = getDrink(itemA) as { name: string; image_color: string } | undefined;
      const drinkB = getDrink(itemB) as { name: string; image_color: string } | undefined;

      if (drinkA && drinkB) {
        const confidence = Math.round(maxConfidence * 100);
        const baseDrink = confidenceAB >= confidenceBA ? drinkA.name : drinkB.name;
        const pairedDrink = confidenceAB >= confidenceBA ? drinkB.name : drinkA.name;

        recommendations.push({
          drinkIds: [itemA, itemB],
          drinkNames: [drinkA.name, drinkB.name],
          confidence: maxConfidence,
          support,
          reason: `${confidence}%的顾客点了${baseDrink}后也会点${pairedDrink}`,
        });
      }
    }
  }

  recommendations.sort((a, b) => b.confidence - a.confidence || b.support - a.support);

  const topRecommendations = recommendations.slice(0, 3);

  if (topRecommendations.length < 3) {
    const defaults = generateDefaultRecommendations();
    const existingIds = new Set(topRecommendations.flatMap((r) => r.drinkIds));

    for (const rec of defaults) {
      if (topRecommendations.length >= 3) break;
      const hasOverlap = rec.drinkIds.some((id) => existingIds.has(id));
      if (!hasOverlap) {
        topRecommendations.push(rec);
      }
    }
  }

  return topRecommendations.slice(0, 3);
}

function generateDefaultRecommendations(): Recommendation[] {
  const drinks = getAllDrinks() as Array<{ id: number; name: string; category: string }>;

  const coffee = drinks.find((d) => d.category === '咖啡');
  const dessert = drinks.find((d) => d.category === '甜点');
  const tea = drinks.find((d) => d.category === '茶饮');

  const recommendations: Recommendation[] = [];

  if (coffee && dessert) {
    recommendations.push({
      drinkIds: [coffee.id, dessert.id],
      drinkNames: [coffee.name, dessert.name],
      confidence: 0.6,
      support: 0.25,
      reason: '经典搭配：咖啡配甜点，享受美好时光',
    });
  }

  if (tea && dessert) {
    recommendations.push({
      drinkIds: [tea.id, dessert.id],
      drinkNames: [tea.name, dessert.name],
      confidence: 0.5,
      support: 0.2,
      reason: '下午茶首选：茶饮与甜点的完美组合',
    });
  }

  const otherCoffee = drinks.filter((d) => d.category === '咖啡').slice(1, 3);
  if (otherCoffee.length >= 2) {
    recommendations.push({
      drinkIds: [otherCoffee[0].id, otherCoffee[1].id],
      drinkNames: [otherCoffee[0].name, otherCoffee[1].name],
      confidence: 0.4,
      support: 0.15,
      reason: '咖啡爱好者必尝的两款经典',
    });
  }

  return recommendations.slice(0, 3);
}

export function getPopularDrinks(limit: number = 5) {
  const drinks = getAllDrinks() as Array<{ id: number; name: string; price: number; image_color: string }>;
  return drinks.slice(0, limit);
}
