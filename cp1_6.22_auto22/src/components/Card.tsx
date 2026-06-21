import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CardStyle, cardStyles, CardStyleConfig, EmphasisSpan } from '../styles/cardStyles';
import { GeneratedContent, renderContentWithEmphasis } from '../utils/generator';
import { Download, Copy, Image, FileText } from 'lucide-react';

interface CardProps {
  content: GeneratedContent | null;
  style: CardStyle;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onCopyImage: () => void;
  onCopyText: () => void;
}

const Card: React.FC<CardProps> = ({
  content,
  style,
  position,
  onPositionChange,
  onCopyImage,
  onCopyText
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showImageCopied, setShowImageCopied] = useState(false);
  const [showTextCopied, setShowTextCopied] = useState(false);

  const styleConfig: CardStyleConfig = cardStyles[style];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    requestAnimationFrame(() => {
      onPositionChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    });
  }, [isDragging, dragStart, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  }, [position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    requestAnimationFrame(() => {
      onPositionChange({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    });
  }, [isDragging, dragStart, onPositionChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const drawDecorations = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    styleConfig.decorations.forEach(decoration => {
      ctx.save();
      switch (decoration.type) {
        case 'line':
          ctx.strokeStyle = decoration.color || styleConfig.accentColor;
          ctx.lineWidth = decoration.position === 'top' ? 3 : 1;
          ctx.beginPath();
          if (decoration.position === 'top') {
            ctx.moveTo(30, 50);
            ctx.lineTo(width - 30, 50);
          } else if (decoration.position === 'bottom') {
            ctx.moveTo(30, height - 30);
            ctx.lineTo(width - 30, height - 30);
          }
          ctx.stroke();
          break;
        case 'inkblot':
          ctx.fillStyle = 'rgba(20, 20, 20, 0.15)';
          const blotPositions: Record<string, [number, number]> = {
            topleft: [40, 60],
            bottomright: [width - 60, height - 50]
          };
          const [bx, by] = blotPositions[decoration.position] || [50, 50];
          for (let i = 0; i < 8; i++) {
            const r = Math.random() * 8 + 2;
            const ox = Math.random() * 20 - 10;
            const oy = Math.random() * 20 - 10;
            ctx.beginPath();
            ctx.arc(bx + ox, by + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'corner':
          ctx.strokeStyle = decoration.color || '#d4a574';
          ctx.lineWidth = 2;
          const cornerSize = 20;
          const corners: Record<string, [number, number, number, number, number, number, number, number]> = {
            topleft: [15, 15, 15, 15 + cornerSize, 15, 15, 15 + cornerSize, 15],
            topright: [width - 15, 15, width - 15, 15 + cornerSize, width - 15, 15, width - 15 - cornerSize, 15],
            bottomleft: [15, height - 15, 15, height - 15 - cornerSize, 15, height - 15, 15 + cornerSize, height - 15],
            bottomright: [width - 15, height - 15, width - 15, height - 15 - cornerSize, width - 15, height - 15, width - 15 - cornerSize, height - 15]
          };
          const corner = corners[decoration.position];
          if (corner) {
            ctx.beginPath();
            ctx.moveTo(corner[0], corner[1]);
            ctx.lineTo(corner[2], corner[3]);
            ctx.moveTo(corner[4], corner[5]);
            ctx.lineTo(corner[6], corner[7]);
            ctx.stroke();
          }
          break;
        case 'border':
          ctx.strokeStyle = decoration.color || '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(15, 15, width - 30, height - 30);
          ctx.setLineDash([]);
          break;
        case 'stamp':
          ctx.save();
          ctx.translate(width - 70, height - 70);
          ctx.rotate(-Math.PI / 6);
          ctx.strokeStyle = decoration.color || '#c41e3a';
          ctx.fillStyle = decoration.color || '#c41e3a';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, 35, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('绝密', 0, -5);
          ctx.font = '10px "Noto Sans SC", sans-serif';
          ctx.fillText('CONIDENTIAL', 0, 12);
          ctx.restore();
          break;
      }
      ctx.restore();
    });
  }, [styleConfig]);

  const exportAsImage = useCallback(async () => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const scale = 2;
    const width = rect.width * scale;
    const height = rect.height * scale;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    if (style === 'newspaper') {
      gradient.addColorStop(0, '#f5e6c8');
      gradient.addColorStop(0.5, '#e8d4a8');
      gradient.addColorStop(1, '#f0dbb8');
    } else if (style === 'typewriter') {
      gradient.addColorStop(0, '#faf8f0');
      gradient.addColorStop(1, '#f2efe0');
    } else if (style === 'handwritten') {
      gradient.addColorStop(0, '#fff9e6');
      gradient.addColorStop(1, '#fff3cc');
    } else if (style === 'poster') {
      gradient.addColorStop(0, '#ffd93d');
      gradient.addColorStop(0.5, '#ffb347');
      gradient.addColorStop(1, '#ffd93d');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (styleConfig.borderWidth > 0) {
      ctx.strokeStyle = styleConfig.borderColor;
      ctx.lineWidth = styleConfig.borderWidth;
      if (styleConfig.borderStyle === 'double') {
        ctx.strokeRect(2, 2, rect.width - 4, rect.height - 4);
        ctx.strokeRect(6, 6, rect.width - 12, rect.height - 12);
      } else if (styleConfig.borderStyle === 'dashed') {
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);
        ctx.setLineDash([]);
      } else {
        ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);
      }
    }

    drawDecorations(ctx, rect.width, rect.height);

    const padding = style === 'handwritten' ? 40 : style === 'typewriter' ? 35 : 30;
    let yOffset = padding + (style === 'newspaper' ? 25 : 10);

    ctx.fillStyle = styleConfig.titleColor;
    ctx.font = `bold ${styleConfig.titleSize} ${styleConfig.titleFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleText = content?.title || '请输入文案生成卡片';
    const maxWidth = rect.width - padding * 2;
    const titleLines: string[] = [];
    let currentLine = '';
    const chars = titleText.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const testLine = currentLine + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        titleLines.push(currentLine);
        currentLine = chars[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      titleLines.push(currentLine);
    }

    const titleLineHeight = parseInt(styleConfig.titleSize) * 1.3;
    titleLines.forEach((line, i) => {
      if (style === 'typewriter') {
        for (let j = 0; j < line.length; j++) {
          const charMetrics = ctx.measureText(line[j]);
          const charX = padding + ctx.measureText(line.substring(0, j)).width + (Math.random() - 0.5) * 1;
          const charY = yOffset + i * titleLineHeight + (Math.random() - 0.5) * 0.5;
          ctx.fillText(line[j], charX, charY);
        }
      } else {
        ctx.fillText(line, padding, yOffset + i * titleLineHeight);
      }
    });

    yOffset += titleLines.length * titleLineHeight + 20;

    if (style === 'newspaper') {
      ctx.strokeStyle = styleConfig.accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, yOffset - 10);
      ctx.lineTo(rect.width - padding, yOffset - 10);
      ctx.stroke();
    }

    ctx.fillStyle = styleConfig.contentColor;
    ctx.font = `${styleConfig.contentSize} ${styleConfig.contentFont}`;

    const contentText = content?.content || '';
    const contentLines: string[] = [];
    let currentContentLine = '';
    const contentChars = contentText.split('');
    
    for (let i = 0; i < contentChars.length; i++) {
      const testLine = currentContentLine + contentChars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentContentLine !== '') {
        contentLines.push(currentContentLine);
        currentContentLine = contentChars[i];
      } else {
        currentContentLine = testLine;
      }
    }
    if (currentContentLine) {
      contentLines.push(currentContentLine);
    }

    const contentLineHeight = parseInt(styleConfig.contentSize) * 1.6;
    const emphasis = content?.emphasis || [];
    let charIndex = 0;

    contentLines.forEach((line, lineIndex) => {
      let xOffset = padding;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charMetrics = ctx.measureText(char);
        
        const emphasisSpan = emphasis.find(e => charIndex >= e.start && charIndex < e.end);
        
        ctx.save();
        if (emphasisSpan) {
          switch (emphasisSpan.type) {
            case 'bold':
              ctx.font = `bold ${styleConfig.contentSize} ${styleConfig.contentFont}`;
              break;
            case 'red':
              ctx.fillStyle = styleConfig.accentColor;
              break;
            case 'underline':
              ctx.strokeStyle = styleConfig.contentColor;
              ctx.lineWidth = 1;
              break;
          }
        }

        if (style === 'typewriter') {
          ctx.fillText(
            char,
            xOffset + (Math.random() - 0.5) * 1,
            yOffset + lineIndex * contentLineHeight + (Math.random() - 0.5) * 0.5
          );
        } else {
          ctx.fillText(char, xOffset, yOffset + lineIndex * contentLineHeight);
        }

        if (emphasisSpan?.type === 'underline') {
          ctx.beginPath();
          ctx.moveTo(xOffset, yOffset + lineIndex * contentLineHeight + parseInt(styleConfig.contentSize) + 2);
          ctx.lineTo(xOffset + charMetrics.width, yOffset + lineIndex * contentLineHeight + parseInt(styleConfig.contentSize) + 2);
          ctx.stroke();
        }

        ctx.restore();
        xOffset += charMetrics.width;
        charIndex++;
      }
    });

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setShowImageCopied(true);
          onCopyImage();
          setTimeout(() => setShowImageCopied(false), 1500);
        } catch {
          const link = document.createElement('a');
          link.download = `card-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          setShowImageCopied(true);
          onCopyImage();
          setTimeout(() => setShowImageCopied(false), 1500);
        }
      }
    }, 'image/png');
  }, [content, style, styleConfig, drawDecorations, onCopyImage]);

  const copyText = useCallback(async () => {
    if (!content) return;
    const text = `${content.title}\n\n${content.content}`;
    try {
      await navigator.clipboard.writeText(text);
      setShowTextCopied(true);
      onCopyText();
      setTimeout(() => setShowTextCopied(false), 1500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShowTextCopied(true);
      onCopyText();
      setTimeout(() => setShowTextCopied(false), 1500);
    }
  }, [content, onCopyText]);

  const renderContent = () => {
    if (!content) {
      return (
        <div className="card-placeholder">
          <p>请输入文案并点击生成按钮</p>
        </div>
      );
    }

    return (
      <>
        <h2 
          className="card-title"
          style={{
            fontFamily: styleConfig.titleFont,
            fontSize: styleConfig.titleSize,
            color: styleConfig.titleColor
          }}
        >
          {content.title}
        </h2>
        <div 
          className="card-content"
          style={{
            fontFamily: styleConfig.contentFont,
            fontSize: styleConfig.contentSize,
            color: styleConfig.contentColor,
            lineHeight: style === 'handwritten' ? '1.8' : '1.6'
          }}
        >
          {renderContentWithEmphasis(content.content, content.emphasis, style)}
        </div>
      </>
    );
  };

  const renderDecorations = () => {
    return styleConfig.decorations.map((dec, i) => {
      if (dec.type === 'line') {
        return (
          <div
            key={i}
            className={`decoration-line decoration-${dec.position}`}
            style={{ backgroundColor: dec.color || styleConfig.accentColor }}
          />
        );
      }
      if (dec.type === 'inkblot') {
        return (
          <div
            key={i}
            className={`inkblot inkblot-${dec.position}`}
          />
        );
      }
      if (dec.type === 'corner') {
        return (
          <div
            key={i}
            className={`corner-decoration corner-${dec.position}`}
            style={{ borderColor: dec.color || styleConfig.borderColor }}
          />
        );
      }
      if (dec.type === 'stamp') {
        return (
          <div
            key={i}
            className="stamp-decoration"
            style={{ color: dec.color || styleConfig.accentColor }}
          >
            <span className="stamp-text">绝密</span>
            <span className="stamp-sub">CONIDENTIAL</span>
          </div>
        );
      }
      if (dec.type === 'border') {
        return (
          <div
            key={i}
            className="inner-border"
            style={{ borderColor: dec.color || styleConfig.borderColor }}
          />
        );
      }
      return null;
    });
  };

  return (
    <div className="card-wrapper">
      <div
        ref={cardRef}
        className={`card card-${style} ${isDragging ? 'dragging' : ''}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          background: styleConfig.backgroundGradient,
          padding: styleConfig.padding,
          borderStyle: styleConfig.borderStyle,
          borderWidth: styleConfig.borderWidth,
          borderColor: styleConfig.borderColor
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div 
          className="card-texture"
          style={{ backgroundImage: styleConfig.paperTexture }}
        />
        {renderDecorations()}
        <canvas
          ref={canvasRef}
          className="card-canvas"
          style={{ display: 'none' }}
        />
        <div className="card-content-wrapper">
          {renderContent()}
        </div>
      </div>

      <div className="card-actions">
        <button
          className="action-btn"
          onClick={exportAsImage}
          disabled={!content}
          title="复制为图片"
        >
          <Image size={20} />
          <span>图片</span>
          {showImageCopied && <span className="toast-inline">已复制</span>}
        </button>
        <button
          className="action-btn"
          onClick={copyText}
          disabled={!content}
          title="复制纯文本"
        >
          <FileText size={20} />
          <span>文本</span>
          {showTextCopied && <span className="toast-inline">已复制</span>}
        </button>
      </div>
    </div>
  );
};

export default Card;
