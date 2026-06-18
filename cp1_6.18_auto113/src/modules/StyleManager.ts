import * as THREE from 'three'
import { STYLE_CONFIG, BuildingStyle, HISTORICAL_NODES } from '@store/useStore'

export interface StyleResult {
  roofColor: THREE.Color
  wallColor: THREE.Color
  lightingTint: THREE.Color
  ambientIntensity: number
  directionalIntensity: number
  sunAngle: number
}

function lerpColor(
  color1: THREE.Color,
  color2: THREE.Color,
  t: number
): THREE.Color {
  const result = color1.clone()
  result.lerp(color2, t)
  return result
}

function getEraIndex(year: number): { prev: number; next: number; t: number } {
  if (year <= HISTORICAL_NODES[0].year) {
    return { prev: 0, next: 0, t: 0 }
  }
  if (year >= HISTORICAL_NODES[HISTORICAL_NODES.length - 1].year) {
    return {
      prev: HISTORICAL_NODES.length - 1,
      next: HISTORICAL_NODES.length - 1,
      t: 1,
    }
  }
  for (let i = 0; i < HISTORICAL_NODES.length - 1; i++) {
    if (
      year >= HISTORICAL_NODES[i].year &&
      year < HISTORICAL_NODES[i + 1].year
    ) {
      const range =
        HISTORICAL_NODES[i + 1].year - HISTORICAL_NODES[i].year
      const t = (year - HISTORICAL_NODES[i].year) / range
      return { prev: i, next: i + 1, t }
    }
  }
  return { prev: 0, next: 0, t: 0 }
}

function styleToColorKey(style: BuildingStyle): {
  roof: THREE.Color
  wall: THREE.Color
  tint: THREE.Color
} {
  const cfg = STYLE_CONFIG[style]
  return {
    roof: cfg.roofColor,
    wall: cfg.wallColor,
    tint: cfg.tint,
  }
}

export function applyStyle(year: number): StyleResult {
  const { prev, next, t } = getEraIndex(year)
  const prevStyle = HISTORICAL_NODES[prev].style
  const nextStyle = HISTORICAL_NODES[next].style

  const prevColors = styleToColorKey(prevStyle)
  const nextColors = styleToColorKey(nextStyle)

  const roofColor = lerpColor(prevColors.roof, nextColors.roof, t)
  const wallColor = lerpColor(prevColors.wall, nextColors.wall, t)
  const lightingTint = lerpColor(prevColors.tint, nextColors.tint, t)

  const totalYears =
    HISTORICAL_NODES[HISTORICAL_NODES.length - 1].year - HISTORICAL_NODES[0].year
  const seasonT =
    (year - HISTORICAL_NODES[0].year) / totalYears

  const sunAngle = Math.sin(seasonT * Math.PI * 2) * 45 + 45

  const warmTint = new THREE.Color('#ffcc66')
  const coolTint = new THREE.Color('#d0e8ff')
  const warmPhase = (Math.sin(seasonT * Math.PI * 4) + 1) / 2
  const seasonalTint = lerpColor(coolTint, warmTint, warmPhase)
  const finalTint = lerpColor(lightingTint, seasonalTint, 0.25)

  const ambientIntensity = 0.45 + Math.sin(seasonT * Math.PI * 2) * 0.1
  const directionalIntensity = 0.8 + Math.cos(seasonT * Math.PI * 2) * 0.15

  return {
    roofColor,
    wallColor,
    lightingTint: finalTint,
    ambientIntensity,
    directionalIntensity,
    sunAngle,
  }
}

export function getBuildingOpacity(
  buildingYear: number,
  currentYear: number
): { opacity: number; outlineOpacity: number; active: boolean } {
  if (buildingYear <= currentYear) {
    const age = currentYear - buildingYear
    if (age < 100) {
      return { opacity: 1, outlineOpacity: 0, active: true }
    } else if (age < 300) {
      const t = (age - 100) / 200
      return {
        opacity: 1 - t * 0.1,
        outlineOpacity: t * 0.3,
        active: true,
      }
    } else {
      return { opacity: 0.7, outlineOpacity: 0.4, active: true }
    }
  } else {
    const future = buildingYear - currentYear
    if (future < 50) {
      const t = future / 50
      return {
        opacity: 0.15 + (1 - t) * 0.1,
        outlineOpacity: 0.6,
        active: false,
      }
    } else {
      return { opacity: 0.08, outlineOpacity: 0.4, active: false }
    }
  }
}

export function getBuildPhaseProgress(
  buildingYear: number,
  currentYear: number,
  transitionWindow: number = 50
): number {
  const diff = currentYear - buildingYear
  if (diff >= 0) return 1
  if (diff < -transitionWindow) return 0
  return 1 + diff / transitionWindow
}

export class BuildingAnalyzer {
  static generateThreeViews(
    dimensions: { width: number; depth: number; height: number },
    style: BuildingStyle
  ) {
    const { width, depth, height } = dimensions
    const roofHeight = height * 0.35
    const bodyHeight = height - roofHeight

    const frontView = {
      svg: this.generateFrontSVG(width, height, roofHeight, bodyHeight, style),
      labels: [
        { text: `宽: ${width.toFixed(1)}m`, x: width / 2, y: height + 3 },
        { text: `高: ${height.toFixed(1)}m`, x: -2, y: height / 2 },
      ],
    }

    const sideView = {
      svg: this.generateSideSVG(depth, height, roofHeight, bodyHeight, style),
      labels: [
        { text: `深: ${depth.toFixed(1)}m`, x: depth / 2, y: height + 3 },
        { text: `高: ${height.toFixed(1)}m`, x: -2, y: height / 2 },
      ],
    }

    const topView = {
      svg: this.generateTopSVG(width, depth, style),
      labels: [
        { text: `宽: ${width.toFixed(1)}m`, x: width / 2, y: depth + 2 },
        { text: `深: ${depth.toFixed(1)}m`, x: -2, y: depth / 2 },
      ],
    }

    return { frontView, sideView, topView }
  }

  private static generateFrontSVG(
    w: number,
    h: number,
    rh: number,
    bh: number,
    style: BuildingStyle
  ): string {
    const scale = 3
    const W = w * scale
    const H = h * scale
    const RH = rh * scale
    const BH = bh * scale
    const stroke = '#c9a96e'
    const fill = STYLE_CONFIG[style].wallColor.getStyle()
    const roofFill = STYLE_CONFIG[style].roofColor.getStyle()
    const eave = style === 'song' ? 15 : style === 'mingqing' ? 10 : 8

    let path = `
      <rect x="2" y="${RH}" width="${W}" height="${BH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <polygon points="0,${RH} ${W / 2},${RH - RH * 0.7} ${W},${RH}" fill="${roofFill}" stroke="${stroke}" stroke-width="1.5"/>
      <rect x="-${eave}" y="${RH - 2}" width="${W + eave * 2}" height="5" fill="${roofFill}" stroke="${stroke}" stroke-width="1"/>
      <rect x="${W * 0.35}" y="${RH + BH * 0.35}" width="${W * 0.3}" height="${BH * 0.5}" fill="#8b6914" stroke="${stroke}" stroke-width="1"/>
    `

    if (style === 'song') {
      path += `
        <polygon points="-${eave + 5},${RH + 3} -${eave},${RH - 8} 0,${RH}" fill="${roofFill}" stroke="${stroke}" stroke-width="1"/>
        <polygon points="${W + eave + 5},${RH + 3} ${W + eave},${RH - 8} ${W},${RH}" fill="${roofFill}" stroke="${stroke}" stroke-width="1"/>
      `
    }

    if (style === 'mingqing') {
      path += `
        <rect x="${W * 0.15}" y="${RH + BH * 0.15}" width="${W * 0.15}" height="${BH * 0.2}" fill="#3a2a1a" stroke="${stroke}" stroke-width="0.8"/>
        <rect x="${W * 0.7}" y="${RH + BH * 0.15}" width="${W * 0.15}" height="${BH * 0.2}" fill="#3a2a1a" stroke="${stroke}" stroke-width="0.8"/>
      `
    }

    return `<svg viewBox="-20 -5 ${W + 40} ${H + 20}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`
  }

  private static generateSideSVG(
    d: number,
    h: number,
    rh: number,
    bh: number,
    style: BuildingStyle
  ): string {
    const scale = 3
    const D = d * scale
    const H = h * scale
    const RH = rh * scale
    const BH = bh * scale
    const stroke = '#c9a96e'
    const fill = STYLE_CONFIG[style].wallColor.getStyle()
    const roofFill = STYLE_CONFIG[style].roofColor.getStyle()

    const path = `
      <rect x="2" y="${RH}" width="${D}" height="${BH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <polygon points="0,${RH} ${D / 2},${RH - RH * 0.5} ${D},${RH}" fill="${roofFill}" stroke="${stroke}" stroke-width="1.5"/>
      <rect x="${D * 0.25}" y="${RH + BH * 0.5}" width="${D * 0.12}" height="${BH * 0.3}" fill="#4a3a2a" stroke="${stroke}" stroke-width="0.8"/>
      <rect x="${D * 0.6}" y="${RH + BH * 0.5}" width="${D * 0.12}" height="${BH * 0.3}" fill="#4a3a2a" stroke="${stroke}" stroke-width="0.8"/>
    `

    return `<svg viewBox="-15 -5 ${D + 30} ${H + 20}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`
  }

  private static generateTopSVG(
    w: number,
    d: number,
    style: BuildingStyle
  ): string {
    const scale = 3
    const W = w * scale
    const D = d * scale
    const stroke = '#c9a96e'
    const roofFill = STYLE_CONFIG[style].roofColor.getStyle()
    const wallFill = STYLE_CONFIG[style].wallColor.getStyle()

    const inner = 6
    const path = `
      <rect x="0" y="0" width="${W}" height="${D}" fill="${roofFill}" stroke="${stroke}" stroke-width="1.5"/>
      <rect x="${inner}" y="${inner}" width="${W - inner * 2}" height="${D - inner * 2}" fill="${wallFill}" stroke="${stroke}" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="0" y1="0" x2="${inner}" y2="${inner}" stroke="${stroke}" stroke-width="1"/>
      <line x1="${W}" y1="0" x2="${W - inner}" y2="${inner}" stroke="${stroke}" stroke-width="1"/>
      <line x1="0" y1="${D}" x2="${inner}" y2="${D - inner}" stroke="${stroke}" stroke-width="1"/>
      <line x1="${W}" y1="${D}" x2="${W - inner}" y2="${D - inner}" stroke="${stroke}" stroke-width="1"/>
    `

    return `<svg viewBox="-5 -5 ${W + 10} ${D + 15}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`
  }
}
