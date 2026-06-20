export interface ComponentStyles {
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  fontSize?: string;
  fontWeight?: string;
  border?: string;
  padding?: string;
  margin?: string;
  boxShadow?: string;
  opacity?: string;
  [key: string]: string | undefined;
}

export interface ComponentProps {
  text?: string;
  placeholder?: string;
  type?: string;
  title?: string;
  showClose?: boolean;
  variant?: string;
  [key: string]: string | boolean | undefined;
}

export interface UIComponent {
  id: string;
  project_id: string;
  type: 'Button' | 'Input' | 'Card' | 'Modal' | string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles: ComponentStyles;
  props: ComponentProps;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface VersionSnapshot {
  project: Project | null;
  components: UIComponent[];
}

export interface Version {
  id: string;
  project_id: string;
  snapshot: VersionSnapshot;
  author: string;
  created_at: string;
}

export interface OnlineUser {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

export interface ComponentTemplate {
  type: string;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultStyles: ComponentStyles;
  defaultProps: ComponentProps;
}

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    type: 'Button',
    name: '按钮',
    defaultWidth: 120,
    defaultHeight: 44,
    defaultStyles: {
      backgroundColor: '#89b4fa',
      color: '#1e1e2e',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
    },
    defaultProps: { text: '按钮', variant: 'primary' },
  },
  {
    type: 'Input',
    name: '输入框',
    defaultWidth: 280,
    defaultHeight: 44,
    defaultStyles: {
      backgroundColor: '#45475a',
      color: '#cdd6f4',
      borderRadius: '8px',
      fontSize: '14px',
      border: '1px solid #585b70',
    },
    defaultProps: { placeholder: '请输入内容', type: 'text' },
  },
  {
    type: 'Card',
    name: '卡片',
    defaultWidth: 320,
    defaultHeight: 200,
    defaultStyles: {
      backgroundColor: '#313244',
      color: '#cdd6f4',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    defaultProps: { title: '卡片标题' },
  },
  {
    type: 'Modal',
    name: '模态框',
    defaultWidth: 480,
    defaultHeight: 300,
    defaultStyles: {
      backgroundColor: '#313244',
      color: '#cdd6f4',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
    defaultProps: { title: '模态框标题', showClose: true },
  },
];
