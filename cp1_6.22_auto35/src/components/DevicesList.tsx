import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';

interface Booking {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface Device {
  id: number;
  name: string;
  icon: string;
  status: string;
  recentBookings: Booking[];
}

interface DevicesListProps {
  devices: Device[];
  onBook: (deviceId: number) => void;
}

interface RippleItem {
  x: number;
  y: number;
  id: number;
}

function DeviceCard({ device, onBook }: { device: Device; onBook: (deviceId: number) => void }) {
  const navigate = useNavigate();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const cardRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleIdRef = useRef(0);

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  const handleBookClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isLoggedIn) {
        navigate('/login');
        return;
      }
      onBook(device.id);
    },
    [isLoggedIn, navigate, onBook, device.id],
  );

  const isAvailable = device.status === 'available';

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className={cn(
        'relative overflow-hidden bg-dark-card rounded-xl p-6 border border-white/5',
        'transition-all duration-300 cursor-pointer',
        'hover:-translate-y-[6px] hover:shadow-xl',
        'group',
      )}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/20 animate-ripple pointer-events-none"
          style={{
            left: ripple.x - 50,
            top: ripple.y - 50,
            width: 100,
            height: 100,
          }}
        />
      ))}

      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl leading-none">{device.icon}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              isAvailable ? 'bg-green-500' : 'bg-red-500',
            )}
          />
          <span className={cn('text-xs', isAvailable ? 'text-green-400' : 'text-red-400')}>
            {isAvailable ? '可用' : '使用中'}
          </span>
        </div>
      </div>

      <h3 className="text-white font-semibold text-lg mb-4">{device.name}</h3>

      <button
        onClick={handleBookClick}
        className={cn(
          'w-full py-2 rounded-lg bg-dark-primary text-white font-medium',
          'active:scale-95 transition-transform duration-200',
          'hover:bg-dark-primary/90',
        )}
      >
        预约
      </button>

      {device.recentBookings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1 mb-2">
            <Clock className="w-3 h-3 text-white/50" />
            <span className="text-white/50 text-xs">最近预约</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {device.recentBookings.slice(0, 3).map((booking) => (
              <span
                key={booking.id}
                className="inline-flex items-center bg-dark-accent/50 text-white/70 text-xs px-2 py-0.5 rounded-full"
              >
                {booking.date} {booking.startTime}-{booking.endTime}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DevicesList({ devices, onBook }: DevicesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} onBook={onBook} />
      ))}
    </div>
  );
}
