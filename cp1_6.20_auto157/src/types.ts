export interface FontItem {
  id: string;
  name: string;
  format: string;
  dataUrl: string;
  fileName: string;
}

export interface TypographySettings {
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface PreviewColumn {
  id: string;
  fontId: string | null;
}

export type SampleTextKey = 'poem' | 'news' | 'tech' | 'marketing' | 'code';

export const SAMPLE_TEXTS: Record<SampleTextKey, { label: string; content: string }> = {
  poem: {
    label: '诗词',
    content: `静夜思
床前明月光，疑是地上霜。
举头望明月，低头思故乡。

春晓
春眠不觉晓，处处闻啼鸟。
夜来风雨声，花落知多少。`
  },
  news: {
    label: '新闻',
    content: `科技创新助力城市数字化转型

  近日，全国多地加快推进智慧城市建设，通过人工智能、大数据、物联网等前沿技术，提升城市治理效能和居民生活品质。

  据了解，新上线的城市大脑系统整合了交通、环保、医疗等多个领域的数据资源，实现了城市运行状态的实时监测和智能调度。`
  },
  tech: {
    label: '技术文档',
    content: `React 组件开发指南

组件是 React 应用的基本构建块。每个组件都是一个独立的、可复用的代码片段，它输出一段 UI。

函数组件示例：

function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

类组件示例：

class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}`
  },
  marketing: {
    label: '营销文案',
    content: `探索无限可能，开启创意之旅

  我们的产品为设计师而生，帮助你将灵感转化为现实。无论是精美的排版设计，还是独特的视觉体验，一切尽在掌握。

  立即体验，发现更多精彩功能。免费试用，无需信用卡。

  ✨ 简洁优雅的界面
  🚀 快速高效的工作流
  🎨 丰富的创意资源`
  },
  code: {
    label: '代码片段',
    content: `function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

const debouncedSearch = debounce(
  (query) => fetchResults(query),
  300
);`
  }
};
