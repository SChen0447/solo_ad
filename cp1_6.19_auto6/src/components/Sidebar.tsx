import React from 'react';
import dayjs from 'dayjs';
import { useStore, MOOD_EMOJIS, DiaryEntry } from '../store';

interface GroupedEntries {
  [date: string]: DiaryEntry[];
}

const Sidebar: React.FC = () => {
  const entries = useStore((s) => s.entries);
  const selectedEntryId = useStore((s) => s.selectedEntryId);
  const setSelectedEntryId = useStore((s) => s.setSelectedEntryId);
  const expandedGroups = useStore((s) => s.expandedGroups);
  const toggleGroupExpanded = useStore((s) => s.toggleGroupExpanded);
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const setSelectedEntry = useStore((s) => s.setSelectedEntryId);

  const grouped: GroupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as GroupedEntries);

  const sortedDates = Object.keys(grouped).sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf());

  const handleItemClick = (entry: DiaryEntry) => {
    setSelectedEntryId(entry.id);
    setSelectedDate(entry.date);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = dayjs(dateStr);
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return d.format('YYYY年MM月DD日');
  };

  return (
    <aside className="sidebar">
      {sortedDates.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 16px' }}>
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
            还没有任何记录
            <br />
            点击右上角开始记录吧
          </div>
        </div>
      ) : (
        sortedDates.map((date) => {
          const isExpanded = expandedGroups.includes(date);
          const items = grouped[date].sort(
            (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
          );
          const displayItems = isExpanded ? items : items.slice(0, 3);
          const isCurrentDate = selectedDate === date;

          return (
            <div key={date} className="sidebar-group">
              <div
                className="sidebar-group-header"
                onClick={() => toggleGroupExpanded(date)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sidebar-group-date">{formatDateLabel(date)}</span>
                  {isCurrentDate && (
                    <span style={{
                      fontSize: '0.7rem',
                      color: '#fff',
                      background: '#2e7d6f',
                      padding: '2px 6px',
                      borderRadius: '8px',
                    }}>
                      当前
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sidebar-group-count">{items.length}条</span>
                  {items.length > 3 && (
                    <span className={`sidebar-group-toggle ${isExpanded ? 'expanded' : ''}`}>
                      ▼
                    </span>
                  )}
                </div>
              </div>

              <div
                className="sidebar-group-items"
                style={{
                  maxHeight: isExpanded || items.length <= 3 ? 'none' : `${Math.min(items.length, 3) * 72}px`,
                  transition: 'max-height 0.3s ease',
                }}
              >
                {displayItems.map((entry) => (
                  <div
                    key={entry.id}
                    className={`sidebar-item ${selectedEntryId === entry.id ? 'selected' : ''}`}
                    onClick={() => handleItemClick(entry)}
                  >
                    <div className="sidebar-item-thumb">
                      {entry.image ? (
                        <img src={entry.image} alt="" />
                      ) : (
                        <span>{MOOD_EMOJIS[entry.mood]}</span>
                      )}
                    </div>
                    <div className="sidebar-item-content">
                      <div className="sidebar-item-title">{entry.title}</div>
                      <div className="sidebar-item-preview">
                        {entry.content.replace(/[#*`\-]/g, '').slice(0, 30) || '无内容'}
                      </div>
                      {entry.tags.length > 0 && (
                        <div className="sidebar-item-tags">
                          {entry.tags.slice(0, 2).map((t, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.65rem',
                                background: '#e8f5e9',
                                color: '#2e7d6f',
                                padding: '1px 6px',
                                borderRadius: '8px',
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </aside>
  );
};

export default Sidebar;
