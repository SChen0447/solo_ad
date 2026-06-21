export type AlignType =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ButtonConfig {
  text: string;
  link: string;
  bgColor: string;
  textColor: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  zIndex: number;
  title: string;
  subtitle: string;
  align: AlignType;
  button: ButtonConfig;
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  countdownEnabled?: boolean;
  countdownEndTime?: string;
  couponCode?: string;
  tiers?: Array<{ threshold: number; discount: number; label: string }>;
}

export const templateList: TemplateConfig[] = [
  {
    id: 'simple-hero',
    name: '简约首屏',
    width: 320,
    height: 420,
    zIndex: 9999,
    title: '双十一狂欢节',
    subtitle: '全场商品5折起\n限时抢购 不容错过',
    align: 'center-center',
    button: {
      text: '立即抢购',
      link: 'https://example.com/shop',
      bgColor: '#ff4757',
      textColor: '#ffffff'
    },
    gradientStart: '#ff6b6b',
    gradientEnd: '#ee0979',
    textColor: '#ffffff'
  },
  {
    id: 'countdown-coupon',
    name: '倒计时+优惠券',
    width: 340,
    height: 480,
    zIndex: 9999,
    title: '年货节特惠',
    subtitle: '新春大促 福利满满',
    align: 'center-center',
    button: {
      text: '领取优惠券',
      link: 'https://example.com/coupon',
      bgColor: '#ffa502',
      textColor: '#ffffff'
    },
    gradientStart: '#f093fb',
    gradientEnd: '#f5576c',
    textColor: '#ffffff',
    countdownEnabled: true,
    countdownEndTime: '2026-02-17T23:59:59',
    couponCode: 'NEWYEAR2026'
  },
  {
    id: 'tiered-discount',
    name: '满减阶梯',
    width: 360,
    height: 500,
    zIndex: 9999,
    title: '618年中大促',
    subtitle: '多买多省 阶梯满减',
    align: 'center-center',
    button: {
      text: '去凑单',
      link: 'https://example.com/cart',
      bgColor: '#00d2d3',
      textColor: '#ffffff'
    },
    gradientStart: '#4facfe',
    gradientEnd: '#00f2fe',
    textColor: '#ffffff',
    tiers: [
      { threshold: 199, discount: 20, label: '满199减20' },
      { threshold: 399, discount: 50, label: '满399减50' },
      { threshold: 699, discount: 100, label: '满699减100' }
    ]
  }
];

export const alignOptions: { value: AlignType; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '顶部居中' },
  { value: 'top-right', label: '右上' },
  { value: 'center-left', label: '左侧居中' },
  { value: 'center-center', label: '居中' },
  { value: 'center-right', label: '右侧居中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '底部居中' },
  { value: 'bottom-right', label: '右下' }
];

export function getTemplateById(id: string): TemplateConfig | undefined {
  return templateList.find((t) => t.id === id);
}

export function cloneTemplate(config: TemplateConfig): TemplateConfig {
  return JSON.parse(JSON.stringify(config));
}
