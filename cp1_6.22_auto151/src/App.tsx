import { useEffect, useState } from 'react';
import { TimbrePanel } from '@/timbre/TimbrePanel';
import { Keyboard } from '@/notes/Keyboard';
import { RecorderControl } from '@/recorder/RecorderControl';
import { MixerPanel } from '@/mixer/MixerPanel';
import { audioEngine } from '@/audio/AudioEngine';
import './App.css';

function App() {
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    const handleFirstInteraction = async () => {
      await audioEngine.initAudio();
      setAudioReady(true);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__logo">
          <span className="app__logo-icon">🎵</span>
          <span className="app__logo-text">SynthStudio</span>
          <span className="app__logo-subtitle">合成器工作室</span>
        </div>
        <div className="app__status">
          {audioReady ? (
            <span className="status-badge status-badge--ready">
              <span className="status-badge__dot" />
              音频已就绪
            </span>
          ) : (
            <span className="status-badge status-badge--pending">
              <span className="status-badge__dot status-badge__dot--pulse" />
              点击任意位置激活音频
            </span>
          )}
        </div>
      </header>

      <main className="app__main">
        <section className="app__keyboard">
          <div className="panel panel--keyboard">
            <Keyboard />
          </div>
        </section>

        <aside className="app__mixer">
          <div className="panel panel--mixer">
            <MixerPanel />
          </div>
        </aside>
      </main>

      <footer className="app__controls">
        <div className="panel panel--controls">
          <div className="controls__row">
            <TimbrePanel />
          </div>
          <div className="controls__row">
            <RecorderControl />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
