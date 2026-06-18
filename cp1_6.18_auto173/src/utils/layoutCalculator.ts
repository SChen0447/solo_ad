import { TemplateType, Size, Position } from '../types/design';

export const TEMPLATE_SIZES: Record<TemplateType, Size & { unit: string }> = {
  'business-card-front': { width: 360, height: 216, unit: 'px' },
  'business-card-back': { width: 360, height: 216, unit: 'px' },
  'letterhead': { width: 595, height: 842, unit: 'px' },
  'twitter-cover': { width: 1500, height: 500, unit: 'px' },
  'instagram-cover': { width: 1080, height: 1080, unit: 'px' },
  'linkedin-cover': { width: 1584, height: 396, unit: 'px' }
};

export const getTemplateSize = (templateType: TemplateType): Size => {
  const size = TEMPLATE_SIZES[templateType];
  return { width: size.width, height: size.height };
};

export const getPreviewScale = (templateType: TemplateType, containerWidth: number, containerHeight: number): number => {
  const { width, height } = getTemplateSize(templateType);
  const scaleX = (containerWidth - 80) / width;
  const scaleY = (containerHeight - 80) / height;
  return Math.min(scaleX, scaleY, 1);
};

export const clampPosition = (
  position: Position,
  elementWidth: number,
  elementHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 10
): Position => {
  return {
    x: Math.max(padding, Math.min(canvasWidth - elementWidth - padding, position.x)),
    y: Math.max(padding, Math.min(canvasHeight - elementHeight - padding, position.y))
  };
};

export const calculateTextSize = (text: string, fontSize: number, fontWeight: string = 'normal'): Size => {
  const avgCharWidth = fontSize * 0.55;
  const lineHeight = fontSize * 1.2;
  const lines = text.split('\n').length;
  return {
    width: Math.max(...text.split('\n').map(line => line.length * avgCharWidth)),
    height: lines * lineHeight
  };
};

export const calculateLogoSize = (originalWidth: number, originalHeight: number, scale: number, maxSize: number = 100): Size => {
  const aspectRatio = originalWidth / originalHeight;
  let width = maxSize * scale;
  let height = width / aspectRatio;
  
  if (height > maxSize * scale) {
    height = maxSize * scale;
    width = height * aspectRatio;
  }
  
  return { width, height };
};

export const getAlignmentLines = (
  elementPos: Position,
  elementSize: Size,
  otherElements: Array<{ pos: Position; size: Size }>,
  canvasSize: Size,
  threshold: number = 5
): { horizontal: number[]; vertical: number[] } => {
  const horizontal: number[] = [];
  const vertical: number[] = [];

  const centerX = elementPos.x + elementSize.width / 2;
  const centerY = elementPos.y + elementSize.height / 2;
  const rightX = elementPos.x + elementSize.width;
  const bottomY = elementPos.y + elementSize.height;

  const canvasCenterX = canvasSize.width / 2;
  const canvasCenterY = canvasSize.height / 2;

  if (Math.abs(centerX - canvasCenterX) < threshold) {
    vertical.push(canvasCenterX);
  }
  if (Math.abs(centerY - canvasCenterY) < threshold) {
    horizontal.push(canvasCenterY);
  }

  if (Math.abs(elementPos.x - 10) < threshold) {
    vertical.push(10);
  }
  if (Math.abs(rightX - (canvasSize.width - 10)) < threshold) {
    vertical.push(canvasSize.width - 10);
  }
  if (Math.abs(elementPos.y - 10) < threshold) {
    horizontal.push(10);
  }
  if (Math.abs(bottomY - (canvasSize.height - 10)) < threshold) {
    horizontal.push(canvasSize.height - 10);
  }

  otherElements.forEach(({ pos, size }) => {
    const otherCenterX = pos.x + size.width / 2;
    const otherCenterY = pos.y + size.height / 2;
    const otherRightX = pos.x + size.width;
    const otherBottomY = pos.y + size.height;

    if (Math.abs(centerX - otherCenterX) < threshold) {
      vertical.push(otherCenterX);
    }
    if (Math.abs(elementPos.x - pos.x) < threshold) {
      vertical.push(pos.x);
    }
    if (Math.abs(rightX - otherRightX) < threshold) {
      vertical.push(otherRightX);
    }

    if (Math.abs(centerY - otherCenterY) < threshold) {
      horizontal.push(otherCenterY);
    }
    if (Math.abs(elementPos.y - pos.y) < threshold) {
      horizontal.push(pos.y);
    }
    if (Math.abs(bottomY - otherBottomY) < threshold) {
      horizontal.push(otherBottomY);
    }
  });

  return { horizontal: [...new Set(horizontal)], vertical: [...new Set(vertical)] };
};
