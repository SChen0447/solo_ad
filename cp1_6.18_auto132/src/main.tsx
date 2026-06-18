import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import CaveScene from './components/CaveScene';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';

function LoadingFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#5588ff',
        fontFamily: 'monospace',
        fontSize: '18px',
        zIndex: 1000,
      }}
    >
      加载洞穴引擎...
    </div>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Suspense fallback={<LoadingFallback />}>
        <CaveScene />
      </Suspense>
      <ControlPanel />
      <InfoPanel />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
