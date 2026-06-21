import { Button, defaultButtonProps, generateButtonCode, ButtonProps } from './Button';
import { Input, defaultInputProps, generateInputCode, InputProps } from './Input';
import { Slider, defaultSliderProps, generateSliderCode, SliderProps } from './Slider';
import { Breadcrumb, defaultBreadcrumbProps, generateBreadcrumbCode, BreadcrumbProps } from './Breadcrumb';
import { Modal, defaultModalProps, generateModalCode, ModalProps } from './Modal';
import type { ComponentType } from 'react';

export type ComponentPropsType = ButtonProps | InputProps | SliderProps | BreadcrumbProps | ModalProps;

export interface ComponentConfig {
  name: string;
  displayName: string;
  icon: string;
  defaultProps: ComponentPropsType;
  component: ComponentType<any>;
  generateCode: (props: any) => string;
}

export const componentConfigs: Record<string, ComponentConfig> = {
  button: {
    name: 'button',
    displayName: '按钮 Button',
    icon: 'square',
    defaultProps: defaultButtonProps,
    component: Button,
    generateCode: generateButtonCode,
  },
  input: {
    name: 'input',
    displayName: '输入框 Input',
    icon: 'type',
    defaultProps: defaultInputProps,
    component: Input,
    generateCode: generateInputCode,
  },
  slider: {
    name: 'slider',
    displayName: '滑块 Slider',
    icon: 'sliders-horizontal',
    defaultProps: defaultSliderProps,
    component: Slider,
    generateCode: generateSliderCode,
  },
  breadcrumb: {
    name: 'breadcrumb',
    displayName: '面包屑 Breadcrumb',
    icon: 'more-horizontal',
    defaultProps: defaultBreadcrumbProps,
    component: Breadcrumb,
    generateCode: generateBreadcrumbCode,
  },
  modal: {
    name: 'modal',
    displayName: '模态框 Modal',
    icon: 'rectangle-horizontal',
    defaultProps: defaultModalProps,
    component: Modal,
    generateCode: generateModalCode,
  },
};

export const componentList = Object.values(componentConfigs);
