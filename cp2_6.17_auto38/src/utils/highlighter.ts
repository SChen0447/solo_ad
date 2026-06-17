export type SupportedLanguage = 'javascript' | 'typescript' | 'html' | 'css';

const COLOR_KEYWORD = '#569cd6';
const COLOR_STRING = '#ce9178';
const COLOR_COMMENT = '#6a9955';
const COLOR_NUMBER = '#b5cea8';

interface Rule {
  pattern: RegExp;
  color: string;
}

const JS_KEYWORDS = [
  'break','case','catch','continue','debugger','default','delete','do','else',
  'finally','for','function','if','in','instanceof','new','return','switch',
  'this','throw','try','typeof','var','void','while','with','let','const',
  'class','extends','super','import','export','from','as','async','await',
  'yield','of','static','get','set','implements','interface','type','enum',
  'namespace','abstract','declare','readonly','keyof','infer','is','unique',
  'require','module','true','false','null','undefined','NaN','Infinity',
];

const CSS_KEYWORDS = [
  'important','inherit','initial','unset','none','auto','block','inline',
  'flex','grid','absolute','relative','fixed','sticky','solid','dashed',
  'dotted','transparent','center','left','right','top','bottom','hidden',
  'visible','scroll','bold','normal','italic','underline','pointer','default',
  'cover','contain','row','column','wrap','nowrap','space-between','space-around',
  'center','start','end','stretch','baseline','@media','@keyframes','@import',
  '@font-face','@supports','from','to',
];

function buildJsRules(): Rule[] {
  return [
    { pattern: /\/\/.*$/gm, color: COLOR_COMMENT },
    { pattern: /\/\*[\s\S]*?\*\//gm, color: COLOR_COMMENT },
    { pattern: /`(?:[^`\\]|\\.)*`/g, color: COLOR_STRING },
    { pattern: /"(?:[^"\\]|\\.)*"/g, color: COLOR_STRING },
    { pattern: /'(?:[^'\\]|\\.)*'/g, color: COLOR_STRING },
    { pattern: new RegExp(`\\b(${JS_KEYWORDS.join('|')})\\b`, 'g'), color: COLOR_KEYWORD },
    { pattern: /\b\d+\.?\d*\b/g, color: COLOR_NUMBER },
  ];
}

function buildTsRules(): Rule[] {
  return [
    { pattern: /\/\/.*$/gm, color: COLOR_COMMENT },
    { pattern: /\/\*[\s\S]*?\*\//gm, color: COLOR_COMMENT },
    { pattern: /`(?:[^`\\]|\\.)*`/g, color: COLOR_STRING },
    { pattern: /"(?:[^"\\]|\\.)*"/g, color: COLOR_STRING },
    { pattern: /'(?:[^'\\]|\\.)*'/g, color: COLOR_STRING },
    { pattern: new RegExp(`\\b(${JS_KEYWORDS.join('|')})\\b`, 'g'), color: COLOR_KEYWORD },
    { pattern: /\b\d+\.?\d*\b/g, color: COLOR_NUMBER },
  ];
}

function buildHtmlRules(): Rule[] {
  return [
    { pattern: /&lt;!--[\s\S]*?--&gt;/gm, color: COLOR_COMMENT },
    { pattern: /("[^"]*"|'[^']*')/g, color: COLOR_STRING },
    { pattern: /&lt;\/?[\w-]+/g, color: COLOR_KEYWORD },
    { pattern: /\/?&gt;/g, color: COLOR_KEYWORD },
    { pattern: /\b[\w-]+(?==)/g, color: '#9cdcfe' },
  ];
}

function buildCssRules(): Rule[] {
  return [
    { pattern: /\/\*[\s\S]*?\*\//gm, color: COLOR_COMMENT },
    { pattern: /"(?:[^"\\]|\\.)*"/g, color: COLOR_STRING },
    { pattern: /'(?:[^'\\]|\\.)*'/g, color: COLOR_STRING },
    { pattern: new RegExp(`\\b(${CSS_KEYWORDS.join('|')})\\b`, 'g'), color: COLOR_KEYWORD },
    { pattern: /\b\d+\.?\d*(px|em|rem|%|vh|vw|s|ms|deg|fr)?\b/g, color: COLOR_NUMBER },
  ];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getRules(language: SupportedLanguage): Rule[] {
  switch (language) {
    case 'javascript': return buildJsRules();
    case 'typescript': return buildTsRules();
    case 'html': return buildHtmlRules();
    case 'css': return buildCssRules();
  }
}

interface Token {
  start: number;
  end: number;
  color: string;
}

export function highlight(code: string, language: SupportedLanguage): string {
  const escaped = escapeHtml(code);
  const rules = getRules(language);
  const tokens: Token[] = [];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(escaped)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        color: rule.color,
      });
      if (!rule.pattern.global) break;
    }
  }

  tokens.sort((a, b) => a.start - b.start || b.end - a.end);

  const filtered: Token[] = [];
  let lastEnd = 0;
  for (const token of tokens) {
    if (token.start >= lastEnd) {
      filtered.push(token);
      lastEnd = token.end;
    }
  }

  let result = '';
  let pos = 0;
  for (const token of filtered) {
    if (token.start > pos) {
      result += escaped.slice(pos, token.start);
    }
    result += `<span style="color:${token.color}">${escaped.slice(token.start, token.end)}</span>`;
    pos = token.end;
  }
  if (pos < escaped.length) {
    result += escaped.slice(pos);
  }

  return result;
}
