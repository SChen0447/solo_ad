import { useEffect, useRef, useCallback } from 'react';
import { Game } from '../game';
import { GameState } from '../game/entities';

interface GameCanvasProps {
  onStateUpdate: (state: GameState) => void;
  gameRef: React.MutableRefObject<Game | null>;
}

export default function GameCanvas({ onStateUpdate, gameRef }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStateUpdate = useCallback(
    (state: GameState) => {
      onStateUpdate(state);
    },
    [onStateUpdate],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (gameRef.current) {
        gameRef.current.resize(rect.width, rect.height);
      }
    };

    resize();

    const game = new Game(canvas);
    gameRef.current = game;
    game.addListener(handleStateUpdate);
    game.start();

    window.addEventListener('resize', resize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      game.setKey(e.key, true);
      if (e.key.toLowerCase() === 'r' && game.state.gameOver) {
        game.reset();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      game.setKey(e.key, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      game.removeListener(handleStateUpdate);
      game.stop();
    };
  }, [handleStateUpdate, gameRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated' as const,
        }}
      />
    </div>
  );
}
