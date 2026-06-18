import React from 'react';
import { FilterBar } from './components/FilterBar';
import { Gallery } from './components/Gallery';
import { Slideshow } from './components/Slideshow';

const appStyles: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#1a1a2e',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: '#e0e0e0',
};

const App: React.FC = () => {
  return (
    <div style={appStyles}>
      <FilterBar />
      <Gallery />
      <Slideshow />
    </div>
  );
};

export default App;
