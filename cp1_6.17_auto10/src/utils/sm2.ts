import { Card } from '../types';

export interface SM2Result {
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateSM2(
  card: Card,
  quality: number
): SM2Result {
  let { easinessFactor, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  }

  easinessFactor =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  if (easinessFactor < 1.3) {
    easinessFactor = 1.3;
  }

  const nextReviewDate = Date.now() + interval * DAY_MS;

  return {
    easinessFactor,
    interval,
    repetitions,
    nextReviewDate,
  };
}

export function isCardDue(card: Card, now: number = Date.now()): boolean {
  return card.nextReviewDate <= now;
}

export function sortCardsByDue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}

export function getDueCards(cards: Card[]): Card[] {
  const now = Date.now();
  return sortCardsByDue(cards.filter((card) => isCardDue(card, now)));
}

export function createNewCard(front: string, back: string): Card {
  const now = Date.now();
  return {
    id: `card_${now}_${Math.random().toString(36).slice(2, 9)}`,
    front,
    back,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: now,
    createdAt: now,
  };
}
