import { useState, useEffect, useRef, useCallback } from 'react';
import type { Podcast } from '../types';
import { api } from '../api/api';

interface Props {
  selectedPodcastId: string | null;
  onSelectPodcast: (podcast: Podcast) => void;
}

export default function PodcastList({ selectedPodcastId, onSelectPodcast }: Props) {
  const [search, setSearch] = useState('');
  const [allPodcasts, setAllPodcasts] = useState<Podcast[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Array<{ id: string; title: string; duration: number; date: string }>>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searchTimerRef = useRef<number | null>(null);

  const loadPodcasts = useCallback(async (keyword?: string) => {
    setLoading(true);
    try {
      const list = await api.getPodcasts(keyword);
      setAllPodcasts(list);
      const subs = new Set(list.filter((p) => p.subscribed).map((p) => p.id));
      setSubscribedIds(subs);
    } catch (err) {
      console.error('Failed to load podcasts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  useEffect(() => {
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      loadPodcasts(search.trim() || undefined);
    }, 250);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [search, loadPodcasts]);

  const subscribedList = allPodcasts.filter((p) => subscribedIds.has(p.id));
  const searchResults = allPodcasts.filter((p) => !subscribedIds.has(p.id));

  const handleSubscribe = async (podcast: Podcast) => {
    try {
      await api.subscribePodcast(podcast.id, true);
      setSubscribedIds((prev) => new Set(prev).add(podcast.id));
      setAllPodcasts((prev) =>
        prev.map((p) => (p.id === podcast.id ? { ...p, subscribed: true } : p))
      );
    } catch (err) {
      console.error('Subscribe failed:', err);
    }
  };

  const handleUnsubscribe = async (podcast: Podcast) => {
    setRemovingId(podcast.id);
    window.setTimeout(async () => {
      try {
        await api.subscribePodcast(podcast.id, false);
        setSubscribedIds((prev) => {
          const next = new Set(prev);
          next.delete(podcast.id);
          return next;
        });
        setAllPodcasts((prev) =>
          prev.map((p) => (p.id === podcast.id ? { ...p, subscribed: false } : p))
        );
        if (expandedId === podcast.id) {
          setExpandedId(null);
          setExpandedEpisodes([]);
        }
      } catch (err) {
        console.error('Unsubscribe failed:', err);
      } finally {
        setRemovingId(null);
      }
    }, 400);
  };

  const handleExpand = async (podcast: Podcast) => {
    if (expandedId === podcast.id) {
      setExpandedId(null);
      setExpandedEpisodes([]);
      return;
    }
    try {
      const eps = await api.getEpisodes(podcast.id);
      setExpandedEpisodes(
        eps.map((e) => ({
          id: e.id,
          title: e.title,
          duration: e.duration,
          date: e.publishDate
        }))
      );
      setExpandedId(podcast.id);
      onSelectPodcast(podcast);
    } catch (err) {
      console.error('Load episodes failed:', err);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={searchWrapStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={searchIconStyle}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          style={searchInputStyle}
          placeholder="搜索播客..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={listScrollStyle}>
        {loading && subscribedList.length === 0 ? (
          <div style={loadingStyle}>加载中...</div>
        ) : (
          <>
            <Section title="我的订阅" count={subscribedList.length}>
              {subscribedList.length === 0 ? (
                <SmallEmpty text="暂无订阅，搜索并添加播客" />
              ) : (
                subscribedList.map((p, idx) => (
                  <div
                    key={p.id}
                    className={removingId === p.id ? 'slide-out-left' : ''}
                    style={{
                      animation:
                        removingId !== p.id
                          ? `fadeIn 0.3s cubic-bezier(0.4,0,0.2,1) ${idx * 0.04}s both`
                          : undefined
                    }}
                  >
                    <PodcastRow
                      podcast={p}
                      selected={selectedPodcastId === p.id}
                      expanded={expandedId === p.id}
                      onClick={() => handleExpand(p)}
                      onUnsubscribe={() => handleUnsubscribe(p)}
                    />
                    {expandedId === p.id && (
                      <EpisodeMiniList items={expandedEpisodes} />
                    )}
                  </div>
                ))
              )}
            </Section>

            {search.trim() && (
              <Section title="搜索结果" count={searchResults.length}>
                {searchResults.length === 0 ? (
                  <SmallEmpty text="未找到相关播客" />
                ) : (
                  searchResults.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        animation: `fadeIn 0.3s cubic-bezier(0.4,0,0.2,1) ${idx * 0.03}s both`
                      }}
                    >
                      <SearchResultRow
                        podcast={p}
                        onSubscribe={() => handleSubscribe(p)}
                      />
                    </div>
                  ))
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <span style={sectionTitleStyle}>{title}</span>
        <span style={sectionCountStyle}>{count}</span>
      </div>
      <div style={sectionBodyStyle}>{children}</div>
    </div>
  );
}

function SmallEmpty({ text }: { text: string }) {
  return (
    <div style={smallEmptyStyle}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span style={smallEmptyTextStyle}>{text}</span>
    </div>
  );
}

function PodcastRow({
  podcast,
  selected,
  expanded,
  onClick,
  onUnsubscribe
}: {
  podcast: Podcast;
  selected: boolean;
  expanded: boolean;
  onClick: () => void;
  onUnsubscribe: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      style={{
        ...rowStyle,
        borderColor: selected ? 'var(--accent)' : 'transparent',
        backgroundColor: selected ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)'
      }}
      onClick={onClick}
      data-podcast-row="true"
    >
      <img src={podcast.coverUrl} alt="" style={coverStyle} />
      <div style={infoStyle}>
        <div style={titleStyle}>{podcast.title}</div>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}>{podcast.episodeCount} 期节目</span>
          <span style={metaDotStyle}>·</span>
          <span style={metaItemStyle}>{formatDate(podcast.lastUpdated)}</span>
        </div>
        <div style={authorStyle}>{podcast.author}</div>
      </div>
      <button
        style={unsubBtnStyle}
        onClick={(e) => {
          e.stopPropagation();
          onUnsubscribe();
        }}
        title="取消订阅"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{
          ...chevronStyle,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function SearchResultRow({ podcast, onSubscribe }: { podcast: Podcast; onSubscribe: () => void }) {
  return (
    <div style={rowStyle} data-podcast-row="true">
      <img src={podcast.coverUrl} alt="" style={coverStyle} />
      <div style={infoStyle}>
        <div style={titleStyle}>{podcast.title}</div>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}>{podcast.episodeCount} 期</span>
          <span style={metaDotStyle}>·</span>
          <span style={metaItemStyle}>{podcast.author}</span>
        </div>
        <div style={descStyle}>{podcast.description}</div>
      </div>
      <button style={subscribeBtnStyle} onClick={onSubscribe}>
        ＋ 订阅
      </button>
    </div>
  );
}

function EpisodeMiniList({
  items
}: {
  items: Array<{ id: string; title: string; duration: number; date: string }>;
}) {
  return (
    <div style={miniListWrapStyle}>
      {items.slice(0, 5).map((it, idx) => (
        <div
          key={it.id}
          style={miniItemStyle}
          style={{
            ...miniItemStyle,
            animation: `fadeIn 0.25s ease ${idx * 0.03}s both`
          } as React.CSSProperties}
        >
          <div style={miniDotStyle} />
          <div style={miniTitleStyle}>{it.title}</div>
          <div style={miniDurationStyle}>{formatShortDuration(it.duration)}</div>
        </div>
      ))}
      {items.length > 5 && (
        <div style={miniMoreStyle}>还有 {items.length - 5} 期节目...</div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatShortDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}分钟`;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: '16px 14px 16px'
};

const searchWrapStyle: React.CSSProperties = {
  position: 'relative',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-secondary)',
  pointerEvents: 'none',
  zIndex: 1
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  borderRadius: 10,
  backgroundColor: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  padding: '0 14px 0 40px',
  fontSize: 13,
  border: '1.5px solid transparent',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  caretColor: 'var(--accent)'
};

const listScrollStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 8
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 6px',
  position: 'sticky',
  top: 0,
  backgroundColor: 'rgba(30,30,46,0.95)',
  backdropFilter: 'blur(8px)',
  zIndex: 2
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: 0.8
};

const sectionCountStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  backgroundColor: 'rgba(255,255,255,0.06)',
  padding: '2px 8px',
  borderRadius: 10
};

const sectionBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6
};

const rowStyle: React.CSSProperties = {
  height: 120,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 10px 10px 10px',
  borderRadius: 12,
  backgroundColor: 'var(--bg-card)',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
  border: '2px solid transparent',
  position: 'relative',
  willChange: 'transform'
};

const coverStyle: React.CSSProperties = {
  width: 100,
  height: 100,
  borderRadius: 12,
  objectFit: 'cover',
  flexShrink: 0
};

const infoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  alignSelf: 'flex-start',
  paddingTop: 6
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text-primary)',
  lineHeight: 1.25,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap'
};

const metaItemStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-secondary)'
};

const metaDotStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.15)'
};

const authorStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(228,228,231,0.55)'
};

const descStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(228,228,231,0.5)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 1.4
};

const unsubBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(228,228,231,0.5)',
  transition: 'background-color 0.2s, transform 0.2s, color 0.2s',
  flexShrink: 0,
  alignSelf: 'flex-start',
  marginTop: 6
};

const chevronStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  transition: 'transform 0.25s ease',
  flexShrink: 0,
  alignSelf: 'center'
};

const subscribeBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  backgroundColor: 'rgba(99,102,241,0.15)',
  color: 'var(--accent)',
  fontSize: 12,
  fontWeight: 600,
  transition: 'background-color 0.2s, transform 0.2s',
  flexShrink: 0,
  alignSelf: 'center'
};

const miniListWrapStyle: React.CSSProperties = {
  marginTop: 2,
  marginBottom: 6,
  marginLeft: 12,
  padding: '8px 12px 10px',
  backgroundColor: 'rgba(99,102,241,0.05)',
  borderRadius: 10,
  borderLeft: '2px solid rgba(99,102,241,0.3)'
};

const miniItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 0'
};

const miniDotStyle: React.CSSProperties = {
  width: 4,
  height: 4,
  borderRadius: '50%',
  backgroundColor: 'rgba(99,102,241,0.6)',
  flexShrink: 0
};

const miniTitleStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 11.5,
  color: 'rgba(228,228,231,0.75)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const miniDurationStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  flexShrink: 0
};

const miniMoreStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  paddingTop: 4,
  fontStyle: 'italic'
};

const smallEmptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px 12px',
  gap: 8
};

const smallEmptyTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  textAlign: 'center'
};

const loadingStyle: React.CSSProperties = {
  padding: 40,
  textAlign: 'center',
  color: 'var(--text-secondary)',
  fontSize: 13
};

(function injectHoverStyles() {
  const styleId = 'podcast-list-hover';
  if (document.getElementById(styleId)) return;
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    input[style*="searchInputStyle"]:focus {
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18) !important;
    }
    [data-podcast-row]:hover {
      transform: translateY(-2px);
      border-color: var(--accent) !important;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);
    }
    [data-podcast-row] button[style*="unsubBtnStyle"]:hover {
      background-color: rgba(239, 68, 68, 0.15) !important;
      color: #F87171 !important;
      transform: translateY(-1px);
    }
    [data-podcast-row] button[style*="subscribeBtnStyle"]:hover {
      background-color: rgba(99, 102, 241, 0.25) !important;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(s);
})();
