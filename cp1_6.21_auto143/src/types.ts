export enum ComponentType {
  BUTTON = 'button',
  CARD = 'card',
  FORM_INPUT = 'form-input',
  NAVBAR = 'navbar',
  ALERT = 'alert',
  PAGINATION = 'pagination'
}

export enum Framework {
  BOOTSTRAP = 'bootstrap',
  TAILWIND = 'tailwind',
  BULMA = 'bulma'
}

export interface VariableConfig {
  name: string;
  label: string;
  type: 'color' | 'number' | 'slider';
  defaultValue: string | number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface VariableOverride {
  [key: string]: string | number;
}

export interface FrameworkVariables {
  [Framework.BOOTSTRAP]: VariableConfig[];
  [Framework.TAILWIND]: VariableConfig[];
  [Framework.BULMA]: VariableConfig[];
}

export interface VariableChangeRecord {
  framework: Framework;
  variableName: string;
  oldValue: string | number;
  newValue: string | number;
  timestamp: number;
}

export interface ComponentInfo {
  id: ComponentType;
  name: string;
  icon: string;
}
