import { useGameStore } from '@/store/GameStore';
import Editor from '@/editor/Editor';
import Battle from '@/battle/Battle';

export default function App() {
  const gamePhase = useGameStore((s) => s.gamePhase);

  return (
    <div className="app-root">
      {gamePhase === 'editor' && <Editor />}
      {(gamePhase === 'battle' || gamePhase === 'victory' || gamePhase === 'defeat') && <Battle />}
    </div>
  );
}
