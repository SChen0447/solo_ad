export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

export const lightenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = Math.round(2.55 * percent);
  return rgbToHex(
    Math.min(255, rgb.r + amount),
    Math.min(255, rgb.g + amount),
    Math.min(255, rgb.b + amount)
  );
};

export const darkenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = Math.round(2.55 * percent);
  return rgbToHex(
    Math.max(0, rgb.r - amount),
    Math.max(0, rgb.g - amount),
    Math.max(0, rgb.b - amount)
  );
};

export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
};

export const extractColorsFromImage = (imgElement: HTMLImageElement, colorCount: number = 5): Promise<string[]> => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(['#4F46E5', '#818CF8', '#3730A3']);
        return;
      }

      const maxSize = 100;
      const scale = Math.min(maxSize / imgElement.width, maxSize / imgElement.height, 1);
      canvas.width = imgElement.width * scale;
      canvas.height = imgElement.height * scale;

      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      const colorMap = new Map<string, number>();

      for (let i = 0; i < pixels.length; i += 4) {
        const r = Math.round(pixels[i] / 10) * 10;
        const g = Math.round(pixels[i + 1] / 10) * 10;
        const b = Math.round(pixels[i + 2] / 10) * 10;
        const a = pixels[i + 3];

        if (a < 128) continue;

        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount * 3);

      const uniqueColors: string[] = [];
      const minDistance = 50;

      for (const [colorStr] of sortedColors) {
        if (uniqueColors.length >= colorCount) break;

        const [r, g, b] = colorStr.split(',').map(Number);
        const hex = rgbToHex(r, g, b);

        const isTooSimilar = uniqueColors.some((existing) => {
          const existingRgb = hexToRgb(existing);
          if (!existingRgb) return false;
          const distance = Math.sqrt(
            Math.pow(r - existingRgb.r, 2) +
            Math.pow(g - existingRgb.g, 2) +
            Math.pow(b - existingRgb.b, 2)
          );
          return distance < minDistance;
        });

        if (!isTooSimilar) {
          uniqueColors.push(hex);
        }
      }

      if (uniqueColors.length < 3) {
        uniqueColors.push('#4F46E5', '#818CF8', '#3730A3');
      }

      resolve(uniqueColors.slice(0, colorCount));
    } catch (error) {
      console.error('Error extracting colors:', error);
      resolve(['#4F46E5', '#818CF8', '#3730A3']);
    }
  });
};
