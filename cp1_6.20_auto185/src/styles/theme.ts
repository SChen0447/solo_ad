export const categoryColors: Record<string, string> = {
  塑料瓶: '#4ECDC4',
  玻璃瓶: '#45B7D1',
  纸箱: '#F39C12',
  布料: '#E74C3C',
  木制品: '#8E44AD',
  金属罐: '#95A5A6',
  轮胎: '#2C3E50',
  旧电器: '#E67E22',
}

export const theme = {
  colors: {
    background: '#FFF8F0',
    card: '#FFFFFF',
    title: '#4A3728',
    subtitle: '#7A5C3F',
    primary: '#D4A373',
    primaryHover: '#B8865B',
    text: '#5D4E37',
    link: '#6B8E23',
    lightGray: '#ECF0F1',
    tagBg: '#F8F9FA',
    divider: '#aaaaaa',
    like: '#FF6B6B',
    shadow: '#00000015',
    categoryColors,
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '20px',
    xl: '32px',
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '16px',
    pill: '20px',
  },
  shadows: {
    card: '0 2px 6px #00000015',
    cardHover: '0 4px 12px #00000025',
  },
  maxWidth: '1280px',
}

export const categories = [
  { key: 'plastic', label: '塑料瓶', color: categoryColors['塑料瓶'] },
  { key: 'glass', label: '玻璃瓶', color: categoryColors['玻璃瓶'] },
  { key: 'paper', label: '纸箱', color: categoryColors['纸箱'] },
  { key: 'cloth', label: '布料', color: categoryColors['布料'] },
  { key: 'wood', label: '木制品', color: categoryColors['木制品'] },
  { key: 'metal', label: '金属罐', color: categoryColors['金属罐'] },
  { key: 'tire', label: '轮胎', color: categoryColors['轮胎'] },
  { key: 'electronic', label: '旧电器', color: categoryColors['旧电器'] },
]
