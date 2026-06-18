import { useAppStore } from '../store/AppStore';
import { formatTime } from '../analysis/SunlightAnalyzer';

const daysInMonth = (month: number) => {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
};

export function ControlPanel() {
  const { time, month, day, setTime, setDate } = useAppStore();

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTime(value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = parseInt(e.target.value);
    const maxDay = daysInMonth(newMonth);
    const newDay = Math.min(day, maxDay);
    setDate(newMonth, newDay);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(month, parseInt(e.target.value));
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.title}>城市建筑日照与阴影动态分析</div>
        
        <div style={styles.sliderGroup}>
          <div style={styles.sliderLabel}>
            <span style={styles.sunIcon}>☀</span>
            <span style={styles.labelText}>时间</span>
            <span style={styles.timeValue}>{formatTime(time)}</span>
            <span style={styles.sunsetIcon}>🌅</span>
          </div>
          <input
            type="range"
            min="6"
            max="20"
            step="0.25"
            value={time}
            onChange={handleTimeChange}
            style={styles.slider}
          />
          <div style={styles.sliderMarks}>
            <span>6:00</span>
            <span>12:00</span>
            <span>20:00</span>
          </div>
        </div>

        <div style={styles.sliderGroup}>
          <div style={styles.sliderLabel}>
            <span style={styles.labelText}>日期</span>
            <span style={styles.dateValue}>{monthNames[month - 1]} {day}日</span>
          </div>
          <div style={styles.dateSliders}>
            <div style={{ flex: 1 }}>
              <div style={styles.subLabel}>月份</div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={month}
                onChange={handleMonthChange}
                style={styles.slider}
              />
            </div>
            <div style={{ flex: 1, marginLeft: 20 }}>
              <div style={styles.subLabel}>日期</div>
              <input
                type="range"
                min="1"
                max={daysInMonth(month)}
                step="1"
                value={day}
                onChange={handleDayChange}
                style={styles.slider}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: '20px',
    pointerEvents: 'none',
  },
  panel: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '20px 24px',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    pointerEvents: 'auto',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  sliderGroup: {
    marginBottom: 16,
  },
  sliderLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    color: '#ffffff',
    fontSize: 14,
  },
  labelText: {
    fontWeight: 500,
  },
  timeValue: {
    marginLeft: 'auto',
    color: '#4fc3f7',
    fontWeight: 600,
    fontSize: 16,
  },
  dateValue: {
    marginLeft: 'auto',
    color: '#4fc3f7',
    fontWeight: 600,
    fontSize: 16,
  },
  sunIcon: {
    color: '#ffd54f',
    fontSize: 18,
  },
  sunsetIcon: {
    color: '#ff7043',
    fontSize: 18,
  },
  slider: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: 'rgba(255, 255, 255, 0.2)',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  },
  sliderMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  dateSliders: {
    display: 'flex',
    gap: 10,
  },
  subLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
};
