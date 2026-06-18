import React, { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLibraryStore } from '../store';

interface BookOption {
  id: string;
  title: string;
  author: string;
  status: string;
}

export const BookingFlow: React.FC = () => {
  const { addToast, addBooking, updateBookingStatus, updateBookStatus, addBorrowRecord } = useLibraryStore();
  const [step, setStep] = useState<'search' | 'form' | 'qrcode' | 'scan'>('search');
  const [searchKw, setSearchKw] = useState('');
  const [bookOptions, setBookOptions] = useState<BookOption[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [ripple, setRipple] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const searchBooks = useCallback(async (kw: string) => {
    if (!kw.trim()) { setBookOptions([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/books/search?keyword=${encodeURIComponent(kw)}&page=1&pageSize=10`);
      const data = await res.json();
      setBookOptions(data.data.filter((b: BookOption) => b.status === 'available'));
    } catch {
      addToast('error', '搜索失败');
    } finally {
      setSearchLoading(false);
    }
  }, [addToast]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchKw(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchBooks(val), 250);
  };

  const handleSelectBook = (book: BookOption) => {
    setSelectedBook(book);
    setStep('form');
  };

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    setRipple(true);
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btn.style.setProperty('--ripple-x', `${x}px`);
    btn.style.setProperty('--ripple-y', `${y}px`);
    setTimeout(() => setRipple(false), 600);
  };

  const submitBooking = async () => {
    if (!selectedBook || !bookingDate || !timeSlot) {
      addToast('error', '请填写完整预约信息');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (bookingDate <= today) {
      addToast('error', '预约日期必须为明天及以后');
      return;
    }
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBook.id, date: bookingDate, timeSlot }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast('error', data.error || '预约失败');
        return;
      }
      addBooking(data);
      setBookingId(data.id);
      setStep('qrcode');
      addToast('success', '预约成功！请保存二维码到馆扫码取书');
    } catch {
      addToast('error', '预约请求失败');
    }
  };

  const handleScanBorrow = async () => {
    if (!scanInput.trim()) {
      addToast('error', '请输入预约编号');
      return;
    }
    try {
      const res = await fetch('/api/borrow/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: scanInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast('error', data.error || '扫码借书失败');
        return;
      }
      updateBookingStatus(scanInput.trim(), 'fulfilled');
      updateBookStatus(data.record.bookId, 'borrowed');
      addBorrowRecord(data.record);
      addToast('success', '借书成功！');
      window.dispatchEvent(new CustomEvent('borrow-success', {
        detail: { title: data.book.title, dueDate: data.book.dueDate },
      }));
      setScanInput('');
      setStep('search');
      setSelectedBook(null);
      setBookingDate('');
      setTimeSlot('');
    } catch {
      addToast('error', '借书请求失败');
    }
  };

  const downloadQR = () => {
    const svg = document.querySelector('#booking-qrcode svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      ctx?.drawImage(img, 0, 0, 200, 200);
      const a = document.createElement('a');
      a.download = `预约二维码_${bookingId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="booking-page">
      <div className="booking-header">
        <h2>预约借书</h2>
        <div className="booking-steps">
          <span className={step === 'search' ? 'step active' : 'step'}>1. 选择图书</span>
          <span className="step-arrow">→</span>
          <span className={step === 'form' ? 'step active' : 'step'}>2. 填写预约</span>
          <span className="step-arrow">→</span>
          <span className={step === 'qrcode' ? 'step active' : 'step'}>3. 获取二维码</span>
        </div>
      </div>

      {step === 'search' && (
        <div className="booking-section fade-in">
          <h3>搜索并选择要预约的图书</h3>
          <div className="booking-search">
            <input
              type="text"
              placeholder="输入书名或作者搜索..."
              value={searchKw}
              onChange={handleSearchChange}
              className="booking-search-input"
            />
          </div>
          {searchLoading && <div className="inline-loading">搜索中...</div>}
          <div className="book-options-list">
            {bookOptions.map((book) => (
              <div key={book.id} className="book-option-item" onClick={() => handleSelectBook(book)}>
                <div className="book-option-info">
                  <span className="book-option-title">{book.title}</span>
                  <span className="book-option-author">{book.author}</span>
                </div>
                <span className="book-option-status available">可预约</span>
              </div>
            ))}
          </div>

          <div className="scan-borrow-section">
            <h3>扫码借书</h3>
            <p className="scan-desc">已预约？输入预约编号完成借书</p>
            <div className="scan-input-row">
              <input
                type="text"
                placeholder="输入预约编号..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="scan-input"
              />
              <button className="scan-btn" onClick={handleScanBorrow}>扫码借书</button>
            </div>
          </div>
        </div>
      )}

      {step === 'form' && selectedBook && (
        <div className="booking-section fade-in">
          <div className="selected-book-card">
            <h4>{selectedBook.title}</h4>
            <p>{selectedBook.author}</p>
          </div>
          <div className="booking-form">
            <div className="form-group fade-in" style={{ animationDelay: '0.1s' }}>
              <label>预约日期</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={getMinDate()}
                className="form-input"
              />
            </div>
            <div className="form-group fade-in" style={{ animationDelay: '0.2s' }}>
              <label>取书时间段</label>
              <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="form-input">
                <option value="">请选择时间段</option>
                <option value="09:00-11:00">09:00 - 11:00</option>
                <option value="11:00-13:00">11:00 - 13:00</option>
                <option value="13:00-15:00">13:00 - 15:00</option>
                <option value="15:00-17:00">15:00 - 17:00</option>
                <option value="17:00-19:00">17:00 - 19:00</option>
              </select>
            </div>
            <div className="form-actions fade-in" style={{ animationDelay: '0.3s' }}>
              <button className="back-btn" onClick={() => setStep('search')}>返回</button>
              <button className={`submit-btn ${ripple ? 'ripple-active' : ''}`} onClick={(e) => { handleRipple(e); submitBooking(); }}>
                提交预约
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'qrcode' && (
        <div className="booking-section fade-in">
          <div className="qrcode-card">
            <h3>预约成功！</h3>
            <p>请保存以下二维码，到馆后出示扫码取书</p>
            <div id="booking-qrcode" className="qrcode-wrapper">
              <QRCodeSVG
                value={JSON.stringify({ bookingId, bookTitle: selectedBook?.title, date: bookingDate, timeSlot })}
                size={200}
                level="M"
                imageSettings={{
                  src: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#8d6e63"/><text x="20" y="26" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">图</text></svg>'),
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <div className="qrcode-info">
              <p><strong>预约编号：</strong>{bookingId}</p>
              <p><strong>图书：</strong>{selectedBook?.title}</p>
              <p><strong>日期：</strong>{bookingDate}</p>
              <p><strong>时段：</strong>{timeSlot}</p>
            </div>
            <button className="download-btn" onClick={downloadQR}>下载二维码</button>
          </div>
        </div>
      )}
    </div>
  );
};
