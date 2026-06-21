import { EmphasisType, EmphasisSpan } from '../styles/cardStyles';
import { getRandomTemplate, formatTemplate, Template } from '../data/templates';

export interface GeneratedContent {
  title: string;
  content: string;
  emphasis: EmphasisSpan[];
  template: Template;
}

const emphasisTypes: EmphasisType[] = ['bold', 'underline', 'red'];

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateEmphasisSpans = (text: string, maxCount: number = 3): EmphasisSpan[] => {
  const spans: EmphasisSpan[] = [];
  const words = text.split(/[，。！？、；：\s]+/).filter(w => w.length > 0);
  
  if (words.length === 0) return spans;
  
  const count = Math.min(maxCount, getRandomInt(1, maxCount));
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 10) {
      const wordIndex = getRandomInt(0, words.length - 1);
      if (!usedIndices.has(wordIndex)) {
        usedIndices.add(wordIndex);
        const word = words[wordIndex];
        const start = text.indexOf(word);
        if (start !== -1) {
          const hasOverlap = spans.some(span => 
            (start >= span.start && start < span.end) ||
            (start + word.length > span.start && start + word.length <= span.end)
          );
          
          if (!hasOverlap) {
            spans.push({
              start,
              end: start + word.length,
              type: emphasisTypes[getRandomInt(0, emphasisTypes.length - 1)]
            });
            break;
          }
        }
      }
      attempts++;
    }
  }
  
  return spans.sort((a, b) => a.start - b.start);
};

export const generateContent = (input: string): GeneratedContent => {
  const template = getRandomTemplate();
  const title = formatTemplate(template, input);
  
  const bodyTemplates = [
    `据可靠消息，${input}，此事引起了社会各界的广泛关注。`,
    `最新消息显示，${input}，相关部门已经介入调查。`,
    `知情人透露，${input}，真相远比想象中更复杂。`,
    `记者调查发现，${input}，背后隐藏着不为人知的秘密。`,
    `专家分析认为，${input}，这将对未来产生深远影响。`
  ];
  
  const bodyIndex = Math.floor(Math.random() * bodyTemplates.length);
  let content = bodyTemplates[bodyIndex];
  
  const additionalSentences = [
    `据了解，这已经不是第一次发生类似事件。`,
    `值得注意的是，此事仍在持续发酵中。`,
    `更多细节正在进一步核实，我们将持续关注。`,
    `有网友表示，这样的结果实在让人意想不到。`,
    `业内人士指出，这一现象值得深入思考。`
  ];
  
  const additionalIndex = Math.floor(Math.random() * additionalSentences.length);
  content += additionalSentences[additionalIndex];
  
  const emphasis = generateEmphasisSpans(content, 3);
  
  return {
    title,
    content,
    emphasis,
    template
  };
};

export const renderContentWithEmphasis = (
  content: string,
  emphasis: EmphasisSpan[],
  styleType: string
): (string | JSX.Element)[] => {
  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  
  emphasis.forEach((span, index) => {
    if (span.start > lastIndex) {
      result.push(content.slice(lastIndex, span.start));
    }
    
    const text = content.slice(span.start, span.end);
    let className = '';
    
    switch (span.type) {
      case 'bold':
        className = `emphasis-bold emphasis-${styleType}`;
        break;
      case 'underline':
        className = `emphasis-underline emphasis-${styleType}`;
        break;
      case 'red':
        className = `emphasis-red emphasis-${styleType}`;
        break;
    }
    
    result.push(
      <span key={index} className={className}>
        {text}
      </span>
    );
    
    lastIndex = span.end;
  });
  
  if (lastIndex < content.length) {
    result.push(content.slice(lastIndex));
  }
  
  return result;
};
