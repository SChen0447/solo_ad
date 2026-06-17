import type { SupportedLanguage } from '@/types';

const COLOR_KEYWORD = '#569cd6';
const COLOR_STRING = '#ce9178';
const COLOR_COMMENT = '#6a9955';
const COLOR_NUMBER = '#b5cea8';
const COLOR_FUNCTION = '#dcdcaa';
const COLOR_VARIABLE = '#9cdcfe';
const COLOR_TAG = '#569cd6';
const COLOR_ATTR = '#9cdcfe';
const COLOR_ATTRIBUTE_VALUE = '#ce9178';
const COLOR_PROPERTY = '#9cdcfe';
const COLOR_SELECTOR = '#d7ba7d';
const COLOR_REGEX = '#d16969';

const JS_KEYWORDS = [
  'break','case','catch','continue','debugger','default','delete','do','else',
  'finally','for','function','if','in','instanceof','new','return','switch',
  'this','throw','try','typeof','var','void','while','with','let','const',
  'class','extends','super','import','export','from','as','async','await',
  'yield','of','static','get','set','implements','interface','type','enum',
  'namespace','abstract','declare','readonly','keyof','infer','is','unique',
  'module','true','false','null','undefined','NaN','Infinity','arguments',
  'require','Promise','Array','Object','String','Number','Boolean','Math',
  'Date','JSON','RegExp','Error','Map','Set','WeakMap','WeakSet',
  'console','window','document','navigator','location','history','screen',
  'Symbol','BigInt','Proxy','Reflect','Intl',
];

const CSS_KEYWORDS = [
  'important','inherit','initial','unset','none','auto','block','inline',
  'flex','grid','absolute','relative','fixed','sticky','solid','dashed',
  'dotted','transparent','center','left','right','top','bottom','hidden',
  'visible','scroll','bold','normal','italic','underline','pointer','default',
  'cover','contain','row','column','wrap','nowrap','space-between','space-around',
  'space-evenly','start','end','stretch','baseline','from','to',
  'relative','absolute','fixed','sticky','static','inherit',
  'serif','sans-serif','monospace','cursive','fantasy',
  'repeat','minmax','auto','fit-content','max-content','min-content',
  'ease','ease-in','ease-out','ease-in-out','linear','step-start','step-end',
  'infinite','alternate','reverse','forwards','backwards','both','running','paused',
  'column','row','grid','flex','block','inline-block','inline','none',
  'dashed','dotted','solid','double','groove','ridge','inset','outset','none','hidden',
  'left','right','center','justify','start','end',
  'capitalize','uppercase','lowercase','none',
  'italic','oblique','normal',
  'thin','medium','thick',
  'small','medium','large','x-large','xx-large','smaller','larger',
];

interface Token {
  start: number;
  end: number;
  color: string;
}

interface Rule {
  pattern: RegExp;
  color: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function collectTokens(text: string, rules: Rule[]): Token[] {
  const tokens: Token[] = [];

  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        color: rule.color,
      });
    }
  }

  tokens.sort((a, b) => a.start - b.start || b.end - a.end);

  const result: Token[] = [];
  let lastEnd = 0;
  for (const token of tokens) {
    if (token.start >= lastEnd) {
      result.push(token);
      lastEnd = token.end;
    }
  }

  return result;
}

function applyTokens(text: string, tokens: Token[]): string {
  let result = '';
  let pos = 0;
  for (const token of tokens) {
    if (token.start > pos) {
      result += text.slice(pos, token.start);
    }
    result += `<span style="color:${token.color}">${text.slice(token.start, token.end)}</span>`;
    pos = token.end;
  }
  if (pos < text.length) {
    result += text.slice(pos);
  }
  return result;
}

function buildJsTsRules(): Rule[] {
  const keywordPattern = new RegExp(
    `\\b(${JS_KEYWORDS.join('|')})\\b`,
    'g'
  );

  return [
    {
      pattern: /\/\/.*$/gm,
      color: COLOR_COMMENT,
    },
    {
      pattern: /\/\*[\s\S]*?\*\//gm,
      color: COLOR_COMMENT,
    },
    {
      pattern: /`(?:[^`\\]|\\[\s\S])*`/g,
      color: COLOR_STRING,
    },
    {
      pattern: /"(?:[^"\\]|\\.)*"/g,
      color: COLOR_STRING,
    },
    {
      pattern: /'(?:[^'\\]|\\.)*'/g,
      color: COLOR_STRING,
    },
    {
      pattern: /\/(?![*/])(?:[^\\\/\[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*\b/g,
      color: COLOR_REGEX,
    },
    {
      pattern: keywordPattern,
      color: COLOR_KEYWORD,
    },
    {
      pattern: /\b\d+\.?\d*(?:e[+-]?\d+)?\b/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\b0x[0-9a-fA-F]+\b/g,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\b0o[0-7]+\b/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\b0b[01]+\b/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\b([a-zA-Z_$][\w$]*)\s*\(/g,
      color: COLOR_FUNCTION,
    },
    {
      pattern: /\.\s*([a-zA-Z_$][\w$]*)/g,
      color: COLOR_PROPERTY,
    },
  ];
}

function buildHtmlRules(): Rule[] {
  return [
    {
      pattern: /<!DOCTYPE\s+[^>]+>/gi,
      color: COLOR_KEYWORD,
    },
    {
      pattern: /<!--[\s\S]*?-->/g,
      color: COLOR_COMMENT,
    },
    {
      pattern: /<\/?[\w-]+/g,
      color: COLOR_TAG,
    },
    {
      pattern: /\/?>/g,
      color: COLOR_TAG,
    },
    {
      pattern: /\b([\w-]+)(?=\s*=\s*["']?)/g,
      color: COLOR_ATTR,
    },
    {
      pattern: /"([^"\\]|\\.)*"/g,
      color: COLOR_ATTRIBUTE_VALUE,
    },
    {
      pattern: /'([^'\\]|\\.)*'/g,
      color: COLOR_ATTRIBUTE_VALUE,
    },
    {
      pattern: /\b\d+%?\b/g,
      color: COLOR_NUMBER,
    },
  ];
}

function buildCssRules(): Rule[] {
  return [
    {
      pattern: /\/\*[\s\S]*?\*\//gm,
      color: COLOR_COMMENT,
    },
    {
      pattern: /@[\w-]+/g,
      color: COLOR_KEYWORD,
    },
    {
      pattern: /#[a-zA-Z_][\w-]*\s*\{/g,
      color: COLOR_SELECTOR,
    },
    {
      pattern: /\.[a-zA-Z_][\w-]*\s*\{/g,
      color: COLOR_SELECTOR,
    },
    {
      pattern: /[a-zA-Z][\w-]*\s*\{/g,
      color: COLOR_SELECTOR,
    },
    {
      pattern: /\[[^\]]+\]/g,
      color: COLOR_ATTR,
    },
    {
      pattern: /[a-zA-Z-]+(?=\s*:)/g,
      color: COLOR_PROPERTY,
    },
    {
      pattern: /"(?:[^"\\]|\\.)*"/g,
      color: COLOR_STRING,
    },
    {
      pattern: /'(?:[^'\\]|\\.)*'/g,
      color: COLOR_STRING,
    },
    {
      pattern: new RegExp(`\\b(${CSS_KEYWORDS.join('|')})\\b`, 'g'),
      color: COLOR_KEYWORD,
    },
    {
      pattern: /\b\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|rad|fr|ch|ex|lh|rlh|cqw|cqh|cqi|cqb|cqmin|cqmax)?\b/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /#(?:[0-9a-fA-F]{3}){1,2}\b/g,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\brgb\([^)]*\)/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\brgba\([^)]*\)/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\bhsl\([^)]*\)/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\bhsla\([^)]*\)/gi,
      color: COLOR_NUMBER,
    },
    {
      pattern: /\bvar\([^)]*\)/g,
      color: COLOR_VARIABLE,
    },
    {
      pattern: /--[\w-]+/g,
      color: COLOR_VARIABLE,
    },
  ];
}

function getRules(language: SupportedLanguage): Rule[] {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return buildJsTsRules();
    case 'html':
      return buildHtmlRules();
    case 'css':
      return buildCssRules();
  }
}

export function highlight(code: string, language: SupportedLanguage): string {
  const escaped = escapeHtml(code);
  const rules = getRules(language);
  const tokens = collectTokens(escaped, rules);
  return applyTokens(escaped, tokens);
}
