export interface ProcessedImageData {
  tracingPaperCanvas: HTMLCanvasElement;
  edgeCanvas: HTMLCanvasElement;
  edgeImageData: ImageData;
  width: number;
  height: number;
}

export interface CannyOptions {
  lowThreshold: number;
  highThreshold: number;
  gaussianKernelSize: number;
}

export interface TracingPaperOptions {
  brightness: number;
  contrast: number;
  textureColor: string;
  textureOpacity: number;
}

const DEFAULT_CANNY_OPTIONS: CannyOptions = {
  lowThreshold: 50,
  highThreshold: 150,
  gaussianKernelSize: 5,
};

const DEFAULT_TRACING_OPTIONS: TracingPaperOptions = {
  brightness: 80,
  contrast: 40,
  textureColor: '#F0F0F0',
  textureOpacity: 0.3,
};

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getImageDataFromImage(img: HTMLImageElement): ImageData {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  const grayData = new Uint8ClampedArray(data.length);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grayData[i] = gray;
    grayData[i + 1] = gray;
    grayData[i + 2] = gray;
    grayData[i + 3] = data[i + 3];
  }
  
  return new ImageData(grayData, imageData.width, imageData.height);
}

function gaussianBlur(imageData: ImageData, kernelSize: number): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);
  
  const sigma = kernelSize / 5;
  const kernel: number[] = [];
  let sum = 0;
  const half = Math.floor(kernelSize / 2);
  
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma)) / (2 * Math.PI * sigma * sigma);
      kernel.push(value);
      sum += value;
    }
  }
  
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0, a = 0;
      let ki = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const pidx = (py * width + px) * 4;
          
          r += data[pidx] * kernel[ki];
          g += data[pidx + 1] * kernel[ki];
          b += data[pidx + 2] * kernel[ki];
          a += data[pidx + 3] * kernel[ki];
          ki++;
        }
      }
      
      output[idx] = r;
      output[idx + 1] = g;
      output[idx + 2] = b;
      output[idx + 3] = a;
    }
  }
  
  return new ImageData(output, width, height);
}

function computeGradient(imageData: ImageData): { magnitude: Float32Array; direction: Float32Array; width: number; height: number } {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);
  
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      let ki = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx;
          const py = y + ky;
          const pidx = (py * width + px) * 4;
          const gray = data[pidx];
          
          gx += gray * sobelX[ki];
          gy += gray * sobelY[ki];
          ki++;
        }
      }
      
      const mag = Math.sqrt(gx * gx + gy * gy);
      const idx = y * width + x;
      magnitude[idx] = mag;
      direction[idx] = Math.atan2(gy, gx);
    }
  }
  
  return { magnitude, direction, width, height };
}

function nonMaximumSuppression(magnitude: Float32Array, direction: Float32Array, width: number, height: number): Float32Array {
  const output = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx];
      let angle = direction[idx] * 180 / Math.PI;
      if (angle < 0) angle += 180;
      
      let q = 255, r = 255;
      
      if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
        q = magnitude[idx + 1];
        r = magnitude[idx - 1];
      } else if (angle >= 22.5 && angle < 67.5) {
        q = magnitude[idx + width - 1];
        r = magnitude[idx - width + 1];
      } else if (angle >= 67.5 && angle < 112.5) {
        q = magnitude[idx + width];
        r = magnitude[idx - width];
      } else if (angle >= 112.5 && angle < 157.5) {
        q = magnitude[idx - width - 1];
        r = magnitude[idx + width + 1];
      }
      
      if (mag >= q && mag >= r) {
        output[idx] = mag;
      } else {
        output[idx] = 0;
      }
    }
  }
  
  return output;
}

function doubleThreshold(image: Float32Array, width: number, height: number, low: number, high: number): Float32Array {
  const output = new Float32Array(width * height);
  const STRONG = 255;
  const WEAK = 25;
  
  for (let i = 0; i < image.length; i++) {
    const mag = image[i];
    if (mag >= high) {
      output[i] = STRONG;
    } else if (mag >= low) {
      output[i] = WEAK;
    } else {
      output[i] = 0;
    }
  }
  
  return output;
}

function hysteresis(image: Float32Array, width: number, height: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height);
  const STRONG = 255;
  const WEAK = 25;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (image[idx] === WEAK) {
        let hasStrong = false;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (image[ny * width + nx] === STRONG) {
                hasStrong = true;
                break;
              }
            }
          }
          if (hasStrong) break;
        }
        
        output[idx] = hasStrong ? 255 : 0;
      } else {
        output[idx] = image[idx];
      }
    }
  }
  
  return output;
}

function cannyEdgeDetection(imageData: ImageData, options: CannyOptions): ImageData {
  const grayData = toGrayscale(imageData);
  const blurred = gaussianBlur(grayData, options.gaussianKernelSize);
  const { magnitude, direction, width, height } = computeGradient(blurred);
  const nms = nonMaximumSuppression(magnitude, direction, width, height);
  const thresholded = doubleThreshold(nms, width, height, options.lowThreshold, options.highThreshold);
  const edges = hysteresis(thresholded, width, height);
  
  const outputData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < edges.length; i++) {
    const idx = i * 4;
    outputData[idx] = edges[i];
    outputData[idx + 1] = edges[i];
    outputData[idx + 2] = edges[i];
    outputData[idx + 3] = edges[i] > 0 ? 255 : 0;
  }
  
  return new ImageData(outputData, width, height);
}

function createTracingPaper(imageData: ImageData, options: TracingPaperOptions): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);
  
  const brightnessFactor = (100 + options.brightness) / 100;
  const contrastFactor = (options.contrast + 100) / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    r = Math.min(255, r * brightnessFactor);
    g = Math.min(255, g * brightnessFactor);
    b = Math.min(255, b * brightnessFactor);
    
    r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
    
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  
  const textureColor = hexToRgb(options.textureColor);
  if (textureColor) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const noise = (Math.sin(x * 0.3) * Math.cos(y * 0.3) + 1) * 0.5 * 20;
        
        data[idx] = data[idx] * (1 - options.textureOpacity) + (textureColor.r + noise) * options.textureOpacity;
        data[idx + 1] = data[idx + 1] * (1 - options.textureOpacity) + (textureColor.g + noise) * options.textureOpacity;
        data[idx + 2] = data[idx + 2] * (1 - options.textureOpacity) + (textureColor.b + noise) * options.textureOpacity;
      }
    }
  }
  
  return new ImageData(data, width, height);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function processImage(file: File, onProgress?: (progress: number) => Promise<void>): Promise<ProcessedImageData> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('图片大小不能超过5MB'));
      return;
    }
    
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      reject(new Error('只支持JPG和PNG格式的图片'));
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        if (onProgress) {
          for (let i = 0; i <= 30; i += 5) {
            await new Promise(r => setTimeout(r, 20));
            await onProgress(i);
          }
        }
        
        const imageData = getImageDataFromImage(img);
        const width = img.width;
        const height = img.height;
        
        if (onProgress) {
          for (let i = 35; i <= 70; i += 5) {
            await new Promise(r => setTimeout(r, 10));
            await onProgress(i);
          }
        }
        
        const edgeImageData = cannyEdgeDetection(imageData, DEFAULT_CANNY_OPTIONS);
        
        const edgeCanvas = createCanvas(width, height);
        const edgeCtx = edgeCanvas.getContext('2d')!;
        edgeCtx.fillStyle = 'transparent';
        edgeCtx.clearRect(0, 0, width, height);
        edgeCtx.putImageData(edgeImageData, 0, 0);
        
        const edgeTmpCanvas = createCanvas(width, height);
        const edgeTmpCtx = edgeTmpCanvas.getContext('2d')!;
        edgeTmpCtx.clearRect(0, 0, width, height);
        edgeTmpCtx.drawImage(edgeCanvas, 0, 0);
        edgeTmpCtx.globalCompositeOperation = 'source-in';
        edgeTmpCtx.fillStyle = '#333333';
        edgeTmpCtx.fillRect(0, 0, width, height);
        edgeCtx.clearRect(0, 0, width, height);
        edgeCtx.lineWidth = 2;
        edgeCtx.drawImage(edgeTmpCanvas, 0, 0);
        
        if (onProgress) {
          for (let i = 75; i <= 95; i += 5) {
            await new Promise(r => setTimeout(r, 10));
            await onProgress(i);
          }
        }
        
        const tracingPaperImageData = createTracingPaper(imageData, DEFAULT_TRACING_OPTIONS);
        const tracingPaperCanvas = createCanvas(width, height);
        const tpCtx = tracingPaperCanvas.getContext('2d')!;
        tpCtx.putImageData(tracingPaperImageData, 0, 0);
        
        if (onProgress) {
          await onProgress(100);
        }
        
        URL.revokeObjectURL(url);
        resolve({
          tracingPaperCanvas,
          edgeCanvas,
          edgeImageData,
          width,
          height
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
}

export function calculateStrokeAccuracy(
  edgeImageData: ImageData,
  strokePoints: { x: number; y: number }[],
  strokeWidth: number,
  canvasWidth: number,
  canvasHeight: number
): { accuracy: number; coveredPixels: number; totalPixels: number } {
  if (strokePoints.length < 2) {
    return { accuracy: 0, coveredPixels: 0, totalPixels: 0 };
  }
  
  const strokeCanvas = createCanvas(canvasWidth, canvasHeight);
  const strokeCtx = strokeCanvas.getContext('2d')!;
  strokeCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  strokeCtx.strokeStyle = '#fff';
  strokeCtx.lineWidth = strokeWidth;
  strokeCtx.lineCap = 'round';
  strokeCtx.lineJoin = 'round';
  strokeCtx.beginPath();
  strokeCtx.moveTo(strokePoints[0].x, strokePoints[0].y);
  
  for (let i = 1; i < strokePoints.length; i++) {
    strokeCtx.lineTo(strokePoints[i].x, strokePoints[i].y);
  }
  strokeCtx.stroke();
  
  const strokeData = strokeCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
  const edgeData = edgeImageData.data;
  
  let strokePixels = 0;
  let overlapPixels = 0;
  
  const searchRadius = Math.max(Math.floor(strokeWidth / 2) + 2, 3);
  
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const idx = (y * canvasWidth + x) * 4;
      
      if (strokeData[idx + 3] > 10) {
        strokePixels++;
        
        let foundEdge = false;
        for (let dy = -searchRadius; dy <= searchRadius && !foundEdge; dy++) {
          for (let dx = -searchRadius; dx <= searchRadius && !foundEdge; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
              const eidx = (ny * canvasWidth + nx) * 4;
              if (edgeData[eidx + 3] > 10) {
                foundEdge = true;
              }
            }
          }
        }
        
        if (foundEdge) {
          overlapPixels++;
        }
      }
    }
  }
  
  const accuracy = strokePixels > 0 ? overlapPixels / strokePixels : 0;
  
  return {
    accuracy,
    coveredPixels: overlapPixels,
    totalPixels: strokePixels
  };
}

export function getStrokeColorByAccuracy(accuracy: number): string {
  if (accuracy >= 0.8) {
    return '#10B981';
  } else if (accuracy >= 0.5) {
    return '#F59E0B';
  } else {
    return '#EF4444';
  }
}
