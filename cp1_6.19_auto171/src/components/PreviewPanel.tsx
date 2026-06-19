import { useEffect, useRef, useState } from 'react';
import { ElementParams, AnimationTarget } from '@/types';
import { animationEngine } from '@/animation/AnimationEngine';
import { v4 as uuidv4 } from 'uuid';
import './PreviewPanel.css';

interface PreviewPanelProps {
  params: ElementParams;
  target: AnimationTarget;
  onElementClick: (target: 'square' | 'circle') => void;
}

export function PreviewPanel({ params, target, onElementClick }: PreviewPanelProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const [squareAnimId, setSquareAnimId] = useState(() => uuidv4().slice(0, 8));
  const [circleAnimId, setCircleAnimId] = useState(() => uuidv4().slice(0, 8));
  const squareRef = useRef<HTMLDivElement | null>(null);
  const circleRef = useRef<HTMLDivElement | null>(null);

  const restartAnimation = (el: HTMLElement | null, className: string) => {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.classList.add(className);
    });
  };

  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.setAttribute('data-anim-styles', 'true');
      document.head.appendChild(styleRef.current);
    }
    const squareCSS = animationEngine.toCSSString('square', params.square, squareAnimId);
    const circleCSS = animationEngine.toCSSString('circle', params.circle, circleAnimId);
    styleRef.current.textContent = `${squareCSS}\n${circleCSS}`;

    const newSquareId = uuidv4().slice(0, 8);
    const newCircleId = uuidv4().slice(0, 8);
    setSquareAnimId(newSquareId);
    setCircleAnimId(newCircleId);

    restartAnimation(squareRef.current, `anim-square-${newSquareId}`);
    restartAnimation(circleRef.current, `anim-circle-${newCircleId}`);
  }, [params]);

  useEffect(() => {
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  return (
    <div className="preview-panel">
      <div className="preview-container">
        <div
          className={`preview-element-wrapper ${target === 'square' || target === 'both' ? 'selected' : ''}`}
          onClick={() => onElementClick('square')}
        >
          <div
            ref={squareRef}
            className={`preview-square anim-square-${squareAnimId}`}
          />
          <div className="element-label">正方形 · 旋转</div>
        </div>
        <div
          className={`preview-element-wrapper ${target === 'circle' || target === 'both' ? 'selected' : ''}`}
          onClick={() => onElementClick('circle')}
        >
          <div
            ref={circleRef}
            className={`preview-circle anim-circle-${circleAnimId}`}
          />
          <div className="element-label">圆形 · 弹跳</div>
        </div>
      </div>
    </div>
  );
}
