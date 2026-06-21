import { FontWrapper } from './fontLoader';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface TypesetParams {
  fontSize: number;
  letterSpacing: number;
  lineHeightFactor: number;
  textAlign: TextAlign;
  maxWidth: number;
}

export interface GlyphPosition {
  char: string;
  glyphIndex: number;
  x: number;
  y: number;
  advance: number;
  width: number;
}

export interface LineLayout {
  glyphs: GlyphPosition[];
  width: number;
  ascent: number;
  descent: number;
  lineHeight: number;
  text: string;
}

export interface LayoutResult {
  lines: LineLayout[];
  totalHeight: number;
  totalWidth: number;
  fontSize: number;
}

const NBSP = '\u00A0';

export class Typesetter {
  private font: FontWrapper;

  constructor(font: FontWrapper) {
    this.font = font;
  }

  layout(text: string, params: TypesetParams): LayoutResult {
    const { fontSize, letterSpacing, lineHeightFactor, textAlign, maxWidth } = params;
    const normalized = text.replace(/\r\n/g, '\n');

    const lineHeight = this.font.getLineHeight(fontSize, lineHeightFactor);
    const scale = fontSize / this.font.metrics.unitsPerEm;
    const ascent = this.font.metrics.ascender * scale;
    const descent = -this.font.metrics.descender * scale;

    const lines: LineLayout[] = [];
    const paragraphLines = normalized.split('\n');

    for (const pLine of paragraphLines) {
      const wrapped = this.wrapLine(pLine, fontSize, letterSpacing, maxWidth);
      for (let i = 0; i < wrapped.length; i++) {
        const isLastLine = i === wrapped.length - 1;
        const lineText = wrapped[i];
        const positions = this.measureLine(lineText, fontSize, letterSpacing);
        const lineWidth = positions.reduce((sum, p) => sum + p.advance, 0);

        let adjustedPositions = [...positions];
        let alignedWidth = lineWidth;

        if (textAlign === 'justify' && !isLastLine && adjustedPositions.length > 1) {
          const gap = (maxWidth - lineWidth) / (adjustedPositions.length - 1);
          adjustedPositions = adjustedPositions.map((p, idx) => ({
            ...p,
            x: p.x + idx * gap,
          }));
          alignedWidth = maxWidth;
        } else if (textAlign === 'center') {
          const offset = (maxWidth - lineWidth) / 2;
          adjustedPositions = adjustedPositions.map((p) => ({ ...p, x: p.x + offset }));
        } else if (textAlign === 'right') {
          const offset = maxWidth - lineWidth;
          adjustedPositions = adjustedPositions.map((p) => ({ ...p, x: p.x + offset }));
        }

        lines.push({
          glyphs: adjustedPositions,
          width: alignedWidth,
          ascent,
          descent,
          lineHeight,
          text: lineText,
        });
      }
    }

    return {
      lines,
      totalHeight: lines.length * lineHeight,
      totalWidth: Math.max(...lines.map((l) => l.width), 0),
      fontSize,
    };
  }

  private measureLine(text: string, fontSize: number, letterSpacing: number): GlyphPosition[] {
    const result: GlyphPosition[] = [];
    let x = 0;
    let prevGlyphIndex = -1;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyphIndex = this.font.getCharGlyphIndex(char);
      let advance = this.font.getGlyphAdvance(glyphIndex, fontSize);

      if (prevGlyphIndex >= 0) {
        const kerning = this.font.getKerning(prevGlyphIndex, glyphIndex, fontSize);
        advance += kerning;
      }
      advance += letterSpacing;

      const glyph = this.font.glyphs[glyphIndex];
      const scale = fontSize / this.font.metrics.unitsPerEm;
      const w = glyph ? (glyph.xMax - glyph.xMin) * scale : advance - letterSpacing;

      result.push({
        char,
        glyphIndex,
        x,
        y: 0,
        advance,
        width: w,
      });

      x += advance;
      prevGlyphIndex = glyphIndex;
    }

    return result;
  }

  private wrapLine(text: string, fontSize: number, letterSpacing: number, maxWidth: number): string[] {
    if (text.length === 0) return [''];

    const lines: string[] = [];

    if (maxWidth <= 0) {
      lines.push(text);
      return lines;
    }

    let current = '';
    let currentWidth = 0;
    let prevGlyphIndex = -1;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyphIndex = this.font.getCharGlyphIndex(char);
      let advance = this.font.getGlyphAdvance(glyphIndex, fontSize);
      if (prevGlyphIndex >= 0) {
        advance += this.font.getKerning(prevGlyphIndex, glyphIndex, fontSize);
      }
      advance += letterSpacing;

      if (this.isBreakableChar(char)) {
        if (currentWidth + advance > maxWidth && current.length > 0) {
          lines.push(current);
          current = char === ' ' || char === '\t' ? '' : char;
          currentWidth = char === ' ' || char === '\t' ? 0 : advance;
          prevGlyphIndex = char === ' ' || char === '\t' ? -1 : glyphIndex;
          continue;
        }
      } else {
        if (currentWidth + advance > maxWidth && current.length > 0) {
          const lastBreak = this.findLastBreakIndex(current);
          if (lastBreak >= 0) {
            lines.push(current.slice(0, lastBreak + 1));
            current = current.slice(lastBreak + 1) + char;
          } else {
            lines.push(current);
            current = char;
          }
          currentWidth = this.measureTextWidth(current, fontSize, letterSpacing);
          prevGlyphIndex = this.getLastGlyphIndex(current);
          continue;
        }
      }

      current += char;
      currentWidth += advance;
      prevGlyphIndex = glyphIndex;
    }

    if (current.length > 0) lines.push(current);

    return lines;
  }

  private measureTextWidth(text: string, fontSize: number, letterSpacing: number): number {
    let width = 0;
    let prevGlyphIndex = -1;
    for (let i = 0; i < text.length; i++) {
      const glyphIndex = this.font.getCharGlyphIndex(text[i]);
      let advance = this.font.getGlyphAdvance(glyphIndex, fontSize);
      if (prevGlyphIndex >= 0) {
        advance += this.font.getKerning(prevGlyphIndex, glyphIndex, fontSize);
      }
      advance += letterSpacing;
      width += advance;
      prevGlyphIndex = glyphIndex;
    }
    return width;
  }

  private getLastGlyphIndex(text: string): number {
    if (text.length === 0) return -1;
    return this.font.getCharGlyphIndex(text[text.length - 1]);
  }

  private findLastBreakIndex(text: string): number {
    for (let i = text.length - 1; i >= 0; i--) {
      if (this.isBreakableChar(text[i])) return i;
    }
    return -1;
  }

  private isBreakableChar(c: string): boolean {
    return c === ' ' || c === '\t' || c === '-' || c === '/' || c === '、' || c === '。' || c === '，' || c === '；';
  }
}
