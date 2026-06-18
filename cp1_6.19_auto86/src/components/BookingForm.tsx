import { useState, useMemo, useEffect } from 'react';
import { X, User, Phone, CheckCircle } from 'lucide-react';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookStore } from '@/stores/bookStore';
import DatePicker from './DatePicker';
import TimeSlotPicker from './TimeSlotPicker';
import { formatDateDisplay } from '@/utils/dateUtils';
import type { Book, TimeSlot, BookingFormData } from '@/types';

interface BookingFormProps {
  book: Book;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

export default function BookingForm({ book, onClose, onSuccess }: BookingFormProps) {
  const { submitBooking, getTimeSlotAvailability } = useBookingStore();
  const { updateBookStock } = useBookStore();
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const availability = useMemo(() => {
    if (!selectedDate) {
      return {
        morning: { date: '', timeSlot: 'morning' as const, total: 5, remaining: 5 },
        afternoon: { date: '', timeSlot: 'afternoon' as const, total: 5, remaining: 5 },
      };
    }
    return {
      morning: getTimeSlotAvailability(selectedDate, 'morning'),
      afternoon: getTimeSlotAvailability(selectedDate, 'afternoon'),
    };
  }, [selectedDate, getTimeSlotAvailability]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedDate) {
      newErrors.date = '请选择取书日期';
    }
    if (!selectedSlot) {
      newErrors.slot = '请选择取书时段';
    }
    if (!customerName.trim()) {
      newErrors.name = '请输入姓名';
    }
    if (!phone.trim()) {
      newErrors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      newErrors.phone = '请输入正确的手机号';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirm(true);
    }
  };

  const confirmBooking = () => {
    setIsSubmitting(true);
    
    const formData: BookingFormData = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      pickupDate: selectedDate,
      timeSlot: selectedSlot!,
    };

    setTimeout(() => {
      const booking = submitBooking(book.id, formData);
      if (booking) {
        updateBookStock(book.id, -1);
        setIsSubmitting(false);
        onSuccess(booking.id);
      } else {
        setIsSubmitting(false);
        setErrors({ slot: '该时段名额已满，请选择其他时段' });
      }
    }, 500);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">预约取书</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-16 h-22 object-cover rounded-lg"
              style={{ width: '60px', height: '82px' }}
            />
            <div>
              <h3 className="font-semibold text-gray-800">{book.title}</h3>
              <p className="text-sm text-gray-600">{book.author}</p>
              <p className="text-primary font-bold">¥{book.price.toFixed(2)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <DatePicker
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setErrors((prev) => ({ ...prev, date: '' }));
              }}
            />
            {errors.date && (
              <p className="text-red-500 text-sm -mt-4">{errors.date}</p>
            )}

            {selectedDate && (
              <>
                <TimeSlotPicker
                  selectedSlot={selectedSlot}
                  onSlotSelect={(slot) => {
                    setSelectedSlot(slot);
                    setErrors((prev) => ({ ...prev, slot: '' }));
                  }}
                  availability={availability}
                />
                {errors.slot && (
                  <p className="text-red-500 text-sm -mt-4">{errors.slot}</p>
                )}
              </>
            )}

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                您的姓名
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="请输入您的姓名"
                  className="input-field pl-12"
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                联系电话
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="请输入11位手机号"
                  className="input-field pl-12"
                  maxLength={11}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1"
              >
                {isSubmitting ? '提交中...' : '提交预约'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">确认预约信息</h3>
              <p className="text-gray-600 mb-6">请确认以下预约信息是否正确</p>

              <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
                <p>
                  <span className="text-gray-500">图书：</span>
                  <span className="font-medium">{book.title}</span>
                </p>
                <p>
                  <span className="text-gray-500">取书日期：</span>
                  <span className="font-medium">{formatDateDisplay(selectedDate)}</span>
                </p>
                <p>
                  <span className="text-gray-500">取书时段：</span>
                  <span className="font-medium">
                    {selectedSlot === 'morning' ? '上午 10:00 - 12:00' : '下午 14:00 - 17:00'}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">姓名：</span>
                  <span className="font-medium">{customerName}</span>
                </p>
                <p>
                  <span className="text-gray-500">电话：</span>
                  <span className="font-medium">{phone}</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  返回修改
                </button>
                <button
                  type="button"
                  onClick={confirmBooking}
                  disabled={isSubmitting}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? '提交中...' : '确认预约'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
