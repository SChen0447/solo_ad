export interface Property {
  id: string
  name: string
  rent: number
  area: number
  layout: string
  floor: string
  orientation: string
  decoration: string
  metroWalkTime: number
  images: string[]
}

export interface Weights {
  rent: number
  area: number
  layout: number
  floor: number
  orientation: number
  decoration: number
  metroWalkTime: number
}

export interface ComparisonList {
  id: string
  name: string
  propertyIds: string[]
  properties?: Property[]
}

export type WeightKey = keyof Weights

export const WEIGHT_LABELS: Record<WeightKey, string> = {
  rent: '月租金',
  area: '面积',
  layout: '户型',
  floor: '楼层',
  orientation: '朝向',
  decoration: '装修',
  metroWalkTime: '地铁距离',
}

export const ORIENTATION_SCORE: Record<string, number> = {
  南: 10,
  东南: 9,
  西南: 8,
  东: 7,
  西: 6,
  东北: 7,
  西北: 5,
  北: 4,
}

export const LAYOUT_SCORE: Record<string, number> = {
  开间: 5,
  一居: 7,
  两居: 9,
  三居: 10,
  四居: 10,
}

export const DECORATION_SCORE: Record<string, number> = {
  毛坯: 3,
  简装: 5,
  中装: 7,
  精装修: 9,
  豪华装修: 10,
}
