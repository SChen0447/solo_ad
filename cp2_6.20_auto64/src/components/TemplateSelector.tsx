import React, { useEffect, useRef, useState } from 'react';
import { CardTemplate } from '../types';
import { templates } from '../data/templates';
import { CanvasRenderer, CANVAS_W, CANVAS_H } from '../core/CanvasRenderer';
import { useCardStore } from '../store';

interface TemplateSelectorProps {
  onSelect?: (template: CardTemplate) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = () => {
  const selectTemplate = useCardStore((state) => state.selectTemplate);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasesReady, setCanvasesReady] = useState(false);
  const rendererRefs = useRef<Map<string, CanvasRenderer>>(new Map());

  const drawTemplateToCanvas = (template: CardTemplate, canvas: HTMLCanvasElement) => {
    const renderer = new CanvasRenderer(canvas);
    renderer.setBackground(template.background);

    for (const text of template.defaultTexts) {
      const scale = 200 / Math.max(CANVAS_W, CANVAS_H);
      renderer.addText({
        ...text,
        x: text.x * scale,
        y: text.y * scale,
        fontSize: Math.max(10, text.fontSize * scale * 0.8),
      });
    }

    for (const deco of template.defaultDecorations) {
      const scale = 200 / Math.max(CANVAS_W, CANVAS_H);
      renderer.addDecoration({
        ...deco,
        x: deco.x * scale,
        y: deco.y * scale,
        scale: deco.scale * scale * 0.8,
      });
    }

    renderer.render();
    rendererRefs.current.set(template.id, renderer);
  };

  useEffect(() => {
    const canvases = containerRef.current?.querySelectorAll('canvas[data-template-id]');
    if (canvases) {
      canvases.forEach((canvasEl) => {
        const canvas = canvasEl as HTMLCanvasElement;
        const tplId = canvas.dataset.templateId;
        const template = templates.find((t) => t.id === tplId);
        if (template) {
          canvas.width = 200;
          canvas.height = 200;
          drawTemplateToCanvas(template, canvas);
        }
      });
      setCanvasesReady(true);
    }

    return () => {
      rendererRefs.current.forEach((r) => r.destroy());
      rendererRefs.current.clear();
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '40px 20px',
      position: 'relative',
      zIndex: 1,
    }}>
      <h1
        className="animate-fade-in-up"
        style={{
          fontSize: '42px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #fff 0%, #f0e6ff 50%, #e0f0ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          fontFamily: "'Ma Shan Zheng', cursive",
          letterSpacing: '4px',
        }}
      >
        贺卡工坊
      </h1>
      <p
        className="animate-fade-in-up"
        style={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '48px',
          animationDelay: '0.1s',
        }}
      >
        选择一个模板，开始创作你的专属贺卡
      </p>

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '32px',
          justifyContent: 'center',
          maxWidth: '1100px',
        }}
      >
        {templates.map((tpl, idx) => (
          <div
            key={tpl.id}
            className="animate-fade-in-up"
            style={{
              animationDelay: `${0.1 + idx * 0.08}s`,
              opacity: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              className="template-card"
              onClick={() => selectTemplate(tpl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') selectTemplate(tpl); }}
              aria-label={`选择${tpl.name}模板`}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: 0,
                background: 'transparent',
              }}
            >
              <canvas
                data-template-id={tpl.id}
                style={{
                  width: '200px',
                  height: '200px',
                  display: 'block',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.4)',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '20px', marginRight: '4px' }}>{tpl.icon}</span>
                {tpl.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p
        className="animate-fade-in-up"
        style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          marginTop: '48px',
          animationDelay: '0.6s',
        }}
      >
        点击模板即可开始编辑
      </p>
    </div>
  );
};

export default TemplateSelector;
