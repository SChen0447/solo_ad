import { useEffect, useRef, useState, useCallback } from 'react';
import { MonitorScene } from './scene';
import {
  DataStream,
  MetricData,
  Thresholds,
  DEFAULT_THRESHOLDS,
  METRIC_KEYS,
  METRIC_COLORS,
  METRIC_LABELS,
} from './dataStream';

const ALERT_DELAY = 3000;
const BEEP_FREQ = 400;
const BEEP_DUR = 0.2;
const BEEP_INTERVAL = 1000;
const WARNING_FLASH_PERIOD = 0.5;

let audioCtx: AudioContext | null = null;

function playBeep(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = BEEP_FREQ;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + BEEP_DUR);
}

const sliderStyles = (color: string): React.CSSProperties => ({
  width: '100%',
  accentColor: '#6666ff',
  background: `linear-gradient(to right, ${color}, rgba(100,100,100,0.3))`,
  height: '4px',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
});

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MonitorScene | null>(null);
  const streamRef = useRef<DataStream | null>(null);
  const overSinceRef = useRef<Record<keyof MetricData, number | null>>({
    cpu: null, memory: null, network: null,
  });
  const beepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [data, setData] = useState<MetricData>({ cpu: 0, memory: 0, network: 0 });
  const [thresholds, setThresholds] = useState<Thresholds>({ ...DEFAULT_THRESHOLDS });
  const [alerts, setAlerts] = useState<Record<keyof MetricData, boolean>>({
    cpu: false, memory: false, network: false,
  });
  const [sustainedAlert, setSustainedAlert] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const onSliderChange = useCallback((key: keyof Thresholds, value: number) => {
    setThresholds(prev => {
      const next = { ...prev, [key]: value };
      streamRef.current?.setThreshold(key, value);
      return next;
    });
  }, []);

  const onReset = useCallback(() => {
    streamRef.current?.reset();
    setThresholds({ ...DEFAULT_THRESHOLDS });
    overSinceRef.current = { cpu: null, memory: null, network: null };
    setAlerts({ cpu: false, memory: false, network: false });
    setSustainedAlert(false);
    setWarningVisible(false);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new MonitorScene(containerRef.current);
    sceneRef.current = scene;

    const stream = new DataStream();
    streamRef.current = stream;

    stream.onUpdate((newData, newThresholds) => {
      setData({ ...newData });
      setThresholds({ ...newThresholds });
      scene.updateData(newData, newThresholds);

      const now = Date.now();
      let anySustained = false;
      const newAlerts: Record<keyof MetricData, boolean> = { cpu: false, memory: false, network: false };

      METRIC_KEYS.forEach(key => {
        const over = newData[key] > newThresholds[key];
        newAlerts[key] = over;
        if (over) {
          if (overSinceRef.current[key] === null) {
            overSinceRef.current[key] = now;
          }
          if (now - overSinceRef.current[key]! >= ALERT_DELAY) {
            anySustained = true;
          }
        } else {
          overSinceRef.current[key] = null;
        }
      });

      setAlerts(newAlerts);
      setSustainedAlert(anySustained);
    });

    stream.start();

    return () => {
      stream.stop();
      scene.dispose();
      sceneRef.current = null;
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sustainedAlert) {
      playBeep();
      if (!beepTimerRef.current) {
        beepTimerRef.current = setInterval(playBeep, BEEP_INTERVAL);
      }
    } else {
      if (beepTimerRef.current) {
        clearInterval(beepTimerRef.current);
        beepTimerRef.current = null;
      }
    }
    return () => {
      if (beepTimerRef.current) {
        clearInterval(beepTimerRef.current);
        beepTimerRef.current = null;
      }
    };
  }, [sustainedAlert]);

  useEffect(() => {
    if (!sustainedAlert) {
      setWarningVisible(false);
      return;
    }
    const id = setInterval(() => {
      setWarningVisible(v => !v);
    }, WARNING_FLASH_PERIOD * 1000);
    setWarningVisible(true);
    return () => clearInterval(id);
  }, [sustainedAlert]);

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '60px', background: 'rgba(20,20,30,0.85)',
        borderRadius: '12px 12px 0 0', border: '1px solid #446',
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 12px', overflowX: 'auto', zIndex: 100,
      }
    : {
        position: 'fixed', top: '16px', left: '16px', width: '240px',
        background: 'rgba(20,20,30,0.85)', borderRadius: '12px',
        border: '1px solid #446', padding: '16px', zIndex: 100,
      };

  return (
    <>
      <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative' }} />

      <div style={panelStyle}>
        {isMobile ? (
          <>
            {METRIC_KEYS.map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '160px', flexShrink: 0 }}>
                <span style={{ color: METRIC_COLORS[key], fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {METRIC_LABELS[key]} {thresholds[key]}
                </span>
                <input
                  type="range" min={0} max={100} step={1}
                  value={thresholds[key]}
                  onChange={e => onSliderChange(key, Number(e.target.value))}
                  style={{ width: '80px', accentColor: '#6666ff', cursor: 'pointer' }}
                />
              </div>
            ))}
            <button onClick={onReset} style={{
              background: '#cc3333', color: 'white', border: 'none',
              borderRadius: '8px', padding: '4px 12px', cursor: 'pointer',
              fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              RESET
            </button>
          </>
        ) : (
          <>
            <div style={{ color: '#aabbff', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '12px', textShadow: '0 0 8px #6666ff' }}>
              ◈ MONITOR PANEL
            </div>
            {METRIC_KEYS.map(key => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ color: METRIC_COLORS[key], fontSize: '13px', fontFamily: 'monospace', textShadow: `0 0 6px ${METRIC_COLORS[key]}` }}>
                    {METRIC_LABELS[key]}
                  </span>
                  <span style={{ color: '#aab', fontSize: '12px', fontFamily: 'monospace' }}>
                    {thresholds[key]}
                  </span>
                </div>
                <input
                  type="range" min={0} max={100} step={1}
                  value={thresholds[key]}
                  onChange={e => onSliderChange(key, Number(e.target.value))}
                  style={sliderStyles(METRIC_COLORS[key])}
                />
              </div>
            ))}
            <button
              onClick={onReset}
              onMouseEnter={e => (e.currentTarget.style.background = '#ee4444')}
              onMouseLeave={e => (e.currentTarget.style.background = '#cc3333')}
              style={{
                width: '100%', padding: '8px', background: '#cc3333', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold',
                textShadow: '0 0 4px rgba(255,0,0,0.5)', transition: 'background 0.2s',
              }}
            >
              RESET
            </button>

            {METRIC_KEYS.map(key => alerts[key] && (
              <div key={key} style={{
                marginTop: '8px', padding: '6px 8px', background: 'rgba(255,51,51,0.2)',
                border: '1px solid #ff3333', borderRadius: '6px',
                color: '#ff6666', fontSize: '11px', fontFamily: 'monospace',
                textShadow: '0 0 4px #ff3333', animation: 'flash 0.3s infinite',
              }}>
                ⚠ {METRIC_LABELS[key]} OVER THRESHOLD ({data[key].toFixed(1)} &gt; {thresholds[key]})
              </div>
            ))}
          </>
        )}
      </div>

      {sustainedAlert && warningVisible && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 200, pointerEvents: 'none',
        }}>
          <svg width="60" height="52" viewBox="0 0 60 52">
            <polygon points="30,0 60,52 0,52" fill="none" stroke="#ff3333" strokeWidth="3" />
            <text x="30" y="36" textAnchor="middle" fill="#ff3333" fontSize="24" fontWeight="bold" fontFamily="monospace">!</text>
          </svg>
        </div>
      )}

      <style>{`
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6666ff;
          cursor: pointer;
          box-shadow: 0 0 6px #6666ff;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6666ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px #6666ff;
        }
      `}</style>
    </>
  );
}
