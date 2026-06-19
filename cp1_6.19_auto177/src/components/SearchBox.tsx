import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { oceanCurrents } from '../data/oceanData';

function SearchBox() {
  const { searchQuery, setSearchQuery, setSelectedCurrent } = useStore();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredCurrents = oceanCurrents.filter(
    (c) =>
      searchQuery &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (currentId: string) => {
    const current = oceanCurrents.find((c) => c.id === currentId);
    if (current) {
      setSelectedCurrent(current);
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedCurrent(null);
    setShowSuggestions(false);
  };

  return (
    <div className="fixed right-4 md:right-6 bottom-4 md:bottom-4 z-40 w-full md:w-64">
      <div
        className={`glass-panel rounded-xl transition-all duration-300 ${
          isFocused ? 'ring-2 ring-ocean-500/50' : ''
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="搜索洋流名称..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>

        {showSuggestions && filteredCurrents.length > 0 && (
          <div className="border-t border-white/10 max-h-48 overflow-y-auto">
            {filteredCurrents.map((current) => (
              <button
                key={current.id}
                onClick={() => handleSelect(current.id)}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: current.colorStart }}
                />
                <div>
                  <p className="text-sm text-white font-medium">
                    {current.name}
                  </p>
                  <p className="text-xs text-gray-500">{current.nameEn}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchBox;
