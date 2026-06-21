export type MediaType = 'book' | 'movie' | 'music'

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  creator: string
  year: number
  coverUrl: string
  rating: number
  tags: string[]
  createdAt: number
}

export interface CreateItemInput extends Omit<MediaItem, 'id' | 'createdAt'> {}

export interface UpdateItemInput extends Partial<Omit<MediaItem, 'id' | 'createdAt' | 'coverUrl'>> {}

export interface Filter {
  type: MediaType | 'all'
  ratingMin: number
  ratingMax: number
  tags: string[]
  search: string
}

export type ViewMode = 'grid' | 'list' | 'timeline'

export interface StatsData {
  total: number
  byType: Record<MediaType, number>
  avgRating: number
  tagCloud: Array<{ tag: string; count: number }>
}
