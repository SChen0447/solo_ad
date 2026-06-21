import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store';

interface BookingFormProps {
  deviceId: number | null;
  onClose: () => void;
  onBookingCreated: () => void;
}

function generateTimeOptions(startHour: number, startMin: number, endHour: number, endMin: number, step: number = 30): string[] {
  const times: string[] = [];
  let h = startHour;
  let m = startMin;
  while (h < endHour || (h === endHour && m <= endMin)) {
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += step;
    if (m >= 60) {
      h++;
      m -= 60;
    }
  }
  return times;
}

const startTimes = generateTimeOptions(8, 0, 21, 30);
const endTimes = generateTimeOptions(8, 30, 22, 0);

export default function BookingForm({ deviceId, onClose, onBookingCreated }: BookingFormProps) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:30');
  const [submitting, setSubmitting] = useState(false);

  const userId = useStore((s) => s.userId);
  const toast = useStore((s) => s.toast);

  if (deviceId === null) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast('Please select a date', 'error');
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (date === todayStr) {
      const now = today.getHours() * 60 + today.getMinutes();
      const [sh, sm] = startTime.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      if (startMinutes < now) {
        toast('Start time cannot be earlier than current time', 'error');
        return;
      }
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (endMinutes <= startMinutes) {
      toast('End time must be after start time', 'error');
      return;
    }

    if (endMinutes - startMinutes < 30) {
      toast('Duration must be at least 30 minutes', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, userId, date, startTime, endTime }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || data.message || 'Booking conflict or error', 'error');
        return;
      }

      toast('Booking created successfully', 'success');
      onBookingCreated();
      onClose();
    } catch {
      toast('Failed to create booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md animate-[scaleIn_0.2s_ease-out] rounded-2xl bg-dark-card p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/50 transition-colors hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="mb-6 text-xl font-semibold text-white">Book Device</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0f3460] px-3 py-2 text-white outline-none transition focus:border-dark-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">Start Time</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0f3460] px-3 py-2 text-white outline-none transition focus:border-dark-primary"
            >
              {startTimes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">End Time</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0f3460] px-3 py-2 text-white outline-none transition focus:border-dark-primary"
            >
              {endTimes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-dark-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Booking...' : 'Book Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
