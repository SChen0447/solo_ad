export interface GrammarError {
  type: string;
  position: number;
  length: number;
  suggestion: string;
  message: string;
}

export interface ScoreResult {
  pronunciationScore: number;
  grammarScore: number;
  grammarErrors: GrammarError[];
  similarity: number;
  isPassed: boolean;
}

export const levenshteinDistance = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
};

export const calculateSimilarity = (str1: string, str2: string): number => {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
};

export const checkGrammarErrors = (text: string): GrammarError[] => {
  const errors: GrammarError[] = [];
  const lowerText = text.toLowerCase();
  
  const subjectVerbRules = [
    { pattern: /\b(i is|i am not is|he are|she are|it are|we is|they is|you is)\b/gi, type: '主谓不一致', suggestion: '请检查主语和动词的搭配' },
    { pattern: /\b(he have|she have|it have|has you|has i|has they|has we)\b/gi, type: '主谓不一致', suggestion: '第三人称单数使用 has' },
    { pattern: /\b(don'?t he|doesn'?t i|doesn'?t you)\b/gi, type: '主谓不一致', suggestion: '请检查助动词的使用' },
  ];
  
  subjectVerbRules.forEach(rule => {
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      errors.push({
        type: rule.type,
        position: match.index,
        length: match[0].length,
        suggestion: rule.suggestion,
        message: `发现 "${match[0]}" 可能存在主谓不一致问题`,
      });
    }
  });
  
  const tenseRules = [
    { pattern: /\byesterday\s+\w+s\b/gi, type: '时态错误', suggestion: 'yesterday 应使用过去式' },
    { pattern: /\btomorrow\s+\w+ed\b/gi, type: '时态错误', suggestion: 'tomorrow 应使用将来时' },
    { pattern: /\bnow\s+\w+ed\b/gi, type: '时态错误', suggestion: 'now 应使用现在进行时' },
  ];
  
  tenseRules.forEach(rule => {
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      errors.push({
        type: rule.type,
        position: match.index,
        length: match[0].length,
        suggestion: rule.suggestion,
        message: `发现时态可能存在问题`,
      });
    }
  });
  
  const articleRules = [
    { pattern: /\ba\s+[aeiou]\w+/gi, type: '冠词错误', suggestion: '元音开头的单词前用 an' },
    { pattern: /\ban\s+[^aeiou]\w+/gi, type: '冠词错误', suggestion: '辅音开头的单词前用 a' },
  ];
  
  articleRules.forEach(rule => {
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      errors.push({
        type: rule.type,
        position: match.index,
        length: match[0].length,
        suggestion: rule.suggestion,
        message: `冠词使用可能有误："${match[0]}"`,
      });
    }
  });
  
  const doubleNegativePattern = /\b(don'?t\s+no|doesn'?t\s+no|didn'?t\s+no|never\s+no|no\s+nobody|not\s+nothing)\b/gi;
  let match;
  while ((match = doubleNegativePattern.exec(text)) !== null) {
    errors.push({
      type: '双重否定',
      position: match.index,
      length: match[0].length,
      suggestion: '英语中应避免双重否定',
      message: `发现双重否定："${match[0]}"`,
    });
  }
  
  errors.sort((a, b) => a.position - b.position);
  return errors;
};

export const calculateScore = (
  recognizedText: string,
  standardText: string
): ScoreResult => {
  const similarity = calculateSimilarity(recognizedText, standardText);
  const pronunciationScore = Math.round(similarity * 100);
  
  const grammarErrors = checkGrammarErrors(recognizedText);
  const totalWords = recognizedText.trim().split(/\s+/).length;
  const errorPenalty = Math.min(grammarErrors.length * 0.1, 0.5);
  const grammarScore = Math.max(0, Math.round((1 - errorPenalty) * 100));
  
  const isPassed = similarity >= 0.6;
  
  return {
    pronunciationScore,
    grammarScore,
    grammarErrors,
    similarity,
    isPassed,
  };
};

export const highlightGrammarErrors = (text: string, errors: GrammarError[]): string => {
  if (errors.length === 0) return text;
  
  let result = '';
  let lastIndex = 0;
  
  const sortedErrors = [...errors].sort((a, b) => a.position - b.position);
  
  for (const error of sortedErrors) {
    result += text.slice(lastIndex, error.position);
    result += `{{${text.slice(error.position, error.position + error.length)}}}`;
    lastIndex = error.position + error.length;
  }
  
  result += text.slice(lastIndex);
  return result;
};
