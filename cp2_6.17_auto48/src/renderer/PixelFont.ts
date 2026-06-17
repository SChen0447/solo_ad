const FONT_12 = {
  width: 6,
  height: 7,
  scale: 2,
};

const FONT_16 = {
  width: 8,
  height: 9,
  scale: 2,
};

const CHAR_PATTERNS: Record<string, number[]> = {
  'A': [0,31,40,68,68,127,68,68,68],
  'B': [0,126,36,36,62,36,36,36,126],
  'C': [0,62,66,2,2,2,2,66,62],
  'D': [0,126,34,34,34,34,34,34,126],
  'E': [0,127,2,2,31,2,2,2,127],
  'F': [0,127,2,2,31,2,2,2,2],
  'G': [0,62,66,2,2,114,66,66,60],
  'H': [0,68,68,68,127,68,68,68,68],
  'I': [0,124,8,8,8,8,8,8,124],
  'J': [0,96,64,64,64,64,68,68,56],
  'K': [0,68,72,120,112,120,72,68,68],
  'L': [0,2,2,2,2,2,2,2,127],
  'M': [0,68,108,84,84,68,68,68,68],
  'N': [0,68,100,84,84,76,72,68,68],
  'O': [0,62,68,68,68,68,68,68,62],
  'P': [0,126,36,36,36,62,2,2,2],
  'Q': [0,62,68,68,68,84,76,68,62],
  'R': [0,126,36,36,36,62,72,68,68],
  'S': [0,62,66,2,4,8,32,66,62],
  'T': [0,127,8,8,8,8,8,8,8],
  'U': [0,68,68,68,68,68,68,68,62],
  'V': [0,68,68,68,68,68,68,40,16],
  'W': [0,68,68,68,68,84,84,84,40],
  'X': [0,68,68,40,16,16,40,68,68],
  'Y': [0,68,68,68,40,16,16,16,16],
  'Z': [0,127,64,64,32,16,8,4,127],
  'a': [0,0,0,24,4,28,36,36,60],
  'b': [0,2,2,2,62,34,34,34,62],
  'c': [0,0,0,28,34,2,2,34,28],
  'd': [0,32,32,32,60,36,36,36,60],
  'e': [0,0,0,28,34,126,2,34,28],
  'f': [0,24,4,4,31,4,4,4,4],
  'g': [0,0,0,60,36,36,36,60,32,32,56],
  'h': [0,2,2,2,62,34,34,34,34],
  'i': [0,8,0,8,8,8,8,8,8],
  'j': [0,16,0,16,16,16,16,16,16,16,8],
  'k': [0,2,2,2,18,28,24,28,18],
  'l': [0,6,2,2,2,2,2,2,126],
  'm': [0,0,0,60,84,84,84,84,84],
  'n': [0,0,0,62,34,34,34,34,34],
  'o': [0,0,0,28,34,34,34,34,28],
  'p': [0,0,0,62,34,34,34,62,2,2,2],
  'q': [0,0,0,28,34,34,34,28,32,32,32],
  'r': [0,0,0,62,8,4,4,4,4],
  's': [0,0,0,30,32,28,4,56,24],
  't': [0,4,4,31,4,4,4,36,24],
  'u': [0,0,0,34,34,34,34,34,60],
  'v': [0,0,0,34,34,34,34,20,8],
  'w': [0,0,0,34,34,34,34,42,28],
  'x': [0,0,0,34,20,8,20,34,34],
  'y': [0,0,0,34,34,34,34,60,32,32,24],
  'z': [0,0,0,62,32,16,8,4,62],
  '0': [0,62,68,76,68,68,68,68,62],
  '1': [0,24,8,8,8,8,8,8,124],
  '2': [0,62,64,64,32,16,8,4,127],
  '3': [0,62,64,64,32,64,64,64,62],
  '4': [0,32,34,34,34,34,127,32,32],
  '5': [0,127,2,2,63,64,64,64,62],
  '6': [0,60,4,2,2,62,34,34,60],
  '7': [0,127,64,64,32,16,8,4,4],
  '8': [0,62,34,34,62,34,34,34,62],
  '9': [0,60,34,34,34,60,64,64,32],
  '!': [0,8,8,8,8,8,0,8,8],
  '?': [0,60,66,32,16,8,0,8,8],
  '.': [0,0,0,0,0,0,0,12,12],
  ',': [0,0,0,0,0,0,12,12,8],
  ':': [0,0,8,8,0,8,8,0,0],
  ';': [0,0,8,8,0,8,8,8,16],
  '-': [0,0,0,0,124,0,0,0,0],
  '_': [0,0,0,0,0,0,0,0,127],
  '=': [0,0,0,124,0,124,0,0,0],
  '+': [0,0,8,8,62,8,8,0,0],
  '*': [0,0,36,24,126,24,36,0,0],
  '/': [0,64,32,16,8,4,2,1,0],
  '\\': [0,1,2,4,8,16,32,64,0],
  '(': [0,8,4,2,2,2,2,4,8],
  ')': [0,4,8,16,16,16,16,8,4],
  '[': [0,14,2,2,2,2,2,2,14],
  ']': [0,14,16,16,16,16,16,16,14],
  '{': [0,8,4,2,2,3,2,4,8],
  '}': [0,4,8,16,16,24,16,8,4],
  '<': [0,8,4,2,2,4,8,16,32],
  '>': [0,32,16,8,4,2,4,8,16],
  '"': [0,68,68,68,0,0,0,0,0],
  "'": [0,8,8,0,0,0,0,0,0],
  '`': [0,4,8,0,0,0,0,0,0],
  '~': [0,0,0,68,40,16,0,0,0],
  '^': [0,0,8,20,34,0,0,0,0],
  '|': [0,2,2,2,2,2,2,2,2],
  '#': [0,0,20,20,127,20,20,0,0],
  '$': [0,24,42,42,28,16,42,42,12],
  '%': [0,66,66,32,16,8,66,66,0],
  '&': [0,28,34,34,28,42,34,34,52],
  '@': [0,0,60,66,93,101,85,70,60],
  ' ': [0,0,0,0,0,0,0,0,0],
};

interface CachedChar {
  canvas: HTMLCanvasElement;
}

interface FontConfig {
  width: number;
  height: number;
  scale: number;
}

const fontCache = new Map<string, Map<string, CachedChar>>();

const getFontCacheKey = (size: 12 | 16, color: string): string => {
  return `${size}-${color}`;
};

const getFontConfig = (size: 12 | 16): FontConfig => {
  return size === 12 ? FONT_12 : FONT_16;
};

const getCharPattern = (char: string): number[] => {
  const pattern = CHAR_PATTERNS[char];
  if (pattern) return pattern;
  const upper = char.toUpperCase();
  if (upper !== char && CHAR_PATTERNS[upper]) return CHAR_PATTERNS[upper];
  return CHAR_PATTERNS['?'] || new Array(9).fill(0);
};

const getPixel = (pattern: number[], row: number, col: number): boolean => {
  if (row >= pattern.length) return false;
  const rowData = pattern[row];
  return ((rowData >> (8 - col)) & 1) === 1;
};

const createCharCanvas = (char: string, config: FontConfig, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = config.width * config.scale;
  canvas.height = config.height * config.scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = color;
  for (let row = 0; row < config.height; row++) {
    for (let col = 0; col < config.width; col++) {
      if (getPixel(getCharPattern(char), row, col)) {
        ctx.fillRect(
          col * config.scale,
          row * config.scale,
          config.scale,
          config.scale
        );
      }
    }
  }

  return canvas;
};

const getCachedChar = (char: string, size: 12 | 16, color: string): CachedChar => {
  const cacheKey = getFontCacheKey(size, color);
  let colorCache = fontCache.get(cacheKey);
  if (!colorCache) {
    colorCache = new Map<string, CachedChar>();
    fontCache.set(cacheKey, colorCache);
  }

  let cached = colorCache.get(char);
  if (!cached) {
    const config = getFontConfig(size);
    const canvas = createCharCanvas(char, config, color);
    cached = { canvas };
    colorCache.set(char, cached);
  }

  return cached;
};

export const drawPixelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: 12 | 16 = 12,
  color: string = '#ffffff'
): { width: number; height: number } => {
  const config = getFontConfig(size);
  const charWidth = config.width * config.scale;
  const charHeight = config.height * config.scale;
  const charSpacing = config.scale;

  const startX = Math.floor(x);
  const startY = Math.floor(y);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  let currentX = startX;
  for (const char of text) {
    const cached = getCachedChar(char, size, color);
    ctx.drawImage(cached.canvas, currentX, startY);
    currentX += charWidth + charSpacing;
  }

  ctx.restore();

  return {
    width: text.length * (charWidth + charSpacing) - charSpacing,
    height: charHeight,
  };
};

export const measurePixelText = (
  text: string,
  size: 12 | 16 = 12
): { width: number; height: number } => {
  const config = getFontConfig(size);
  const charWidth = config.width * config.scale;
  const charHeight = config.height * config.scale;
  const charSpacing = config.scale;

  return {
    width: text.length * (charWidth + charSpacing) - charSpacing,
    height: charHeight,
  };
};

export const wrapPixelText = (
  text: string,
  maxWidth: number,
  size: 12 | 16 = 12
): string[] => {
  const config = getFontConfig(size);
  const charWidth = config.width * config.scale;
  const charSpacing = config.scale;
  const totalCharWidth = charWidth + charSpacing;

  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';
  let currentWidth = 0;

  for (const word of words) {
    const wordWidth = word.length * totalCharWidth;
    const spaceWidth = currentLine ? totalCharWidth : 0;

    if (currentWidth + spaceWidth + wordWidth <= maxWidth || currentLine === '') {
      if (currentLine) {
        currentLine += ' ' + word;
        currentWidth += spaceWidth + wordWidth;
      } else {
        currentLine = word;
        currentWidth = wordWidth;
      }
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
      currentWidth = wordWidth;
    }

    if (currentWidth > maxWidth && word.length > 1) {
      let remaining = word;
      while (remaining.length > 0) {
        const charsFit = Math.floor((maxWidth - (currentLine ? 0 : 0)) / totalCharWidth);
        if (charsFit <= 0) break;
        const chunk = remaining.substring(0, charsFit);
        lines.push(chunk);
        remaining = remaining.substring(charsFit);
      }
      currentLine = '';
      currentWidth = 0;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
};
