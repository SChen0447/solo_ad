import { useState } from 'react';

interface BookingFormProps {
  nickname: string;
  disabled?: boolean;
  onSubmit: (nickname: string, duration: number) => void;
}

export default function BookingForm({ nickname, disabled, onSubmit }: BookingFormProps) {
  const [duration, setDuration] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(nickname, duration);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <h3>📝 预约排队</h3>
      
      <div className="form-group">
        <label>您的昵称</label>
        <input type="text" value={nickname} disabled />
      </div>

      <div className="form-group">
        <label>预计使用时长</label>
        <div className="duration-input-wrapper">
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={disabled}
          />
          <span className="duration-value">{duration} 分钟</span>
        </div>
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? '提交中...' : disabled ? '设备维护中，无法预约' : '加入排队'}
      </button>
    </form>
  );
}
