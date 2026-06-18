import { useGradientStore } from '@/store/gradientStore';
import type { EasingType } from '@/types';
import styles from './AnimationController.module.css';

export default function AnimationController() {
  const animationParams = useGradientStore((s) => s.animationParams);
  const setAnimationParams = useGradientStore((s) => s.setAnimationParams);

  const easingOptions: EasingType[] = ['ease', 'ease-in', 'ease-out', 'linear', 'cubic-bezier'];

  return (
    <div className={styles.container}>
      <div className={styles.control}>
        <label className={styles.label}>
          Duration <span className={styles.value}>{animationParams.duration}s</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={animationParams.duration}
          onChange={(e) => setAnimationParams({ duration: Number(e.target.value) })}
          className={styles.range}
        />
      </div>

      <div className={styles.control}>
        <label className={styles.label}>
          Delay <span className={styles.value}>{animationParams.delay}s</span>
        </label>
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={animationParams.delay}
          onChange={(e) => setAnimationParams({ delay: Number(e.target.value) })}
          className={styles.range}
        />
      </div>

      <div className={styles.control}>
        <label className={styles.label}>Easing</label>
        <select
          value={animationParams.easing}
          onChange={(e) => setAnimationParams({ easing: e.target.value as EasingType })}
          className={styles.select}
        >
          {easingOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {animationParams.easing === 'cubic-bezier' && (
        <div className={styles.control}>
          <label className={styles.label}>Cubic Bezier Value</label>
          <input
            type="text"
            value={animationParams.cubicBezierValue}
            onChange={(e) => setAnimationParams({ cubicBezierValue: e.target.value })}
            className={styles.textInput}
          />
        </div>
      )}
    </div>
  );
}
