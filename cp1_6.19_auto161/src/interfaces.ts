export type ComponentType =
  | 'Button'
  | 'Card'
  | 'Input'
  | 'Image'
  | 'Badge'
  | 'Container'
  | 'Text';

export interface ComponentNode {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  style: React.CSSProperties;
  children: ComponentNode[] | string;
}

export interface NodePatch {
  props?: Record<string, any>;
  style?: React.CSSProperties;
}

export const DEFAULT_COMPONENTS: Record<ComponentType, Omit<ComponentNode, 'id'>> = {
  Button: {
    type: 'Button',
    props: { children: '按钮', disabled: false },
    style: {
      padding: '8px 16px',
      fontSize: '14px',
      backgroundColor: '#4A90D9',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
    },
    children: '按钮',
  },
  Card: {
    type: 'Card',
    props: {},
    style: {
      padding: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      width: '300px',
    },
    children: [],
  },
  Input: {
    type: 'Input',
    props: { placeholder: '请输入...', value: '' },
    style: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      width: '200px',
      outline: 'none',
    },
    children: [],
  },
  Image: {
    type: 'Image',
    props: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      alt: '示例图片',
    },
    style: {
      width: '300px',
      height: '200px',
      borderRadius: '8px',
      objectFit: 'cover',
    },
    children: [],
  },
  Badge: {
    type: 'Badge',
    props: { children: 'New' },
    style: {
      padding: '2px 8px',
      fontSize: '12px',
      backgroundColor: '#10B981',
      color: '#ffffff',
      borderRadius: '10px',
      display: 'inline-block',
    },
    children: 'New',
  },
  Container: {
    type: 'Container',
    props: {},
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
    },
    children: [],
  },
  Text: {
    type: 'Text',
    props: { children: '文本内容' },
    style: {
      fontSize: '14px',
      color: '#334155',
      lineHeight: '1.6',
    },
    children: '文本内容',
  },
};
