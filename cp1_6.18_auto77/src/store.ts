import { create } from 'zustand';
import type { Product, TemplateId, ActivityConfig, PromotionState } from './types';

const mockProducts: Product[] = [
  {
    id: '1',
    name: '无线蓝牙耳机',
    originalPrice: 299,
    discountPrice: 159,
    stock: 150,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless%20bluetooth%20earbuds%20product%20photo%20white%20background&image_size=square',
    description: '高品质无线蓝牙耳机，支持主动降噪，续航长达24小时，舒适佩戴，IPX5级防水。',
  },
  {
    id: '2',
    name: '智能运动手表',
    originalPrice: 899,
    discountPrice: 499,
    stock: 80,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20sports%20watch%20product%20photo%20black%20background&image_size=square',
    description: '多功能智能运动手表，实时心率监测，50米防水，14天超长续航，支持多种运动模式。',
  },
  {
    id: '3',
    name: '便携充电宝',
    originalPrice: 199,
    discountPrice: 99,
    stock: 300,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portable%20power%20bank%20charger%20product%20photo%20white%20background&image_size=square',
    description: '20000mAh大容量充电宝，支持22.5W快充，双向快充，小巧便携，多设备兼容。',
  },
  {
    id: '4',
    name: '高清摄像头',
    originalPrice: 499,
    discountPrice: 279,
    stock: 60,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=HD%20webcam%20camera%20product%20photo%20white%20background&image_size=square',
    description: '1080P高清摄像头，自动对焦，内置麦克风，适用于视频会议、直播、网课等场景。',
  },
  {
    id: '5',
    name: '机械键盘',
    originalPrice: 399,
    discountPrice: 229,
    stock: 120,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mechanical%20gaming%20keyboard%20RGB%20product%20photo%20dark%20background&image_size=square',
    description: '青轴机械键盘，RGB背光，104键全键无冲，铝合金面板，人体工学设计。',
  },
  {
    id: '6',
    name: '无线鼠标',
    originalPrice: 159,
    discountPrice: 89,
    stock: 200,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless%20ergonomic%20mouse%20product%20photo%20white%20background&image_size=square',
    description: '人体工学无线鼠标，静音按键，DPI可调，续航持久，办公游戏两用。',
  },
  {
    id: '7',
    name: '笔记本支架',
    originalPrice: 129,
    discountPrice: 69,
    stock: 180,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=laptop%20stand%20aluminum%20product%20photo%20white%20background&image_size=square',
    description: '铝合金笔记本支架，7档角度调节，散热设计，稳固承重，便携折叠。',
  },
  {
    id: '8',
    name: 'USB-C扩展坞',
    originalPrice: 249,
    discountPrice: 139,
    stock: 90,
    mainImageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=USB%20C%20hub%20adapter%20product%20photo%20white%20background&image_size=square',
    description: '7合1 USB-C扩展坞，支持4K HDMI，PD快充，SD/TF读卡，USB3.0高速传输。',
  },
];

const initialConfig: ActivityConfig = {
  activityName: '夏季大促销',
  startTime: '',
  endTime: '',
  discountColor: '#FF4444',
};

export const usePromotionStore = create<PromotionState>((set) => ({
  availableProducts: mockProducts,
  selectedProducts: [],
  templateId: 'vertical',
  activityConfig: initialConfig,

  setSelectedProducts: (products: Product[]) => set({ selectedProducts: products }),

  addProduct: (product: Product) =>
    set((state) => {
      if (state.selectedProducts.find((p) => p.id === product.id)) {
        return state;
      }
      return { selectedProducts: [...state.selectedProducts, product] };
    }),

  removeProduct: (productId: string) =>
    set((state) => ({
      selectedProducts: state.selectedProducts.filter((p) => p.id !== productId),
    })),

  reorderProducts: (fromIndex: number, toIndex: number) =>
    set((state) => {
      const newProducts = [...state.selectedProducts];
      const [moved] = newProducts.splice(fromIndex, 1);
      newProducts.splice(toIndex, 0, moved);
      return { selectedProducts: newProducts };
    }),

  setTemplateId: (templateId: TemplateId) => set({ templateId }),

  updateActivityConfig: (config: Partial<ActivityConfig>) =>
    set((state) => ({
      activityConfig: { ...state.activityConfig, ...config },
    })),
}));
