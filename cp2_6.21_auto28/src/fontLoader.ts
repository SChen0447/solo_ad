import opentype from 'opentype.js';

export interface FontMetrics {
  ascender: number;
  descender: number;
  unitsPerEm: number;
  lineGap: number;
  maxAdvanceWidth: number;
}

export interface FontInfo {
  fullName: string;
  familyName: string;
  subfamilyName: string;
  postScriptName: string;
  glyphCount: number;
  unitsPerEm: number;
  version: string;
  charRanges: string[];
}

export interface GlyphData {
  index: number;
  unicode: number | null;
  advanceWidth: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export class FontWrapper {
  font: opentype.Font;
  info: FontInfo;
  metrics: FontMetrics;
  glyphs: GlyphData[];
  url: string;
  fontFamily: string;

  constructor(font: opentype.Font, buffer: ArrayBuffer) {
    this.font = font;
    this.info = this.extractFontInfo(font);
    this.metrics = this.extractMetrics(font);
    this.glyphs = this.extractGlyphs(font);
    this.url = this.createObjectURL(buffer);
    this.fontFamily = this.sanitizeFamilyName(this.info.familyName || 'CustomFont');
  }

  private extractFontInfo(font: opentype.Font): FontInfo {
    const names = font.names;
    const get = (key: string): string => {
      const n = (names as any)[key];
      if (!n) return '';
      if (typeof n === 'string') return n;
      return (n.en || n['zh-CN'] || Object.values(n)[0] || '') as string;
    };

    const glyphCount = font.glyphs.length;
    const supportedChars = this.getCharRanges(font);

    return {
      fullName: get('fullName') || get('postScriptName') || 'Unknown',
      familyName: get('fontFamily') || get('familyName') || 'Unknown',
      subfamilyName: get('fontSubfamily') || get('subfamilyName') || 'Regular',
      postScriptName: get('postScriptName') || '',
      glyphCount,
      unitsPerEm: font.unitsPerEm,
      version: get('version') || '',
      charRanges: supportedChars,
    };
  }

  private getCharRanges(font: opentype.Font): string[] {
    const ranges: string[] = [];
    const cmap = (font as any).cmap;
    const glyphMap = cmap?.glyphIndexMap;
    if (!glyphMap) return ranges;

    const ascii = [0x20, 0x7E];
    const latinExt = [0x80, 0xFF];
    const cjk = [0x4E00, 0x9FFF];
    const hiragana = [0x3040, 0x309F];
    const katakana = [0x30A0, 0x30FF];
    const greek = [0x0370, 0x03FF];
    const cyrillic = [0x0400, 0x04FF];

    const rangesToCheck: [string, number, number][] = [
      ['ASCII', ascii[0], ascii[1]],
      ['Latin扩展', latinExt[0], latinExt[1]],
      ['中日韩统一表意文字', cjk[0], cjk[1]],
      ['平假名', hiragana[0], hiragana[1]],
      ['片假名', katakana[0], katakana[1]],
      ['希腊语', greek[0], greek[1]],
      ['西里尔语', cyrillic[0], cyrillic[1]],
    ];

    for (const [name, start, end] of rangesToCheck) {
      let count = 0;
      for (let i = start; i <= end; i++) {
        if (glyphMap[i]) count++;
      }
      if (count > 10) {
        ranges.push(name);
      }
    }

    return ranges;
  }

  private extractMetrics(font: opentype.Font): FontMetrics {
    return {
      ascender: font.ascender,
      descender: font.descender,
      unitsPerEm: font.unitsPerEm,
      lineGap: (font as any).tables?.hhea?.lineGap || 0,
      maxAdvanceWidth: (font as any).tables?.hhea?.advanceWidthMax || font.unitsPerEm,
    };
  }

  private extractGlyphs(font: opentype.Font): GlyphData[] {
    const glyphs: GlyphData[] = [];
    const glyphSet = font.glyphs;
    const maxGlyphs = Math.min(glyphSet.length, 20000);

    for (let i = 0; i < maxGlyphs; i++) {
      try {
        const g = glyphSet.get(i);
        if (g) {
          const bbox = g.getBoundingBox ? g.getBoundingBox() : null;
          glyphs.push({
            index: i,
            unicode: (g as any).unicode ?? null,
            advanceWidth: g.advanceWidth || 0,
            xMin: bbox?.x1 ?? 0,
            yMin: bbox?.y1 ?? 0,
            xMax: bbox?.x2 ?? 0,
            yMax: bbox?.y2 ?? 0,
          });
        }
      } catch (e) {
        // skip
      }
    }
    return glyphs;
  }

  private createObjectURL(buffer: ArrayBuffer): string {
    const blob = new Blob([buffer], { type: 'font/opentype' });
    return URL.createObjectURL(blob);
  }

  getLineHeight(fontSize: number, lineHeightFactor: number): number {
    const scale = fontSize / this.metrics.unitsPerEm;
    const lineHeightUnits = this.metrics.ascender - this.metrics.descender + this.metrics.lineGap;
    return lineHeightUnits * scale * lineHeightFactor;
  }

  getGlyphAdvance(glyphIndex: number, fontSize: number): number {
    const glyph = this.glyphs[glyphIndex];
    if (!glyph) return fontSize * 0.5;
    const scale = fontSize / this.metrics.unitsPerEm;
    return glyph.advanceWidth * scale;
  }

  getKerning(leftGlyphIndex: number, rightGlyphIndex: number, fontSize: number): number {
    const scale = fontSize / this.metrics.unitsPerEm;
    const kern = (this.font as any).kerningValue?.(leftGlyphIndex, rightGlyphIndex);
    return (kern || 0) * scale;
  }

  getCharGlyphIndex(char: string): number {
    const codePoint = char.codePointAt(0);
    if (!codePoint) return 0;
    try {
      const g = this.font.charToGlyph?.(char);
      if (g) {
        const idx = (this.font.glyphs as any).glyphs?.indexOf(g);
        if (idx >= 0) return idx;
      }
    } catch (e) {
      // fallback
    }
    return (this.font as any).cmap?.glyphIndexMap?.[codePoint] ?? 0;
  }

  cleanup(): void {
    if (this.url) {
      URL.revokeObjectURL(this.url);
    }
  }

  private sanitizeFamilyName(name: string): string {
    return 'CustomFont_' + name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '_' + Date.now();
  }
}

export async function loadFontFromFile(file: File): Promise<FontWrapper> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('文件过大，不能超过5MB');
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'woff2' && ext !== 'ttf' && ext !== 'woff' && ext !== 'otf') {
    throw new Error('文件格式不支持或解析失败');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件格式不支持或解析失败'));
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          reject(new Error('文件格式不支持或解析失败'));
          return;
        }
        opentype.parse(buffer, (err, font) => {
          if (err || !font) {
            reject(new Error('文件格式不支持或解析失败'));
            return;
          }
          try {
            const wrapper = new FontWrapper(font, buffer);
            resolve(wrapper);
          } catch (e) {
            reject(new Error('文件格式不支持或解析失败'));
          }
        });
      } catch (e) {
        reject(new Error('文件格式不支持或解析失败'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
