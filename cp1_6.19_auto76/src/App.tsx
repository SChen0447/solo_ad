import { SceneManager } from './scene/SceneManager';
import { ControlPanel } from './ui/ControlPanel';
import { InfoOverlay } from './ui/InfoOverlay';
import { MiniMap } from './ui/MiniMap';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <div className="scene-container">
        <SceneManager />
      </div>

      <InfoOverlay />
      <ControlPanel />
      <MiniMap />

      <div className="app-header">
        <h1 className="app-title">
          <span className="title-icon">✈</span>
          无人机城市物流调度系统
        </h1>
        <p className="app-subtitle">Smart City Drone Logistics Visualization</p>
      </div>
    </div>
  );
}

export default App;
