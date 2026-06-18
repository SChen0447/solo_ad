export interface ApplicationTag {
  name: string;
  icon: string;
  description: string;
}

export interface SpectrumBand {
  index: number;
  name: string;
  nameEn: string;
  frequencyMin: number;
  frequencyMax: number;
  wavelengthMin: number;
  wavelengthMax: number;
  frequencyUnit: string;
  wavelengthUnit: string;
  color: { r: number; g: number; b: number };
  applications: ApplicationTag[];
  description: string;
}

export const spectrumBands: SpectrumBand[] = [
  {
    index: 0,
    name: '无线电波',
    nameEn: 'Radio Waves',
    frequencyMin: 3,
    frequencyMax: 3e9,
    wavelengthMin: 0.1,
    wavelengthMax: 1e5,
    frequencyUnit: 'Hz - GHz',
    wavelengthUnit: 'm',
    color: { r: 0.4, g: 0.2, b: 0.8 },
    applications: [
      { name: '广播通信', icon: '📡', description: 'AM/FM无线电广播，覆盖长距离传输' },
      { name: '电视信号', icon: '📺', description: '模拟和数字电视信号传输' },
      { name: '移动通信', icon: '📱', description: '蜂窝网络基站通信' },
    ],
    description: '频率最低、波长最长的电磁波，用于远距离通信和广播',
  },
  {
    index: 1,
    name: '微波',
    nameEn: 'Microwaves',
    frequencyMin: 3e8,
    frequencyMax: 3e11,
    wavelengthMin: 0.001,
    wavelengthMax: 1,
    frequencyUnit: 'MHz - GHz',
    wavelengthUnit: 'mm - m',
    color: { r: 0.2, g: 0.6, b: 0.9 },
    applications: [
      { name: '雷达', icon: '△', description: '目标探测、测距和导航系统' },
      { name: 'Wi-Fi', icon: '📶', description: '无线局域网通信技术' },
      { name: '微波炉', icon: '🍳', description: '利用微波加热水分子烹饪食物' },
    ],
    description: '频率300MHz-300GHz，用于雷达、Wi-Fi和微波炉',
  },
  {
    index: 2,
    name: '红外',
    nameEn: 'Infrared',
    frequencyMin: 3e11,
    frequencyMax: 4.3e14,
    wavelengthMin: 7e-7,
    wavelengthMax: 0.001,
    frequencyUnit: 'THz',
    wavelengthUnit: 'nm - mm',
    color: { r: 1.0, g: 0.4, b: 0.1 },
    applications: [
      { name: '夜视仪', icon: '👁', description: '探测物体热辐射成像' },
      { name: '遥控器', icon: '🎮', description: '家电红外遥控信号' },
      { name: '热成像', icon: '🌡', description: '温度分布可视化' },
    ],
    description: '人眼不可见的热辐射，用于热成像和短距离通信',
  },
  {
    index: 3,
    name: '可见光',
    nameEn: 'Visible Light',
    frequencyMin: 4.3e14,
    frequencyMax: 7.5e14,
    wavelengthMin: 4e-7,
    wavelengthMax: 7e-7,
    frequencyUnit: 'THz',
    wavelengthUnit: 'nm',
    color: { r: 0.2, g: 0.9, b: 0.5 },
    applications: [
      { name: '照明', icon: '☀', description: '人造光源与自然日光' },
      { name: '摄影', icon: '📷', description: '光学成像记录技术' },
      { name: '光纤通信', icon: '🔬', description: '高速光纤数据传输' },
    ],
    description: '人眼可感知的电磁波段，波长400-700纳米，包含彩虹七色',
  },
  {
    index: 4,
    name: '紫外',
    nameEn: 'Ultraviolet',
    frequencyMin: 7.5e14,
    frequencyMax: 3e16,
    wavelengthMin: 1e-8,
    wavelengthMax: 4e-7,
    frequencyUnit: 'PHz',
    wavelengthUnit: 'nm',
    color: { r: 0.6, g: 0.3, b: 0.9 },
    applications: [
      { name: '杀菌消毒', icon: '💊', description: '破坏微生物DNA结构' },
      { name: '荧光检测', icon: '🔍', description: '物质荧光特性分析' },
      { name: '防伪', icon: '💎', description: '货币和证件紫外防伪标记' },
    ],
    description: '能量高于可见光，可引起化学反应，用于杀菌和荧光检测',
  },
  {
    index: 5,
    name: 'X射线',
    nameEn: 'X-Rays',
    frequencyMin: 3e16,
    frequencyMax: 3e19,
    wavelengthMin: 1e-11,
    wavelengthMax: 1e-8,
    frequencyUnit: 'EHz',
    wavelengthUnit: 'pm - nm',
    color: { r: 0.1, g: 0.8, b: 0.8 },
    applications: [
      { name: '医学成像', icon: '🩺', description: '骨骼和器官透视检查' },
      { name: '安检扫描', icon: '🛃', description: '行李和人体安全检查' },
      { name: '晶体分析', icon: '💠', description: 'X射线衍射晶体结构分析' },
    ],
    description: '高能量穿透性射线，用于医学成像和材料无损检测',
  },
  {
    index: 6,
    name: '伽马射线',
    nameEn: 'Gamma Rays',
    frequencyMin: 3e19,
    frequencyMax: 3e22,
    wavelengthMin: 1e-14,
    wavelengthMax: 1e-11,
    frequencyUnit: 'EHz - ZHz',
    wavelengthUnit: 'pm',
    color: { r: 1.0, g: 0.1, b: 0.4 },
    applications: [
      { name: '放射治疗', icon: '⚕', description: '靶向杀死癌细胞' },
      { name: '核医学', icon: '☢', description: '放射性同位素诊断' },
      { name: '天文观测', icon: '🔭', description: '探测宇宙极端天体现象' },
    ],
    description: '能量最高的电磁波，由原子核衰变产生，用于癌症治疗和天体物理研究',
  },
];

export function getAllBands(): SpectrumBand[] {
  return spectrumBands;
}

export function getBandByIndex(index: number): SpectrumBand | undefined {
  return spectrumBands.find((b) => b.index === index);
}

export function formatWavelength(wavelength: number): string {
  if (wavelength >= 1) return `${wavelength.toFixed(2)} m`;
  if (wavelength >= 1e-3) return `${(wavelength * 1e3).toFixed(2)} mm`;
  if (wavelength >= 1e-6) return `${(wavelength * 1e6).toFixed(2)} μm`;
  if (wavelength >= 1e-9) return `${(wavelength * 1e9).toFixed(2)} nm`;
  return `${(wavelength * 1e12).toFixed(2)} pm`;
}

export function formatFrequency(frequency: number): string {
  if (frequency >= 1e21) return `${(frequency / 1e21).toFixed(2)} ZHz`;
  if (frequency >= 1e18) return `${(frequency / 1e18).toFixed(2)} EHz`;
  if (frequency >= 1e15) return `${(frequency / 1e15).toFixed(2)} PHz`;
  if (frequency >= 1e12) return `${(frequency / 1e12).toFixed(2)} THz`;
  if (frequency >= 1e9) return `${(frequency / 1e9).toFixed(2)} GHz`;
  if (frequency >= 1e6) return `${(frequency / 1e6).toFixed(2)} MHz`;
  if (frequency >= 1e3) return `${(frequency / 1e3).toFixed(2)} kHz`;
  return `${frequency.toFixed(2)} Hz`;
}
