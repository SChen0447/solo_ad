import { Poem } from '../core/poemData';

export interface FilterCriteria {
  keyword?: string;
  author?: string;
  dynasty?: string;
}

export function filterPoems(poems: Poem[], criteria: FilterCriteria): Poem[] {
  if (!criteria) return poems;

  const { keyword, author, dynasty } = criteria;

  if (!keyword && !author && !dynasty) return poems;

  return poems.filter((poem) => {
    if (author && poem.author !== author) return false;
    if (dynasty && poem.dynasty !== dynasty) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      const inTitle = poem.title.toLowerCase().includes(kw);
      const inAuthor = poem.author.toLowerCase().includes(kw);
      const inLines = poem.lines.join('').toLowerCase().includes(kw);
      const inExcerpt = poem.excerpt ? poem.excerpt.toLowerCase().includes(kw) : false;
      if (!inTitle && !inAuthor && !inLines && !inExcerpt) return false;
    }
    return true;
  });
}
