export interface CodeStyle {
  indentType: string;
  commentRatio: number;
}

export interface QuoteItem {
  text: string;
  lang?: string;
  minCommentRatio?: number;
  maxCommentRatio?: number;
  type: 'quote' | 'haiku';
}

export const presetQuotes: QuoteItem[] = [
  {
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    lang: 'JavaScript',
    type: 'quote',
  },
  {
    text: 'Code is read much more often than it is written.',
    lang: 'Python',
    type: 'quote',
  },
  {
    text: 'Simplicity is the soul of efficiency.',
    minCommentRatio: 0,
    maxCommentRatio: 0.2,
    type: 'quote',
  },
  {
    text: 'The best error message is the one that never shows up.',
    lang: 'JavaScript',
    type: 'quote',
  },
  {
    text: 'First, solve the problem. Then, write the code.',
    type: 'quote',
  },
  {
    text: 'Beautiful is better than ugly. Explicit is better than implicit.',
    lang: 'Python',
    minCommentRatio: 0.2,
    type: 'quote',
  },
  {
    text: 'Make it work, make it right, make it fast.',
    type: 'quote',
  },
  {
    text: 'There are only two hard things in Computer Science: cache invalidation and naming things.',
    lang: 'JavaScript',
    type: 'quote',
  },
  {
    text: 'The best documentation is a well-designed interface.',
    maxCommentRatio: 0.15,
    type: 'quote',
  },
  {
    text: 'Talk is cheap. Show me the code.',
    type: 'quote',
  },
];

export const presetHaiku: QuoteItem[] = [
  {
    text: 'Bugs crawl in the code\nStack traces light the dark screen\nDebugger finds them',
    type: 'haiku',
  },
  {
    text: 'Lines flow like rivers\nVariables hold meaning\nCode breathes with purpose',
    minCommentRatio: 0.2,
    type: 'haiku',
  },
  {
    text: 'Silent code whispers\nNo comments needed at all\nLogic speaks loudly',
    maxCommentRatio: 0.1,
    type: 'haiku',
  },
  {
    text: 'Spring cleaning the code\nRefactor with gentle hands\nBugs take flight away',
    lang: 'Python',
    type: 'haiku',
  },
  {
    text: 'Callbacks cascade down\nPromise chains rise upward\nAsync dance unfolds',
    lang: 'JavaScript',
    type: 'haiku',
  },
  {
    text: 'Tags nested softly\nStyles paint the canvas bright\nWeb blooms like flowers',
    lang: 'HTML',
    type: 'haiku',
  },
  {
    text: 'Selectors precise\nPixels dance to rhythm true\nBeauty in details',
    lang: 'CSS',
    type: 'haiku',
  },
  {
    text: 'Tabs or spaces? Both\nThe code compiles just the same\nTeam unity wins',
    type: 'haiku',
  },
  {
    text: 'Sparse lines of pure thought\nWhite space frames the logic well\nPoetry in code',
    maxCommentRatio: 0.15,
    type: 'haiku',
  },
  {
    text: 'Autumn leaves falling\nOne by one tests turn green now\nShip it, we are done',
    type: 'haiku',
  },
];

const poeticDescriptions: QuoteItem[] = [
  {
    text: '这段代码像一首严谨的格律诗，每一行都遵循着内在的韵律。',
    type: 'quote',
    minCommentRatio: 0.15,
  },
  {
    text: '注释稀疏，如同留白的山水画，意境在不言中。',
    type: 'quote',
    maxCommentRatio: 0.1,
  },
  {
    text: '代码结构如交响乐，各部分和谐共鸣。',
    type: 'quote',
  },
  {
    text: '这是一首代码的十四行诗，工整而优雅。',
    type: 'quote',
    minCommentRatio: 0.2,
  },
  {
    text: '简洁如俳句，三行之内意境深远。',
    type: 'quote',
    maxCommentRatio: 0.15,
  },
];

export function getRecommendations(
  lang: string,
  style: CodeStyle
): string[] {
  const allItems = [...presetQuotes, ...presetHaiku, ...poeticDescriptions];

  const scored = allItems.map((item) => {
    let score = 0;

    if (item.lang && item.lang === lang) {
      score += 3;
    }

    if (
      item.minCommentRatio !== undefined &&
      style.commentRatio >= item.minCommentRatio
    ) {
      score += 2;
    }
    if (
      item.maxCommentRatio !== undefined &&
      style.commentRatio <= item.maxCommentRatio
    ) {
      score += 2;
    }

    if (!item.lang) {
      score += 1;
    }

    score += Math.random() * 0.5;

    return { text: item.text, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const uniqueTexts = Array.from(new Set(scored.map((s) => s.text)));

  return uniqueTexts.slice(0, 3);
}
