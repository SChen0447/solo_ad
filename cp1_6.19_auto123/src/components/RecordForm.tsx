import { useState, useEffect, useRef, useCallback } from 'react';
import type { TransportType, CommuteRecord } from '../types';
import { calculateEmission, TRANSPORT_LABELS, TRANSPORT_ICONS, TRANSPORT_COLORS, addRecord } from '../mockApi';

const TRANSPORT_TYPES: TransportType[] = ['walk', 'bicycle', 'electric', 'bus', 'metro', 'car', 'carpool'];

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

function AnimatedNumber({ value, duration = 600 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const easeOutQuad = (t: number) => t * (2 - t);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuad(progress);

      const currentValue = startValueRef.current + (value - startValueRef.current) * easedProgress;
      setDisplayValue(Math.round(currentValue * 100) / 100);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <>{displayValue.toFixed(value % 1 === 0 ? 0 : 1)}</>;
}

interface RecordFormProps {
  onRecordAdded: (record: CommuteRecord) => void;
  records: CommuteRecord[];
}

export default function RecordForm({ onRecordAdded, records }: RecordFormProps) {
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
  const [distance, setDistance] = useState('');
  const [calculatedEmission, setCalculatedEmission] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedTransport && distance) {
      const distNum = parseFloat(distance);
      if (!isNaN(distNum) && distNum > 0) {
        setCalculatedEmission(calculateEmission(selectedTransport, distNum));
      } else {
        setCalculatedEmission(0);
      }
    } else {
      setCalculatedEmission(0);
    }
  }, [selectedTransport, distance]);

  const handleSubmit = useCallback(async () => {
    if (!selectedTransport || !distance) return;

    const distNum = parseFloat(distance);
    if (isNaN(distNum) || distNum <= 0) return;

    setIsSubmitting(true);
    try {
      const emission = calculateEmission(selectedTransport, distNum);
      const newRecord = await addRecord({
        transport: selectedTransport,
        distance: distNum,
        emission,
      });
      onRecordAdded(newRecord);
      setSelectedTransport(null);
      setDistance('');
      setCalculatedEmission(0);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTransport, distance, onRecordAdded]);

  const isValid = selectedTransport && distance && parseFloat(distance) > 0;

  return (
    <div className="card">
      <h2 className="card-title">✏️ 记录通勤</h2>

      <div className="form-group">
        <label className="form-label">选择交通工具</label>
        <div className="transport-options">
          {TRANSPORT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`transport-btn ${selectedTransport === type ? 'active' : ''}`}
              onClick={() => setSelectedTransport(type)}
              style={{
                borderColor: selectedTransport === type ? TRANSPORT_COLORS[type] : undefined,
                background: selectedTransport === type ? `${TRANSPORT_COLORS[type]}15` : undefined,
              }}
            >
              <span className="icon">{TRANSPORT_ICONS[type]}</span>
              <span>{TRANSPORT_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">行驶里程</label>
        <div className="input-wrapper">
          <input
            type="number"
            className="form-input"
            placeholder="请输入里程"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            step="0.1"
            min="0"
          />
          <span className="input-suffix">公里</span>
        </div>
      </div>

      {isValid && (
        <div className="emission-preview">
          <div className="label">本次碳排放</div>
          <div className="value">
            <AnimatedNumber value={calculatedEmission} />
            <span className="unit">g CO₂</span>
          </div>
        </div>
      )}

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? '提交中...' : '添加记录'}
      </button>

      {records.length > 0 && (
        <div className="form-group" style={{ marginTop: '24px' }}>
          <label className="form-label">📋 最近记录</label>
          <div className="records-list">
            {records.slice(0, 10).map((record) => (
              <div key={record.id} className="record-item">
                <span
                  className="transport-icon"
                  style={{ backgroundColor: `${TRANSPORT_COLORS[record.transport]}15` }}
                >
                  {TRANSPORT_ICONS[record.transport]}
                </span>
                <div className="info">
                  <div className="transport-name">{TRANSPORT_LABELS[record.transport]}</div>
                  <div className="distance">{record.distance} 公里</div>
                </div>
                <div className="emission" style={{ color: TRANSPORT_COLORS[record.transport] }}>
                  {record.emission.toFixed(1)} g
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
