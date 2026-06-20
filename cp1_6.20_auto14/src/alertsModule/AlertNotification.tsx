import React, { useEffect, useRef, useState } from 'react';
import { useSensorStore } from '../sensorDataModule/store.tsx';
import {
  AlertNotification as AlertNotifType,
  SENSOR_LABELS,
  SENSOR_UNITS,
  SENSOR_COLORS,
  formatTime,
  SensorData,
} from '../sensorDataModule/types';

const generateNotifId = (): string => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const AlertNotification: React.FC = () => {
  const { state, addAlertNotification, removeAlertNotification } = useSensorStore();
  const lastCheckedDataIdRef = useRef<string | null>(null);
  const triggeredRulesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const dataLen = state.sensorData.length;
    if (dataLen === 0) return;

    const latest: SensorData = state.sensorData[dataLen - 1];
    if (lastCheckedDataIdRef.current === latest.id) return;
    lastCheckedDataIdRef.current = latest.id;

    const rules = state.alertRules.filter((r) => r.enabled);
    const now = Date.now();

    for (const rule of rules) {
      const value = latest[rule.sensorType];
      const triggered =
        rule.operator === '>' ? value > rule.threshold : value < rule.threshold;

      const ruleKey = `${rule.id}-${latest.timestamp}`;

      if (triggered && !triggeredRulesRef.current.has(ruleKey)) {
        triggeredRulesRef.current.add(ruleKey);

        const notif: AlertNotifType = {
          id: generateNotifId(),
          timestamp: latest.timestamp,
          time: formatTime(latest.timestamp),
          sensorType: rule.sensorType,
          value,
          ruleDescription: `${SENSOR_LABELS[rule.sensorType]} ${rule.operator} ${rule.threshold} ${SENSOR_UNITS[rule.sensorType]}`,
        };
        addAlertNotification(notif);
      }
    }

    // Clean up old rule keys (older than 30s)
    const cutoff = now - 30000;
    for (const key of Array.from(triggeredRulesRef.current)) {
      const ts = parseInt(key.split('-')[3] || '0', 10);
      if (!isNaN(ts) && ts < cutoff) {
        triggeredRulesRef.current.delete(key);
      }
    }
  }, [state.sensorData, state.alertRules, addAlertNotification]);

  const notifications = state.alertNotifications;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>警报通知</h3>
        <span style={styles.countBadge}>{notifications.length}</span>
      </div>

      <div style={styles.listContainer}>
        {notifications.length === 0 && (
          <div style={styles.empty}>暂无警报</div>
        )}
        {notifications.map((notif, index) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            index={index}
            onClose={() => removeAlertNotification(notif.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface NotificationItemProps {
  notification: AlertNotifType;
  index: number;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, index, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const color = SENSOR_COLORS[notification.sensorType];

  return (
    <div
      style={{
        ...styles.notificationCard,
        borderLeftColor: color,
        opacity: leaving ? 0 : visible ? 1 : 0,
        transform: leaving
          ? 'translateX(120%)'
          : visible
          ? 'translateX(0)'
          : 'translateX(120%)',
        transition: `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)`,
        transitionDelay: `${Math.min(index * 30, 150)}ms`,
      }}
    >
      <div style={styles.notifHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span
            style={{
              ...styles.sensorDot,
              backgroundColor: color,
            }}
          />
          <span style={styles.sensorName}>{SENSOR_LABELS[notification.sensorType]}</span>
          <span style={styles.notifTime}>{notification.time}</span>
        </div>
        <button onClick={handleClose} style={styles.closeButton} aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="#888"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div style={styles.notifBody}>
        <div style={styles.triggeredValueRow}>
          <span style={styles.valueLabel}>触发值</span>
          <span style={{ ...styles.triggeredValue, color }}>
            {notification.value.toFixed(2)} {SENSOR_UNITS[notification.sensorType]}
          </span>
        </div>
        <div style={styles.ruleDesc}>
          <span style={styles.ruleLabel}>规则:</span>
          <span style={styles.ruleText}>{notification.ruleDescription}</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#16213e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    padding: '16px',
    boxSizing: 'border-box',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
  },
  countBadge: {
    background: '#e94560',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    minWidth: '20px',
    textAlign: 'center',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    maxHeight: '300px',
    flex: 1,
  },
  empty: {
    color: '#555',
    fontSize: '12px',
    textAlign: 'center',
    padding: '30px 0',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    background: 'rgba(15, 52, 96, 0.5)',
    borderRadius: '10px',
    borderLeft: '3px solid',
    padding: '12px',
    boxSizing: 'border-box',
    backdropFilter: 'blur(8px)',
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sensorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  sensorName: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
  },
  notifTime: {
    color: '#666',
    fontSize: '11px',
    marginLeft: '4px',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    padding: '4px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease',
  },
  notifBody: {
    paddingLeft: '16px',
  },
  triggeredValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  valueLabel: {
    color: '#888',
    fontSize: '11px',
  },
  triggeredValue: {
    fontSize: '16px',
    fontWeight: 700,
  },
  ruleDesc: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  ruleLabel: {
    color: '#666',
    fontSize: '10px',
  },
  ruleText: {
    color: '#b0b0b0',
    fontSize: '11px',
  },
};

export default AlertNotification;
