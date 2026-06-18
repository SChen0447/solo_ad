import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import type { HealthMetrics, WorkloadItem } from '../types';

function AnimatedNumber({ value, suffix = '', duration = 600 }: { value: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return (
    <span
      style={{
        display: 'inline-block',
        fontVariantNumeric: 'tabular-nums',
        animation: value !== prevRef.current ? 'flip-number 0.4s ease' : 'none',
      }}
    >
      {display}
      {suffix}
    </span>
  );
}

function Gauge({
  value,
  max,
  label,
  color,
  invert = false,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  invert?: boolean;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayValue = invert ? Math.max(0, 100 - percentage) : percentage;
  const angle = (displayValue / 100) * 180;

  const size = 110;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - angle / 180);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size / 2 + 10 }}>
        <svg
          width={size}
          height={size / 2 + 10}
          viewBox={`0 0 ${size} ${size / 2 + 10}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#2d2d44"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={`url(#grad-${label})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            filter={`url(#glow-${label})`}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 22,
            fontWeight: 700,
            color,
          }}
        >
          <AnimatedNumber value={value} suffix={label.includes('小时') ? '' : '%'} />
          {label.includes('小时') ? <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.8 }}>h</span> : null}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#8080a0', textAlign: 'center', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function WorkloadBar({ item }: { item: WorkloadItem }) {
  const maxHours = Math.max(item.dailyLimit * 2, item.remainingHours, 1);
  const taskPct = (item.remainingHours / maxHours) * 100;
  const limitPct = (item.dailyLimit / maxHours) * 100;
  const dangerPct = ((item.dailyLimit * 1.5) / maxHours) * 100;

  return (
    <div
      style={{
        marginBottom: 14,
        animation: item.isOverloaded ? 'pulse-red 1.5s ease-in-out infinite' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: `hsl(${(item.member.charCodeAt(0) * 37) % 360}, 60%, 55%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {item.member.charAt(0)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: item.isOverloaded ? '#e94560' : '#e0e0f0' }}>
            {item.member}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#a0a0b8' }}>
          <span style={{ color: item.isOverloaded ? '#e94560' : '#8ab8e0', fontWeight: 600 }}>
            {item.remainingHours}h
          </span>
          <span style={{ color: '#606090' }}> / {item.taskCount}个任务</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 14, background: '#2d2d44', borderRadius: 7, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${taskPct}%`,
            background: item.isOverloaded
              ? 'linear-gradient(90deg, #e94560, #ff6b6b)'
              : 'linear-gradient(90deg, #3d6b93, #5d8bb3)',
            borderRadius: 7,
            transition: 'width 0.5s ease, background 0.3s ease',
            boxShadow: item.isOverloaded ? '0 0 10px rgba(233,69,96,0.5)' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${limitPct}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: '#f0c040',
            zIndex: 2,
          }}
          title="每日上限8h"
        />
        <div
          style={{
            position: 'absolute',
            left: `${dangerPct}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: '#e94560',
            opacity: 0.7,
            zIndex: 2,
          }}
          title="危险阈值12h"
        />
      </div>
    </div>
  );
}

export default function HealthPanel() {
  const { health, currentProjectId, loadHealth } = useAppStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!currentProjectId) return;
    loadHealth(currentProjectId);
    const interval = setInterval(() => {
      loadHealth(currentProjectId);
      setTick(t => t + 1);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentProjectId, loadHealth]);

  if (!health) {
    return (
      <div style={{ padding: 20, color: '#606090', textAlign: 'center' }}>
        <p>加载健康指标中...</p>
      </div>
    );
  }

  const sortedWorkloads = [...health.workloads].sort((a, b) => b.remainingHours - a.remainingHours);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ color: '#f0f0f8', fontSize: 16, fontWeight: 600 }}>项目健康度</h3>
          <div style={{ fontSize: 10, color: '#606090', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#2d6a4f',
                animation: 'pulse-red 2s ease-in-out infinite',
              }}
            />
            实时
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            background: '#0f1528',
            padding: '16px 8px 8px',
            borderRadius: 12,
          }}
        >
          <Gauge
            value={health.onTimeCompletionRate}
            max={100}
            label="按时完成率"
            color="#2d6a4f"
          />
          <Gauge
            value={health.avgTurnaroundHours}
            max={48}
            label="平均周转(小时)"
            color="#3d6b93"
          />
          <Gauge
            value={health.blockedTaskRate}
            max={100}
            label="阻塞率"
            color="#e94560"
            invert
          />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ color: '#f0f0f8', fontSize: 16, fontWeight: 600 }}>个人工作负荷</h3>
          <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 8, height: 3, background: '#f0c040', borderRadius: 2 }} />
              <span style={{ color: '#8080a0' }}>上限</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 8, height: 3, background: '#e94560', borderRadius: 2 }} />
              <span style={{ color: '#8080a0' }}>危险</span>
            </div>
          </div>
        </div>

        {sortedWorkloads.map(w => (
          <WorkloadBar key={w.member} item={w} />
        ))}

        {health.overloadedMembers.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(233, 69, 96, 0.1)',
              border: '1px solid rgba(233, 69, 96, 0.3)',
              animation: 'pulse-red 2s ease-in-out infinite',
            }}
          >
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 600, marginBottom: 4 }}>
              ⚠️ 超负荷警告
            </div>
            <div style={{ fontSize: 12, color: '#c08090', lineHeight: 1.6 }}>
              {health.overloadedMembers.join('、')} 工时已超过每日上限的150%，请考虑重新分配任务。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
