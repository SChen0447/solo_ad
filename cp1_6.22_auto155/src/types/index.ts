export interface Action {
  id: string;
  name: string;
  muscle: string;
  description: string;
  difficulty: number;
  duration: number;
  sets: number;
  gifUrl?: string;
}

export type MuscleGroup = '胸' | '背' | '腿' | '肩' | '臂' | '核心';

export const MUSCLE_GROUPS: MuscleGroup[] = ['胸', '背', '腿', '肩', '臂', '核心'];
