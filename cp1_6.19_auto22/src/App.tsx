import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import PortScene from './port/PortScene';
import BattleScene from './battle/BattleScene';
import './index.css';

function App() {
  const { currentScene, initGame } = useGameStore();

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="app">
      {currentScene === 'port' && <PortScene />}
      {currentScene === 'battle' && <BattleScene />}
    </div>
  );
}

export default App;
