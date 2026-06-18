export interface Theme {
  name: string;
  displayName: string;
  background: string;
  cardBackground: string;
  textColor: string;
  keywordColor: string;
  commentColor: string;
  stringColor: string;
  functionColor: string;
  numberColor: string;
  operatorColor: string;
  tagColor: string;
  attrColor: string;
  fontFamily: string;
  titleColor: string;
  watermarkColor: string;
  labelBackground: string;
  labelColor: string;
  accentColor: string;
  lineNumbersColor: string;
  lineNumbersBackground: string;
  codeAreaBackground: string;
}

export const themes: Record<string, Theme> = {
  'starry-night': {
    name: 'starry-night',
    displayName: '暗夜星辰',
    background: '#0d1117',
    cardBackground: '#161b22',
    textColor: '#c9d1d9',
    keywordColor: '#ff7b72',
    commentColor: '#8b949e',
    stringColor: '#a5d6ff',
    functionColor: '#d2a8ff',
    numberColor: '#79c0ff',
    operatorColor: '#ff7b72',
    tagColor: '#7ee787',
    attrColor: '#79c0ff',
    fontFamily: "'Fira Code', monospace",
    titleColor: '#e6edf3',
    watermarkColor: '#484f58',
    labelBackground: '#1f6feb33',
    labelColor: '#58a6ff',
    accentColor: '#58a6ff',
    lineNumbersColor: '#484f58',
    lineNumbersBackground: '#0d1117',
    codeAreaBackground: '#0d1117',
  },
  'warm-sunset': {
    name: 'warm-sunset',
    displayName: '暖阳余晖',
    background: '#1a1410',
    cardBackground: '#231c15',
    textColor: '#e8d5b7',
    keywordColor: '#f4a261',
    commentColor: '#8a7560',
    stringColor: '#e9c46a',
    functionColor: '#f4a261',
    numberColor: '#e76f51',
    operatorColor: '#e76f51',
    tagColor: '#2a9d8f',
    attrColor: '#e9c46a',
    fontFamily: "'JetBrains Mono', monospace",
    titleColor: '#f4e4c1',
    watermarkColor: '#6b5a48',
    labelBackground: '#f4a26133',
    labelColor: '#f4a261',
    accentColor: '#f4a261',
    lineNumbersColor: '#6b5a48',
    lineNumbersBackground: '#1a1410',
    codeAreaBackground: '#1a1410',
  },
  'frost-minimal': {
    name: 'frost-minimal',
    displayName: '冰霜极简',
    background: '#fafbfc',
    cardBackground: '#ffffff',
    textColor: '#24292e',
    keywordColor: '#d73a49',
    commentColor: '#6a737d',
    stringColor: '#032f62',
    functionColor: '#6f42c1',
    numberColor: '#005cc5',
    operatorColor: '#d73a49',
    tagColor: '#22863a',
    attrColor: '#6f42c1',
    fontFamily: "'Source Code Pro', monospace",
    titleColor: '#24292e',
    watermarkColor: '#959da5',
    labelBackground: '#032f621a',
    labelColor: '#005cc5',
    accentColor: '#005cc5',
    lineNumbersColor: '#959da5',
    lineNumbersBackground: '#f6f8fa',
    codeAreaBackground: '#f6f8fa',
  },
};

export const defaultCode = `function fibonacci(n) {
  if (n <= 1) return n;
  
  let prev = 0;
  let current = 1;
  
  for (let i = 2; i <= n; i++) {
    const next = prev + current;
    prev = current;
    current = next;
  }
  
  return current;
}

// 计算前10个斐波那契数
const results = Array.from(
  { length: 10 },
  (_, i) => fibonacci(i)
);

console.log(results);`;
