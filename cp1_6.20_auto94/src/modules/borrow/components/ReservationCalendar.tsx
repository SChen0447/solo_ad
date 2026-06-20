import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { borrowApi, type CalendarDayData } from '../api/borrowApi';
import type { Reservation, Book } from '@/types';

interface ReservationCalendarProps {
  book: Book;
  onReserve?: (reservation: Reservation) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function ReservationCalendar({ book, onReserve }: ReservationCalendarProps) {
  const {
    reservations,
    addReservation,
    addToast,
    currentUser,
    addOperationLog,
    updateBook
  } = useAppStore();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<Record<string, CalendarDayData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showQr, setShowQr] = useState<Reservation | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);

  const reservedDates = useMemo(() => {
    return reservations
      .filter(r => r.bookId === book.id && r.status !== 'cancelled')
      .map(r => r.reserveDate);
  }, [reservations, book.id]);

  useEffect(() => {
    const loadCalendar = async () => {
      setIsLoading(true);
      const startStr = formatDate(today);
      const endStr = formatDate(maxDate);
      try {
        const data = await borrowApi.getCalendarData(book.id, startStr, endStr);
        const map: Record<string, CalendarDayData> = {};
        data.forEach(d => { map[d.date] = d; });
        setCalendarData(map);
      } catch {
        const map: Record<string, CalendarDayData> = {};
        for (let i = 0; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dateStr = formatDate(d);
          map[dateStr] = {
            date: dateStr,
            available: !reservedDates.includes(dateStr),
            reservations: reservedDates.includes(dateStr) ? 1 : 0
          };
        }
        setCalendarData(map);
      } finally {
        setIsLoading(false);
      }
    };
    loadCalendar();
  }, [book.id, reservedDates.length]);

  function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = firstDay.getDay();

    const days: Array<{
      date: Date | null;
      key: string;
      dateStr?: string;
      isToday?: boolean;
      isAvailable?: boolean;
      isReserved?: boolean;
      isDisabled?: boolean;
      isSelected?: boolean;
      inRange?: boolean;
    }> = [];

    for (let i = 0; i < startWeekday; i++) {
      days.push({ date: null, key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const isToday = dateStart.getTime() === today.getTime();
      const isPast = dateStart.getTime() < today.getTime();
      const isFuture = dateStart.getTime() > maxDate.getTime();
      const isDisabled = isPast || isFuture;
      const calInfo = calendarData[dateStr];
      const isReserved = reservedDates.includes(dateStr) || calInfo?.available === false;
      const isAvailable = !isDisabled && !isReserved;
      const isSelected = selectedDate === dateStr;
      const inRange = !isPast && !isFuture;

      days.push({
        date,
        key: dateStr,
        dateStr,
        isToday,
        isAvailable,
        isReserved,
        isDisabled,
        isSelected,
        inRange
      });
    }

    return days;
  }, [currentMonth, calendarData, reservedDates, today, maxDate, selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (dateStr: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    setSelectedDate(dateStr);
  };

  const handleConfirmReservation = async () => {
    if (!selectedDate || !currentUser) {
      if (currentUser?.role !== 'reader') {
        addToast('error', '请切换到读者角色预约借阅');
      }
      return;
    }

    setIsConfirming(true);
    try {
      let reservation: Reservation;
      try {
        reservation = await borrowApi.createReservation({
          bookId: book.id,
          bookTitle: book.title,
          userId: currentUser.id,
          userName: currentUser.name,
          reserveDate: selectedDate
        });
      } catch {
        reservation = {
          id: `res-${Date.now()}`,
          bookId: book.id,
          bookTitle: book.title,
          userId: currentUser.id,
          userName: currentUser.name,
          reserveDate: selectedDate,
          status: 'confirmed',
          qrCode: `QR-${book.id}-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
      }

      addReservation(reservation);
      updateBook(book.id, { status: '借阅中' });
      setShowQr(reservation);

      addOperationLog({
        id: `log-${Date.now()}`,
        action: '创建了借阅预约',
        targetType: 'reservation',
        targetId: reservation.id,
        targetName: book.title,
        operatorName: currentUser.name,
        timestamp: new Date().toISOString()
      });

      addToast('success', '预约成功！请凭二维码取书');

      if (onReserve) onReserve(reservation);
      setSelectedDate(null);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || '预约失败，请重试');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div>
      <div className="calendar-wrapper">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>
            ← 上月
          </button>
          <div className="calendar-title">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </div>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>
            下月 →
          </button>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map(w => (
            <div key={w} className="calendar-weekday">{w}</div>
          ))}
          {calendarDays.map((cell, idx) => (
            cell.date === null ? (
              <div key={cell.key} />
            ) : (
              <motion.div
                key={cell.key}
                className={`calendar-day ${
                  cell.isDisabled ? 'disabled' :
                  cell.isReserved ? 'reserved' :
                  cell.isAvailable ? 'available' : ''
                } ${cell.isSelected ? 'selected' : ''} ${cell.isToday ? 'today' : ''}`}
                onClick={() => cell.isAvailable && handleDateClick(cell.dateStr!, true)}
                whileHover={cell.isAvailable ? { scale: 1.1 } : {}}
                transition={{ duration: 0.15 }}
                style={{ opacity: cell.inRange ? 1 : 0.35 }}
                title={cell.isReserved ? '已被预约' : cell.isDisabled ? '不在可预约范围内' : '点击选择'}
              >
                {cell.date?.getDate()}
                {cell.isReserved && <span title="已预约">•</span>}
              </motion.div>
            )
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: 20,
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #eee',
          fontSize: 13,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: 'var(--available-date)' }} />
            <span style={{ color: '#888' }}>可预约</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: 'var(--reserved-date)' }} />
            <span style={{ color: '#888' }}>已预约</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid var(--accent-blue-start)' }} />
            <span style={{ color: '#888' }}>今天</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: 'var(--accent-blue-start)' }} />
            <span style={{ color: '#888' }}>已选择</span>
          </div>
          <div style={{ color: '#888', marginLeft: 'auto' }}>
            可预约范围：未来7天内
          </div>
        </div>
      </div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 20,
            padding: 20,
            backgroundColor: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 15 }}>预约确认</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14, marginBottom: 20 }}>
            <div>
              <span style={{ color: '#888' }}>书籍：</span>
              <strong>《{book.title}》</strong>
            </div>
            <div>
              <span style={{ color: '#888' }}>作者：</span>
              <span>{book.author}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>预约日期：</span>
              <strong style={{ color: '#4a90d9' }}>{selectedDate}</strong>
            </div>
            <div>
              <span style={{ color: '#888' }}>预约人：</span>
              <span>{currentUser?.name || '未知'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedDate(null)}
              disabled={isConfirming}
            >
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmReservation}
              disabled={isConfirming}
              style={{ minWidth: 140 }}
            >
              {isConfirming ? (
                <>
                  <span className="loading-spinner" />
                  <span>确认中...</span>
                </>
              ) : '确认预约'}
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowQr(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-title">✅ 预约成功</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div className="qr-code-box">
                  <div className="qr-code" />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50', marginBottom: 4 }}>
                    取书凭证
                  </div>
                  <div className="qr-label">{showQr.qrCode}</div>
                </div>
                <div style={{ marginTop: 20, fontSize: 14, color: '#555' }}>
                  <p style={{ marginBottom: 8 }}>
                    <strong>《{showQr.bookTitle}》</strong>
                  </p>
                  <p style={{ marginBottom: 4 }}>
                    预约日期：<strong style={{ color: '#4a90d9' }}>{showQr.reserveDate}</strong>
                  </p>
                  <p style={{ color: '#888', fontSize: 12, marginTop: 12 }}>
                    请凭此二维码到阅读室服务台取书
                  </p>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={() => setShowQr(null)}>
                  我知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
