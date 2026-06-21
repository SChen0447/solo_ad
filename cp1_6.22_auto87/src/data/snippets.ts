export type Language = 'javascript' | 'python' | 'css' | 'html' | 'typescript' | 'json';

export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: Language;
  tags: string[];
  createdAt: number;
}

const STORAGE_KEY = 'code-snippets-collection';

export const LANGUAGE_COLORS: Record<Language, string> = {
  javascript: '#d69e2e',
  typescript: '#3178c6',
  python: '#3182ce',
  css: '#805ad5',
  html: '#dd6b20',
  json: '#2f855a',
};

export const LANGUAGE_PRISM_MAP: Record<Language, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  css: 'css',
  html: 'markup',
  json: 'json',
};

export const sampleSnippets: Snippet[] = [
  {
    id: 'snippet-1',
    title: 'CSS 毛玻璃效果',
    description: '使用 backdrop-filter 实现的现代毛玻璃效果，适用于卡片、导航栏等元素，营造半透明磨砂质感。',
    code: `.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}`,
    language: 'css',
    tags: ['CSS', 'UI效果', '毛玻璃'],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'snippet-2',
    title: 'JS 数组去重函数',
    description: '多种方式实现 JavaScript 数组去重，包括基础类型和对象数组的深度去重方案。',
    code: `function uniqueArray(arr) {
  return [...new Set(arr)];
}

function uniqueObjects(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

const nums = [1, 2, 2, 3, 4, 4, 5];
console.log(uniqueArray(nums));`,
    language: 'javascript',
    tags: ['JavaScript', '数组', '工具函数'],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'snippet-3',
    title: 'Python 文件遍历',
    description: '使用 os 和 pathlib 遍历目录下所有文件，支持递归查找和文件类型过滤。',
    code: `import os
from pathlib import Path

def list_files(directory, extension=None):
    path = Path(directory)
    for item in path.rglob('*' if not extension else f'*.{extension}'):
        if item.is_file():
            yield str(item)

def walk_directory(directory):
    for root, dirs, files in os.walk(directory):
        level = root.replace(directory, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            print(f'{subindent}{file}')`,
    language: 'python',
    tags: ['Python', '文件操作', '工具函数'],
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'snippet-4',
    title: 'HTML 响应式图片画廊',
    description: '使用纯 HTML 和 CSS Grid 创建响应式图片画廊布局，自适应不同屏幕尺寸。',
    code: `<div class="gallery">
  <figure class="gallery-item">
    <img src="image1.jpg" alt="作品1" loading="lazy">
    <figcaption>描述文字</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="image2.jpg" alt="作品2" loading="lazy">
    <figcaption>描述文字</figcaption>
  </figure>
</div>

<style>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
.gallery-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}
</style>`,
    language: 'html',
    tags: ['HTML', 'CSS', '响应式'],
    createdAt: Date.now() - 3600000 * 12,
  },
];

export function getSnippets(): Snippet[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleSnippets));
      return sampleSnippets;
    }
    return JSON.parse(stored);
  } catch {
    return sampleSnippets;
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

export function addSnippet(snippet: Snippet): Snippet[] {
  const snippets = getSnippets();
  const updated = [snippet, ...snippets];
  saveSnippets(updated);
  return updated;
}

export function deleteSnippet(id: string): Snippet[] {
  const snippets = getSnippets();
  const updated = snippets.filter(s => s.id !== id);
  saveSnippets(updated);
  return updated;
}

export function filterByTags(snippets: Snippet[], selectedTags: string[]): Snippet[] {
  if (selectedTags.length === 0) return snippets;
  return snippets.filter(snippet =>
    selectedTags.every(tag => snippet.tags.includes(tag))
  );
}

export function searchByKeyword(snippets: Snippet[], keyword: string): Snippet[] {
  if (!keyword.trim()) return snippets;
  const lower = keyword.toLowerCase();
  return snippets.filter(
    snippet =>
      snippet.title.toLowerCase().includes(lower) ||
      snippet.description.toLowerCase().includes(lower) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(lower))
  );
}

export function getAllTags(snippets: Snippet[]): string[] {
  const tagSet = new Set<string>();
  snippets.forEach(snippet => snippet.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

export function hashStringToTextColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 35%)`;
}

export function generateId(): string {
  return `snippet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
