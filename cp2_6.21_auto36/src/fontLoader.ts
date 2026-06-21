import opentype from 'opentype.js';

export interface FontMeta {
  familyName: string;
  styleName: string;
  glyphCount: number;
  supportedRange: string;
  hasChinese: boolean;
  fileName: string;
  fileSize: number;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
}

export interface FontData {
  font: opentype.Font | null;
  meta: FontMeta;
  fontFamilyName: string;
  arrayBuffer: ArrayBuffer;
  fontFormat: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function detectChineseSupport(font: opentype.Font): boolean {
  const cjkStart = 0x4E00;
  const cjkEnd = 0x9FFF;
  let found = 0;
  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    if (glyph.unicode !== undefined && glyph.unicode >= cjkStart && glyph.unicode <= cjkEnd) {
      found++;
      if (found >= 10) return true;
    }
  }
  return false;
}

function getSupportedRange(font: opentype.Font): string {
  const unicodes: number[] = [];
  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    if (glyph.unicode !== undefined) {
      unicodes.push(glyph.unicode);
    }
  }
  unicodes.sort((a, b) => a - b);

  if (unicodes.length === 0) return '无字符';

  const ranges: string[] = [];
  let start = unicodes[0];
  let prev = unicodes[0];

  for (let i = 1; i < unicodes.length; i++) {
    if (unicodes[i] === prev + 1 || unicodes[i] === prev) {
      prev = unicodes[i];
    } else {
      ranges.push(formatRange(start, prev));
      start = unicodes[i];
      prev = unicodes[i];
    }
  }
  ranges.push(formatRange(start, prev));

  return ranges.slice(0, 8).join(', ') + (ranges.length > 8 ? '...' : '');
}

function formatRange(start: number, end: number): string {
  const s = `U+${start.toString(16).toUpperCase().padStart(4, '0')}`;
  if (start === end) return s;
  return `${s}-U+${end.toString(16).toUpperCase().padStart(4, '0')}`;
}

export async function loadFontFile(file: File): Promise<FontData> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('文件大小超过5MB限制');
  }

  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'woff2' && ext !== 'ttf' && ext !== 'otf') {
    throw new Error('文件格式不支持或解析失败');
  }

  const arrayBuffer = await file.arrayBuffer();
  const fontFamilyName = `uploaded-font-${Date.now()}`;
  const displayName = file.name.replace(/\.[^.]+$/, '');

  let parsedFont: opentype.Font | null = null;
  try {
    parsedFont = opentype.parse(arrayBuffer);
  } catch {
    if (ext === 'woff2') {
      const meta: FontMeta = {
        familyName: displayName,
        styleName: 'Regular',
        glyphCount: 0,
        supportedRange: 'WOFF2 (需浏览器解码)',
        hasChinese: false,
        fileName: file.name,
        fileSize: file.size,
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        lineGap: 0,
      };
      return {
        font: null,
        meta,
        fontFamilyName,
        arrayBuffer: arrayBuffer.slice(0),
        fontFormat: 'woff2',
      };
    }
    throw new Error('文件格式不支持或解析失败');
  }

  const familyName = parsedFont.names.fontFamily?.en || parsedFont.names.fontFamily?.zh || displayName;
  const styleName = parsedFont.names.fontSubfamily?.en || 'Regular';

  const meta: FontMeta = {
    familyName: familyName as string,
    styleName: styleName as string,
    glyphCount: parsedFont.glyphs.length,
    supportedRange: getSupportedRange(parsedFont),
    hasChinese: detectChineseSupport(parsedFont),
    fileName: file.name,
    fileSize: file.size,
    unitsPerEm: parsedFont.unitsPerEm,
    ascender: parsedFont.ascender,
    descender: parsedFont.descender,
    lineGap: parsedFont.tables.os2?.sTypoLineGap ?? 0,
  };

  return {
    font: parsedFont,
    meta,
    fontFamilyName,
    arrayBuffer: arrayBuffer.slice(0),
    fontFormat: ext === 'woff2' ? 'woff2' : 'truetype',
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function registerFontFace(fontData: FontData): Promise<void> {
  const existingFont = document.fonts as FontFaceSet;
  for (const f of Array.from(existingFont)) {
    if ((f as FontFace).family === fontData.fontFamilyName) {
      document.fonts.delete(f as FontFace);
    }
  }

  const mimeType = fontData.fontFormat === 'woff2' ? 'font/woff2' : 'font/ttf';
  const blob = new Blob([fontData.arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const fontFace = new FontFace(
    fontData.fontFamilyName,
    `url(${url})`,
    {
      style: 'normal',
      weight: 'normal',
    }
  );

  try {
    const loaded = await fontFace.load();
    document.fonts.add(loaded);
  } catch {
    const fallbackBlob = new Blob([fontData.arrayBuffer], { type: 'application/octet-stream' });
    const fallbackUrl = URL.createObjectURL(fallbackBlob);
    const fallbackFace = new FontFace(
      fontData.fontFamilyName,
      `url(${fallbackUrl})`,
      { style: 'normal', weight: 'normal' }
    );
    try {
      const loaded = await fallbackFace.load();
      document.fonts.add(loaded);
    } catch {
      // Font registration failed silently
    }
  }
}
