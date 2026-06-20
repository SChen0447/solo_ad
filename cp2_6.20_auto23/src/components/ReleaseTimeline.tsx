import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Track, Artist } from '../types';
import { getCountdown, formatDateCN, getArtistColor } from '../utils/helpers';

interface Props {
  artistId?: string;
}

const ReleaseTimeline: React.FC<Props> = ({ artistId }) => {
  const { tracks, shows, artists, styleColors, updateTrack, addTrack } = useAppContext();
  const [selected, setSelected] = useState<Track | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; origDate: string } | null>(null);
  const [tempOffset, setTempOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAdd, setShowAdd] = useState(false);

  const artistTracks = useMemo(
    () => (artistId ? tracks.filter(t => t.artistId === artistId) : tracks),
    [tracks, artistId]
  );

  const artistMap = useMemo(() => new Map(artists.map(a => [a.id, a])), [artists]);

  const showDates = useMemo(() => {
    const set = new Set<string>();
    (artistId ? shows.filter(s => s.artistId === artistId) : shows).forEach(s => set.add(s.date));
    return set;
  }, [shows, artistId]);

  const { rangeStart, totalDays, dateFromOffset } = useMemo(() => {
    if (artistTracks.length === 0) {
      const today = new Date();
      const s = new Date(today);
      s.setDate(s.getDate() - 7);
      const e = new Date(today);
      e.setDate(e.getDate() + 60);
      const total = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      return {
        rangeStart: s,
        totalDays: total,
        dateFromOffset: (offsetDays: number) => {
          const d = new Date(s);
          d.setDate(d.getDate() + offsetDays);
          return d;
        },
      };
    }
    const dateObjects = artistTracks.map(t => new Date(t.releaseDate)).sort((a, b) => a.getTime() - b.getTime());
    const first = dateObjects[0];
    const last = dateObjects[dateObjects.length - 1];
    const s = new Date(first);
    s.setDate(s.getDate() - 14);
    const e = new Date(last);
    e.setDate(e.getDate() + 14);
    const total = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    const fn = (offsetDays: number) => {
      const d = new Date(s);
      d.setDate(d.getDate() + offsetDays);
      return d;
    };
    return { rangeStart: s, totalDays: Math.max(total, 30), dateFromOffset: fn };
  }, [artistTracks]);

  const dayToPercent = (iso: string, offset = 0) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + offset);
    const diff = (d.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(1, diff / totalDays));
  };

  const marks = useMemo(() => {
    const arr: { date: Date; label: string; percent: number }[] = [];
    const step = Math.max(7, Math.floor(totalDays / 8));
    for (let i = 0; i <= totalDays; i += step) {
      const d = dateFromOffset(i);
      const percent = (i / totalDays) * 100;
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      arr.push({ date: d, label, percent });
    }
    return arr;
  }, [totalDays, dateFromOffset]);

  const handleMouseDown = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    setDragging({
      id: track.id,
      startX: e.clientX,
      origDate: track.releaseDate,
    });
  };

  useEffect(() => {
    if (!dragging || !containerRef.current) return;

    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragging) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - dragging.startX;
      const days = Math.round((dx / rect.width) * totalDays);
      setTempOffset(days);
    };

    const handleUp = async (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - dragging.startX;
      const days = Math.round((dx / rect.width) * totalDays);
      const orig = new Date(dragging.origDate);
      orig.setDate(orig.getDate() + days);
      const newDate = orig.toISOString().split('T')[0];
      if (days !== 0) {
        await updateTrack(dragging.id, { releaseDate: newDate });
      }
      setDragging(null);
      setTempOffset(0);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, totalDays, updateTrack]);

  const getArtist = (id: string) => artistMap.get(id);

  return (
    <div className="timeline-wrap">
      <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h3>作品发布计划</h3>
          <p>拖拽蓝色三角形可调整发行日期 · 点击查看详情</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          ＋ 新增作品
        </button>
      </div>

      <div className="timeline" ref={containerRef}>
        <div className="timeline-marks">
          {marks.map((m, i) => (
            <div
              key={i}
              className="timeline-mark"
              style={{ position: 'absolute', left: `${m.percent}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        <div className="timeline-axis" />

        <div className="timeline-items" style={{ position: 'relative' }}>
          {artistTracks.map(track => {
            const offset = dragging?.id === track.id ? tempOffset : 0;
            const percent = dayToPercent(track.releaseDate, offset) * 100;
            const actualDate = new Date(new Date(track.releaseDate).getTime() + offset * 86400000);
            const actualISO = actualDate.toISOString().split('T')[0];
            const hasShowOverlap = showDates.has(actualISO);
            const isHovered = hovered === track.id;
            const art = getArtist(track.artistId);
            const countdown = getCountdown(track.releaseDate);

            return (
              <div
                key={track.id}
                className="timeline-item"
                style={{
                  position: 'absolute',
                  left: `${percent}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => handleMouseDown(e, track)}
                onMouseEnter={() => setHovered(track.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (!dragging) setSelected(selected?.id === track.id ? null : track);
                }}
              >
                <div className="timeline-triangle" />
                {hasShowOverlap && <div className="timeline-star">★</div>}
                {isHovered && (
                  <div className="timeline-tooltip">
                    <div className="timeline-tooltip-title">
                      {art ? `${art.name} · ` : ''}
                      {track.name}
                    </div>
                    {!countdown.past && (
                      <div className="timeline-tooltip-countdown">
                        距发行 {countdown.days}天{countdown.hours}小时
                      </div>
                    )}
                    {countdown.past && (
                      <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 4 }}>
                        已发行
                      </div>
                    )}
                    <div className="timeline-tooltip-date">
                      {formatDateCN(track.releaseDate)}
                    </div>
                    {hasShowOverlap && (
                      <div className="timeline-tooltip-conflict">
                        ⚠ 作品发布与演出同一天，建议错开
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <ReleaseDetail track={selected} artist={getArtist(selected.artistId)} onClose={() => setSelected(null)} />
      )}

      {artistTracks.length === 0 && (
        <div className="empty-state" style={{ padding: 30 }}>
          <div className="empty-icon" style={{ fontSize: 40 }}>🎵</div>
          <div className="empty-text">暂无发布计划</div>
        </div>
      )}

      {showAdd && (
        <AddTrackModal
          artists={artists}
          artistId={artistId}
          onClose={() => setShowAdd(false)}
          onSave={async (d) => {
            await addTrack(d);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
};

const ReleaseDetail: React.FC<{
  track: Track;
  artist?: Artist;
  onClose: () => void;
}> = ({ track, artist, onClose }) => {
  const countdown = getCountdown(track.releaseDate);
  return (
    <div className="timeline-detail-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            {artist?.name || '未知艺术家'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            🎵 {track.name}
          </div>
          {!countdown.past ? (
            <div style={{ fontSize: 16, color: 'var(--accent)', fontWeight: 600 }}>
              ⏱ 倒计时 {countdown.days}天{countdown.hours}小时 发行
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--success)' }}>
              ✅ 已于 {formatDateCN(track.releaseDate)} 发行
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          × 关闭
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 13 }}>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>发行日期</div>
          <div style={{ fontWeight: 600 }}>{formatDateCN(track.releaseDate)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>时长</div>
          <div style={{ fontWeight: 600 }}>
            {track.duration
              ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`
              : '—'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>播放链接</div>
          <div style={{ fontWeight: 600 }}>
            {track.playLink ? (
              <a href={track.playLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                点击播放 →
              </a>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AddTrackModal: React.FC<{
  artists: Artist[];
  artistId?: string;
  onClose: () => void;
  onSave: (data: Omit<Track, 'id'>) => Promise<void>;
}> = ({ artists, artistId, onClose, onSave }) => {
  const [aid, setAid] = useState(artistId || artists[0]?.id || '');
  const [name, setName] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [playLink, setPlayLink] = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aid || !name) return;
    await onSave({
      artistId: aid,
      name,
      releaseDate,
      duration: parseInt(duration) || 0,
      playLink,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dark-theme" onClick={(e) => e.stopPropagation()}>
        <h2>新增作品</h2>
        <form onSubmit={handle}>
          {!artistId && (
            <div className="form-group">
              <label className="form-label">艺术家</label>
              <select className="form-input" value={aid} onChange={(e) => setAid(e.target.value)}>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">曲名</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">发行日期</label>
              <input
                type="date"
                className="form-input"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">时长（秒）</label>
              <input
                type="number"
                className="form-input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="例如 240"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">播放链接</label>
            <input
              className="form-input"
              value={playLink}
              onChange={(e) => setPlayLink(e.target.value)}
              placeholder="Spotify / Apple Music 链接"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={!aid || !name}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReleaseTimeline;
