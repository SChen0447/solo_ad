import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Check, Infinity } from 'lucide-react';
import { type AnimationParams } from '../utils/exportCss';
import styles from './ParamPanel.module.css';

interface ParamPanelProps {
  params: AnimationParams;
  onChange: (params: AnimationParams) => void;
  onExport: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  const percentage = ((value - min) / (max - min)) * 100;

  const handleUpdate = useCallback((clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newPercentage = x / rect.width;
    const rawValue = min + newPercentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    const finalValue = parseFloat(clampedValue.toFixed(1));

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      onChange(finalValue);
    });
  }, [min, max, step, onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleUpdate(e.clientX);
  }, [handleUpdate]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleUpdate(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleUpdate]);

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderLabel}>
        <span>{label}</span>
        <span className={styles.sliderValue}>
          {value}{unit}
        </span>
      </div>
      <div
        ref={sliderRef}
        className={`${styles.sliderTrack} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div
          className={styles.sliderFill}
          style={{ width: `${percentage}%` }}
        />
        <div
          className={styles.sliderThumb}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <div className={styles.sliderRange}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function ParamPanel({ params, onChange, onExport }: ParamPanelProps) {
  const [showCopied, setShowCopied] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  const handleExport = () => {
    setIsButtonPressed(true);
    onExport();
    setShowCopied(true);

    setTimeout(() => {
      setIsButtonPressed(false);
    }, 150);

    setTimeout(() => {
      setShowCopied(false);
    }, 1500);
  };

  const handleDurationChange = (duration: number) => {
    onChange({ ...params, duration });
  };

  const handleDelayChange = (delay: number) => {
    onChange({ ...params, delay });
  };

  const handleIterationChange = (value: number | 'infinite') => {
    onChange({ ...params, iterationCount: value });
  };

  const iterationOptions = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 'infinite' as const, label: '∞' },
  ];

  return (
    <div className={styles.paramPanel}>
      <div className={styles.paramsGrid}>
        <Slider
          label="持续时间"
          value={params.duration}
          min={0.1}
          max={10}
          step={0.1}
          unit="s"
          onChange={handleDurationChange}
        />

        <Slider
          label="延迟"
          value={params.delay}
          min={0}
          max={5}
          step={0.1}
          unit="s"
          onChange={handleDelayChange}
        />

        <div className={styles.iterationContainer}>
          <div className={styles.sliderLabel}>
            <span>循环次数</span>
            <span className={styles.sliderValue}>
              {params.iterationCount === 'infinite' ? '无限' : `${params.iterationCount} 次`}
            </span>
          </div>
          <div className={styles.iterationButtons}>
            {iterationOptions.map((option) => (
              <button
                key={String(option.value)}
                className={`${styles.iterationButton} ${
                  params.iterationCount === option.value ? styles.active : ''
                }`}
                onClick={() => handleIterationChange(option.value)}
              >
                {option.value === 'infinite' ? <Infinity size={16} /> : option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.exportContainer}>
        <button
          className={`${styles.exportButton} ${isButtonPressed ? styles.pressed : ''}`}
          onClick={handleExport}
        >
          {showCopied ? (
            <>
              <Check size={18} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>导出 CSS 代码</span>
            </>
          )}
        </button>
        {showCopied && (
          <div className={styles.copiedToast}>
            Copied!
          </div>
        )}
      </div>
    </div>
  );
}
