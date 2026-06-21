import { SceneData } from '@/types'

export function exportSceneToJSON(sceneData: SceneData, filename?: string): void {
  const jsonString = JSON.stringify(sceneData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `scene-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function importSceneFromFile(file: File): Promise<SceneData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as SceneData
        if (!data.buildings || !Array.isArray(data.buildings)) {
          reject(new Error('Invalid scene file: missing buildings array'))
          return
        }
        resolve(data)
      } catch (err) {
        reject(new Error('Failed to parse scene file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export async function saveSceneToServer(sceneData: SceneData): Promise<{ id: string }> {
  try {
    const response = await fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sceneData),
    })
    if (!response.ok) throw new Error('Failed to save scene')
    return await response.json()
  } catch (err) {
    console.error('Save scene error:', err)
    throw err
  }
}

export async function loadSceneFromServer(id: string): Promise<SceneData> {
  try {
    const response = await fetch(`/api/scenes/${id}`)
    if (!response.ok) throw new Error('Scene not found')
    return await response.json()
  } catch (err) {
    console.error('Load scene error:', err)
    throw err
  }
}

export async function generateReport(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/report/${id}`)
    if (!response.ok) throw new Error('Failed to generate report')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-${id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Generate report error:', err)
    throw err
  }
}

export async function fetchShadowAnalysis(
  buildings: SceneData['buildings'],
  dayOfYear: number
): Promise<{ hourly: Array<{ hour: number; coveragePercent: number; coverageArea: number }>; averageCoverage: number; totalArea: number }> {
  try {
    const response = await fetch('/api/shadow-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildings, dayOfYear }),
    })
    if (!response.ok) throw new Error('Shadow analysis failed')
    return await response.json()
  } catch (err) {
    console.error('Shadow analysis error:', err)
    throw err
  }
}
