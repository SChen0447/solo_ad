import { useEffect, useState } from "react";

interface ProgressRingProps {
  radius: number;
  stroke: number;
  progress: number;
  remaining: number;
  total: number;
  size?: number;
}

export default function ProgressRing({
  radius,
  stroke,
  progress,
  remaining,
  total,
  size = 48,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - animatedProgress * circumference;

  const color =
    progress > 0.5 ? "#4CAF50" : progress >= 0.1 ? "#FF9800" : "#F44336";

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 50);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg height={size} width={size} className="transform -rotate-90">
        <circle
          stroke="#E0D5C8"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          style={{
            transition: "stroke-dashoffset 1s ease-out, stroke 0.3s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold leading-none" style={{ color }}>
          {remaining}
        </span>
        <span className="text-[7px] leading-none text-gray-500">/{total}</span>
      </div>
    </div>
  );
}
