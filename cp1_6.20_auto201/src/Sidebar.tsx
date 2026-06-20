import { Constellation } from './constellationData';
import './Sidebar.css';

interface SidebarProps {
  constellations: Constellation[];
  selectedConstellation: Constellation | null;
  onSelectConstellation: (constellation: Constellation) => void;
}

const Sidebar = ({ constellations, selectedConstellation, onSelectConstellation }: SidebarProps) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">✨ 88星座</h1>
        <p className="sidebar-subtitle">点击星座探索星空</p>
      </div>
      <div className="constellation-list">
        {constellations.map((constellation) => (
          <div
            key={constellation.id}
            className={`constellation-item ${selectedConstellation?.id === constellation.id ? 'selected' : ''}`}
            onClick={() => onSelectConstellation(constellation)}
          >
            <span className="constellation-name">{constellation.name}</span>
            <span className="constellation-latin">{constellation.latinName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
