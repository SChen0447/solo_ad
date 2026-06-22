/**
 * AnimatedNumber 数字递增动画组件
 *
 * 数据流向：
 *   父组件（App.tsx 底部统计栏）传入 value（目标值）
 *   → 本组件内部使用 requestAnimationFrame 逐帧递增/递减
 *   → 每帧更新内部 state 显示中间值
 *   → 动画时长 300ms（0.3s），配合 opacity + transform 淡入淡出
 *
 * 使用场景：
 *   <AnimatedNumber value={stats.totalOrders} />
 *   <AnimatedNumber value={stats.totalAmount} prefix="¥" decimals={2} />
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;          // 目标数字
  prefix?: string;         // 前缀（如 ¥）
  suffix?: string;         // 后缀（如 %、件）
  decimals?: number;        // 保留小数位
  duration?: number;     // 动画时长（毫秒），默认 300
}

const AnimatedNumber = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 300,
}: Props) => {
  const [display, setDisplay] = useState<number>(value);
  const startRef = useRef<number>(value);      // 动画起始值
  const startTimeRef = useRef<number>(0);          // 动画开始时间戳
  const rafRef = useRef<number>(0);          // requestAnimationFrame ID

  useEffect(() => {
    // 目标值未变化 → 跳过
    if (startRef.current === value) return;

    cancelAnimationFrame(rafRef.current);
    startRef.current = display;                  // 以当前显示值作为新动画起点
    startTimeRef.current = 0;

    // easeOutCubic：加速快、减速慢
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = ease(t);
      const current = startRef.current + (value - startRef.current) * eased;
      setDisplay(Number(current.toFixed(decimals)));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);                   // 确保最后一帧精确命中目标值
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, decimals, duration]);

  // 显示格式（decimals 位小数 + 前后缀）
  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toString();

  return (
    <span
      className="animated-num"
      style={{ display: 'inline-block', transition: 'opacity 0.15s' }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
