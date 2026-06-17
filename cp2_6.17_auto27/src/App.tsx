import { useEffect, useRef, useState } from 'react';
import { SceneManager } from './SceneManager';
import { LightEditor } from './LightEditor';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const sm = new SceneManager(containerRef.current, () => {});
    setSceneManager(sm);
    return () => {
      sm.dispose();
    };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <LightEditor sceneManager={sceneManager} />
    </div>
  );
}
