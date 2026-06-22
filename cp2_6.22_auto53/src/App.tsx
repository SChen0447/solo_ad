import React, { useState } from 'react';
import Workshop from './components/Workshop';
import Race from './components/Race';
import Results from './components/Results';
import type { ShipConfig } from './modules/shipBuilder';
import './App.css';

type GameScreen = 'workshop' | 'race' | 'results';

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('workshop');
  const [shipConfig, setShipConfig] = useState<ShipConfig | null>(null);
  const [finalRank, setFinalRank] = useState(1);
  const [finalTime, setFinalTime] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const handleStartRace = (config: ShipConfig) => {
    setShipConfig(config);
    setTransitioning(true);
    setTimeout(() => {
      setScreen('race');
      setTransitioning(false);
    }, 300);
  };

  const handleRaceEnd = (rank: number, time: number) => {
    setFinalRank(rank);
    setFinalTime(time);
    setTransitioning(true);
    setTimeout(() => {
      setScreen('results');
      setTransitioning(false);
    }, 500);
  };

  const handleRestart = () => {
    setTransitioning(true);
    setTimeout(() => {
      setScreen('race');
      setTransitioning(false);
    }, 300);
  };

  const handleBackToWorkshop = () => {
    setTransitioning(true);
    setTimeout(() => {
      setScreen('workshop');
      setTransitioning(false);
    }, 300);
  };

  return (
    <div className={`app-container ${transitioning ? 'transitioning' : ''}`}>
      {screen === 'workshop' && <Workshop onStartRace={handleStartRace} />}
      {screen === 'race' && shipConfig && (
        <Race
          shipConfig={shipConfig}
          onRaceEnd={handleRaceEnd}
          onBackToWorkshop={handleBackToWorkshop}
        />
      )}
      {screen === 'results' && (
        <Results
          rank={finalRank}
          time={finalTime}
          onRestart={handleRestart}
          onBackToWorkshop={handleBackToWorkshop}
        />
      )}
    </div>
  );
};

export default App;
