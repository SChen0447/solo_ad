export function extractLanguage(code: string): string {
  const trimmed = code.trim();

  if (/<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed) || /<div[\s>]/i.test(trimmed)) {
    return 'HTML';
  }

  if (/<style[\s>]/i.test(trimmed) || /^[\s]*[.#]?[\w-]+\s*\{/m.test(trimmed)) {
    const hasCSSPatterns = /(?:color|background|font-size|margin|padding|width|height|display|flex|grid)\s*:/i.test(trimmed);
    if (hasCSSPatterns) {
      return 'CSS';
    }
  }

  if (/\bfunction\b/.test(trimmed) || /\b(?:let|const|var)\s+\w+/.test(trimmed) || /=>\s*[{(]/.test(trimmed)) {
    return 'JavaScript';
  }

  if (/\bdef\s+\w+\s*\(/.test(trimmed) || /\bimport\s+\w+/m.test(trimmed) || /\bclass\s+\w+.*:/m.test(trimmed)) {
    return 'Python';
  }

  if (/\bclass\s+\w+/.test(trimmed) || /\bimport\b/.test(trimmed)) {
    return 'JavaScript';
  }

  return 'Unknown';
}

export function analyzeStyle(code: string): { indentType: string; commentRatio: number } {
  const lines = code.split('\n');
  const totalLines = lines.length;

  let spaceIndents = 0;
  let tabIndents = 0;
  let commentLines = 0;

  for (const line of lines) {
    if (/^\t/.test(line)) {
      tabIndents++;
    } else if (/^ {2,}/.test(line)) {
      spaceIndents++;
    }

    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('<!--') ||
      trimmed.startsWith('/*') ||
      trimmed.endsWith('*/')
    ) {
      commentLines++;
    }
  }

  let indentType = 'Unknown';
  if (spaceIndents > 0 && tabIndents === 0) {
    indentType = 'Spaces';
  } else if (tabIndents > 0 && spaceIndents === 0) {
    indentType = 'Tabs';
  } else if (spaceIndents > 0 && tabIndents > 0) {
    indentType = spaceIndents >= tabIndents ? 'Spaces' : 'Tabs';
  }

  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length;
  const commentRatio = nonEmptyLines > 0 ? commentLines / nonEmptyLines : 0;

  return { indentType, commentRatio };
}
