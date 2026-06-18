export type ComponentType = 'button' | 'input' | 'card' | 'modal' | 'tabs';

export interface BaseProps {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface ButtonProps extends BaseProps {
  type: 'button';
  label: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled: boolean;
  primaryColor: string;
  backgroundColor: string;
  fontSize: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
}

export interface InputProps extends BaseProps {
  type: 'input';
  placeholder: string;
  value: string;
  disabled: boolean;
  focused: boolean;
  primaryColor: string;
  backgroundColor: string;
  borderRadius: number;
  fontSize: number;
  paddingX: number;
  paddingY: number;
}

export interface CardProps extends BaseProps {
  type: 'card';
  title: string;
  description: string;
  imageUrl: string;
  elevation: number;
  primaryColor: string;
  backgroundColor: string;
  borderRadius: number;
}

export interface ModalProps extends BaseProps {
  type: 'modal';
  title: string;
  content: string;
  showCloseButton: boolean;
  primaryColor: string;
  backgroundColor: string;
  borderRadius: number;
  overlayOpacity: number;
}

export interface TabsProps extends BaseProps {
  type: 'tabs';
  tabs: string[];
  activeTab: number;
  primaryColor: string;
  backgroundColor: string;
  borderRadius: number;
}

export type ComponentProps = ButtonProps | InputProps | CardProps | ModalProps | TabsProps;

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  components: ComponentProps[];
}

export interface ComponentDiff {
  componentId: string;
  componentType: ComponentType;
  propName: string;
  valueA: unknown;
  valueB: unknown;
}

export interface AlignLine {
  type: 'vertical' | 'horizontal';
  position: number;
}

export type PropFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'boolean'
  | 'color'
  | 'range'
  | 'textarea'
  | 'array';

export interface PropFieldConfig {
  key: string;
  label: string;
  type: PropFieldType;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentRegistry {
  type: ComponentType;
  name: string;
  icon: string;
  defaultProps: Omit<ComponentProps, 'id' | 'type' | 'x' | 'y'>;
  fieldConfigs: PropFieldConfig[];
}
