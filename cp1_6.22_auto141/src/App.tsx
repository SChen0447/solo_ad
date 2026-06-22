import { useState } from 'react';
import type { CelestialBody, FilterType } from './types';
import DeepSpaceScene from './scene/DeepSpaceScene';
import FilterBar from './scene/FilterBar';
import SearchBar from './scene/SearchBar';
import InfoPanel from './scene/InfoPanel';

export default function App() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('visible');
  const [focusedBody, setFocusedBody] = useState<CelestialBody | null>(null);
  const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(null);

  const handleBodyClick = (body: CelestialBody) => {
    setSelectedBody(body);
  };

  const handleSearchSelect = (body: CelestialBody) => {
    setFocusedBody(body);
  };

  const handleFocusComplete = () => {
    setFocusedBody(null);
  };

  const handleInfoClose = () => {
    setSelectedBody(null);
  };

  return (
    <div className="app-container">
      <div className="scene-container">
        <DeepSpaceScene
          selectedFilter={selectedFilter}
          focusedBody={focusedBody}
          onBodyClick={handleBodyClick}
          onFocusComplete={handleFocusComplete}
        />
      </div>

      <div className="ui-overlay">
        <div className="app-header">
          <h1 className="app-title">深空天体沙盘</h1>
        </div>

        <div className="filter-container">
          <FilterBar
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
          />
        </div>

        <div className="search-container-wrapper">
          <SearchBar onSelect={handleSearchSelect} />
        </div>
      </div>

      <InfoPanel body={selectedBody} onClose={handleInfoClose} />
    </div>
  );
}
