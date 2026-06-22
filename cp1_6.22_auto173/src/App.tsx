import React, { useState, useEffect, useRef, useCallback } from 'react'
import Scene3D, { Scene3DHandle } from './components/Scene3D'
import StarControlPanel from './components/StarControlPanel'
import { IPresetStar, IStarParams, calcStarParams, getPresetStars, getEvolutionEndPoint } from './data/starData'
import './styles.css'

const App: React.FC = () => {
  const [presetStars, setPresetStars] = useState<IPresetStar[]>([])
  const [selectedStar, setSelectedStar] = useState<IPresetStar | null>(null)
  const [starParams, setStarParams] = useState<IStarParams | null>(null)
  const [inputParams, setInputParams] = useState({ mass: 1.0, temp: 5778, age: 4600 })
  const [error, setError] = useState<string | null>(null)
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(false)
  const [evolutionEnd, setEvolutionEnd] = useState<{ radius: number; temp: number } | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  const scene3dRef = useRef<Scene3DHandle>(null)
  const lastValidParamsRef = useRef<IStarParams | null>(null)

  useEffect(() => {
    const fetchPresetStars = async () => {
      try {
        const response = await fetch('/api/stars')
        if (!response.ok) throw new Error('获取恒星列表失败')
        const data = await response.json()
        setPresetStars(data)
        if (data.length > 0) {
          const defaultStar = data[0]
          setSelectedStar(defaultStar)
          setInputParams({ mass: defaultStar.mass, temp: defaultStar.temp, age: defaultStar.age })
        }
      } catch {
        const localStars = getPresetStars()
        setPresetStars(localStars)
        if (localStars.length > 0) {
          const defaultStar = localStars[0]
          setSelectedStar(defaultStar)
          setInputParams({ mass: defaultStar.mass, temp: defaultStar.temp, age: defaultStar.age })
        }
      }
    }

    fetchPresetStars()
  }, [])

  const fetchStarParams = useCallback(async (mass: number, temp: number, age: number) => {
    setIsLoading(true)
    try {
      const localResult = calcStarParams(mass, temp, age)
      if ('error' in localResult) {
        setError(localResult.error)
        setIsLoading(false)
        return
      }

      setStarParams(localResult)
      if (scene3dRef.current) {
        scene3dRef.current.updateStar(localResult)
        scene3dRef.current.startRotation(localResult.rotationSpeed)
      }
      lastValidParamsRef.current = localResult
      setError(null)

      const endPoint = getEvolutionEndPoint(mass, temp)
      setEvolutionEnd({ radius: endPoint.radius, temp: endPoint.temp })

      try {
        const response = await fetch('/api/star/params', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mass, temp, age }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || '参数计算失败')
          return
        }

        const serverResult: IStarParams = await response.json()
        setStarParams(serverResult)
        if (scene3dRef.current) {
          scene3dRef.current.updateStar(serverResult)
        }
        lastValidParamsRef.current = serverResult
        setError(null)
      } catch {
        // 忽略后端错误，使用本地计算结果
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedStar) {
      fetchStarParams(selectedStar.mass, selectedStar.temp, selectedStar.age)
    }
  }, [selectedStar, fetchStarParams])

  const handleStarSelect = useCallback((star: IPresetStar) => {
    setSelectedStar(star)
    setInputParams({ mass: star.mass, temp: star.temp, age: star.age })
  }, [])

  const handleParamsChange = useCallback((params: { mass: number; temp: number; age: number }) => {
    setInputParams(params)
    fetchStarParams(params.mass, params.temp, params.age)
  }, [fetchStarParams])

  const handleAutoOrbit = useCallback(() => {
    if (scene3dRef.current) {
      const isOrbiting = scene3dRef.current.toggleAutoOrbit()
      setIsAutoOrbiting(isOrbiting)
      return isOrbiting
    }
    return false
  }, [])

  return (
    <div className="app-container">
      <StarControlPanel
        presetStars={presetStars}
        selectedStar={selectedStar}
        starParams={starParams}
        inputParams={inputParams}
        onStarSelect={handleStarSelect}
        onParamsChange={handleParamsChange}
        error={error}
        onAutoOrbit={handleAutoOrbit}
        isAutoOrbiting={isAutoOrbiting}
      />

      <main className="scene-container">
        {isLoading && <div className="loading-indicator">计算中...</div>}
        <Scene3D ref={scene3dRef} evolutionEnd={evolutionEnd} />
      </main>
    </div>
  )
}

export default App
