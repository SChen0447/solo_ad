import StarScene from './components/StarScene';
import ControlPanel from './components/ControlPanel';
import InfoOverlay from './components/InfoOverlay';

export default function App() {
  return (
    <div className="app-container">
      <div className="scene-wrapper">
        <StarScene />
        <InfoOverlay />
      </div>
      <ControlPanel />
    </div>
  );
}
