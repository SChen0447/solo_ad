import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Show, Artist } from '../types';
import { getConflicts, getArtistColor } from '../utils/helpers';

interface Props {
  artistId?: string;
  onSelectShow?: (show: Show) => void;
}

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const CalendarView: React.FC<Props> = ({ artistId, onSelectShow }) => {
  const { shows, artists, styleColors, addShow, updateShow, deleteShow } = useAppContext();
  const [current, setCurrent] = useState(new Date());
  const [isCompact, setIsCompact] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [editModal, setEditModal] = useState<{ show: Show; conflictIds: string[] } | null>(null);
  const [addModal, setAddModal] = useState<{ date: string } | null>(null);

  useEffect(() => {
    const handle = () => setIsCompact(window.innerWidth < 768);
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
    const last = new Date(year, month + 1, 0);
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

  const handleConflictClick = (show: Show) => {
    const conflictIds = Array.from(conflicts.get(show.id) || []);
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
                      return (
                        <div
                          key={ev.id}
                          className={`calendar-event ${hasConflict ? 'has-conflict conflict-banner' : ''}`}
                          style={hasConflict ? undefined : { background: color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasConflict) {
                              handleConflictClick(ev);
                            } else {
                              onSelectShow?.(ev);
                            }
                          }}
                          title={`${art?.name || ''} ${ev.time} @ ${ev.venue}`}
                        >
                          <strong>{ev.time}</strong> {art?.name || '未知'}
                          {hasConflict && (
                            <div className="conflict-banner-detail" onClick={(e) => e.stopPropagation()}>
                              {Array.from(conflicts.get(ev.id) || []).map(cid => {
                                const cs = filteredShows.find(s => s.id === cid);
                                if (!cs) return null;
                                return (
                                  <div key={cid}>
                                    ⚠ {cs.time} @ {cs.venue}
                                  </div>
                                );
                              })}
                              <button onClick={(e) => { e.stopPropagation(); handleConflictClick(ev); }}>
                                修改日程
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
        <div className="compact-list">
          {sortedList.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon" style={{ fontSize: 40 }}>📅</div>
              <div className="empty-text">暂无演出安排</div>
            </div>
          ) : (
            sortedList.map(ev => {
              const art = getArtist(ev.artistId);
              const hasConflict = conflicts.has(ev.id);
              const color = art ? getArtistColor(art.styleTags, styleColors) : 'var(--accent)';
              return (
                <div
                  key={ev.id}
                  className={`compact-event ${hasConflict ? 'has-conflict' : ''}`}
                  style={{ background: `linear-gradient(90deg, ${color}15, var(--bg-primary))` }}
                  onClick={() => (hasConflict ? handleConflictClick(ev) : onSelectShow?.(ev))}
                >
                  <div
                    className="compact-event-time"
                    style={hasConflict ? undefined : { background: color }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.85 }}>
                      {ev.date.slice(5).replace('-', '/')}
                    </div>
                    <div>{ev.time}</div>
                  </div>
                  <div className="compact-event-artist">
                    {art?.name || '未知艺术家'}
                    <small>{hasConflict ? '⚠ 存在档期冲突' : ''}</small>
                  </div>
                  <div className="compact-event-venue">
                    📍 {ev.venue}
                    {ev.notes && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>{ev.notes}</div>}
                  </div>
                  <div style={{ fontSize: 20, opacity: 0.3 }}>›</div>
                </div>
              );
            })
          )}
        </div>
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
