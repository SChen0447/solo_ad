export interface ComponentItem {
  id: number;
  name: string;
  category: 'button' | 'card' | 'input' | 'modal';
  tags: string[];
  defaultProps: Record<string, any>;
}

export interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  fontFamily: string;
}

export type CategoryType = 'all' | 'button' | 'card' | 'input' | 'modal';

export const defaultComponents: ComponentItem[] = [
  {
    id: 1,
    name: 'Primary Button',
    category: 'button',
    tags: ['button', 'primary', 'action'],
    defaultProps: { text: 'Click Me', variant: 'primary' }
  }
];

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default Blue',
  primaryColor: '#3b82f6',
  secondaryColor: '#10b981',
  bgColor: '#ffffff',
  fontFamily: 'Inter, system-ui, sans-serif'
};
