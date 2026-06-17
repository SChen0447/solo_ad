import { cards, type Card, type Rarity } from '@/data/cards'

function pickCardByRarity(rarity: Rarity): Card {
  const pool = cards.filter(c => c.rarity === rarity)
  const totalWeight = pool.reduce((sum, c) => sum + c.probability, 0)
  let roll = Math.random() * totalWeight
  for (const card of pool) {
    roll -= card.probability
    if (roll <= 0) return card
  }
  return pool[pool.length - 1]
}

export function pullSingleCard(pitySR: number, pitySSR: number): {
  card: Card
  newPitySR: number
  newPitySSR: number
} {
  let rarity: Rarity

  if (pitySSR >= 49) {
    rarity = 'SSR'
  } else if (pitySR >= 9) {
    rarity = 'SR'
  } else {
    const roll = Math.random()
    if (roll < 0.05) {
      rarity = 'SSR'
    } else if (roll < 0.30) {
      rarity = 'SR'
    } else {
      rarity = 'R'
    }
  }

  const card = pickCardByRarity(rarity)

  let newPitySR = pitySR
  let newPitySSR = pitySSR

  if (rarity === 'SSR') {
    newPitySR = 0
    newPitySSR = 0
  } else if (rarity === 'SR') {
    newPitySR = 0
    newPitySSR = pitySSR + 1
  } else {
    newPitySR = pitySR + 1
    newPitySSR = pitySSR + 1
  }

  return { card, newPitySR, newPitySSR }
}

export function pullTenCards(pitySR: number, pitySSR: number): {
  cards: Card[]
  newPitySR: number
  newPitySSR: number
} {
  const results: Card[] = []
  let curSR = pitySR
  let curSSR = pitySSR

  for (let i = 0; i < 10; i++) {
    const result = pullSingleCard(curSR, curSSR)
    results.push(result.card)
    curSR = result.newPitySR
    curSSR = result.newPitySSR
  }

  const hasSRorAbove = results.some(c => c.rarity === 'SR' || c.rarity === 'SSR')
  if (!hasSRorAbove) {
    const guaranteed = pickCardByRarity('SR')
    results[results.length - 1] = guaranteed
    curSR = 0
  }

  return { cards: results, newPitySR: curSR, newPitySSR: curSSR }
}

export function canEvolve(
  collectedIds: string[],
  coins: number,
  targetCardId: string,
  allCards: Card[]
): { canEvolve: boolean; requiredCards: string[]; missingCoins: number } {
  const target = allCards.find(c => c.id === targetCardId)
  if (!target || target.rarity !== 'SSR') {
    return { canEvolve: false, requiredCards: [], missingCoins: 0 }
  }

  const sameAttrSR = allCards.filter(
    c => c.rarity === 'SR' && c.attribute === target.attribute
  )
  const requiredCards = sameAttrSR
    .filter(c => collectedIds.includes(c.id))
    .map(c => c.id)
    .slice(0, 3)

  const hasEnoughCards = requiredCards.length === 3
  const hasEnoughCoins = coins >= 50
  const missingCoins = hasEnoughCoins ? 0 : 50 - coins

  return {
    canEvolve: hasEnoughCards && hasEnoughCoins,
    requiredCards,
    missingCoins
  }
}

export function getPityStatus(pitySR: number, pitySSR: number): {
  pullsUntilSR: number
  pullsUntilSSR: number
} {
  return {
    pullsUntilSR: 10 - pitySR,
    pullsUntilSSR: 50 - pitySSR
  }
}
