import type { StoryCardData, TransitionType } from '@/types';

type TransitionPhase = 'enter' | 'hold' | 'exit';

type PlaybackCallback = (info: {
  currentIndex: number;
  progress: number;
  cardProgress: number;
  transitionPhase: TransitionPhase;
  isComplete: boolean;
}) => void;

interface AnimationState {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  startTime: number;
  pauseTime: number;
  rafId: number | null;
  cards: StoryCardData[];
  onPlayback: PlaybackCallback | null;
  transitionDuration: number;
}

const state: AnimationState = {
  isPlaying: false,
  isPaused: false,
  currentIndex: 0,
  startTime: 0,
  pauseTime: 0,
  rafId: null,
  cards: [],
  onPlayback: null,
  transitionDuration: 500,
};

export function getTransitionAnimName(
  type: TransitionType,
  phase: TransitionPhase
): string {
  if (phase === 'exit') {
    return 'pfadeOutExit';
  }
  switch (type) {
    case 'fadeInOut':
      return 'pfadeIn';
    case 'slideUp':
      return 'pslideUp';
    case 'slideDown':
      return 'pslideDown';
    case 'slideLeft':
      return 'pslideLeft';
    case 'slideRight':
      return 'pslideRight';
    case 'zoom':
      return 'pzoom';
    default:
      return 'pfadeIn';
  }
}

function computeProgress(elapsed: number, cards: StoryCardData[]): {
  currentIndex: number;
  cardProgress: number;
  transitionPhase: TransitionPhase;
  overallProgress: number;
  isComplete: boolean;
} {
  if (cards.length === 0) {
    return { currentIndex: 0, cardProgress: 1, transitionPhase: 'hold', overallProgress: 1, isComplete: true };
  }
  const totalDuration = cards.reduce((s, c) => s + c.duration * 1000, 0);
  const overallProgress = Math.min(elapsed / totalDuration, 1);

  let acc = 0;
  let currentIndex = 0;
  let cardElapsed = 0;
  for (let i = 0; i < cards.length; i++) {
    const cd = cards[i].duration * 1000;
    if (elapsed < acc + cd) {
      currentIndex = i;
      cardElapsed = elapsed - acc;
      break;
    }
    acc += cd;
    if (i === cards.length - 1) {
      currentIndex = i;
      cardElapsed = cd;
    }
  }

  const card = cards[currentIndex];
  const cardDur = card.duration * 1000;
  const cardProgress = Math.min(cardElapsed / cardDur, 1);
  const transMs = Math.min(state.transitionDuration, cardDur / 2);

  let transitionPhase: TransitionPhase = 'hold';
  if (cardElapsed < transMs) {
    transitionPhase = 'enter';
  } else if (cardElapsed > cardDur - transMs && currentIndex < cards.length - 1) {
    transitionPhase = 'exit';
  }

  return {
    currentIndex,
    cardProgress,
    transitionPhase,
    overallProgress,
    isComplete: overallProgress >= 1,
  };
}

function tick(timestamp: number) {
  if (!state.isPlaying || state.isPaused) return;

  const elapsed = timestamp - state.startTime;
  const result = computeProgress(elapsed, state.cards);
  state.currentIndex = result.currentIndex;

  state.onPlayback?.({
    currentIndex: result.currentIndex,
    progress: result.overallProgress,
    cardProgress: result.cardProgress,
    transitionPhase: result.transitionPhase,
    isComplete: result.isComplete,
  });

  if (result.isComplete) {
    state.isPlaying = false;
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    return;
  }

  state.rafId = requestAnimationFrame(tick);
}

export function playSequence(
  cards: StoryCardData[],
  options?: {
    transitionDuration?: number;
    onPlayback?: PlaybackCallback;
    startIndex?: number;
  }
) {
  stopSequence();
  state.cards = cards;
  state.isPlaying = true;
  state.isPaused = false;
  state.onPlayback = options?.onPlayback ?? null;
  state.transitionDuration = options?.transitionDuration ?? 500;

  let offsetMs = 0;
  const startIdx = options?.startIndex ?? 0;
  for (let i = 0; i < startIdx && i < cards.length; i++) {
    offsetMs += cards[i].duration * 1000;
  }
  state.startTime = performance.now() - offsetMs;
  state.currentIndex = startIdx;
  state.rafId = requestAnimationFrame(tick);
}

export function pause(): void {
  if (!state.isPlaying || state.isPaused) return;
  state.isPaused = true;
  state.pauseTime = performance.now();
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

export function resume(): void {
  if (!state.isPlaying || !state.isPaused) return;
  state.isPaused = false;
  const pauseDur = performance.now() - state.pauseTime;
  state.startTime += pauseDur;
  state.rafId = requestAnimationFrame(tick);
}

export function stopSequence(): void {
  state.isPlaying = false;
  state.isPaused = false;
  state.currentIndex = 0;
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

export function seekToCard(index: number): void {
  if (!state.cards.length) return;
  let target = 0;
  for (let i = 0; i < index && i < state.cards.length; i++) {
    target += state.cards[i].duration * 1000;
  }
  state.startTime = performance.now() - target;
  state.currentIndex = index;
  if (state.isPlaying && !state.isPaused) {
    if (state.rafId !== null) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(tick);
  }
}

export function skipForward(): void {
  seekToCard(Math.min(state.currentIndex + 1, state.cards.length - 1));
}

export function skipBackward(): void {
  seekToCard(Math.max(state.currentIndex - 1, 0));
}

export function isEnginePlaying(): boolean {
  return state.isPlaying && !state.isPaused;
}

export function isEnginePaused(): boolean {
  return state.isPaused;
}
