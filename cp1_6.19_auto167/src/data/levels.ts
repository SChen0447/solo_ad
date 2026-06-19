import type { Level, ForceField } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

const makeField = (
  type: ForceField['type'],
  x: number,
  y: number,
  strength: number,
  angle: number,
  radius: number = 150
): ForceField => ({
  id: uuidv4(),
  type,
  position: { x, y },
  strength,
  angle,
  radius,
});

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '简单：初识重力',
    difficulty: 'easy',
    ballStart: { x: 80, y: 250 },
    initialVelocity: { x: 5, y: 0 },
    target: {
      type: 'circle',
      position: { x: 650, y: 380 },
      size: { radius: 40 },
    },
    fields: [
      makeField('gravity', 400, 400, 12, 90, 180),
    ],
  },
  {
    id: 2,
    name: '中等：磁力偏转',
    difficulty: 'medium',
    ballStart: { x: 80, y: 250 },
    initialVelocity: { x: 6, y: 0 },
    target: {
      type: 'circle',
      position: { x: 700, y: 120 },
      size: { radius: 35 },
    },
    fields: [
      makeField('gravity', 400, 450, 10, 90, 200),
      makeField('magnetic', 450, 200, 35, 0, 140),
    ],
  },
  {
    id: 3,
    name: '困难：弹力反弹',
    difficulty: 'hard',
    ballStart: { x: 80, y: 420 },
    initialVelocity: { x: 5, y: -2 },
    target: {
      type: 'rectangle',
      position: { x: 700, y: 80 },
      size: { width: 80, height: 60 },
    },
    fields: [
      makeField('gravity', 400, 500, 8, 90, 250),
      makeField('magnetic', 300, 200, 28, 45, 120),
      makeField('elastic', 600, 300, 150, 180, 130),
    ],
  },
];

export const getLevelById = (id: number): Level | undefined => {
  return LEVELS.find((l) => l.id === id);
};

export const cloneLevel = (level: Level): Level => {
  return {
    ...level,
    ballStart: { ...level.ballStart },
    initialVelocity: { ...level.initialVelocity },
    target: {
      ...level.target,
      position: { ...level.target.position },
      size: { ...level.target.size },
    },
    fields: level.fields.map((f) => ({
      ...f,
      position: { ...f.position },
    })),
  };
};
