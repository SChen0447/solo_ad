export enum TemplateType {
  LANDING = 'landing',
  REGISTER = 'register',
  MODAL = 'modal',
}

export interface Variant {
  id: string;
  name: string;
  title: string;
  btnColor: string;
  bgUrl: string;
  fontSize: number;
  btnText: string;
  description: string;
}

export interface DiffResult {
  field: string;
  fieldLabel: string;
  oldValue: string | number;
  newValue: string | number;
  type: 'added' | 'removed' | 'modified';
}

export type DiffField = keyof Pick<Variant, 'title' | 'btnColor' | 'bgUrl' | 'fontSize' | 'btnText' | 'description'>;

export const FIELD_LABELS: Record<DiffField, string> = {
  title: '标题文案',
  btnColor: '按钮颜色',
  bgUrl: '背景图片',
  fontSize: '字体大小',
  btnText: '按钮文案',
  description: '描述文案',
};

export interface AppState {
  template: TemplateType;
  variants: Variant[];
  selectedVariantId: string | null;
  compareMode: boolean;
  compareVariantIds: [string, string];
  setTemplate: (t: TemplateType) => void;
  addVariant: () => void;
  updateVariant: (id: string, data: Partial<Variant>) => void;
  deleteVariant: (id: string) => void;
  selectVariant: (id: string) => void;
  toggleCompareMode: () => void;
  setCompareVariants: (ids: [string, string]) => void;
}
