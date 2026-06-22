export interface IPresetStar {
  id: string
  name: string
  mass: number
  temp: number
  age: number
  lifespan: number
  description: string
}

export interface IStarParams {
  radius: number
  temperature: number
  color: { r: number; g: number; b: number }
  lifespan: number
  spectralType: string
  absoluteMagnitude: number
  lifeStage: string
  rotationSpeed: number
}

export interface IStarInputParams {
  mass: number
  temp: number
  age: number
}

const presetStars: IPresetStar[] = [
  {
    id: 'sun',
    name: '太阳 (Sun)',
    mass: 1.0,
    temp: 5778,
    age: 4600,
    lifespan: 10000,
    description: '一颗典型的G型主序星，生命中期',
  },
  {
    id: 'proxima',
    name: '比邻星 (Proxima Centauri)',
    mass: 0.12,
    temp: 3042,
    age: 4800,
    lifespan: 4000000,
    description: '一颗红矮星，距离太阳最近的恒星',
  },
  {
    id: 'sirius-a',
    name: '天狼星A (Sirius A)',
    mass: 2.02,
    temp: 9940,
    age: 242,
    lifespan: 1000,
    description: '夜空中最亮的恒星，A型主序星',
  },
  {
    id: 'betelgeuse',
    name: '参宿四 (Betelgeuse)',
    mass: 15.0,
    temp: 3500,
    age: 8,
    lifespan: 10,
    description: '一颗红超巨星，接近生命终点',
  },
  {
    id: 'vega',
    name: '织女星 (Vega)',
    mass: 2.135,
    temp: 9602,
    age: 455,
    lifespan: 900,
    description: '夏季大三角之一，A型主序星',
  },
  {
    id: 'sirius-b',
    name: '天狼星B (Sirius B)',
    mass: 1.02,
    temp: 25200,
    age: 120,
    lifespan: 1000,
    description: '一颗白矮星，天狼星的伴星',
  },
]

export function getPresetStars(): IPresetStar[] {
  return presetStars
}

function kelvinToRGB(temp: number): { r: number; g: number; b: number } {
  const t = temp / 100
  let r: number, g: number, b: number

  if (t <= 66) {
    r = 255
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(t) - 161.1195681661))
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(t - 60, -0.1332047592)))
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(t - 60, -0.0755148492)))
  }

  if (t >= 66) {
    b = 255
  } else if (t <= 19) {
    b = 0
  } else {
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(t - 10) - 305.0447927307))
  }

  return {
    r: Math.round(r) / 255,
    g: Math.round(g) / 255,
    b: Math.round(b) / 255,
  }
}

function getSpectralType(temp: number): string {
  if (temp >= 30000) return 'O'
  if (temp >= 10000) return 'B'
  if (temp >= 7500) return 'A'
  if (temp >= 6000) return 'F'
  if (temp >= 5200) return 'G'
  if (temp >= 3700) return 'K'
  return 'M'
}

function getLifeStage(mass: number, temp: number, age: number, lifespan: number): string {
  const ratio = age / lifespan

  if (mass >= 10 && temp < 4000) return '红超巨星'
  if (temp > 10000 && ratio > 0.9) return '白矮星'
  if (ratio < 0.1) return '原恒星'
  if (ratio < 0.9) return '主序星'
  if (temp < 5000) return '红巨星'
  return '白矮星'
}

function validateParams(mass: number, temp: number, age: number): boolean {
  if (mass < 0.1 || mass > 50) return false
  if (temp < 3000 || temp > 50000) return false
  if (age < 0 || age > 10000) return false

  if (mass > 20 && temp < 4000) return false
  if (mass < 0.5 && temp > 10000) return false

  return true
}

export function calcStarParams(mass: number, temp: number, age: number): IStarParams | { error: string } {
  if (!validateParams(mass, temp, age)) {
    return { error: '参数组合超出物理模型有效范围，请调整后重试' }
  }

  const mainSeqRadius = Math.pow(mass, 0.8)
  const lifeStage = getLifeStage(mass, temp, age, calculateLifespan(mass))

  let radius = mainSeqRadius
  if (lifeStage === '红巨星' || lifeStage === '红超巨星') {
    radius = mainSeqRadius * 20
  } else if (lifeStage === '白矮星') {
    radius = mainSeqRadius * 0.01
  }

  const color = kelvinToRGB(temp)
  const spectralType = getSpectralType(temp)
  const lifespan = calculateLifespan(mass)

  const bolometricLuminosity = Math.pow(mass, 3.5)
  const absoluteMagnitude = 4.83 - 2.5 * Math.log10(bolometricLuminosity)

  const ageFactor = 1 - (age / lifespan) * 0.2
  const rotationSpeed = 0.5 + (50 / mass) * 0.01

  return {
    radius,
    temperature: temp,
    color: {
      r: color.r * ageFactor,
      g: color.g * ageFactor,
      b: color.b * ageFactor,
    },
    lifespan,
    spectralType,
    absoluteMagnitude: Number(absoluteMagnitude.toFixed(2)),
    lifeStage,
    rotationSpeed,
  }
}

function calculateLifespan(mass: number): number {
  return Math.round(10000 / Math.pow(mass, 2.5))
}

export function getEvolutionEndPoint(mass: number, temp: number): { mass: number; temp: number; radius: number } {
  if (mass >= 8) {
    return { mass, temp: 100000, radius: 0.01 }
  } else if (mass >= 1) {
    return { mass, temp: 25000, radius: 0.01 }
  } else {
    return { mass, temp: 3500, radius: Math.pow(mass, 0.8) * 20 }
  }
}
