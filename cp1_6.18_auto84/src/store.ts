import { create } from 'zustand';
import { TemplateType, Variant, AppState } from './types';

const generateId = (): string => Math.random().toString(36).substring(2, 9);

const createInitialVariants = (): Variant[] => [
  {
    id: generateId(),
    name: 'A方案',
    title: '限时特惠，立即抢购',
    btnColor: '#3B82F6',
    bgUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200',
    fontSize: 48,
    btnText: '立即购买',
    description: '专享优惠折扣，数量有限，先到先得',
  },
  {
    id: generateId(),
    name: 'B方案',
    title: '新用户专享福利',
    btnColor: '#10B981',
    bgUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
    fontSize: 42,
    btnText: '免费领取',
    description: '注册即送100元优惠券，全场通用',
  },
  {
    id: generateId(),
    name: 'C方案',
    title: '会员尊享特权',
    btnColor: '#F59E0B',
    bgUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200',
    fontSize: 52,
    btnText: '开通会员',
    description: '升级会员享受更多专属优惠与服务',
  },
];

export const useStore = create<AppState>((set, get) => ({
  template: TemplateType.LANDING,
  variants: createInitialVariants(),
  selectedVariantId: null,
  compareMode: false,
  compareVariantIds: ['', ''],

  setTemplate: (template: TemplateType) => set({ template }),

  addVariant: () => {
    const { variants } = get();
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newVariant: Variant = {
      id: generateId(),
      name: `${letters[variants.length]}方案`,
      title: '新变体标题',
      btnColor: '#6366F1',
      bgUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
      fontSize: 36,
      btnText: '点击按钮',
      description: '请输入描述文案',
    };
    set({
      variants: [...variants, newVariant],
      selectedVariantId: newVariant.id,
    });
  },

  updateVariant: (id: string, data: Partial<Variant>) => {
    const { variants } = get();
    set({
      variants: variants.map((v) => (v.id === id ? { ...v, ...data } : v)),
    });
  },

  deleteVariant: (id: string) => {
    const { variants, selectedVariantId, compareVariantIds } = get();
    const newVariants = variants.filter((v) => v.id !== id);
    const newSelectedId = selectedVariantId === id
      ? (newVariants[0]?.id ?? null)
      : selectedVariantId;
    const newCompareIds: [string, string] = [
      compareVariantIds[0] === id ? (newVariants[0]?.id ?? '') : compareVariantIds[0],
      compareVariantIds[1] === id ? (newVariants[1]?.id ?? '') : compareVariantIds[1],
    ];
    set({
      variants: newVariants,
      selectedVariantId: newSelectedId,
      compareVariantIds: newCompareIds,
    });
  },

  selectVariant: (id: string) => set({ selectedVariantId: id }),

  toggleCompareMode: () => {
    const { compareMode, variants } = get();
    if (!compareMode && variants.length >= 2) {
      set({
        compareMode: true,
        compareVariantIds: [variants[0].id, variants[1].id],
      });
    } else {
      set({ compareMode: false });
    }
  },

  setCompareVariants: (ids: [string, string]) => set({ compareVariantIds: ids }),
}));
