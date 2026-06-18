import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { useDesignStore } from '../store/designStore';
import { TemplateType, TextElement, LogoElement, Position } from '../types/design';
import { getTemplateSize, clampPosition, getAlignmentLines } from '../utils/layoutCalculator';
import { getContrastColor } from '../utils/colorUtils';

export interface TemplateCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
  toDataURL: (type?: string, quality?: number) => string;
}

interface TemplateCanvasProps {
  templateType: TemplateType;
  interactive?: boolean;
  onElementDrag?: (elementId: string, position: Position) => void;
}

interface DragState {
  isDragging: boolean;
  elementId: string;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
}

const TemplateCanvas = forwardRef<TemplateCanvasRef, TemplateCanvasProps>(
  ({ templateType, interactive = true, onElementDrag }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [alignmentLines, setAlignmentLines] = useState<{ horizontal: number[]; vertical: number[] }>({ horizontal: [], vertical: [] });
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);
    const logoImageRef = useRef<HTMLImageElement | null>(null);

    const {
      primaryColor,
      secondaryColor,
      businessCard,
      letterhead,
      socialCover,
      updateBusinessCardFrontElement,
      updateBusinessCardBackElement,
      updateLetterheadElement,
      updateSocialCoverElement
    } = useDesignStore();

    const templateSize = getTemplateSize(templateType);
    const scale = 1;

    const getElements = useCallback(() => {
      const elements: Array<{ id: string; type: 'text' | 'logo'; data: TextElement | LogoElement; size: { width: number; height: number } }> = [];

      switch (templateType) {
        case 'business-card-front':
          if (businessCard.front.logo.src) {
            const logoSize = { width: 60, height: 40 };
            elements.push({ id: 'logo', type: 'logo', data: businessCard.front.logo, size: logoSize });
          }
          (['name', 'title', 'phone', 'email', 'website'] as const).forEach((id) => {
            const el = businessCard.front[id];
            const textWidth = el.content.length * el.fontSize * 0.55;
            const textHeight = el.fontSize * 1.2;
            elements.push({ id, type: 'text', data: el, size: { width: textWidth, height: textHeight } });
          });
          break;

        case 'business-card-back':
          (['slogan'] as const).forEach((id) => {
            const el = businessCard.back[id];
            const textWidth = el.content.length * el.fontSize * 0.6;
            const textHeight = el.fontSize * 1.2;
            elements.push({ id, type: 'text', data: el, size: { width: textWidth, height: textHeight } });
          });
          break;

        case 'letterhead':
          if (letterhead.logo.src) {
            const logoSize = { width: 80, height: 50 };
            elements.push({ id: 'logo', type: 'logo', data: letterhead.logo, size: logoSize });
          }
          (['companyName', 'address', 'contact'] as const).forEach((id) => {
            const el = letterhead[id];
            const textWidth = el.content.length * el.fontSize * 0.55;
            const textHeight = el.fontSize * 1.2;
            elements.push({ id, type: 'text', data: el, size: { width: textWidth, height: textHeight } });
          });
          break;

        case 'twitter-cover':
        case 'instagram-cover':
        case 'linkedin-cover':
          if (socialCover.logo.src) {
            const logoSize = { width: 100, height: 80 };
            elements.push({ id: 'logo', type: 'logo', data: socialCover.logo, size: logoSize });
          }
          (['title', 'subtitle'] as const).forEach((id) => {
            const el = socialCover[id];
            const textWidth = el.content.length * el.fontSize * 0.55;
            const textHeight = el.fontSize * 1.2;
            elements.push({ id, type: 'text', data: el, size: { width: textWidth, height: textHeight } });
          });
          break;
      }

      return elements;
    }, [templateType, businessCard, letterhead, socialCover]);

    const drawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = templateSize;
      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);

      drawBackground(ctx, templateType, primaryColor, secondaryColor, width, height);
      drawElements(ctx, templateType, businessCard, letterhead, socialCover, logoImageRef.current, primaryColor);

      if (interactive && alignmentLines) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        alignmentLines.horizontal.forEach((y) => {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        });

        alignmentLines.vertical.forEach((x) => {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        });

        ctx.setLineDash([]);
      }

      if (interactive && hoveredElement && !dragState?.isDragging) {
        const elements = getElements();
        const el = elements.find((e) => e.id === hoveredElement);
        if (el) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(el.data.position.x - 4, el.data.position.y - 4, el.size.width + 8, el.size.height + 8);
          ctx.setLineDash([]);
        }
      }
    }, [templateType, primaryColor, secondaryColor, businessCard, letterhead, socialCover, interactive, alignmentLines, hoveredElement, dragState, getElements]);

    useEffect(() => {
      const logoSrc = useDesignStore.getState().logoImage;
      if (logoSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          logoImageRef.current = img;
          drawCanvas();
        };
        img.src = logoSrc;
      } else {
        logoImageRef.current = null;
        drawCanvas();
      }
    }, [useDesignStore.getState().logoImage, drawCanvas]);

    useEffect(() => {
      drawCanvas();
    }, [drawCanvas]);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      toDataURL: (type = 'image/png', quality = 1.0) => {
        return canvasRef.current?.toDataURL(type, quality) || '';
      }
    }));

    const getCanvasCoords = (clientX: number, clientY: number): Position => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * templateSize.width,
        y: ((clientY - rect.top) / rect.height) * templateSize.height
      };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;

      const pos = getCanvasCoords(e.clientX, e.clientY);
      const elements = getElements().reverse();

      for (const el of elements) {
        const { x, y } = el.data.position;
        const { width, height } = el.size;

        if (pos.x >= x - 5 && pos.x <= x + width + 5 && pos.y >= y - 5 && pos.y <= y + height + 5) {
          setDragState({
            isDragging: true,
            elementId: el.id,
            startX: e.clientX,
            startY: e.clientY,
            elementStartX: x,
            elementStartY: y
          });
          break;
        }
      }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;

      const pos = getCanvasCoords(e.clientX, e.clientY);

      if (dragState?.isDragging) {
        const deltaX = ((e.clientX - dragState.startX) / canvasRef.current!.getBoundingClientRect().width) * templateSize.width;
        const deltaY = ((e.clientY - dragState.startY) / canvasRef.current!.getBoundingClientRect().height) * templateSize.height;

        const elements = getElements();
        const currentEl = elements.find((el) => el.id === dragState.elementId);
        if (!currentEl) return;

        const newPos = clampPosition(
          { x: dragState.elementStartX + deltaX, y: dragState.elementStartY + deltaY },
          currentEl.size.width,
          currentEl.size.height,
          templateSize.width,
          templateSize.height
        );

        const otherElements = elements
          .filter((el) => el.id !== dragState.elementId)
          .map((el) => ({ pos: el.data.position, size: el.size }));

        const lines = getAlignmentLines(newPos, currentEl.size, otherElements, templateSize);
        setAlignmentLines(lines);

        if (lines.vertical.length > 0) {
          newPos.x = lines.vertical[0] - currentEl.size.width / 2;
        }
        if (lines.horizontal.length > 0) {
          newPos.y = lines.horizontal[0] - currentEl.size.height / 2;
        }

        updateElementPosition(dragState.elementId, newPos);
        onElementDrag?.(dragState.elementId, newPos);
      } else {
        const elements = getElements().reverse();
        let found = false;
        for (const el of elements) {
          const { x, y } = el.data.position;
          const { width, height } = el.size;
          if (pos.x >= x - 5 && pos.x <= x + width + 5 && pos.y >= y - 5 && pos.y <= y + height + 5) {
            setHoveredElement(el.id);
            found = true;
            break;
          }
        }
        if (!found) setHoveredElement(null);
      }
    };

    const handleMouseUp = () => {
      if (dragState?.isDragging) {
        setDragState(null);
        setAlignmentLines({ horizontal: [], vertical: [] });
      }
    };

    const handleMouseLeave = () => {
      if (dragState?.isDragging) {
        setDragState(null);
        setAlignmentLines({ horizontal: [], vertical: [] });
      }
      setHoveredElement(null);
    };

    const updateElementPosition = (elementId: string, position: Position) => {
      switch (templateType) {
        case 'business-card-front':
          if (elementId === 'logo') {
            updateBusinessCardFrontElement('logo', { position });
          } else {
            updateBusinessCardFrontElement(elementId as keyof typeof businessCard.front, { position } as Partial<TextElement>);
          }
          break;
        case 'business-card-back':
          updateBusinessCardBackElement(elementId as keyof typeof businessCard.back, { position });
          break;
        case 'letterhead':
          if (elementId === 'logo') {
            updateLetterheadElement('logo', { position });
          } else {
            updateLetterheadElement(elementId as keyof typeof letterhead, { position } as Partial<TextElement>);
          }
          break;
        case 'twitter-cover':
        case 'instagram-cover':
        case 'linkedin-cover':
          if (elementId === 'logo') {
            updateSocialCoverElement('logo', { position });
          } else {
            updateSocialCoverElement(elementId as keyof typeof socialCover, { position } as Partial<TextElement>);
          }
          break;
      }
    };

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: hoveredElement || dragState?.isDragging ? 'move' : 'default',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    );
  }
);

function drawBackground(
  ctx: CanvasRenderingContext2D,
  templateType: TemplateType,
  primaryColor: string,
  secondaryColor: string,
  width: number,
  height: number
) {
  switch (templateType) {
    case 'business-card-front':
    case 'letterhead':
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = primaryColor;
      ctx.fillRect(0, 0, width, 6);
      break;

    case 'business-card-back':
      ctx.fillStyle = primaryColor;
      ctx.fillRect(0, 0, width, height);
      break;

    case 'twitter-cover':
    case 'instagram-cover':
    case 'linkedin-cover':
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
  }
}

function drawElements(
  ctx: CanvasRenderingContext2D,
  templateType: TemplateType,
  businessCard: ReturnType<typeof useDesignStore.getState>['businessCard'],
  letterhead: ReturnType<typeof useDesignStore.getState>['letterhead'],
  socialCover: ReturnType<typeof useDesignStore.getState>['socialCover'],
  logoImage: HTMLImageElement | null,
  primaryColor: string
) {
  switch (templateType) {
    case 'business-card-front':
      drawBusinessCardFront(ctx, businessCard, logoImage, primaryColor);
      break;
    case 'business-card-back':
      drawBusinessCardBack(ctx, businessCard);
      break;
    case 'letterhead':
      drawLetterhead(ctx, letterhead, logoImage, primaryColor);
      break;
    case 'twitter-cover':
    case 'instagram-cover':
    case 'linkedin-cover':
      drawSocialCover(ctx, socialCover, logoImage);
      break;
  }
}

function drawBusinessCardFront(
  ctx: CanvasRenderingContext2D,
  data: ReturnType<typeof useDesignStore.getState>['businessCard'],
  logoImage: HTMLImageElement | null,
  primaryColor: string
) {
  const { logo, name, title, phone, email, website } = data.front;

  if (logoImage && logo.src) {
    const logoWidth = 60 * logo.scale;
    const logoHeight = 40 * logo.scale;
    ctx.globalAlpha = logo.opacity;
    ctx.drawImage(logoImage, logo.position.x, logo.position.y, logoWidth, logoHeight);
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = name.opacity;
  ctx.font = `bold ${name.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = primaryColor;
  ctx.fillText(name.content, name.position.x, name.position.y + name.fontSize);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = title.opacity;
  ctx.font = `${title.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = title.color;
  ctx.fillText(title.content, title.position.x, title.position.y + title.fontSize);
  ctx.globalAlpha = 1;

  [phone, email, website].forEach((el) => {
    ctx.globalAlpha = el.opacity;
    ctx.font = `${el.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillStyle = el.color;
    ctx.fillText(el.content, el.position.x, el.position.y + el.fontSize);
    ctx.globalAlpha = 1;
  });
}

function drawBusinessCardBack(
  ctx: CanvasRenderingContext2D,
  data: ReturnType<typeof useDesignStore.getState>['businessCard']
) {
  const { slogan } = data.back;

  ctx.globalAlpha = slogan.opacity;
  ctx.font = `bold ${slogan.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = slogan.color;
  ctx.textAlign = 'center';
  ctx.fillText(slogan.content, slogan.position.x, slogan.position.y + slogan.fontSize / 2);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

function drawLetterhead(
  ctx: CanvasRenderingContext2D,
  data: ReturnType<typeof useDesignStore.getState>['letterhead'],
  logoImage: HTMLImageElement | null,
  primaryColor: string
) {
  const { logo, companyName, address, contact } = data;

  if (logoImage && logo.src) {
    const logoWidth = 80 * logo.scale;
    const logoHeight = 50 * logo.scale;
    ctx.globalAlpha = logo.opacity;
    ctx.drawImage(logoImage, logo.position.x, logo.position.y, logoWidth, logoHeight);
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = companyName.opacity;
  ctx.font = `bold ${companyName.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = primaryColor;
  ctx.fillText(companyName.content, companyName.position.x, companyName.position.y + companyName.fontSize);
  ctx.globalAlpha = 1;

  [address, contact].forEach((el) => {
    ctx.globalAlpha = el.opacity;
    ctx.font = `${el.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillStyle = el.color;
    ctx.fillText(el.content, el.position.x, el.position.y + el.fontSize);
    ctx.globalAlpha = 1;
  });

  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  for (let y = 260; y < 800; y += 30) {
    ctx.beginPath();
    ctx.moveTo(100, y);
    ctx.lineTo(495, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawSocialCover(
  ctx: CanvasRenderingContext2D,
  data: ReturnType<typeof useDesignStore.getState>['socialCover'],
  logoImage: HTMLImageElement | null
) {
  const { logo, title, subtitle } = data;

  if (logoImage && logo.src) {
    const logoWidth = 100 * logo.scale;
    const logoHeight = 80 * logo.scale;
    ctx.globalAlpha = logo.opacity;
    ctx.drawImage(
      logoImage,
      logo.position.x - logoWidth / 2,
      logo.position.y - logoHeight / 2,
      logoWidth,
      logoHeight
    );
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = title.opacity;
  ctx.font = `bold ${title.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = title.color;
  ctx.textAlign = 'center';
  ctx.fillText(title.content, title.position.x, title.position.y + title.fontSize / 2);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = subtitle.opacity;
  ctx.font = `${subtitle.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = subtitle.color;
  ctx.textAlign = 'center';
  ctx.fillText(subtitle.content, subtitle.position.x, subtitle.position.y + subtitle.fontSize / 2);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

TemplateCanvas.displayName = 'TemplateCanvas';

export default TemplateCanvas;
