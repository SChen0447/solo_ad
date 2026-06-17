import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import InspirationCard from './InspirationCard';
import SearchBox from './SearchBox';

const HomePage: React.FC = () => {
  const { inspirations, tags, isLoading, fetchInspirations, fetchTags, openDetail } = useStore();
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    fetchInspirations();
    fetchTags();
  }, [fetchInspirations, fetchTags]);

  const filteredInspirations = useMemo(() => {
    if (!searchKeyword.trim()) return inspirations;
    
    const keyword = searchKeyword.toLowerCase().trim();
    return inspirations.filter(ins =>
      ins.title.toLowerCase().includes(keyword) ||
      ins.content.toLowerCase().includes(keyword) ||
      ins.tags.some(tag => tag.toLowerCase().includes(keyword))
    );
  }, [inspirations, searchKeyword]);

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  if (isLoading && inspirations.length === 0) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">灵感碎片</h1>
          <p className="page-description">记录每一个一闪而过的创意火花</p>
        </div>
        <SearchBox onSearch={handleSearch} />
      </div>

      {filteredInspirations.length === 0 ? (
        <div className="empty-state">
          {searchKeyword ? '没有找到匹配的灵感' : '还没有灵感，开始记录你的第一个创意吧！'}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredInspirations.map(inspiration => (
            <InspirationCard
              key={inspiration.id}
              inspiration={inspiration}
              tags={tags}
              onClick={() => openDetail(inspiration.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
