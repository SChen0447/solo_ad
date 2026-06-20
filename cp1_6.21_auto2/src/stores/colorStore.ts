import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Palette, ColorSwatch } from '@/colorEngine/types'
import {
  generatePalette,
  isDarkColor,
  exportAsCSSVariables,
  exportAsSCSSMap
} from '@/colorEngine/colorHarmony'

export const useColorStore = defineStore('color', () => {
  const baseColor = ref('#3B82F6')
  const palette = ref<Palette>(generatePalette(baseColor.value))
  const isDarkMode = computed(() => isDarkColor(baseColor.value))

  function setBaseColor(color: string) {
    baseColor.value = color
    palette.value = generatePalette(color)
  }

  const primary500 = computed<ColorSwatch>(() => palette.value.primary[2])
  const bgColor = computed(() => {
    const p = palette.value.primary
    if (p.length > 0) {
      return p[0].hex
    }
    return '#F5F7FA'
  })
  const textColor = computed(() => {
    return isDarkMode.value ? '#FFFFFF' : palette.value.neutral[3].hex
  })

  function exportCSS(): string {
    return exportAsCSSVariables(palette.value)
  }

  function exportSCSS(): string {
    return exportAsSCSSMap(palette.value)
  }

  return {
    baseColor,
    palette,
    isDarkMode,
    primary500,
    bgColor,
    textColor,
    setBaseColor,
    exportCSS,
    exportSCSS
  }
})
