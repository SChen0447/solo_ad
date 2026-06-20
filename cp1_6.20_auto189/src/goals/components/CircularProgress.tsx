interface CircularProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgress = ({ current, target, size = 80, strokeWidth = 4 }: CircularProgressProps) => {
  const percent = Math.min((current / target) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  const getColor = (p: number) => {
    if (p < 33) return '#ff4757';
    if (p < 66) return '#ffa502';
    return '#2ed573';
  };

  const color = getColor(percent);

  return (
    <svg width={size} height={size} className="circular-progress">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-color)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill="var(--text-primary)"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
};

export default CircularProgress;
