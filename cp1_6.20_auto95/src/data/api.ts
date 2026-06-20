import axios from 'axios'
import type { Layer, Drill, ApiResponse, AppData } from './types'

const API_BASE_URL = 'http://localhost:5000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000
})

export async function getLayers(): Promise<Layer[]> {
  const response = await apiClient.get<ApiResponse<Layer[]>>('/layers')
  return response.data.data
}

export async function getDrills(): Promise<Drill[]> {
  const response = await apiClient.get<ApiResponse<Drill[]>>('/drills')
  return response.data.data
}

export async function getAllData(): Promise<AppData> {
  const [layers, drills] = await Promise.all([
    getLayers(), getDrills()
  ])
  return { layers, drills }
}

export { API_BASE_URL }
