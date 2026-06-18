import { useCallback } from 'react';
import { applyColorBlindMatrix, type ColorBlindType } from '@/utils/colorBlindMatrices';

export function useColorBlind() {
  const simulate = useCallback(
    (imageData: ImageData, type: ColorBlindType): ImageData => {
      const { width, height, data } = imageData;
      const output = new ImageData(width, height);
      const src = data;
      const dst = output.data;

      for (let i = 0; i < src.length; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const [nr, ng, nb] = applyColorBlindMatrix(r, g, b, type);
        dst[i] = nr;
        dst[i + 1] = ng;
        dst[i + 2] = nb;
        dst[i + 3] = src[i + 3];
      }

      return output;
    },
    []
  );

  return { simulate };
}
