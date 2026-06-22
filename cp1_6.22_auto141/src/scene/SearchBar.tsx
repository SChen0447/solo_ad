import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CELESTIAL_BODIES } from '../data/celestialBodies';
import type { CelestialBody } from '../types';

interface SearchBarProps {
  onSelect: (body: CelestialBody) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = query.trim()
    ? CELESTIAL_BODIES.filter((body) => {
        const q = query.toLowerCase();
        return (
          body.name.toLowerCase().includes(q) ||
          body.alias.some((a) => a.toLowerCase().includes(q))
        );
      }).slice(0, 5)
    : [];

  const handleSelect = (body: CelestialBody) => {
    onSelect(body);
    setQuery(body.name);
    setShowResults(false);
  };

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="搜索天体..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((body) => (
            <div
              key={body.id}
              className="search-result-item"
              onClick={() => handleSelect(body)}
            >
              <div
                className="search-thumb"
                style={{ backgroundColor: body.baseColor }}
              />
              <div className="search-result-info">
                <div className="search-result-name">{body.name}</div>
                <div className="search-result-type">{body.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
