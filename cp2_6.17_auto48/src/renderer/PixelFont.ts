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
  'l': [0,6,2,2,2,2,2,2,2],
  'm': [0,0,0,46,68,68,68,68,68],
  'n': [0,0,0,62,34,34,34,34,34],
  'o': [0,0,0,28,34,34,34,34,28],
  'p': [0,0,0,62,34,34,34,62,2,2,2],
  'q': [0,0,0,60,36,36,36,60,32,32,32],
  'r': [0,0,0,62,4,4,4,4,4],
  's': [0,0,0,30,32,28,4,56,48],
  't': [0,4,4,31,4,4,4,4,8],
  'u': [0,0,0,34,34,34,34,34,60],
  'v': [0,0,0,34,34,34,34,20,8],
  'w': [0,0,0,68,68,84,84,40,16],
  'x': [0,0,0,34,20,8,8,20,34],
  'y': [0,0,0,34,34,34,34,60,32,32,56],
  'z': [0,0,0,62,32,16,8,4,62],
  '0': [0,60,66,74,82,98,66,66,60],
  '1': [0,24,8,8,8,8,8,8,62],
  '2': [0,60,66,64,32,16,8,4,126],
  '3': [0,124,64,32,48,32,64,66,60],
  '4': [0,32,48,40,36,34,126,32,32],
  '5': [0,126,2,2,62,64,64,66,60],
  '6': [0,60,66,2,2,62,66,66,60],
  '7': [0,126,64,32,16,8,8,8,8],
  '8': [0,60,66,66,60,66,66,66,60],
  '9': [0,60,66,66,66,60,64,66,60],
  ':': [0,8,8,0,8,8,0,0,0],
  ';': [0,8,8,0,8,8,8,8,16],
  '.': [0,0,0,0,0,0,0,24,24],
  ',': [0,0,0,0,0,0,0,24,24,16,16],
  '!': [0,8,8,8,8,8,0,0,8],
  '?': [0,120,68,64,32,16,0,0,16],
  '-': [0,0,0,0,120,0,0,0,0],
  '_': [0,0,0,0,0,0,0,0,126],
  ' ': [0,0,0,0,0,0,0,0,0],
  "'": [0,8,8,0,0,0,0,0,0],
  '"': [0,20,20,0,0,0,0,0,0],
  '(': [0,16,8,4,4,4,4,8,16],
  ')': [0,4,8,16,16,16,16,8,4],
  '[': [0,28,4,4,4,4,4,4,28],
  ']': [0,28,16,16,16,16,16,16,28],
  '/': [0,64,64,32,32,16,16,8,8],
  '\\':[0,2,2,4,4,8,8,16,16],
  '+': [0,0,0,8,8,127,8,8,0],
  '=': [0,0,0,120,0,120,0,0,0],
  '<': [0,8,16,32,64,32,16,8,0],
  '>': [0,8,4,2,1,2,4,8,0],
  '*': [0,0,0,68,40,16,40,68,0],
  '#': [0,20,20,127,20,127,20,20,0],
  '&': [0,24,36,66,58,36,66,60,0],
  '@': [0,60,66,91,81,91,66,60,0],
};

const getCharPattern = (char: string): number[] => {
  return CHAR_PATTERNS[char] || CHAR_PATTERNS[' '];
};

const getPixel = (pattern: number[], row: number, col: number): boolean => {
  if (row < 0 || row >= pattern.length) return false;
  const rowData = pattern[row];
  return ((rowData >> (8 - col)) & 1) === 1;
};

export const drawPixelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: 12 | 16 = 12,
  color: string = '#ffffff'
): { width: number; height: number } => {
  const font = size === 12 ? FONT_12 : FONT_16;
  const pixelSize = font.scale;
  const charWidth = font.width * pixelSize;
  const charHeight = font.height * pixelSize;
  const charSpacing = pixelSize;

  ctx.save();
  ctx.fillStyle = color;
  ctx.imageSmoothingEnabled = false;

  let currentX = Math.floor(x);
  const startY = Math.floor(y);

  for (const char of text) {
    const pattern = getCharPattern(char);
    for (let row = 0; row < font.height; row++) {
      for (let col = 0; col < font.width; col++) {
        if (getPixel(pattern, row, col)) {
          ctx.fillRect(
            currentX + col * pixelSize,
            startY + row * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
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
  const font = size === 12 ? FONT_12 : FONT_16;
  const pixelSize = font.scale;
  const charWidth = font.width * pixelSize;
  const charHeight = font.height * pixelSize;
  const charSpacing = pixelSize;

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
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const measured = measurePixelText(testLine, size);
    
    if (measured.width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      
      const wordWidth = measurePixelText(word, size).width;
      if (wordWidth > maxWidth) {
        let remaining = word;
        while (remaining.length > 0) {
          let chunkLength = 1;
          while (
            chunkLength < remaining.length &&
            measurePixelText(remaining.slice(0, chunkLength + 1), size).width <= maxWidth
          ) {
            chunkLength++;
          }
          lines.push(remaining.slice(0, chunkLength));
          remaining = remaining.slice(chunkLength);
        }
        currentLine = '';
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};
