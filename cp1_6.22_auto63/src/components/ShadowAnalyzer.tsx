import { useMemo } from 'react'
import { Building, ShadowAnalysisResult, ShadowDataPoint } from '@/types'
import { calculateSunPosition } from '@/utils/sunPosition'

interface ShadowAnalyzerProps {
  buildings: Building[]
  dayOfYear: number
  hourOfDay: number
  groundBounds?: { minX: number; maxX: number; minZ: number; maxZ: number }
  onAnalysis?: (result: ShadowAnalysisResult, current: { coveragePercent: number; coverageArea: number }) => void
}

export function useShadowAnalysis(
  buildings: Building[],
  dayOfYear: number,
  hourOfDay: number,
  groundBounds: { minX: number; maxX: number; minZ: number; maxZ: number } = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 }
) {
  const totalArea = (groundBounds.maxX - groundBounds.minX) * (groundBounds.maxZ - groundBounds.minZ)

  const currentCoverage = useMemo(() => {
    const sunPos = calculateSunPosition(dayOfYear, hourOfDay)
    if (sunPos.altitude <= 0 || buildings.length === 0) {
      return { coveragePercent: 0, coverageArea: 0 }
    }

    let totalShadow = 0
    buildings.forEach(building => {
      const shadowLength = building.size.y / Math.tan(sunPos.altitude * Math.PI / 180)
      const angleRad = sunPos.azimuth * Math.PI / 180

      const dx = shadowLength * Math.sin(angleRad)
      const dz = shadowLength * Math.cos(angleRad)

      const halfW = building.size.x / 2
      const halfD = building.size.z / 2

      const corners = [
        { x: building.position.x - halfW, z: building.position.z - halfD },
        { x: building.position.x + halfW, z: building.position.z - halfD },
        { x: building.position.x + halfW, z: building.position.z + halfD },
        { x: building.position.x - halfW, z: building.position.z + halfD },
      ]

      const projectedCorners = corners.map(c => ({
        x: c.x + dx,
        z: c.z + dz,
      }))

      const allCorners = [...corners, ...projectedCorners]
      const minX = Math.max(groundBounds.minX, Math.min(...allCorners.map(c => c.x)))
      const maxX = Math.min(groundBounds.maxX, Math.max(...allCorners.map(c => c.x)))
      const minZ = Math.max(groundBounds.minZ, Math.min(...allCorners.map(c => c.z)))
      const maxZ = Math.min(groundBounds.maxZ, Math.max(...allCorners.map(c => c.z)))

      const area = Math.max(0, (maxX - minX) * (maxZ - minZ))
      totalShadow += area
    })

    const overlapFactor = 0.85
    const adjustedShadow = Math.min(totalArea, totalShadow * overlapFactor)

    return {
      coveragePercent: parseFloat(((adjustedShadow / totalArea) * 100).toFixed(2)),
      coverageArea: parseFloat(adjustedShadow.toFixed(2)),
    }
  }, [buildings, dayOfYear, hourOfDay, groundBounds, totalArea])

  const hourlyAnalysis = useMemo(() => {
    const results: ShadowDataPoint[] = []
    for (let hour = 6; hour <= 19; hour++) {
      const sunPos = calculateSunPosition(dayOfYear, hour)
      if (sunPos.altitude <= 0 || buildings.length === 0) {
        results.push({ hour, coveragePercent: 0, coverageArea: 0 })
        continue
      }

      let totalShadow = 0
      buildings.forEach(building => {
        const shadowLength = building.size.y / Math.tan(sunPos.altitude * Math.PI / 180)
        const angleRad = sunPos.azimuth * Math.PI / 180

        const dx = shadowLength * Math.sin(angleRad)
        const dz = shadowLength * Math.cos(angleRad)

        const halfW = building.size.x / 2
        const halfD = building.size.z / 2

        const corners = [
          { x: building.position.x - halfW, z: building.position.z - halfD },
          { x: building.position.x + halfW, z: building.position.z - halfD },
          { x: building.position.x + halfW, z: building.position.z + halfD },
          { x: building.position.x - halfW, z: building.position.z + halfD },
        ]

        const projectedCorners = corners.map(c => ({
          x: c.x + dx,
          z: c.z + dz,
        }))

        const allCorners = [...corners, ...projectedCorners]
        const minX = Math.max(groundBounds.minX, Math.min(...allCorners.map(c => c.x)))
        const maxX = Math.min(groundBounds.maxX, Math.max(...allCorners.map(c => c.x)))
        const minZ = Math.max(groundBounds.minZ, Math.min(...allCorners.map(c => c.z)))
        const maxZ = Math.min(groundBounds.maxZ, Math.max(...allCorners.map(c => c.z)))

        const area = Math.max(0, (maxX - minX) * (maxZ - minZ))
        totalShadow += area
      })

      const overlapFactor = 0.85
      const adjustedShadow = Math.min(totalArea, totalShadow * overlapFactor)

      results.push({
        hour,
        coveragePercent: parseFloat(((adjustedShadow / totalArea) * 100).toFixed(2)),
        coverageArea: parseFloat(adjustedShadow.toFixed(2)),
      })
    }

    const averageCoverage = parseFloat(
      (results.reduce((sum, r) => sum + r.coveragePercent, 0) / results.length).toFixed(2)
    )

    return {
      hourly: results,
      averageCoverage,
      totalArea: parseFloat(totalArea.toFixed(2)),
    }
  }, [buildings, dayOfYear, groundBounds, totalArea])

  return {
    currentCoverage,
    hourlyAnalysis,
  }
}

export function ShadowAnalyzer(_props: ShadowAnalyzerProps) {
  return null
}
