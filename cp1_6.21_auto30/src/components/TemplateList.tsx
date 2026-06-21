import { useRef, useEffect } from 'react';
import type { Template } from '../types';
import './TemplateList.css';

interface TemplateListProps {
  templates: Template[];
  currentTemplateId: string | null;
  onSelect: (template: Template) => void;
  collapsed?: boolean;
}

const templateColors: Record<string, { c1: string; c2: string }> = {
  'template-simple-white': { c1: '#FFFFFF', c2: '#F5F5F5' },
  'template-festival-red': { c1: '#C0392B', c2: '#922B21' },
  'template-ecommerce-yellow': { c1: '#F39C12', c2: '#E67E22' },
};

function TemplateThumbnail({ template }: { template: Template }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const colors = templateColors[template.id] || { c1: '#444', c2: '#222' };
    const bg = template.background;
    const gColor1 = bg.type === 'gradient' && bg.color1 ? bg.color1 : colors.c1;
    const gColor2 = bg.type === 'gradient' && bg.color2 ? bg.color2 : colors.c2;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, gColor1);
    gradient.addColorStop(1, gColor2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const titleEl = template.elements.find((e) => e.name === '标题');
    if (titleEl && titleEl.type === 'text') {
      ctx.fillStyle = titleEl.style.color;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const titleY = (titleEl.y / template.canvasHeight) * h;
      ctx.fillText(titleEl.content.substring(0, 8), w / 2, titleY + 4);
    }

    const imgArea = template.elements.find((e) => e.type === 'image');
    if (imgArea) {
      const ix = (imgArea.x / template.canvasWidth) * w;
      const iy = (imgArea.y / template.canvasHeight) * h;
      const iw = (imgArea.width / template.canvasWidth) * w;
      const ih = (imgArea.height / template.canvasHeight) * h;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(ix, iy, iw, ih);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('图片', ix + iw / 2, iy + ih / 2);
    }

    const priceEl = template.elements.find((e) => e.name === '价格');
    if (priceEl && priceEl.type === 'text') {
      const py = (priceEl.y / template.canvasHeight) * h;
      ctx.fillStyle = priceEl.style.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('¥ 99', w / 2, py + 6);
    }

    const btnEl = template.elements.find((e) => e.name === '按钮文字');
    if (btnEl) {
      const bx = (btnEl.x / template.canvasWidth) * w;
      const by = (btnEl.y / template.canvasHeight) * h;
      const bw = (btnEl.width / template.canvasWidth) * w;
      const bh = (btnEl.height / template.canvasHeight) * h;
      const btnGradient = ctx.createLinearGradient(0, by, 0, by + bh);
      btnGradient.addColorStop(0, '#667eea');
      btnGradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = btnGradient;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + bh - r);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
      ctx.lineTo(bx + r, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();
      if (btnEl.type === 'text') {
        ctx.fillStyle = btnEl.style.color;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btnEl.content.substring(0, 4), bx + bw / 2, by + bh / 2);
      }
    }
  }, [template]);

  return <canvas ref={canvasRef} width={160} height={240} className="thumbnail-canvas" />;
}

export default function TemplateList({
  templates,
  currentTemplateId,
  onSelect,
  collapsed,
}: TemplateListProps) {
  return (
    <div className={`template-list ${collapsed ? 'horizontal' : 'vertical'}`}>
      {templates.map((template) => (
        <div
          key={template.id}
          className={`template-item ${currentTemplateId === template.id ? 'active' : ''}`}
          onClick={() => onSelect(template)}
        >
          <TemplateThumbnail template={template} />
          <div className="template-name">{template.name}</div>
        </div>
      ))}
    </div>
  );
}
