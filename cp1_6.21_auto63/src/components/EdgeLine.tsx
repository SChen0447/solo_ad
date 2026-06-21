import { FC, useMemo } from 'react';
import { Line } from 'react-konva';

interface EdgeLineProps {
  points: number[];
  stroke?: string;
  strokeWidth?: number;
}

const EdgeLine: FC<EdgeLineProps> = ({
  points,
  stroke = '#90a4ae',
  strokeWidth = 2,
}) => {
  const validatedPoints = useMemo(() => {
    if (!points || points.length < 4) {
      return [0, 0, 0, 0];
    }
    return points;
  }, [points]);

  return (
    <Line
      points={validatedPoints}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      bezier={false}
      hitStrokeWidth={10}
    />
  );
};

export default EdgeLine;
