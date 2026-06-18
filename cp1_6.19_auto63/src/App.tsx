import React, { useEffect, useState } from 'react';
import RunePanel from './components/RunePanel';
import PlantCanvas from './components/PlantCanvas';
import ControlBar from './components/ControlBar';

const isMobileQuery = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(isMobileQuery());

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0a0a1a',
        }}
      >
        <div style={{ height: '30%', minHeight: 180, flexShrink: 0 }}>
          <RunePanel />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <PlantCanvas />
        </div>
        <ControlBar />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0a0a1a',
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: '30%', minWidth: 260, flexShrink: 0 }}>
          <RunePanel />
        </div>
        <div style={{ flex: 1, minWidth: 0, background: '#16213e' }}>
          <PlantCanvas />
        </div>
      </div>
      <ControlBar />
    </div>
  );
};

export default App;
