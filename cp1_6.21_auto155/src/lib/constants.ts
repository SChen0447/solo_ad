export const BREEDS = [
  '金毛', '柯基', '柴犬', '哈士奇', '拉布拉多', '萨摩耶',
  '布偶猫', '英短', '美短', '橘猫', '暹罗猫', '狸花猫',
] as const

export const DOG_BREEDS = ['金毛', '柯基', '柴犬', '哈士奇', '拉布拉多', '萨摩耶']

export const PERSONALITIES = ['活泼', '安静', '粘人', '独立', '护食'] as const

export const VACCINE_OPTIONS = ['已打全', '部分', '未打'] as const

export function isDogBreed(breed: string): boolean {
  return DOG_BREEDS.includes(breed)
}

export function isCatBreed(breed: string): boolean {
  return BREEDS.includes(breed as any) && !DOG_BREEDS.includes(breed)
}

export function getBreedBgClass(breed: string): string {
  if (isDogBreed(breed)) return 'bg-amber-50 border-amber-200'
  if (isCatBreed(breed)) return 'bg-pink-50 border-pink-200'
  return 'bg-purple-50 border-purple-200'
}

export function getBreedAccentClass(breed: string): string {
  if (isDogBreed(breed)) return 'bg-amber-100 text-amber-700'
  if (isCatBreed(breed)) return 'bg-pink-100 text-pink-700'
  return 'bg-purple-100 text-purple-700'
}

export function getBreedIconBg(breed: string): string {
  if (isDogBreed(breed)) return 'bg-amber-200'
  if (isCatBreed(breed)) return 'bg-pink-200'
  return 'bg-purple-200'
}

export function getRatingColor(rating: number): string {
  if (rating >= 4) return 'text-teal-600'
  if (rating >= 3) return 'text-amber-600'
  return 'text-orange-600'
}

export function getRankBgClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-400 text-white'
  if (rank === 2) return 'bg-gray-400 text-white'
  if (rank === 3) return 'bg-orange-400 text-white'
  return 'bg-blue-400 text-white'
}

export function truncateText(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  return timeStr.replace('T', ' ').slice(0, 16)
}
