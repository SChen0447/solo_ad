declare module 'opentype.js' {
  interface Glyph {
    unicode?: number;
    advanceWidth: number;
    path: Path;
    name?: string;
  }

  interface Path {
    toPathData(decimalPlaces?: number): string;
    toSVG(decimalPlaces?: number): string;
  }

  interface FontNames {
    fontFamily?: { en?: string; zh?: string };
    fontSubfamily?: { en?: string; zh?: string };
    version?: { en?: string; zh?: string };
  }

  interface OS2Table {
    sTypoLineGap?: number;
  }

  interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: GlyphSet;
    names: FontNames;
    tables: {
      os2?: OS2Table;
    };
    charToGlyph(c: string): Glyph;
    stringToGlyphs(s: string): Glyph[];
    getKerningValue(left: Glyph, right: Glyph): number;
  }

  interface GlyphSet {
    length: number;
    get(index: number): Glyph;
  }

  function parse(buffer: ArrayBuffer | Uint8Array): Font;
  function load(url: string, callback: (err: Error | null, font?: Font) => void): void;
}
