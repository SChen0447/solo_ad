import { useState, useMemo, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { COLOR_PALETTE, type EasingCurve, type AnimationParams } from '../utils/exportCss';
import styles from './AnimationPreview.module.css';

interface AnimationExample {
  id: string;
  property: 'translateX' | 'scale' | 'rotate' | 'opacity';
  color: string;
  label: string;
}

interface AnimationPreviewProps {
  curve: EasingCurve;
  params: AnimationParams;
}

export default function AnimationPreview({ curve, params }: AnimationPreviewProps) {
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState<string>(uuidv4());

  const examples = useMemo<AnimationExample[]>(() => [
    { id: 'translate', property: 'translateX', color: COLOR_PALETTE[0], label: 'translateX' },
    { id: 'scale', property: 'scale', color: COLOR_PALETTE[1], label: 'scale' },
    { id: 'rotate', property: 'rotate', color: COLOR_PALETTE[2], label: 'rotate' },
    { id: 'opacity', property: 'opacity', color: COLOR_PALETTE[3], label: 'opacity' },
  ], []);

  const iterations = params.iterationCount === 'infinite' ? 'infinite' : String(params.iterationCount);

  const getAnimationStyle = useCallback((example: AnimationExample, isFullscreen: boolean) => {
    const baseStyle: React.CSSProperties = {
      animationDuration: `${params.duration}s`,
      animationTimingFunction: curve.value,
      animationDelay: `${params.delay}s`,
      animationIterationCount: iterations,
      animationPlayState: fullscreenId === null || fullscreenId === example.id ? 'running' : 'paused',
      backgroundColor: example.color,
      willChange: 'transform, opacity',
      transform: 'translateZ(0)',
    };

    if (isFullscreen) {
      return {
        ...baseStyle,
        width: '80px',
        height: '80px',
      };
    }

    return baseStyle;
  }, [curve.value, params.duration, params.delay, iterations, fullscreenId]);

  const handleExampleClick = (id: string) => {
    setFullscreenId(fullscreenId === id ? null : id);
  };

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenId(null);
  }, []);

  useEffect(() => {
    setAnimationKey(uuidv4());
  }, [curve, params.duration, params.delay, params.iterationCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenId) {
        handleCloseFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenId, handleCloseFullscreen]);

  return (
    <div className={styles.previewContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>动画预览</h2>
        <div className={styles.currentCurve}>
          <span className={styles.curveLabel}>当前曲线：</span>
          <code className={styles.curveValue}>{curve.value}</code>
        </div>
      </div>

      <div className={styles.examplesGrid}>
        {examples.map((example) => (
          <div
            key={example.id}
            className={styles.exampleCard}
            onClick={() => handleExampleClick(example.id)}
          >
            <div className={styles.exampleLabel}>{example.label}</div>
            <div className={styles.track}>
              <div
                key={`${animationKey}-${example.id}`}
                className={`${styles.animatedBall} ${styles[`anim-${example.property}`]}`}
                style={getAnimationStyle(example, false)}
              />
            </div>
          </div>
        ))}
      </div>

      {fullscreenId && (
        <div className={styles.fullscreenOverlay} onClick={handleCloseFullscreen}>
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              handleCloseFullscreen();
            }}
          >
            <X size={24} />
          </button>
          <div className={styles.fullscreenContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.fullscreenTitle}>
              {examples.find(e => e.id === fullscreenId)?.label}
            </h3>
            <div className={styles.fullscreenTrack}>
              <div
                key={`fs-${animationKey}-${fullscreenId}`}
                className={`${styles.animatedBall} ${styles[`anim-${fullscreenId}`]} ${styles.fullscreenBall}`}
                style={getAnimationStyle(examples.find(e => e.id === fullscreenId)!, true)}
              />
            </div>
            <p className={styles.fullscreenHint}>按 ESC 或点击外部关闭</p>
          </div>
        </div>
      )}
    </div>
  );
}
