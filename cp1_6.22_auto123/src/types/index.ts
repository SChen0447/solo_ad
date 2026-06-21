export type TimerPhase = 'idle' | 'focus' | 'rest';

export type TimerState = {
  phase: TimerPhase;
  isRunning: boolean;
  timeRemaining: number;
  duration: number;
};

export type StretchAction = 'idle' | 'headTurn' | 'armRaise' | 'sideBend';

export type PostureTip = '挺直背部' | '放松肩膀' | '调整坐姿' | '活动颈部';

export type HistoryRecord = {
  date: string;
  completedSessions: number;
};

export type AppState = {
  timer: TimerState;
  postureMode: boolean;
  currentAction: StretchAction;
  showRestModal: boolean;
  showHistoryPanel: boolean;
  history: HistoryRecord[];
  currentTip: PostureTip;
};

export type AnimationConfig = {
  name: StretchAction;
  duration: number;
  label: string;
  description: string;
};

export const ANIMATION_CONFIGS: AnimationConfig[] = [
  { name: 'headTurn', duration: 2, label: '转头运动', description: '缓慢左右转动头部，放松颈部肌肉' },
  { name: 'armRaise', duration: 1.5, label: '抬手伸展', description: '抬起手臂至与地面平行，拉伸肩部' },
  { name: 'sideBend', duration: 2, label: '侧腰拉伸', description: '躯干向两侧弯曲，伸展腰部肌肉' },
];

export const FOCUS_DURATION = 25 * 60;
export const REST_DURATION = 5 * 60;

export const POSTURE_TIPS: PostureTip[] = ['挺直背部', '放松肩膀', '调整坐姿', '活动颈部'];
