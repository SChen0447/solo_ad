declare module 'opentype.js' {
  export interface FontNames {
    [key: string]: any;
    fontFamily?: string | { [lang: string]: string };
    fullName?: string | { [lang: string]: string };
    postScriptName?: string | { [lang: string]: string };
    fontSubfamily?: string | { [lang: string]: string };
    subfamilyName?: string | { [lang: string]: string };
    version?: string | { [lang: string]: string };
  }

  export interface GlyphBoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Glyph {
    advanceWidth: number;
    index: number;
    unicode?: number;
    unicodes?: number[];
    getBoundingBox?(): GlyphBoundingBox;
    getMetrics?(): any;
    path?: any;
  }

  export interface GlyphSet {
    length: number;
    get(index: number): Glyph | null;
  }

  export interface Font {
    names: FontNames;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: GlyphSet;
    supportedChars?: number[];
    charToGlyph?(char: string): Glyph | null;
    kerningValue?(leftGlyphIndex: number, rightGlyphIndex: number): number;
    tables?: {
      hhea?: {
        lineGap: number;
        advanceWidthMax: number;
      };
      cmap?: {
        glyphIndexMap?: { [codePoint: number]: number };
      };
    };
  }

  export function parse(
    buffer: ArrayBuffer,
    callback: (err: Error | null, font: Font | null) => void
  ): void;

  export function load(
    url: string,
    callback: (err: Error | null, font: Font | null) => void
  ): void;
}
