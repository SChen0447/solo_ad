import { SpeciesEmoji, SpeciesColors } from '../types'

export const SPECIES_EMOJI: SpeciesEmoji = {
  '多肉': '🌵',
  '仙人掌': '🌵',
  '绿萝': '🌿',
  '吊兰': '🌿',
  '玫瑰': '🌹',
  '月季': '🌹',
  '郁金香': '🌷',
  '向日葵': '🌻',
  '茉莉': '🌸',
  '桂花': '🌸',
  '君子兰': '🪴',
  '虎皮兰': '🪴',
  '发财树': '🌳',
  '橡皮树': '🌳',
  '龟背竹': '🍃',
  '红掌': '🌺',
  '白掌': '🌺',
  '蝴蝶兰': '🦋',
  '默认': '🌱'
}

export const SPECIES_COLORS: SpeciesColors = {
  '多肉': { from: '#E8F5E9', to: '#C8E6C9' },
  '仙人掌': { from: '#F0F4C3', to: '#DCE775' },
  '绿萝': { from: '#B2DFDB', to: '#80CBC4' },
  '吊兰': { from: '#B2DFDB', to: '#80CBC4' },
  '玫瑰': { from: '#FCE4EC', to: '#F8BBD0' },
  '月季': { from: '#FCE4EC', to: '#F8BBD0' },
  '郁金香': { from: '#F3E5F5', to: '#E1BEE7' },
  '向日葵': { from: '#FFF8E1', to: '#FFECB3' },
  '茉莉': { from: '#FAFAFA', to: '#F5F5F5' },
  '桂花': { from: '#FFF3E0', to: '#FFE0B2' },
  '君子兰': { from: '#E8F5E9', to: '#A5D6A7' },
  '虎皮兰': { from: '#E8F5E9', to: '#A5D6A7' },
  '发财树': { from: '#E0F2F1', to: '#80CBC4' },
  '橡皮树': { from: '#E0F2F1', to: '#80CBC4' },
  '龟背竹': { from: '#E8F5E9', to: '#C5E1A5' },
  '红掌': { from: '#FFEBEE', to: '#FFCDD2' },
  '白掌': { from: '#FAFAFA', to: '#EEEEEE' },
  '蝴蝶兰': { from: '#F3E5F5', to: '#CE93D8' },
  '默认': { from: '#F1F8E9', to: '#DCEDC8' }
}

export const getSpeciesEmoji = (species: string): string => {
  return SPECIES_EMOJI[species] || SPECIES_EMOJI['默认']
}

export const getSpeciesGradient = (species: string): string => {
  const colors = SPECIES_COLORS[species] || SPECIES_COLORS['默认']
  return `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`
}

export const getTextColor = (species: string): string => {
  const darkSpecies = ['蝴蝶兰', '玫瑰', '月季', '红掌']
  return darkSpecies.includes(species) ? '#5D4037' : '#2E7D32'
}
