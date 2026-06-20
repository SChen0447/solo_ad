import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Show, Artist } from '../types';
import { getConflicts, getArtistColor } from '../utils/helpers';

interface Props {
  artistId?: string;
  onSelectShow?: (show: Show) => void;
}

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const COMPACT_BREAKPOINT = 768;

const CalendarView: React.FC<Props> = ({ artistId, onSelectShow }) => {
  const { shows, artists, styleColors, addShow, updateShow, deleteShow } = useAppContext();
  const [current, setCurrent] = useState(new Date());
  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' && window.innerWidth < COMPACT_BREAKPOINT
  );
  const [editModal, setEditModal] = useState<{ show: Show; conflictIds: string[] } | null>(null);
  const [addModal, setAddModal] = useState<{ date: string } | null>(null);
  const [expandedConflictId, setExpandedConflictId] = useState<string | null>(null);

  useEffect(() => {
    const handle = () => setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const filteredShows = useMemo(
    () => (artistId ? shows.filter(s => s.artistId === artistId) : shows),
    [shows, artistId]
  );

  const conflicts = useMemo(() => getConflicts(filteredShows), [filteredShows]);

  const artistById = useMemo(() => {
    const map = new Map<string, Artist>();
    artists.forEach(a => map.set(a.id, a));
    return map;
  }, [artists]);

  const getArtist = (id: string) => artistById.get(id);

  const { days, monthLabel } = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startDow);
    const daysArr: { date: Date; inMonth: boolean; key: string; iso: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const inMonth = d.getMonth() === month;
      const iso = d.toISOString().split('T')[0];
      daysArr.push({ date: d, inMonth, key: `${i}-${iso}`, iso });
    }
    const label = `${year}年${month + 1}月`;
    return { days: daysArr, monthLabel: label };
  }, [current]);

  const todayStr = new Date().toISOString().split('T')[0];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Show[]>();
    filteredShows.forEach(s => {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    });
    return map;
  }, [filteredShows]);

  const sortedList = useMemo(
    () => [...filteredShows].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [filteredShows]
  );

  const prevMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCurrent(new Date());

  const openEditConflict = (show: Show) => {
    const conflictIds = Array.from(conflicts.get(show.id) || []);
    setExpandedConflictId(null);
    setEditModal({ show, conflictIds });
  };

  const updateShowForm = async (show: Show, data: Partial<Show>) => {
    await updateShow(show.id, data);
    setEditModal(null);
  };

  return (
    <div className="calendar-wrap">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
          <button
            className="calendar-nav-btn"
            onClick={goToday}
            style={{ fontSize: 12, padding: '0 12px', width: 'auto' }}
          >
            今天
          </button>
          <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
          <div className="calendar-month">{monthLabel}</div>
        </div>
        {!artistId && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAddModal({ date: todayStr })}
          >
            ＋ 添加演出
          </button>
        )}
      </div>

      {!isCompact ? (
        <>
          <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekdays.map(d => (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map(day => {
              const events = eventsByDate.get(day.iso) || [];
              const isToday = day.iso === todayStr;
              return (
                <div
                  key={day.key}
                  className={`calendar-day ${day.inMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                  onClick={() => day.inMonth && setAddModal({ date: day.iso })}
                  style={{ cursor: day.inMonth ? 'pointer' : 'default' }}
                >
                  <div className="calendar-date">{day.date.getDate()}</div>
                  <div className="calendar-events">
                    {events.slice(0, 3).map(ev => {
                      const art = getArtist(ev.artistId);
                      const hasConflict = conflicts.has(ev.id);
                      const color = art ? getArtistColor(art.styleTags, styleColors) : 'var(--accent)';
                      const isExpanded = expandedConflictId === ev.id;
                      return (
                        <div
                          key={ev.id}
                          style={{
                            position: 'relative',
                            marginBottom: 4,
                          }}
                        >
                          {hasConflict && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedConflictId(isExpanded ? null : ev.id);
                              }}
                              className="conflict-warning-bar"
                            >
                              <span>⚠ 档期冲突</span>
                              <span style={{ marginLeft: 'auto', fontSize: 10 }}>
                                {isExpanded ? '收起 ▲' : '修改 ▼'}
                              </span>
                            </div>
                          )}
                          <div
                            className={`calendar-event ${hasConflict ? 'has-conflict' : ''}`}
                            style={hasConflict ? undefined : { background: color }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasConflict) {
                                setExpandedConflictId(isExpanded ? null : ev.id);
                              } else {
                                onSelectShow?.(ev);
                              }
                            }}
                            title={`${art?.name || ''} ${ev.time} @ ${ev.venue}`}
                          >
                            <strong>{ev.time}</strong> {art?.name || '未知'}
                          </div>
                          {hasConflict && isExpanded && (
                            <div
                              className="conflict-detail-panel"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="conflict-detail-header">冲突详情对比：</div>
                              <ConflictCompareRows
                                primary={ev}
                                others={Array.from(conflicts.get(ev.id) || [])
                                  .map(id => filteredShows.find(s => s.id === id))
                                  .filter((s): s is Show => !!s)}
                                getArtist={getArtist}
                              />
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ width: '100%', marginTop: 10, fontSize: 12 }}
                                onClick={() => openEditConflict(ev)}
                              >
                                点击修改此日程 →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {events.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '0 4px' }}>
                        +{events.length - 3} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <CompactList
          sortedList={sortedList}
          conflicts={conflicts}
          getArtist={getArtist}
          styleColors={styleColors}
          filteredShows={filteredShows}
          onSelect={(ev) => {
            if (conflicts.has(ev.id)) openEditConflict(ev);
            else onSelectShow?.(ev);
          }}
        />
      )}

      {editModal && (
        <EditShowModal
          show={editModal.show}
          conflictIds={editModal.conflictIds}
          allShows={filteredShows}
          artists={artists}
          onClose={() => setEditModal(null)}
          onSave={(data) => updateShowForm(editModal.show, data)}
          onDelete={() => { deleteShow(editModal.show.id); setEditModal(null); }}
        />
      )}

      {addModal && (
        <AddShowModal
          date={addModal.date}
          artists={artists}
          artistId={artistId}
          onClose={() => setAddModal(null)}
          onSave={async (data) => {
            await addShow(data);
            setAddModal(null);
          }}
        />
      )}
    </div>
  );
};

const ConflictCompareRows: React.FC<{
  primary: Show;
  others: Show[];
  getArtist: (id: string) => Artist | undefined;
}> = ({ primary, others, getArtist }) => {
  const all = [primary, ...others];
  return (
    <div className="conflict-compare">
      {all.map((ev, i) => {
        const art = getArtist(ev.artistId);
        const isPrimary = ev.id === primary.id;
        return (
          <div key={ev.id} className={`conflict-compare-row ${isPrimary ? 'is-primary' : ''}`}>
            <div className="conflict-compare-label">
              {isPrimary ? '🎯 当前' : `⚠ 冲突${i}`}
            </div>
            <div className="conflict-compare-time">{ev.time}</div>
            <div className="conflict-compare-venue">{ev.venue}</div>
            <div className="conflict-compare-artist">{art?.name || '未知'}</div>
          </div>
        );
      })}
    </div>
  );
};

const CompactList: React.FC<{
  sortedList: Show[];
  conflicts: Map<string, Set<string>>;
  getArtist: (id: string) => Artist | undefined;
  styleColors: Record<string, string>;
  filteredShows: Show[];
  onSelect: (ev: Show) => void;
}> = ({ sortedList, conflicts, getArtist, styleColors, onSelect }) => {
  if (sortedList.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <div className="empty-icon" style={{ fontSize: 40 }}>📅</div>
        <div className="empty-text">暂无演出安排</div>
      </div>
    );
  }

  return (
    <div className="compact-event-list">
      {sortedList.map((ev, idx) => {
        const art = getArtist(ev.artistId);
        const hasConflict = conflicts.has(ev.id);
        const color = art ? getArtistColor(art.styleTags, styleColors) : '#6c63ff';
        return (
          <React.Fragment key={ev.id}>
            {idx === 0 || sortedList[idx - 1].date !== ev.date ? (
              <div className="compact-date-label">{formatDateLabel(ev.date)}</div>
            ) : null}
            <div
              className="compact-event-bar"
              onClick={() => onSelect(ev)}
              style={{
                background: hasConflict
                  ? 'linear-gradient(90deg, #ff6b6b 0%, #ff8e8e 100%)'
                  : `linear-gradient(135deg, ${color}dd 0%, ${adjustColor(color, -20)}dd 100%)`,
              }}
            >
              <div className="compact-event-bar-time">
                <div className="bar-hour">{ev.time}</div>
              </div>
              <div className="compact-event-bar-body">
                <div className="compact-event-bar-artist">
                  {art?.name || '未知艺术家'}
                  {hasConflict && (
                    <span className="compact-conflict-badge">
                      ⚠ 档期冲突 · 点击修改
                    </span>
                  )}
                </div>
                <div className="compact-event-bar-venue">
                  📍 {ev.venue}
                </div>
              </div>
              <div className="compact-event-bar-arrow">›</div>
            </div>
            {hasConflict && (
              <div className="compact-conflict-detail">
                <div className="conflict-detail-header" style={{ padding: '0 4px 8px' }}>
                  冲突场次对比：
                </div>
                <ConflictCompareRows
                  primary={ev}
                  others={Array.from(conflicts.get(ev.id) || [])
                    .map(id => sortedList.find(s => s.id === id))
                    .filter((s): s is Show => !!s)}
                  getArtist={getArtist}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toISOString().split('T')[0];
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const mark = iso === today ? ' · 今天' : '';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${wd}${mark}`;
};

const adjustColor = (hex: string, amount: number) => {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

const AddShowModal: React.FC<{
  date: string;
  artists: Artist[];
  artistId?: string;
  onClose: () => void;
  onSave: (data: Omit<Show, 'id'>) => Promise<void>;
}> = ({ date, artists, artistId, onClose, onSave }) => {
  const [fDate, setDate] = useState(date);
  const [time, setTime] = useState('20:00');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [aid, setAid] = useState(artistId || artists[0]?.id || '');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aid || !fDate || !time || !venue) return;
    await onSave({ artistId: aid, date: fDate, time, venue, notes });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dark-theme" onClick={e => e.stopPropagation()}>
        <h2>添加演出</h2>
        <form onSubmit={handle}>
          {!artistId && (
            <div className="form-group">
              <label className="form-label">艺术家</label>
              <select className="form-input" value={aid} onChange={e => setAid(e.target.value)}>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">日期</label>
              <input type="date" className="form-input" value={fDate} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">时间</label>
              <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">场馆</label>
            <input className="form-input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="例如：MAO Livehouse 上海" />
          </div>
          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="演出备注信息..." />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={!aid || !fDate || !time || !venue}>保存</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditShowModal: React.FC<{
  show: Show;
  conflictIds: string[];
  allShows: Show[];
  artists: Artist[];
  onClose: () => void;
  onSave: (data: Partial<Show>) => Promise<void>;
  onDelete: () => void;
}> = ({ show, conflictIds, allShows, artists, onClose, onSave, onDelete }) => {
  const [date, setDate] = useState(show.date);
  const [time, setTime] = useState(show.time);
  const [venue, setVenue] = useState(show.venue);
  const [notes, setNotes] = useState(show.notes);

  const artById = new Map(artists.map(a => [a.id, a]));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ date, time, venue, notes });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dark-theme" onClick={e => e.stopPropagation()}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--danger)' }}>⚠</span> 修改演出日程
        </h2>

        {conflictIds.length > 0 && (
          <div style={{
            background: 'rgba(255,107,107,0.12)',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 8,
            padding: 14,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--danger)' }}>
              检测到档期冲突：
            </div>
            {conflictIds.map(cid => {
              const cs = allShows.find(s => s.id === cid);
              if (!cs) return null;
              return (
                <div key={cid} style={{ fontSize: 12, padding: '4px 0', color: '#ffb3b3' }}>
                  🔴 {artById.get(cs.artistId)?.name} — {cs.time} @ {cs.venue}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handle}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">日期</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">时间</label>
              <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">场馆</label>
            <input className="form-input" value={venue} onChange={e => setVenue(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>删除此演出</button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
              <button type="submit" className="btn btn-primary">保存修改</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarView;
