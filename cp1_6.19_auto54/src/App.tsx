import { useMemo, useEffect, useState } from 'react'
import { useDiffractionStore } from '@/store'
import { calculateDiffraction, DiffractionSpot } from '@/diffractionEngine'
import { CrystalScene } from '@/components/CrystalScene'
import { ControlPanel } from '@/components/ControlPanel'
import '@/style.css'

function DiffractionPanel({ spots }: { spots: DiffractionSpot[] }) {
  const screenSize = 200
  const maxCoord = 2.5

  return (
    <div className="diffraction-panel">
      <h3>衍射光斑图</h3>
      <div className="diffraction-screen">
        {spots.map((spot, index) => {
          const x = screenSize / 2 + (spot.x / maxCoord) * (screenSize / 2 - 10)
          const y = screenSize / 2 - (spot.y / maxCoord) * (screenSize / 2 - 10)
          const size = 4 + spot.intensity * 6

          return (
            <div
              key={index}
              className="spot"
              title={`${spot.hkl} 强度: ${(spot.intensity * 100).toFixed(0)}%`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: spot.intensity,
                boxShadow: `0 0 ${6 + spot.intensity * 12}px rgba(255, 255, 255, ${0.4 + spot.intensity * 0.5})`,
              }}
            />
          )
        })}
        {spots.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#445566',
              fontSize: '12px',
            }}
          >
            无衍射
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        晶面数: {spots.length}
      </div>
    </div>
  )
}

function InfoPanel({
  rotationAngle,
  tiltAngle,
  incidentAngle,
  spotCount,
}: {
  rotationAngle: number
  tiltAngle: number
  incidentAngle: number
  spotCount: number
}) {
  const braggInfo = useMemo(() => {
    const sinTheta = Math.sin((incidentAngle * Math.PI) / 180)
    const lambda = 0.71
    const dEstimate = lambda / (2 * Math.max(sinTheta, 0.001))
    return {
      sinTheta: sinTheta.toFixed(3),
      dEstimate: dEstimate.toFixed(3),
    }
  }, [incidentAngle])

  return (
    <div className="info-panel">
      <h2>💎 水晶衍射实验室</h2>
      <div className="info-row">
        <span className="info-label">晶体类型</span>
        <span className="info-value">八面体 FCC</span>
      </div>
      <div className="info-row">
        <span className="info-label">水平旋转</span>
        <span className="info-value">{rotationAngle.toFixed(0)}°</span>
      </div>
      <div className="info-row">
        <span className="info-label">垂直倾斜</span>
        <span className="info-value">{tiltAngle.toFixed(0)}°</span>
      </div>
      <div className="info-row">
        <span className="info-label">入射角度</span>
        <span className="info-value">{incidentAngle.toFixed(0)}°</span>
      </div>
      <div className="info-row">
        <span className="info-label">激光波长 λ</span>
        <span className="info-value">0.71 Å</span>
      </div>
      <div className="info-row">
        <span className="info-label">sin(θ)</span>
        <span className="info-value">{braggInfo.sinTheta}</span>
      </div>
      <div className="info-row">
        <span className="info-label">估算面间距 d</span>
        <span className="info-value">{braggInfo.dEstimate} Å</span>
      </div>
      <div className="info-row">
        <span className="info-label">衍射光斑</span>
        <span className="info-value">{spotCount} 个</span>
      </div>
    </div>
  )
}

export default function App() {
  const { rotationAngle, tiltAngle, incidentAngle, reset } =
    useDiffractionStore()

  const [fps, setFps] = useState(60)
  const [lastTime, setLastTime] = useState(performance.now())
  const [frames, setFrames] = useState(0)

  useEffect(() => {
    let animationId: number
    const measureFps = () => {
      setFrames((prev) => {
        const newFrames = prev + 1
        const now = performance.now()
        if (now - lastTime >= 1000) {
          setFps(Math.round((newFrames * 1000) / (now - lastTime)))
          setLastTime(now)
          return 0
        }
        return newFrames
      })
      animationId = requestAnimationFrame(measureFps)
    }
    animationId = requestAnimationFrame(measureFps)
    return () => cancelAnimationFrame(animationId)
  }, [lastTime])

  const spots = useMemo(
    () => calculateDiffraction(rotationAngle, tiltAngle, incidentAngle),
    [rotationAngle, tiltAngle, incidentAngle]
  )

  return (
    <div className="app-container">
      <div className="scene-container">
        <CrystalScene
          rotationAngle={rotationAngle}
          tiltAngle={tiltAngle}
          incidentAngle={incidentAngle}
          spots={spots}
        />

        <InfoPanel
          rotationAngle={rotationAngle}
          tiltAngle={tiltAngle}
          incidentAngle={incidentAngle}
          spotCount={spots.length}
        />

        <DiffractionPanel spots={spots} />

        <button className="reset-button" onClick={reset}>
          ↺ 重置
        </button>

        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            fontSize: '11px',
            color: fps >= 30 ? '#4ade80' : '#f87171',
            fontFamily: 'Consolas, Monaco, monospace',
            opacity: 0.85,
            background: 'rgba(26, 35, 50, 0.7)',
            padding: '4px 10px',
            borderRadius: '6px',
            zIndex: 10,
          }}
        >
          FPS: {fps}
        </div>
      </div>

      <ControlPanel />
    </div>
  )
}
