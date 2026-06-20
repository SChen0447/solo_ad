import React, { useState } from 'react';
import RoomList from './components/RoomList';
import GamePage from './components/GamePage';
import { JoinResult } from './api/gameApi';

const App: React.FC = () => {
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);

  return (
    <div style={{ fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` }}>
      {joinResult ? (
        <GamePage
          joinResult={joinResult}
          onExit={() => setJoinResult(null)}
        />
      ) : (
        <RoomList onJoinedRoom={(r) => setJoinResult(r)} />
      )}
    </div>
  );
};

export default App;
