import { useCallback } from 'react';
import { analyzeContrast, type ContrastMetrics } from '@/utils/contrastCalculator';

export function useContrastAnalyzer() {
  const analyze = useCallback(
    (original: ImageData, simulated: ImageData, threshold: number = 0.05): ContrastMetrics => {
      return analyzeContrast(original, simulated, threshold);
    },
    []
  );

  return { analyze };
}
