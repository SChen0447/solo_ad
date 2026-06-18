import opentype from 'opentype.js';
import { FontData } from './types';

export interface ParsedFontData extends FontData {
  opentypeFont?: opentype.Font;
}

export class FontLoader {
  private static loadedFonts: Map<string, ParsedFontData> = new Map();

  static async loadFromFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ParsedFontData> {
    return new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('字体文件大小不能超过5MB'));
        return;
      }

      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            reject(new Error('无法读取字体文件'));
            return;
          }

          if (onProgress) onProgress(80);

          const opentypeFont = await this.parseOpenType(buffer);
          const fontName = file.name.replace(/\.(woff|ttf)$/i, '');
          const fontFamily = `Custom_${fontName.replace(/[^a-zA-Z0-9]/g, '_')}`;

          const fontUrl = this.createFontFace(fontFamily, buffer, file.type);

          if (onProgress) onProgress(100);

          const fontData: ParsedFontData = {
            name: fontName,
            buffer,
            fontUrl,
            family: `'${fontFamily}', sans-serif`,
            isCustom: true,
            opentypeFont,
            metrics: {
              ascender: opentypeFont.ascender,
              descender: opentypeFont.descender,
              unitsPerEm: opentypeFont.unitsPerEm,
            },
          };

          this.loadedFonts.set(fontFamily, fontData);
          resolve(fontData);
        } catch (error) {
          reject(new Error('字体解析失败: ' + (error as Error).message));
        }
      };

      reader.onerror = () => reject(new Error('字体文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  static async loadPresetFont(
    fontName: string,
    fontFamily: string,
    cssUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<ParsedFontData> {
    return new Promise((resolve, reject) => {
      if (onProgress) onProgress(20);

      this.loadGoogleFontCSS(cssUrl)
        .then(() => {
          if (onProgress) onProgress(60);
          return this.waitForFontLoad(fontFamily);
        })
        .then(() => {
          if (onProgress) onProgress(100);

          const fontData: ParsedFontData = {
            name: fontName,
            buffer: null,
            fontUrl: cssUrl,
            family: fontFamily,
            isCustom: false,
          };

          this.loadedFonts.set(fontName, fontData);
          resolve(fontData);
        })
        .catch(reject);
    });
  }

  private static async parseOpenType(buffer: ArrayBuffer): Promise<opentype.Font> {
    return new Promise((resolve, reject) => {
      try {
        const font = opentype.parse(buffer);
        resolve(font);
      } catch (error) {
        reject(error);
      }
    });
  }

  private static createFontFace(
    fontFamily: string,
    buffer: ArrayBuffer,
    mimeType: string
  ): string {
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('${url}') format('${mimeType.includes('woff') ? 'woff' : 'truetype'}');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(style);

    return url;
  }

  private static async loadGoogleFontCSS(cssUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingLink = document.querySelector(`link[href="${cssUrl}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('无法加载字体样式表'));
      document.head.appendChild(link);
    });
  }

  private static async waitForFontLoad(fontFamily: string): Promise<void> {
    try {
      await document.fonts.load(`16px ${fontFamily}`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  static getFont(family: string): ParsedFontData | undefined {
    return this.loadedFonts.get(family);
  }

  static revokeFont(fontUrl: string): void {
    if (fontUrl.startsWith('blob:')) {
      URL.revokeObjectURL(fontUrl);
    }
  }
}
