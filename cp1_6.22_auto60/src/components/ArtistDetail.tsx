import { useState, useEffect, useMemo } from 'react';
import { ArtistDetail as ArtistDetailType, STYLE_COLORS, BookedSlot } from '../types';

interface ArtistDetailProps {
  artistId: number;
  onBack: () => void;
  onSuccess: () => void;
}

function ArtistDetail({ artistId, onBack, onSuccess }: ArtistDetailProps) {
  const [artist, setArtist] = useState<ArtistDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchArtist();
  }, [artistId]);

  useEffect(() => {
    if (!artist || artist.works.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % artist.works.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [artist]);

  const fetchArtist = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/artists/${artistId}`);
      const data = await res.json();
      setArtist(data);
    } catch (error) {
      console.error('获取手作人详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextDays = useMemo(() => {
    const days: { date: string; dayName: string }[] = [];
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = i === 0 ? '今天' : i === 1 ? '明天' : weekDays[date.getDay()];
      days.push({ date: dateStr, dayName });
    }
    return days;
  }, []);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const isSlotBooked = (date: string, time: string): boolean => {
    if (!artist) return false;
    return artist.bookedSlots.some(
      (slot: BookedSlot) => slot.date === date && slot.time === time
    );
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    if (isSlotBooked(date, time)) return;
    setSelectedDate(date);
    setSelectedTime(time);
    setVisitorName('');
    setPhone('');
    setShowModal(true);
  };

  const handlePrevSlide = () => {
    if (!artist) return;
    setCurrentSlide((prev) => (prev - 1 + artist.works.length) % artist.works.length);
  };

  const handleNextSlide = () => {
    if (!artist) return;
    setCurrentSlide((prev) => (prev + 1) % artist.works.length);
  };

  const handleGoToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !phone.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          date: selectedDate,
          time: selectedTime,
          visitorName: visitorName.trim(),
          phone: phone.trim()
        })
      });

      if (res.ok) {
        setShowModal(false);
        onSuccess();
        fetchArtist();
      } else {
        const data = await res.json();
        alert(data.error || '预约失败');
      }
    } catch (error) {
      console.error('预约失败:', error);
      alert('预约失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!artist) {
    return (
      <div className="empty-state">
        <div className="empty-icon">😔</div>
        <p>手作人不存在</p>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={onBack}>
        ← 返回列表
      </button>

      <div className="carousel">
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {artist.works.map((work: string, index: number) => (
            <div key={index} className="carousel-slide">
              <img src={work} alt={`作品${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>

        {artist.works.length > 1 && (
          <>
            <button className="carousel-btn prev" onClick={handlePrevSlide}>
              ‹
            </button>
            <button className="carousel-btn next" onClick={handleNextSlide}>
              ›
            </button>
            <div className="carousel-dots">
              {artist.works.map((_: string, index: number) => (
                <span
                  key={index}
                  className={`dot ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => handleGoToSlide(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="artist-info">
        <h1>
          {artist.name}
          <span
            className="style-tag"
            style={{ backgroundColor: STYLE_COLORS[artist.style] || '#718096' }}
          >
            {artist.style}
          </span>
        </h1>
        <p className="artist-description">
          {artist.description.length > 200
            ? artist.description.slice(0, 200) + '...'
            : artist.description}
        </p>
        <div className="materials-list">
          {artist.materials.map((material: string, index: number) => (
            <span key={index} className="material-tag">
              {material}
            </span>
          ))}
        </div>
      </div>

      <div className="schedule-section">
        <h2>可预约时间</h2>
        <table className="schedule-table">
          <thead>
            <tr>
              <th>时间</th>
              {nextDays.map((day) => (
                <th key={day.date}>
                  <div>{day.dayName}</div>
                  <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#a0aec0' }}>
                    {formatDateDisplay(day.date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time}>
                <td style={{ fontWeight: 500, color: '#4a5568' }}>{time}</td>
                {nextDays.map((day) => {
                  const booked = isSlotBooked(day.date, time);
                  return (
                    <td
                      key={day.date}
                      className={`time-slot ${booked ? 'booked' : ''}`}
                      onClick={() => handleTimeSlotClick(day.date, time)}
                    >
                      {booked ? '已约' : '可约'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">预约确认</h3>
            <div className="modal-info">
              <p>
                <strong>手作人：</strong>
                {artist.name}
              </p>
              <p>
                <strong>日期：</strong>
                {formatDateDisplay(selectedDate)}（
                {nextDays.find((d) => d.date === selectedDate)?.dayName}）
              </p>
              <p>
                <strong>时间：</strong>
                {selectedTime}
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>您的昵称</label>
                <input
                  type="text"
                  placeholder="请输入昵称"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>手机号码</label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '确认预约'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtistDetail;
