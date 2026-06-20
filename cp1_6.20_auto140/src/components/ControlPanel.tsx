import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlantStore } from '@/store/useStore';
import { Sun, Droplets, FlaskConical, ChevronDown } from 'lucide-react';
import type { SpeciesData } from '@/utils/plantGrowth';
import { STAGE_LABELS } from '@/utils/plantGrowth';

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  icon: React.ReactNode;
}

function Slider({ label, value, onChange, color, icon }: SliderProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderHeader}>
        <span style={styles.sliderIcon}>{icon}</span>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValue}>{value}</span>
      </div>
      <div style={styles.sliderTrackWrapper}>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...styles.sliderInput,
            background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #1a1a2e ${value}%, #1a1a2e 100%)`,
          }}
          className="plant-slider"
        />
      </div>
    </div>
  );
}

function BarChart3D({ light, water, nutrient }: { light: number; water: number; nutrient: number }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>环境参数</div>
      <div style={styles.chartContainer}>
        {[
          { value: light, color: '#FFD700', label: '光照' },
          { value: water, color: '#4A90D9', label: '水分' },
          { value: nutrient, color: '#8B5A2B', label: '养分' },
        ].map((bar) => (
          <div key={bar.label} style={styles.barColumn}>
            <div style={styles.barWrapper}>
              <div
                style={{
                  ...styles.bar,
                  height: `${bar.value}%`,
                  background: `linear-gradient(to top, ${bar.color}dd, ${bar.color})`,
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>
            <span style={styles.barLabel}>{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ControlPanelProps {
  speciesList: SpeciesData[];
  currentStage: string;
  overallProgress: number;
}

export default function ControlPanel({ speciesList, currentStage, overallProgress }: ControlPanelProps) {
  const { environment, species, setEnvironment, setSpecies } = usePlantStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLightChange = useCallback((v: number) => setEnvironment({ light: v }), [setEnvironment]);
  const handleWaterChange = useCallback((v: number) => setEnvironment({ water: v }), [setEnvironment]);
  const handleNutrientChange = useCallback((v: number) => setEnvironment({ nutrient: v }), [setEnvironment]);

  const handleSpeciesSelect = useCallback((sp: SpeciesData) => {
    setSpecies(sp);
    setDropdownOpen(false);
  }, [setSpecies]);

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>植物生长模拟器</h2>

      <div style={styles.statusCard}>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>当前物种</span>
          <span style={styles.statusValue}>{species?.name || '未选择'}</span>
        </div>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>生长阶段</span>
          <span style={styles.statusValue}>{STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] || currentStage}</span>
        </div>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>总体进度</span>
          <span style={styles.statusValue}>{Math.round(overallProgress * 100)}%</span>
        </div>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${overallProgress * 100}%`,
            }}
          />
        </div>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.sectionTitle}>选择物种</div>
        <div ref={dropdownRef} style={styles.dropdownWrapper}>
          <button
            style={styles.dropdownButton}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>{species?.name || '请选择植物物种'}</span>
            <ChevronDown size={16} style={{
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s'
            }} />
          </button>
          {dropdownOpen && (
            <div style={styles.dropdownMenu}>
              {speciesList.map((sp) => (
                <button
                  key={sp.id}
                  style={{
                    ...styles.dropdownItem,
                    background: species?.id === sp.id ? '#3a3a4c' : 'transparent',
                  }}
                  onClick={() => handleSpeciesSelect(sp)}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = '#3a3a4c';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = species?.id === sp.id ? '#3a3a4c' : 'transparent';
                  }}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.sectionTitle}>环境参数调节</div>
        <Slider
          label="光照"
          value={environment.light}
          onChange={handleLightChange}
          color="#FFD700"
          icon={<Sun size={16} color="#FFD700" />}
        />
        <Slider
          label="水分"
          value={environment.water}
          onChange={handleWaterChange}
          color="#4A90D9"
          icon={<Droplets size={16} color="#4A90D9" />}
        />
        <Slider
          label="养分"
          value={environment.nutrient}
          onChange={handleNutrientChange}
          color="#8B5A2B"
          icon={<FlaskConical size={16} color="#8B5A2B" />}
        />
      </div>

      <BarChart3D light={environment.light} water={environment.water} nutrient={environment.nutrient} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#1e1e2e',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '20px',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: 0,
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  statusCard: {
    background: '#2a2a3c',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: '12px',
    color: '#a0a0a0',
    fontFamily: "'DM Sans', sans-serif",
  },
  statusValue: {
    fontSize: '13px',
    color: '#e0e0e0',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
  },
  progressBarBg: {
    height: '4px',
    background: '#1a1a2e',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(to right, #4a90d9, #2d6a4f)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  sectionCard: {
    background: '#2a2a3c',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '13px',
    color: '#a0a0a0',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  dropdownWrapper: {
    position: 'relative' as const,
  },
  dropdownButton: {
    width: '100%',
    background: '#1e1e2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    outline: 'none',
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#2a2a3c',
    borderRadius: '6px',
    marginTop: '4px',
    overflow: 'hidden',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  dropdownItem: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '10px 12px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.15s',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sliderHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sliderIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: '12px',
    color: '#a0a0a0',
    fontFamily: "'DM Sans', sans-serif",
    flex: 1,
  },
  sliderValue: {
    fontSize: '13px',
    color: '#e0e0e0',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    minWidth: '28px',
    textAlign: 'right' as const,
  },
  sliderTrackWrapper: {
    position: 'relative' as const,
  },
  sliderInput: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    WebkitAppearance: 'none' as unknown as number,
    appearance: 'none' as unknown as string,
    cursor: 'pointer',
  },
  chartCard: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '12px',
    backdropFilter: 'blur(10px)',
  },
  chartTitle: {
    fontSize: '12px',
    color: '#a0a0a0',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '10px',
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100px',
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  barWrapper: {
    width: '28px',
    height: '80px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
  },
  barLabel: {
    fontSize: '10px',
    color: '#a0a0a0',
    fontFamily: "'DM Sans', sans-serif",
  },
};
