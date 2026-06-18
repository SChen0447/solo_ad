export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function getRemainingTime(targetDate: Date): TimeRemaining {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const total = Math.max(0, target - now);

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

export function startCountdown(
  targetDate: Date,
  callback: (time: TimeRemaining) => void
): () => void {
  const update = () => {
    const time = getRemainingTime(targetDate);
    callback(time);
  };

  update();
  const intervalId = setInterval(update, 1000);

  return () => clearInterval(intervalId);
}

export function validateTargetDate(date: Date): boolean {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return new Date(date) >= tomorrow;
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeRemaining(time: TimeRemaining): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${time.days}天 ${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
}
