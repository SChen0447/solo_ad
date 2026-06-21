import { useState, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { WindFieldManager, AltitudeLevel, getAltitudeLevelName } from './wind/WindFieldManager'
import { ParticleSystem } from './wind/ParticleSystem'
import { Earth } from './components/Earth'
import { InfoPanel, SelectedPointInfo } from './components/InfoPanel'

function StarBackground() {
  const stars = useMemo(() => {
    const result = []
    for (let i = 0; i < 200; i++) {
      result.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3
      })
    }
    return result
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`
          }}
        />
      ))}
    </div>
  )
}

function AltitudeSwitcher({
  currentLevel,
  onChange
}: {
  currentLevel: AltitudeLevel
  onChange: (level: AltitudeLevel) => void
}) {
  const levels: AltitudeLevel[] = ['surface', '500hPa', '250hPa']

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
      }}
    >
      {levels.map(level => (
        <button
          key={level}
          onClick={() => onChange(level)}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: currentLevel === level ? '#3182ce' : 'rgba(74, 85, 104, 0.7)',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'background-color 0.2s, transform 0.1s',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            if (currentLevel !== level) {
              e.currentTarget.style.backgroundColor = 'rgba(99, 110, 130, 0.8)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentLevel !== level) {
              e.currentTarget.style.backgroundColor = 'rgba(74, 85, 104, 0.7)'
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {getAltitudeLevelName(level)}
        </button>
      ))}
    </div>
  )
}

function ParticleDensitySlider({
  value,
  onChange
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '13px',
          color: '#e2e8f0'
        }}
      >
        <span>粒子密度</span>
        <span style={{ color: '#63b3ed', fontWeight: 500 }}>{value}</span>
      </div>
      <input
        type="range"
        min={1000}
        max={10000}
        step={500}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none'
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3182ce;
          cursor: pointer;
          transition: transform 0.1s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3182ce;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}

function ControlPanel({
  altitudeLevel,
  onAltitudeChange,
  particleCount,
  onParticleCountChange,
  isPlaying,
  onTogglePlay
}: {
  altitudeLevel: AltitudeLevel
  onAltitudeChange: (level: AltitudeLevel) => void
  particleCount: number
  onParticleCountChange: (count: number) => void
  isPlaying: boolean
  onTogglePlay: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '280px',
        backgroundColor: 'rgba(26, 32, 44, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '16px',
        color: '#e2e8f0',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        全球风场可视化
      </div>

      <AltitudeSwitcher currentLevel={altitudeLevel} onChange={onAltitudeChange} />

      <ParticleDensitySlider value={particleCount} onChange={onParticleCountChange} />

      <button
        onClick={onTogglePlay}
        style={{
          width: '100%',
          padding: '10px 16px',
          backgroundColor: isPlaying ? 'rgba(229, 62, 62, 0.8)' : 'rgba(72, 187, 120, 0.8)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background-color 0.2s, transform 0.1s',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {isPlaying ? '⏸ 暂停动画' : '▶ 播放动画'}
      </button>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '12px',
          color: '#718096',
          lineHeight: '1.6'
        }}
      >
        <div>🖱 拖拽旋转地球</div>
        <div>🔍 滚轮缩放视角</div>
        <div>📍 点击地球查看风场数据</div>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(26, 32, 44, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#e2e8f0',
        zIndex: 1000,
        fontSize: '12px'
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 500 }}>风速图例</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '100px',
            height: '8px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #48bb78, #ed8936, #e53e3e)'
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#a0aec0'
        }}
      >
        <span>低</span>
        <span>中</span>
        <span>高</span>
      </div>
    </div>
  )
}

export function App() {
  const [altitudeLevel, setAltitudeLevel] = useState<AltitudeLevel>('surface')
  const [particleCount, setParticleCount] = useState(5000)
  const [isPlaying, setIsPlaying] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState<SelectedPointInfo | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lon: number } | null>(null)

  const windManager = useMemo(() => new WindFieldManager(particleCount), [])

  useEffect(() => {
    windManager.setParticleCount(particleCount)
  }, [particleCount, windManager])

  const handleAltitudeChange = (level: AltitudeLevel) => {
    setAltitudeLevel(level)
    if (selectedPoint) {
      const windData = windManager.getWindAtLatLon(selectedPoint.latitude, selectedPoint.longitude, level)
      setSelectedPoint({
        ...selectedPoint,
        altitudeLevel: level,
        windSpeed: Math.round(windData.speed * 10) / 10,
        windDirection: Math.round(windData.direction * 10) / 10
      })
    }
  }

  const handlePointSelect = (info: SelectedPointInfo | null) => {
    setSelectedPoint(info)
    if (info) {
      setSelectedPosition({ lat: info.latitude, lon: info.longitude })
    } else {
      setSelectedPosition(null)
    }
  }

  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <StarBackground />

      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color="#4299e1" />

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

        <Earth
          windManager={windManager}
          altitudeLevel={altitudeLevel}
          onPointSelect={handlePointSelect}
          selectedPosition={selectedPosition}
        />

        <ParticleSystem
          windManager={windManager}
          particleCount={particleCount}
          altitudeLevel={altitudeLevel}
          isPlaying={isPlaying}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.5}
          maxDistance={10}
          enablePan={false}
        />
      </Canvas>

      <ControlPanel
        altitudeLevel={altitudeLevel}
        onAltitudeChange={handleAltitudeChange}
        particleCount={particleCount}
        onParticleCountChange={setParticleCount}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
      />

      <InfoPanel selectedPoint={selectedPoint} isVisible={!!selectedPoint} />

      <Legend />
    </div>
  )
}
