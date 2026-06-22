import { memo, useMemo, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { AnimationConfig, ANIMATION_TYPE_LABELS, EASING_LABELS } from '@/types/animation';

interface AnimationBoxProps {
  animation: AnimationConfig;
  seekTime: number;
  isPlaying: boolean;
  isSelected: boolean;
  isSeeking: boolean;
  playKey: number;
  onClick: () => void;
}

const translateKeyframes = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(40px); }
`;

const rotateKeyframes = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const scaleKeyframes = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
`;

const colorKeyframes = keyframes`
  0% { background: #8B5CF6; }
  50% { background: #3B82F6; }
  100% { background: #8B5CF6; }
`;

const bounceKeyframes = keyframes`
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-30px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-15px); }
`;

const getAnimationName = (type: string) => {
  switch (type) {
    case 'translate': return translateKeyframes;
    case 'rotate': return rotateKeyframes;
    case 'scale': return scaleKeyframes;
    case 'color': return colorKeyframes;
    case 'bounce': return bounceKeyframes;
    default: return translateKeyframes;
  }
};

const BoxWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 20px;
  border-radius: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.08);
  }
`;

const BoxContainer = styled.div<{ $selected: boolean }>`
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: ${props => props.$selected ? '3px solid #8B5CF6' : '3px solid transparent'};
  border-radius: 16px;
  transition: border-color 0.2s ease;
`;

const AnimatedBox = styled.div<{
  $type: string;
  $duration: number;
  $delay: number;
  $easing: string;
  $paused: boolean;
}>`
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
  
  animation-name: ${props => getAnimationName(props.$type)};
  animation-duration: ${props => props.$duration}s;
  animation-timing-function: ${props => props.$easing};
  animation-iteration-count: infinite;
  animation-play-state: ${props => props.$paused ? 'paused' : 'running'};
  animation-fill-mode: both;
`;

const BoxInfo = styled.div`
  text-align: center;
`;

const BoxName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 4px;
`;

const BoxParams = styled.div`
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
`;

const ParamBadge = styled.span`
  display: inline-block;
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 2px;
  font-size: 11px;
  color: #4B5563;
  font-family: monospace;
`;

const AnimationBox = ({ 
  animation, 
  seekTime, 
  isPlaying, 
  isSelected, 
  isSeeking,
  playKey,
  onClick 
}: AnimationBoxProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const wasSeekingRef = useRef(false);

  const easingValue = useMemo(() => {
    if (animation.easing === 'cubic-bezier') {
      return `cubic-bezier(${animation.cubicBezier.join(', ')})`;
    }
    return animation.easing;
  }, [animation.easing, animation.cubicBezier]);

  useEffect(() => {
    if (!boxRef.current) return;

    const totalDuration = animation.duration + animation.delay;
    if (totalDuration <= 0) return;

    if (isSeeking) {
      wasSeekingRef.current = true;
      const seekOffset = seekTime % totalDuration;
      boxRef.current.style.animationDelay = `${animation.delay - seekOffset}s`;
      boxRef.current.style.animationPlayState = 'paused';
    } else if (wasSeekingRef.current && isPlaying) {
      wasSeekingRef.current = false;
      boxRef.current.style.animationPlayState = 'running';
    } else if (!isPlaying) {
      boxRef.current.style.animationPlayState = 'paused';
    } else {
      boxRef.current.style.animationPlayState = 'running';
    }
  }, [seekTime, isSeeking, isPlaying, animation.duration, animation.delay]);

  useEffect(() => {
    wasSeekingRef.current = false;
    if (boxRef.current) {
      boxRef.current.style.animationDelay = `${animation.delay}s`;
      boxRef.current.style.animationPlayState = isPlaying ? 'running' : 'paused';
    }
  }, [playKey, animation.delay, isPlaying]);

  return (
    <BoxWrapper onClick={onClick}>
      <BoxContainer $selected={isSelected}>
        <AnimatedBox
          key={playKey}
          ref={boxRef}
          $type={animation.type}
          $duration={animation.duration}
          $delay={animation.delay}
          $easing={easingValue}
          $paused={!isPlaying}
        />
      </BoxContainer>
      <BoxInfo>
        <BoxName>{animation.name}</BoxName>
        <BoxParams>
          <ParamBadge>{ANIMATION_TYPE_LABELS[animation.type]}</ParamBadge>
          <ParamBadge>{animation.duration.toFixed(1)}s</ParamBadge>
          {animation.delay > 0 && <ParamBadge>延迟 {animation.delay.toFixed(1)}s</ParamBadge>}
          <br />
          <ParamBadge>{EASING_LABELS[animation.easing]}</ParamBadge>
        </BoxParams>
      </BoxInfo>
    </BoxWrapper>
  );
};

export default memo(AnimationBox);
