import type { Card, TagNode, TagRelation } from '../types';

export function extractTagsFromText(text: string): string[] {
  const tagRegex = /#([\u4e00-\u9fa5a-zA-Z0-9_]+)/g;
  const matches = text.match(tagRegex) || [];
  return [...new Set(matches.map(t => t.slice(1)))];
}

export function calculateTagFrequency(cards: Card[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const card of cards) {
    for (const tag of card.tags) {
      frequency.set(tag, (frequency.get(tag) || 0) + 1);
    }
  }
  return frequency;
}

export function calculateTagRelations(cards: Card[]): TagRelation[] {
  const cooccurrence = new Map<string, Map<string, number>>();
  const frequency = calculateTagFrequency(cards);

  for (const card of cards) {
    const uniqueTags = [...new Set(card.tags)];
    for (let i = 0; i < uniqueTags.length; i++) {
      for (let j = i + 1; j < uniqueTags.length; j++) {
        const a = uniqueTags[i];
        const b = uniqueTags[j];
        const key = [a, b].sort().join('|');
        const [sortedA, sortedB] = key.split('|');
        if (!cooccurrence.has(sortedA)) {
          cooccurrence.set(sortedA, new Map());
        }
        const inner = cooccurrence.get(sortedA)!;
        inner.set(sortedB, (inner.get(sortedB) || 0) + 1);
      }
    }
  }

  const relations: TagRelation[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const uniqueTags = [...new Set(card.tags)];
    for (let i = 0; i < uniqueTags.length; i++) {
      for (let j = i + 1; j < uniqueTags.length; j++) {
        const a = uniqueTags[i];
        const b = uniqueTags[j];
        const key = [a, b].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);

        const [sortedA, sortedB] = key.split('|');
        const co = cooccurrence.get(sortedA)?.get(sortedB) || 0;
        const freqA = frequency.get(a) || 0;
        const freqB = frequency.get(b) || 0;
        const weight = co > 0 ? co / (freqA + freqB - co) : 0;
        if (weight > 0) {
          relations.push({ source: a, target: b, weight });
        }
      }
    }
  }

  return relations;
}

export function buildTagGraphData(cards: Card[]): { nodes: TagNode[]; links: TagRelation[] } {
  const frequency = calculateTagFrequency(cards);
  const relations = calculateTagRelations(cards);

  const nodes: TagNode[] = [];
  for (const [name, freq] of frequency.entries()) {
    nodes.push({
      name,
      frequency: freq,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    });
  }

  return { nodes, links: relations };
}

export function simulateExtractWebInfo(url: string): { title: string; summary: string } {
  const urlPatterns: Record<string, { title: string; summary: string }> = {
    'github.com': {
      title: 'GitHub Repository',
      summary: '开源代码仓库，包含项目源码、文档和协作功能。',
    },
    'developer.mozilla.org': {
      title: 'MDN Web Docs',
      summary: 'Mozilla 开发者网络文档，提供 Web 技术的权威参考资料。',
    },
    'stackoverflow.com': {
      title: 'Stack Overflow',
      summary: '程序员问答社区，解决各类编程问题。',
    },
    'medium.com': {
      title: 'Medium Article',
      summary: '技术博客文章，分享深度技术见解和实践经验。',
    },
    'react.dev': {
      title: 'React 官方文档',
      summary: 'React 前端框架官方文档，包含组件、Hooks 等核心概念。',
    },
    'zhihu.com': {
      title: '知乎专栏',
      summary: '中文知识问答社区，各领域专业人士分享见解。',
    },
  };

  for (const pattern of Object.keys(urlPatterns)) {
    if (url.includes(pattern)) {
      return urlPatterns[pattern];
    }
  }

  const domain = url.replace(/^https?:\/\//, '').split('/')[0] || '网页';
  return {
    title: `${domain} - 网页标题`,
    summary: `这是从 ${domain} 捕获的网页内容摘要。系统自动提取了页面的关键信息。`,
  };
}
