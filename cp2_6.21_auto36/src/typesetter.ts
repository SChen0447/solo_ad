import opentype from 'opentype.js';

export interface TypesetParams {
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  text: string;
  maxWidth: number;
}

export interface GlyphPosition {
  glyph: opentype.Glyph;
  x: number;
  y: number;
  advanceWidth: number;
}

export interface TextLine {
  glyphs: GlyphPosition[];
  x: number;
  y: number;
  width: number;
  baseline: number;
}

export interface TypesetResult {
  lines: TextLine[];
  totalHeight: number;
  maxLineWidth: number;
}

function measureCharWidth(font: opentype.Font, char: string, fontSize: number): number {
  const glyph = font.charToGlyph(char);
  return (glyph.advanceWidth / font.unitsPerEm) * fontSize;
}

function breakLines(
  font: opentype.Font,
  text: string,
  fontSize: number,
  letterSpacing: number,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    const words: string[] = [];
    let current = '';
    for (const char of paragraph) {
      if (char === ' ' || char === '\t') {
        if (current) words.push(current);
        words.push(char);
        current = '';
      } else {
        current += char;
      }
    }
    if (current) words.push(current);

    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let lineText = '';
    let lineWidth = 0;

    for (const word of words) {
      const wordWidth = measureWordWidth(font, word, fontSize, letterSpacing);

      if (lineWidth + wordWidth > maxWidth && lineText.length > 0) {
        lines.push(lineText.trimEnd());
        lineText = word;
        lineWidth = wordWidth;
      } else {
        lineText += word;
        lineWidth += wordWidth;
      }
    }

    if (lineText.length > 0) {
      lines.push(lineText.trimEnd());
    }
  }

  return lines;
}

function measureWordWidth(
  font: opentype.Font,
  word: string,
  fontSize: number,
  letterSpacing: number
): number {
  let width = 0;
  for (let i = 0; i < word.length; i++) {
    width += measureCharWidth(font, word[i], fontSize);
    if (i < word.length - 1) {
      width += letterSpacing;
    }
  }
  return width;
}

function measureLineWidth(
  font: opentype.Font,
  line: string,
  fontSize: number,
  letterSpacing: number
): number {
  let width = 0;
  for (let i = 0; i < line.length; i++) {
    width += measureCharWidth(font, line[i], fontSize);
    if (i < line.length - 1) {
      width += letterSpacing;
    }
  }
  return width;
}

function layoutLine(
  font: opentype.Font,
  line: string,
  fontSize: number,
  letterSpacing: number,
  lineHeightPx: number,
  lineIndex: number,
  maxWidth: number,
  alignment: 'left' | 'center' | 'right' | 'justify'
): TextLine {
  const scale = fontSize / font.unitsPerEm;
  const glyphs: GlyphPosition[] = [];
  let x = 0;

  for (let i = 0; i < line.length; i++) {
    const glyph = font.charToGlyph(line[i]);
    const advanceWidth = glyph.advanceWidth * scale;
    glyphs.push({
      glyph,
      x,
      y: 0,
      advanceWidth,
    });
    x += advanceWidth;
    if (i < line.length - 1) {
      x += letterSpacing;
    }
  }

  const lineWidth = x;
  let offsetX = 0;

  switch (alignment) {
    case 'center':
      offsetX = (maxWidth - lineWidth) / 2;
      break;
    case 'right':
      offsetX = maxWidth - lineWidth;
      break;
    case 'justify':
      if (line.length > 1) {
        const extraSpace = maxWidth - lineWidth;
        const gapCount = line.length - 1;
        const extraPerGap = extraSpace / gapCount;
        let jx = 0;
        for (let i = 0; i < glyphs.length; i++) {
          glyphs[i].x = jx;
          jx += glyphs[i].advanceWidth;
          if (i < glyphs.length - 1) {
            jx += letterSpacing + extraPerGap;
          }
        }
      }
      break;
    default:
      break;
  }

  if (alignment !== 'justify') {
    for (const g of glyphs) {
      g.x += offsetX;
    }
  }

  const baseline = lineIndex * lineHeightPx + lineHeightPx * 0.8;

  return {
    glyphs,
    x: 0,
    y: lineIndex * lineHeightPx,
    width: alignment === 'justify' ? maxWidth : lineWidth,
    baseline,
  };
}

export function typeset(
  font: opentype.Font | null,
  params: TypesetParams
): TypesetResult {
  if (!font || !params.text) {
    return { lines: [], totalHeight: 0, maxLineWidth: 0 };
  }

  const { fontSize, letterSpacing, lineHeight, alignment, text, maxWidth } = params;

  if (maxWidth <= 0) {
    return { lines: [], totalHeight: 0, maxLineWidth: 0 };
  }

  const lineHeightPx = fontSize * lineHeight;
  const brokenLines = breakLines(font, text, fontSize, letterSpacing, maxWidth);

  const lines: TextLine[] = [];
  let maxLineWidth = 0;

  for (let i = 0; i < brokenLines.length; i++) {
    const line = layoutLine(
      font,
      brokenLines[i],
      fontSize,
      letterSpacing,
      lineHeightPx,
      i,
      maxWidth,
      alignment
    );
    lines.push(line);
    if (line.width > maxLineWidth) {
      maxLineWidth = line.width;
    }
  }

  const totalHeight = lines.length * lineHeightPx;

  return { lines, totalHeight, maxLineWidth };
}

export function getTextLineBaselines(result: TypesetResult, fontSize: number, lineHeight: number): number[] {
  const lineHeightPx = fontSize * lineHeight;
  return result.lines.map((_, i) => i * lineHeightPx + lineHeightPx * 0.8);
}
