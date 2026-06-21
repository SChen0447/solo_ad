import React from 'react';
import PoemFall from './PoemFall';
import MusicPlayer from './MusicPlayer';

const App: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#2E1A11',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PoemFall />
      <MusicPlayer />
    </div>
  );
};

export default App;
