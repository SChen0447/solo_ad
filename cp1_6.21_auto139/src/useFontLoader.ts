import { useState, useEffect, useCallback } from 'react';
import WebFont from 'webfontloader';

export interface FontItem {
  name: string;
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'monospace';
  weights?: string[];
}

export interface UseFontLoaderReturn {
  fonts: FontItem[];
  loading: boolean;
  error: string | null;
  addLocalFont: (file: File) => Promise<void>;
}

const DEFAULT_GOOGLE_FONTS: FontItem[] = [
  { name: 'Noto Sans SC', family: "'Noto Sans SC', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Noto Serif SC', family: "'Noto Serif SC', serif", category: 'serif', weights: ['400', '500', '700'] },
  { name: 'Source Han Sans SC', family: "'Source Han Sans SC', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Source Han Serif SC', family: "'Source Han Serif SC', serif", category: 'serif', weights: ['400', '500', '700'] },
  { name: 'Roboto', family: "'Roboto', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'serif', weights: ['400', '500', '700'] },
  { name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Lato', family: "'Lato', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Merriweather', family: "'Merriweather', serif", category: 'serif', weights: ['400', '500', '700'] },
  { name: 'Inter', family: "'Inter', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Poppins', family: "'Poppins', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Raleway', family: "'Raleway', sans-serif", category: 'sans-serif', weights: ['400', '500', '700'] },
  { name: 'Georgia', family: 'Georgia, serif', category: 'serif' },
  { name: 'Times New Roman', family: "'Times New Roman', serif", category: 'serif' },
  { name: 'Arial', family: 'Arial, sans-serif', category: 'sans-serif' },
  { name: 'Helvetica', family: 'Helvetica, sans-serif', category: 'sans-serif' },
  { name: 'Courier New', family: "'Courier New', monospace", category: 'monospace' },
];

const GOOGLE_FONT_API_NAMES = [
  'Noto+Sans+SC',
  'Noto+Serif+SC',
  'Roboto',
  'Playfair+Display',
  'Open+Sans',
  'Lato',
  'Montserrat',
  'Merriweather',
  'Inter',
  'Poppins',
  'Raleway',
];

export function useFontLoader(): UseFontLoaderReturn {
  const [fonts, setFonts] = useState<FontItem[]>(DEFAULT_GOOGLE_FONTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    WebFont.load({
      google: {
        families: GOOGLE_FONT_API_NAMES,
      },
      active: () => {
        setLoading(false);
      },
      inactive: () => {
        setLoading(false);
        setError('部分 Google Fonts 加载失败，请检查网络连接');
      },
    });
  }, []);

  const addLocalFont = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!file.name.match(/\.(ttf|otf|woff2?)$/i)) {
        reject(new Error('仅支持 .ttf, .otf, .woff, .woff2 格式的字体文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const fileName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '');
          const fontName = `Local_${fileName}_${Date.now()}`;
          const format = file.name.toLowerCase().match(/\.otf$/) ? 'opentype' : 'truetype';
          const cssBuffer = new Blob([buffer]);
          const fontUrl = URL.createObjectURL(cssBuffer);

          const fontFace = new FontFace(fontName, `url(${fontUrl}) format('${format}')`);
          fontFace.load().then((loadedFace) => {
            document.fonts.add(loadedFace);

            const newFont: FontItem = {
              name: fileName,
              family: `'${fontName}', sans-serif`,
              category: 'sans-serif',
              weights: ['400'],
            };

            setFonts((prev) => [...prev, newFont]);
            resolve();
          }).catch((err) => {
            URL.revokeObjectURL(fontUrl);
            reject(err);
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('读取字体文件失败'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  return { fonts, loading, error, addLocalFont };
}
