import type { ScraperRequest, ScraperResponse, ScrapedData } from './scraper';

const MOCK_SITES: ScrapedData[] = [
  {
    title: '极简主义设计的艺术',
    summary: '探索极简主义在现代设计中的应用，如何通过少即是多的理念创造出更有力量的视觉作品。',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop',
    colors: ['#2c3e50', '#ecf0f1', '#3498db'],
  },
  {
    title: '色彩心理学指南',
    summary: '深入了解色彩如何影响人类情感和行为，为设计师提供实用的配色建议和心理学依据。',
    thumbnail: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=300&fit=crop',
    colors: ['#e74c3c', '#f39c12', '#27ae60'],
  },
  {
    title: '用户体验设计原则',
    summary: '十大核心UX设计原则，帮助你创造出既美观又易用的数字产品，提升用户满意度。',
    thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=300&fit=crop',
    colors: ['#9b59b6', '#3498db', '#1abc9c'],
  },
  {
    title: '字体排版的艺术',
    summary: '掌握字体排版的基本规则和进阶技巧，让你的设计作品在文字层面就脱颖而出。',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop',
    colors: ['#2c3e50', '#7f8c8d', '#bdc3c7'],
  },
  {
    title: '品牌视觉识别系统',
    summary: '从零开始构建一套完整的品牌视觉识别系统，包括标志、色彩、字体和应用规范。',
    thumbnail: 'https://images.unsplash.com/photo-1634986666676-ec8fd920c936?w=400&h=300&fit=crop',
    colors: ['#e67e22', '#d35400', '#f1c40f'],
  },
  {
    title: '动效设计基础',
    summary: '学习动效设计的基本原理和常用技巧，为静态设计注入生命力和交互感。',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
    colors: ['#6c63ff', '#4e46c9', '#a8a2ff'],
  },
];

function getMockData(url: string): ScrapedData {
  const hash = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % MOCK_SITES.length;
  const base = MOCK_SITES[index];
  return {
    ...base,
    title: `${base.title} - ${url.slice(0, 20)}`,
  };
}

self.onmessage = (event: MessageEvent<ScraperRequest>) => {
  const { type, url } = event.data;

  if (type === 'scrape') {
    setTimeout(() => {
      try {
        const data = getMockData(url);
        const response: ScraperResponse = {
          type: 'success',
          data,
        };
        self.postMessage(response);
      } catch (error) {
        const response: ScraperResponse = {
          type: 'error',
          error: error instanceof Error ? error.message : '未知错误',
        };
        self.postMessage(response);
      }
    }, 800 + Math.random() * 400);
  }
};

export {};
