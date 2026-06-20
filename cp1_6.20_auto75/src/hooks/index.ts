import { useEffect, useRef, useState, useCallback } from 'react';
import type { ThemeVariables, ThemePackage, HistoryTheme } from './types';

const HISTORY_KEY = 'theme_extractor_history';
const MAX_HISTORY = 5;

export function useThemeHistory() {
  const [history, setHistory] = useState<HistoryTheme[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const saveHistory = useCallback((newHistory: HistoryTheme[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }, []);

  const addToHistory = useCallback(
    (theme: ThemePackage) => {
      const thumbnail = theme.colors
        .map((c) => c.hex)
        .join(',');
      const entry: HistoryTheme = {
        id: theme.id,
        colors: theme.colors,
        timestamp: theme.timestamp,
        thumbnail,
      };

      setHistory((prev) => {
        const filtered = prev.filter((h) => h.id !== theme.id);
        const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save history', e);
        }
        return updated;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, addToHistory, clearHistory, saveHistory };
}

export function useColorExtractor() {
  const workerRef = useRef<Worker | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const extractFromImage = useCallback(
    (imageData: ImageData): Promise<any> => {
      return new Promise((resolve, reject) => {
        setIsProcessing(true);
        setProgress(0);

        if (workerRef.current) {
          workerRef.current.terminate();
        }

        try {
          workerRef.current = new Worker(
            new URL('./workers/colorExtractor.worker.ts', import.meta.url),
            { type: 'module' },
          );
        } catch {
          import('./colorExtractor')
            .then(({ extractColors }) => {
              const result = extractColors(imageData, 5, (p) => {
                setProgress(p);
              });
              setProgress(1);
              setIsProcessing(false);
              resolve(result);
            })
            .catch(reject);
          return;
        }

        const worker = workerRef.current!;

        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === 'progress') {
            setProgress(msg.progress);
          } else if (msg.type === 'success') {
            setProgress(1);
            setIsProcessing(false);
            resolve(msg.result);
            worker.terminate();
            workerRef.current = null;
          } else if (msg.type === 'error') {
            setIsProcessing(false);
            reject(new Error(msg.message));
            worker.terminate();
            workerRef.current = null;
          }
        };

        worker.onerror = (err) => {
          setIsProcessing(false);
          reject(err);
          worker.terminate();
          workerRef.current = null;
        };

        worker.postMessage({ type: 'extract', imageData, k: 5 });
      });
    },
    [],
  );

  return { progress, isProcessing, extractFromImage };
}

export function useCSSVariables() {
  const applyVariables = useCallback(
    (variables: ThemeVariables, target: HTMLElement = document.documentElement) => {
      Object.entries(variables).forEach(([key, value]) => {
        target.style.setProperty(key, value);
      });
    },
    [],
  );

  const clearVariables = useCallback(
    (target: HTMLElement = document.documentElement) => {
      const style = target.style;
      for (let i = style.length - 1; i >= 0; i--) {
        const prop = style[i];
        if (prop.startsWith('--')) {
          style.removeProperty(prop);
        }
      }
    },
    [],
  );

  return { applyVariables, clearVariables };
}
