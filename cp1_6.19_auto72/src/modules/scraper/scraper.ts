export interface ScrapedData {
  title: string;
  summary: string;
  thumbnail: string;
  colors: string[];
}

export interface ScraperRequest {
  type: 'scrape';
  url: string;
}

export interface ScraperResponse {
  type: 'success' | 'error';
  data?: ScrapedData;
  error?: string;
}

const MOCK_SITES: ScrapedData[] = [
  {
    title: '极简主义设计的艺术',
    summary: '探索极简主义在现代设计中的应用，如何通过少即是多的理念创造出更有力量的视觉作品。',
    thumbnail: 'https://picsum.photos/seed/minimalism/400/300',
    colors: ['#2c3e50', '#ecf0f1', '#3498db'],
  },
  {
    title: '色彩心理学指南',
    summary: '深入了解色彩如何影响人类情感和行为，为设计师提供实用的配色建议和心理学依据。',
    thumbnail: 'https://picsum.photos/seed/psychology/400/300',
    colors: ['#e74c3c', '#f39c12', '#27ae60'],
  },
  {
    title: '用户体验设计原则',
    summary: '十大核心UX设计原则，帮助你创造出既美观又易用的数字产品，提升用户满意度。',
    thumbnail: 'https://picsum.photos/seed/uxdesign/400/300',
    colors: ['#9b59b6', '#3498db', '#1abc9c'],
  },
  {
    title: '字体排版的艺术',
    summary: '掌握字体排版的基本规则和进阶技巧，让你的设计作品在文字层面就脱颖而出。',
    thumbnail: 'https://picsum.photos/seed/typography/400/300',
    colors: ['#2c3e50', '#7f8c8d', '#bdc3c7'],
  },
  {
    title: '品牌视觉识别系统',
    summary: '从零开始构建一套完整的品牌视觉识别系统，包括标志、色彩、字体和应用规范。',
    thumbnail: 'https://picsum.photos/seed/brand/400/300',
    colors: ['#e67e22', '#d35400', '#f1c40f'],
  },
  {
    title: '动效设计基础',
    summary: '学习动效设计的基本原理和常用技巧，为静态设计注入生命力和交互感。',
    thumbnail: 'https://picsum.photos/seed/motion/400/300',
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

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMockData(url));
    }, 800 + Math.random() * 400);
  });
}

export async function extractColorsFromImage(imageUrl: string, count: number = 3): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取canvas上下文'));
        return;
      }

      const size = 100;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      try {
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;
        const colorMap: Map<string, number> = new Map();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          const a = pixels[i + 3];
          if (a < 128) continue;

          const key = `${r},${g},${b}`;
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }

        const sorted = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, count)
          .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          });

        resolve(sorted.length > 0 ? sorted : ['#6c63ff', '#4e46c9', '#a8a2ff']);
      } catch (e) {
        resolve(['#6c63ff', '#4e46c9', '#a8a2ff']);
      }
    };
    img.onerror = () => {
      resolve(['#6c63ff', '#4e46c9', '#a8a2ff']);
    };
    img.src = imageUrl;
  });
}

export function createScraperWorker(): Worker {
  return new Worker(new URL('./scraperWorker.ts', import.meta.url), {
    type: 'module',
  });
}
