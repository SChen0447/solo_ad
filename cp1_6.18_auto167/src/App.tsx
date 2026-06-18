import { useEffect } from 'react';
import Timeline from '@/components/Timeline';
import DateCard from '@/components/DateCard';
import ControlPanel from '@/components/ControlPanel';
import { useTimelineStore } from '@/core/store';
import type { DeviceType, LayoutMode } from '@/types';

function useResponsive() {
  const setDeviceType = useTimelineStore((s) => s.setDeviceType);
  const setLayoutMode = useTimelineStore((s) => s.setLayoutMode);
  const setVisibleNodeCount = useTimelineStore((s) => s.setVisibleNodeCount);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      let device: DeviceType = 'desktop';
      let layout: LayoutMode = 'horizontal';
      let count = 30;

      if (w <= 640) {
        device = 'mobile';
        layout = 'vertical';
        count = 20;
      } else if (w <= 1024) {
        device = 'tablet';
        layout = 'horizontal';
        count = 20;
      } else {
        device = 'desktop';
        layout = 'horizontal';
        count = 30;
      }

      setDeviceType(device);
      setLayoutMode(layout);
      setVisibleNodeCount(count);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setDeviceType, setLayoutMode, setVisibleNodeCount]);
}

export default function App() {
  const loadSampleData = useTimelineStore((s) => s.loadSampleData);
  const layoutMode = useTimelineStore((s) => s.layoutMode);

  useResponsive();

  useEffect(() => {
    loadSampleData();
  }, [loadSampleData]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a2332',
        color: '#e0e6ed',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: layoutMode === 'vertical' ? '20px 16px 0' : '40px 20px 0',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: layoutMode === 'vertical' ? 22 : 32,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 50%, #ef4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}
        >
          ⏳ 时间轨迹
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
          记录心情，串起每一天的闪光
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: layoutMode === 'vertical' ? 'calc(100vh - 120px)' : 'calc(100vh - 160px)',
        }}
      >
        <Timeline />
      </div>

      <DateCard />
      <ControlPanel />
    </div>
  );
}
