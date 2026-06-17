import { useFPS } from '@/hooks/useFPS';

interface FPSCounterProps {
  onLowFPS?: (fps: number) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function FPSCounter({ 
  onLowFPS, 
  position = 'top-right' 
}: FPSCounterProps) {
  const { fps } = useFPS({ onLowFPS });

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const isLow = fps < 30;
  const isMedium = fps >= 30 && fps < 50;

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 px-3 py-2 rounded-lg text-sm font-mono backdrop-blur-md bg-white/10 border border-white/20 transition-all duration-300`}
      style={{
        boxShadow: isLow 
          ? '0 0 10px rgba(255, 107, 107, 0.5)' 
          : '0 0 10px rgba(79, 195, 247, 0.3)',
      }}
    >
      <span className="text-white/70 text-xs mr-1">FPS</span>
      <span
        className={`font-bold transition-colors duration-300 ${
          isLow ? 'text-red-400' : isMedium ? 'text-yellow-400' : 'text-white'
        }`}
        style={{
          textShadow: isLow 
            ? '0 0 8px rgba(255, 107, 107, 0.8)' 
            : '0 0 8px rgba(79, 195, 247, 0.5)',
        }}
      >
        {fps}
      </span>
    </div>
  );
}
