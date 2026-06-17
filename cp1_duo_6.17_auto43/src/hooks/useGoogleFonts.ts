import { useState, useEffect, useCallback } from 'react';
import { IFontOption } from '../types';

export const fontOptions: IFontOption[] = [
  { name: '思源黑体', value: 'Noto Sans SC', category: 'chinese', googleFontFamily: 'Noto+Sans+SC:wght@400;700' },
  { name: '思源宋体', value: 'Noto Serif SC', category: 'chinese', googleFontFamily: 'Noto+Serif+SC:wght@400;700' },
  { name: '站酷快乐体', value: 'ZCOOL KuaiLe', category: 'chinese', googleFontFamily: 'ZCOOL+KuaiLe' },
  { name: '站酷庆科黄油体', value: 'ZCOOL QingKe HuangYou', category: 'chinese', googleFontFamily: 'ZCOOL+QingKe+HuangYou' },
  { name: '马善政楷', value: 'Ma Shan Zheng', category: 'chinese', googleFontFamily: 'Ma+Shan+Zheng' },
  { name: 'Roboto', value: 'Roboto', category: 'english', googleFontFamily: 'Roboto:wght@400;700' },
  { name: 'Open Sans', value: 'Open Sans', category: 'english', googleFontFamily: 'Open+Sans:wght@400;700' },
  { name: 'Lato', value: 'Lato', category: 'english', googleFontFamily: 'Lato:wght@400;700' },
  { name: 'Montserrat', value: 'Montserrat', category: 'english', googleFontFamily: 'Montserrat:wght@400;700' },
  { name: 'Playfair Display', value: 'Playfair Display', category: 'english', googleFontFamily: 'Playfair+Display:wght@400;700' }
];

const loadedFonts = new Set<string>();

export function useGoogleFonts() {
  const [loadingFont, setLoadingFont] = useState<string | null>(null);

  const loadFont = useCallback(async (fontFamily: string) => {
    if (loadedFonts.has(fontFamily)) {
      return;
    }

    const fontOption = fontOptions.find(f => f.value === fontFamily);
    if (!fontOption || !fontOption.googleFontFamily) {
      return;
    }

    setLoadingFont(fontFamily);

    try {
      const linkId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
      
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontOption.googleFontFamily}&display=swap`;
        document.head.appendChild(link);

        await new Promise<void>((resolve, reject) => {
          link.onload = () => resolve();
          link.onerror = () => reject(new Error(`Failed to load font: ${fontFamily}`));
        });
      }

      await document.fonts.load(`16px "${fontFamily}"`);
      loadedFonts.add(fontFamily);
    } catch (err) {
      console.warn(`Font load warning for ${fontFamily}:`, err);
    } finally {
      setLoadingFont((current) => current === fontFamily ? null : current);
    }
  }, []);

  const isFontLoaded = useCallback((fontFamily: string) => {
    return loadedFonts.has(fontFamily);
  }, []);

  useEffect(() => {
    const defaultFont = 'Roboto';
    if (!loadedFonts.has(defaultFont)) {
      loadFont(defaultFont);
    }
  }, [loadFont]);

  return { loadingFont, loadFont, isFontLoaded, fontOptions };
}

export default useGoogleFonts;
