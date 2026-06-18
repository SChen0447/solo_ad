import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  mockRecords,
  groupByYear,
  getYears,
  findFirstRecordOfYear,
  filterByTag,
  getAllTags,
  TimelineRecord,
  YearGroup
} from './dataManager';
import NavigationPanel from './NavigationPanel';
import TimelineItem from './TimelineItem';
import TagBadge from './TagBadge';

const Timeline: React.FC = () => {
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);

  const filteredRecords = useMemo(() => {
    if (activeTag) {
      return filterByTag(mockRecords, activeTag);
    }
    return mockRecords;
  }, [activeTag]);

  const allTags = useMemo(() => getAllTags(mockRecords), [activeTag]);

  const yearsWithCount = useMemo(() => {
    return getYears(filteredRecords).map(year => ({
      year,
      count: filteredRecords.filter(r => new Date(r.date).getFullYear() === year).length
    }));
  }, [filteredRecords]);

  const allCollapsed = useMemo(() => {
    if (yearGroups.length === 0) return false;
    return yearGroups.every(g => g.collapsed);
  }, [yearGroups]);

  useEffect(() => {
    const groups = groupByYear(filteredRecords);
    setYearGroups(groups.map(g => ({ ...g, collapsed: false })));
    if (groups.length > 0) {
      setActiveYear(groups[0].year);
    }
  }, [filteredRecords]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      let currentYear: number | null = null;

      for (const group of yearGroups) {
        if (group.collapsed) continue;
        const firstRecord = findFirstRecordOfYear(filteredRecords, group.year);
        if (firstRecord) {
          const element = document.getElementById(`record-${firstRecord.id}`);
          if (element) {
            const elementTop = element.offsetTop;
            if (elementTop <= scrollPosition) {
              currentYear = group.year;
            }
          }
        }
      }

      if (currentYear !== null && currentYear !== activeYear) {
        setActiveYear(currentYear);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [yearGroups, filteredRecords, activeYear]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.timeline-card') &&
        !target.closest('.navigation-panel') &&
        !target.closest('.tag-filter-bar') &&
        expandedId !== null
      ) {
        setExpandedId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [expandedId]);

  const handleYearClick = useCallback((year: number) => {
    const firstRecord = findFirstRecordOfYear(filteredRecords, year);
    if (firstRecord) {
      const element = document.getElementById(`record-${firstRecord.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setActiveYear(year);
  }, [filteredRecords]);

  const handleToggleAll = useCallback(() => {
    const newCollapsed = !allCollapsed;
    setYearGroups(prev => prev.map(g => ({ ...g, collapsed: newCollapsed })));
  }, [allCollapsed]);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag(prev => prev === tag ? null : tag);
    setExpandedId(null);
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveTag(null);
  }, []);

  const handleExpand = useCallback((id: string | null) => {
    setExpandedId(id);
  }, []);

  const handleToggleYearGroup = useCallback((year: number) => {
    setYearGroups(prev =>
      prev.map(g => (g.year === year ? { ...g, collapsed: !g.collapsed } : g))
    );
  }, []);

  return (
    <div>
      <header className="app-header">
        <span>📅 时间线回廊</span>
      </header>

      <NavigationPanel
        years={yearsWithCount}
        activeYear={activeYear}
        allCollapsed={allCollapsed}
        onYearClick={handleYearClick}
        onToggleAll={handleToggleAll}
      />

      <main className="timeline-container">
        <div className="timeline-main-line" />

        <div className="tag-filter-bar">
          <span className="tag-filter-label">筛选标签:</span>
          {allTags.map(tag => (
            <TagBadge
              key={tag}
              tag={tag}
              isActive={activeTag === tag}
              onClick={handleTagClick}
            />
          ))}
          {activeTag && (
            <span className="clear-filter-btn" onClick={handleClearFilter}>
              清除筛选
            </span>
          )}
        </div>

        {yearGroups.length === 0 ? (
          <div className="no-results">
            <p>暂无符合条件的记录</p>
          </div>
        ) : (
          yearGroups.map(group => (
            <div
              key={group.year}
              className={`year-group ${group.collapsed ? 'collapsed' : ''}`}
            >
              <div
                className="year-group-header"
                onClick={() => handleToggleYearGroup(group.year)}
              >
                <h2 className="year-group-title">
                  {group.year}
                  <span className="year-group-arrow">▼</span>
                </h2>
              </div>
              <div className="year-group-records">
                {group.records.map((record: TimelineRecord) => (
                  <TimelineItem
                    key={record.id}
                    record={record}
                    isActiveYear={new Date(record.date).getFullYear() === activeYear}
                    activeTag={activeTag}
                    onTagClick={handleTagClick}
                    onExpand={handleExpand}
                    expandedId={expandedId}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Timeline;
