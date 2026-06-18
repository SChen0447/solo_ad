import { useEffect, useRef } from 'react';
import { Game, CANVAS_WIDTH, CANVAS_HEIGHT } from './Game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.start();

    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        borderRadius: '6px',
        boxShadow: '0 0 20px #00000033',
        cursor: 'crosshair',
      }}
    />
  );
}
