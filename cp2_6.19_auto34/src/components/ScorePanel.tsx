import { useState, useEffect, useRef } from 'react';
import { ROUND_SIZE } from '../data/words';

/**
 * ScorePanel 得分面板组件
 *
 * 调用关系与数据流向：
 *   ← 接收 App.tsx 传入的 props：
 *     - score: 当前总得分（答对后 App.tsx 调用 setScore 更新，此组件感知变化后触发动画）
 *     - correctCount: 答对题数
 *     - roundProgress: boolean[5]，每题答对标记（由 App.tsx 在 handleCorrect 中更新）
 *     - scoreAnimating: 得分是否正在执行弹性缩放动画（由 App.tsx 控制）
 *
 *   内部不向父组件输出数据，纯展示组件。
 *
 * 动画实现：
 *   - 得分数字滚动：requestAnimationFrame 驱动，0.2s ease-out 从旧值平滑过渡到新值
 *   - 得分弹性缩放：Web Animations API (element.animate)，0.2s 弹性 scale 曲线
 *   - 圆点填充渐变：CSS @keyframes dotFill，从透明缩小到实心正常大小的渐变动画
 */

interface ScorePanelProps {
  score: number;
  correctCount: number;
  roundProgress: boolean[];
  scoreAnimating: boolean;
}

function ScorePanel({
  score,
  correctCount,
  roundProgress,
  scoreAnimating
}: ScorePanelProps) {
  const [displayScore, setDisplayScore] = useState(score);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (score === displayScore) return;

    const start = displayScore;
    const end = score;
    const duration = 200;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeProgress);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, displayScore]);

  useEffect(() => {
    if (scoreAnimating && scoreRef.current) {
      scoreRef.current.animate(
        [
          { transform: 'scale(1)', offset: 0 },
          { transform: 'scale(1.4)', offset: 0.5 },
          { transform: 'scale(1)', offset: 1 }
        ],
        {
          duration: 200,
          easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          fill: 'forwards'
        }
      );
    }
  }, [scoreAnimating]);

  return (
    <footer
      style={{
        padding: '16px 20px',
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        {Array.from({ length: ROUND_SIZE }).map((_, idx) => (
          <ProgressDot key={idx} filled={roundProgress[idx] || false} index={idx} />
        ))}
      </div>

      <div className="score-info-row">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '16px' }}>⭐</span>
          <span>得分：</span>
          <span
            ref={scoreRef}
            style={{
              fontWeight: 'bold',
              color: '#F5A623',
              fontSize: '18px',
              minWidth: '32px',
              display: 'inline-block',
              textAlign: 'left'
            }}
          >
            {displayScore}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '16px' }}>✓</span>
          <span>答对：</span>
          <span
            style={{
              fontWeight: 'bold',
              color: '#4CAF50',
              fontSize: '18px'
            }}
          >
            {correctCount}
          </span>
          <span>/</span>
          <span
            style={{
              color: '#999',
              fontSize: '14px'
            }}
          >
            {ROUND_SIZE}
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * ProgressDot 圆形进度点组件
 *
 * 数据流向：
 *   ← App.tsx → ScorePanel → ProgressDot
 *   通过 filled prop 控制是否填充
 *
 * 渐变动画实现：
 *   - filled 从 false→true 时，使用 CSS animation dotFill 实现从透明缩小到实心正常大小的渐变
 *   - 同时内部星星图标使用 CSS animation starAppear 从透明缩放到出现
 */
function ProgressDot({ filled, index }: { filled: boolean; index: number }) {
  const [isFilled, setIsFilled] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (filled && !isFilled) {
      const timer = setTimeout(() => {
        setIsFilled(true);
        setShouldAnimate(true);
      }, index * 50);
      return () => clearTimeout(timer);
    }
    if (!filled) {
      setIsFilled(false);
      setShouldAnimate(false);
    }
  }, [filled, isFilled, index]);

  return (
    <div
      className={shouldAnimate ? 'dot-fill' : ''}
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        border: '2px solid #F5A623',
        backgroundColor: isFilled ? '#F5A623' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isFilled ? '0 0 0 3px rgba(245, 166, 35, 0.2)' : 'none',
        transition: shouldAnimate ? 'none' : 'background-color 0.3s ease, box-shadow 0.3s ease'
      }}
    >
      {isFilled && (
        <span
          className={shouldAnimate ? 'star-appear' : ''}
          style={{
            color: '#fff',
            fontSize: '8px',
            fontWeight: 'bold'
          }}
        >
          ⭐
        </span>
      )}
    </div>
  );
}

export default ScorePanel;
