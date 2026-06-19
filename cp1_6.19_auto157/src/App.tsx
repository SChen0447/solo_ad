import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Timeline from './components/Timeline';
import CardPanel from './components/CardPanel';
import {
  TimelineEngine,
  TimelineNode,
  TimelineData,
  HistoryEvent,
  CIVILIZATION_COLORS
} from './engine/TimelineEngine';

const App: React.FC = () => {
  const engineRef = useRef<TimelineEngine>(new TimelineEngine());
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width <= 1200);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchKeyword(searchInput);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  const timelineData: TimelineData = useMemo(() => {
    const engine = engineRef.current;
    if (searchKeyword.trim()) {
      const filteredEvents = engine.searchEvents(searchKeyword);
      return engine.generateTimelineData(filteredEvents);
    }
    return engine.generateTimelineData();
  }, [searchKeyword]);

  const handleNodeClick = useCallback((node: TimelineNode) => {
    setSelectedNode(node);
    setSelectedEvent(node.event);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedEvent(null);
    setSelectedNode(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchKeyword('');
  }, []);

  const civilizationStats = useMemo(() => {
    const stats: Record<string, number> = {};
    const allEvents = engineRef.current.getAllEvents();
    allEvents.forEach(event => {
      stats[event.civilization] = (stats[event.civilization] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, count]) => ({
        name,
        count,
        color: CIVILIZATION_COLORS[name] || '#888888'
      }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const headerPaddingTop = isMobile ? '60px' : isTablet ? '24px' : '32px';
  const headerPaddingX = isMobile ? '16px' : isTablet ? '24px' : '40px';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0a0e1a 0%, #0f1628 50%, #0a1420 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          padding: `${headerPaddingTop} ${headerPaddingX} ${isMobile ? '16px' : '24px'}`,
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: isMobile
            ? 'linear-gradient(180deg, #0a0e1a 0%, rgba(10,14,26,0.95) 80%, transparent 100%)'
            : 'transparent',
          backdropFilter: isMobile ? 'blur(10px)' : 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '14px' : '20px',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : '0'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '10px' : '14px'
            }}
          >
            <div
              style={{
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2a5a8c 0%, #1a4a6c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '18px' : '22px',
                boxShadow: '0 4px 14px rgba(42, 90, 140, 0.4)'
              }}
            >
              📜
            </div>
            <div>
              <h1
                style={{
                  fontSize: isMobile ? '20px' : isTablet ? '22px' : '28px',
                  fontWeight: '800',
                  background: 'linear-gradient(90deg, #64b4ff 0%, #a0d8ff 50%, #64b4ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '1px',
                  textAlign: isMobile ? 'center' : 'left'
                }}
              >
                文明年鉴
              </h1>
              <p
                style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: 'rgba(224, 224, 224, 0.5)',
                  marginTop: '2px',
                  textAlign: isMobile ? 'center' : 'left'
                }}
              >
                交互式历史时间轴 · 公元前3000年 - 公元2000年
              </p>
            </div>
          </div>

          {!isMobile && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
              }}
            >
              {civilizationStats.map(stat => (
                <div
                  key={stat.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: `${stat.color}15`,
                    border: `1px solid ${stat.color}30`
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: stat.color,
                      boxShadow: `0 0 6px ${stat.color}`
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: stat.color,
                      fontWeight: '500'
                    }}
                  >
                    {stat.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'rgba(224, 224, 224, 0.5)',
                      fontWeight: '600'
                    }}
                  >
                    {stat.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'relative',
            maxWidth: isMobile ? '100%' : '560px',
            margin: isMobile ? '0' : '0 auto'
          }}
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索历史事件..."
            style={{
              width: '100%',
              padding: isMobile
                ? '12px 44px 12px 44px'
                : '14px 50px 14px 50px',
              fontSize: isMobile ? '14px' : '15px',
              color: '#e0e0e0',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: isMobile ? '10px' : '12px',
              outline: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(100, 180, 255, 0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(100, 180, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: isMobile ? '14px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: isMobile ? '16px' : '18px',
              opacity: 0.5
            }}
          >
            🔍
          </span>
          {searchInput && (
            <button
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: isMobile ? '10px' : '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                lineHeight: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              ✕
            </button>
          )}
        </div>

        {searchKeyword && (
          <div
            style={{
              textAlign: 'center',
              marginTop: '10px',
              fontSize: '12px',
              color: 'rgba(224, 224, 224, 0.5)'
            }}
          >
            找到 <span style={{ color: '#64b4ff', fontWeight: '600' }}>{timelineData.nodes.length}</span> 条与 "
            <span style={{ color: '#a0d8ff' }}>{searchKeyword}</span>" 相关的事件
          </div>
        )}
      </header>

      <main
        style={{
          flex: '1',
          padding: isMobile
            ? '160px 12px 24px'
            : isTablet
              ? '16px 24px 32px'
              : '24px 40px 48px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : isTablet ? '20px 0' : '40px 0',
            overflow: isMobile ? 'auto' : 'visible'
          }}
        >
          <Timeline
            timelineData={timelineData}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNode?.id}
            searchKeyword={searchKeyword}
          />
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: isMobile ? '12px 0 0' : '16px 0 0',
            fontSize: isMobile ? '11px' : '13px',
            color: 'rgba(224, 224, 224, 0.35)',
            flexShrink: 0
          }}
        >
          {isMobile
            ? '点击事件节点查看详情 · 上下滚动浏览时间轴'
            : '点击彩色节点查看历史事件详情 · 鼠标悬停可快速预览'}
        </div>
      </main>

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '20px',
            background: 'rgba(10, 14, 26, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 90
          }}
        >
          {civilizationStats.slice(0, 4).map(stat => (
            <div
              key={stat.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: stat.color
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  color: 'rgba(224, 224, 224, 0.6)'
                }}
              >
                {stat.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <CardPanel
        selectedEvent={selectedEvent}
        onClose={handleCloseCard}
      />
    </div>
  );
};

export default App;
