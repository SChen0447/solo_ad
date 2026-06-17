import type { Card, SearchFilter } from '../types';

export function searchCards(cards: Card[], filter: SearchFilter): Card[] {
  const { keyword, tags, dateFrom, dateTo } = filter;
  const keywordLower = keyword.toLowerCase().trim();

  return cards.filter(card => {
    if (keywordLower) {
      const titleMatch = card.title.toLowerCase().includes(keywordLower);
      const contentMatch = card.content.toLowerCase().includes(keywordLower);
      const summaryMatch = card.summary.toLowerCase().includes(keywordLower);
      if (!titleMatch && !contentMatch && !summaryMatch) {
        return false;
      }
    }

    if (tags.length > 0) {
      const hasAllTags = tags.every(tag =>
        card.tags.some(cardTag =>
          cardTag.toLowerCase() === tag.toLowerCase() ||
          cardTag.toLowerCase().startsWith(tag.toLowerCase())
        )
      );
      if (!hasAllTags) {
        return false;
      }
    }

    if (dateFrom !== null && card.createdAt < dateFrom) {
      return false;
    }

    if (dateTo !== null && card.createdAt > dateTo) {
      return false;
    }

    return true;
  });
}

export function getAllTags(cards: Card[]): string[] {
  const tagSet = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}
