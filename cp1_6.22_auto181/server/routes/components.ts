import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

export interface ComponentVersion {
  version: string;
  jsx: string;
  defaultProps: Record<string, any>;
  createdAt: string;
}

export interface Component {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnail: string;
  likes: number;
  versions: ComponentVersion[];
  createdAt: string;
  updatedAt: string;
}

const components: Component[] = [
  {
    id: 'button',
    name: 'Button',
    description: '一个可定制的按钮组件，支持多种尺寸和样式变体',
    tags: ['表单', '基础'],
    thumbnail: '',
    likes: 128,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<button 
  style={{
    padding: size === 'large' ? '12px 24px' : size === 'small' ? '6px 12px' : '8px 16px',
    backgroundColor: variant === 'primary' ? '#6366f1' : variant === 'danger' ? '#ef4444' : '#f1f5f9',
    color: variant === 'outline' ? '#6366f1' : variant === 'ghost' ? '#6366f1' : variant === 'secondary' ? '#475569' : '#ffffff',
    border: variant === 'outline' ? '1px solid #6366f1' : 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontSize: size === 'large' ? '16px' : size === 'small' ? '12px' : '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  }}
  disabled={disabled}
>
  {children}
</button>`,
        defaultProps: {
          size: 'medium',
          variant: 'primary',
          disabled: false,
          children: '按钮'
        },
        createdAt: '2024-01-15T10:00:00Z'
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'input',
    name: 'Input',
    description: '基础输入框组件，支持前缀、后缀和状态提示',
    tags: ['表单', '基础'],
    thumbnail: '',
    likes: 96,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
  {label && (
    <label style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
      {label}
    </label>
  )}
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    disabled={disabled}
    style={{
      padding: '10px 12px',
      border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      cursor: disabled ? 'not-allowed' : 'text',
      backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
    }}
  />
  {error && (
    <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>
  )}
</div>`,
        defaultProps: {
          type: 'text',
          placeholder: '请输入内容',
          value: '',
          label: '',
          disabled: false,
          error: ''
        },
        createdAt: '2024-01-20T14:30:00Z'
      }
    ],
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'card',
    name: 'Card',
    description: '卡片容器组件，用于展示内容块',
    tags: ['布局', '基础'],
    thumbnail: '',
    likes: 156,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div
  style={{
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
    border: bordered ? '1px solid #e5e7eb' : 'none',
    padding: paddingSize === 'large' ? '24px' : paddingSize === 'small' ? '12px' : '16px',
    transition: 'box-shadow 0.2s ease',
  }}
>
  {title && (
    <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
      {title}
    </div>
  )}
  <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
    {children || '这是卡片内容区域'}
  </div>
</div>`,
        defaultProps: {
          title: '卡片标题',
          shadow: true,
          bordered: false,
          paddingSize: 'medium',
          children: '这是卡片内容区域'
        },
        createdAt: '2024-02-01T09:15:00Z'
      }
    ],
    createdAt: '2024-02-01T09:15:00Z',
    updatedAt: '2024-02-01T09:15:00Z'
  },
  {
    id: 'badge',
    name: 'Badge',
    description: '徽章组件，用于显示状态或数量标记',
    tags: ['数据展示', '基础'],
    thumbnail: '',
    likes: 78,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<span
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '9999px',
    backgroundColor: {
      primary: '#e0e7ff',
      success: '#dcfce7',
      warning: '#fef3c7',
      danger: '#fee2e2',
      default: '#f1f5f9',
    }[color] || '#f1f5f9',
    color: {
      primary: '#4f46e5',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
      default: '#475569',
    }[color] || '#475569',
    lineHeight: 1.5,
  }}
>
  {text}
</span>`,
        defaultProps: {
          text: '徽章',
          color: 'primary'
        },
        createdAt: '2024-02-10T16:45:00Z'
      }
    ],
    createdAt: '2024-02-10T16:45:00Z',
    updatedAt: '2024-02-10T16:45:00Z'
  },
  {
    id: 'modal',
    name: 'Modal',
    description: '模态对话框组件，用于展示重要信息或操作',
    tags: ['反馈', '弹窗'],
    thumbnail: '',
    likes: 203,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div
  style={{
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    opacity: visible ? 1 : 0,
    visibility: visible ? 'visible' : 'hidden',
    transition: 'opacity 0.2s ease, visibility 0.2s ease',
  }}
  onClick={onClose}
>
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      width: size === 'large' ? '600px' : size === 'small' ? '320px' : '480px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      transform: visible ? 'scale(1)' : 'scale(0.95)',
      transition: 'transform 0.2s ease',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    }}
  >
    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>{title}</h3>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af', padding: '4px 8px', borderRadius: '4px' }}
      >
        ×
      </button>
    </div>
    <div style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
      {children || '模态框内容'}
    </div>
    {showFooter && (
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>
          取消
        </button>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>
          确定
        </button>
      </div>
    )}
  </div>
</div>`,
        defaultProps: {
          title: '对话框标题',
          visible: true,
          size: 'medium',
          showFooter: true,
          children: '这是模态框的内容区域'
        },
        createdAt: '2024-02-15T11:20:00Z'
      }
    ],
    createdAt: '2024-02-15T11:20:00Z',
    updatedAt: '2024-02-15T11:20:00Z'
  },
  {
    id: 'progress',
    name: 'Progress',
    description: '进度条组件，展示操作进度状态',
    tags: ['数据展示', '反馈'],
    thumbnail: '',
    likes: 67,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div style={{ width: '100%' }}>
  {showLabel && (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#4b5563' }}>
      <span>{label || '进度'}</span>
      <span>{percent}%</span>
    </div>
  )}
  <div
    style={{
      width: '100%',
      height: size === 'large' ? '12px' : size === 'small' ? '4px' : '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '9999px',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        height: '100%',
        width: \`\${percent}%\`,
        backgroundColor: {
          primary: '#6366f1',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        }[color] || '#6366f1',
        borderRadius: '9999px',
        transition: 'width 0.3s ease',
      }}
    />
  </div>
</div>`,
        defaultProps: {
          percent: 60,
          size: 'medium',
          color: 'primary',
          showLabel: true,
          label: '完成进度'
        },
        createdAt: '2024-02-20T08:30:00Z'
      }
    ],
    createdAt: '2024-02-20T08:30:00Z',
    updatedAt: '2024-02-20T08:30:00Z'
  },
  {
    id: 'avatar',
    name: 'Avatar',
    description: '头像组件，支持图片、文字和图标',
    tags: ['数据展示', '基础'],
    thumbnail: '',
    likes: 112,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div
  style={{
    width: size === 'large' ? '64px' : size === 'small' ? '24px' : size === 'xlarge' ? '96px' : '40px',
    height: size === 'large' ? '64px' : size === 'small' ? '24px' : size === 'xlarge' ? '96px' : '40px',
    borderRadius: shape === 'square' ? '8px' : '50%',
    backgroundColor: bgColor || '#e0e7ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size === 'large' ? '20px' : size === 'small' ? '12px' : size === 'xlarge' ? '32px' : '16px',
    fontWeight: 500,
    overflow: 'hidden',
    flexShrink: 0,
  }}
>
  {src ? (
    <img src={src} alt={alt || text} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    text
  )}
</div>`,
        defaultProps: {
          text: 'U',
          size: 'medium',
          shape: 'circle',
          src: '',
          alt: '',
          bgColor: ''
        },
        createdAt: '2024-03-01T13:00:00Z'
      }
    ],
    createdAt: '2024-03-01T13:00:00Z',
    updatedAt: '2024-03-01T13:00:00Z'
  },
  {
    id: 'tag',
    name: 'Tag',
    description: '标签组件，用于标记和分类',
    tags: ['数据展示', '基础'],
    thumbnail: '',
    likes: 89,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<span
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: paddingSize === 'large' ? '6px 12px' : '2px 8px',
    fontSize: paddingSize === 'large' ? '14px' : '12px',
    borderRadius: variant === 'dark' ? '4px' : '6px',
    backgroundColor: {
      primary: variant === 'dark' ? '#4f46e5' : '#eef2ff',
      success: variant === 'dark' ? '#16a34a' : '#dcfce7',
      warning: variant === 'dark' ? '#d97706' : '#fef3c7',
      danger: variant === 'dark' ? '#dc2626' : '#fee2e2',
      default: variant === 'dark' ? '#475569' : '#f1f5f9',
    }[color] || '#f1f5f9',
    color: {
      primary: variant === 'dark' ? '#ffffff' : '#4f46e5',
      success: variant === 'dark' ? '#ffffff' : '#16a34a',
      warning: variant === 'dark' ? '#ffffff' : '#d97706',
      danger: variant === 'dark' ? '#ffffff' : '#dc2626',
      default: variant === 'dark' ? '#ffffff' : '#475569',
    }[color] || '#475569',
    fontWeight: 500,
    cursor: 'default',
    border: variant === 'outline' ? `1px solid ${
      { primary: '#6366f1', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', default: '#9ca3af' }[color] || '#9ca3af'
    }` : 'none',
    background: variant === 'outline' ? 'transparent' : undefined,
  }}
>
  {text}
  {closable && (
    <span style={{ cursor: 'pointer', marginLeft: '2px', fontSize: '14px', lineHeight: 1 }}>×</span>
  )}
</span>`,
        defaultProps: {
          text: '标签',
          color: 'primary',
          variant: 'light',
          paddingSize: 'medium',
          closable: false
        },
        createdAt: '2024-03-05T10:15:00Z'
      }
    ],
    createdAt: '2024-03-05T10:15:00Z',
    updatedAt: '2024-03-05T10:15:00Z'
  },
  {
    id: 'chart-bar',
    name: 'BarChart',
    description: '柱状图组件，用于数据可视化展示',
    tags: ['图表', '数据展示'],
    thumbnail: '',
    likes: 145,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div style={{ width: '100%', padding: '16px' }}>
  {title && (
    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>{title}</h3>
  )}
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '200px', gap: '8px', padding: '8px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
    {data.map((item, index) => (
      <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <span style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{item.value}</span>
        <div
          style={{
            width: '100%',
            maxWidth: '40px',
            height: \`\${(item.value / maxValue) * 150}px\`,
            backgroundColor: barColor || '#6366f1',
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.3s ease',
            minHeight: '4px',
          }}
        />
        <span style={{ fontSize: '12px', color: '#4b5563', marginTop: '8px' }}>{item.label}</span>
      </div>
    ))}
  </div>
</div>`,
        defaultProps: {
          title: '销售数据统计',
          barColor: '#6366f1',
          data: [
            { label: '周一', value: 45 },
            { label: '周二', value: 68 },
            { label: '周三', value: 52 },
            { label: '周四', value: 80 },
            { label: '周五', value: 95 },
          ],
          maxValue: 100
        },
        createdAt: '2024-03-10T15:45:00Z'
      }
    ],
    createdAt: '2024-03-10T15:45:00Z',
    updatedAt: '2024-03-10T15:45:00Z'
  },
  {
    id: 'switch',
    name: 'Switch',
    description: '开关组件，用于二元选项切换',
    tags: ['表单', '基础'],
    thumbnail: '',
    likes: 73,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<button
  type="button"
  role="switch"
  aria-checked={checked}
  disabled={disabled}
  style={{
    position: 'relative',
    width: size === 'large' ? '56px' : size === 'small' ? '36px' : '44px',
    height: size === 'large' ? '32px' : size === 'small' ? '20px' : '24px',
    borderRadius: '9999px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: disabled ? '#d1d5db' : checked ? activeColor : '#d1d5db',
    transition: 'background-color 0.2s ease',
    padding: 0,
    outline: 'none',
  }}
>
  <span
    style={{
      position: 'absolute',
      top: '2px',
      left: checked ? (size === 'large' ? '26px' : size === 'small' ? '18px' : '22px') : '2px',
      width: size === 'large' ? '28px' : size === 'small' ? '16px' : '20px',
      height: size === 'large' ? '28px' : size === 'small' ? '16px' : '20px',
      backgroundColor: '#ffffff',
      borderRadius: '50%',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      transition: 'left 0.2s ease',
    }}
  />
</button>`,
        defaultProps: {
          checked: true,
          disabled: false,
          size: 'medium',
          activeColor: '#6366f1'
        },
        createdAt: '2024-03-15T09:30:00Z'
      }
    ],
    createdAt: '2024-03-15T09:30:00Z',
    updatedAt: '2024-03-15T09:30:00Z'
  },
  {
    id: 'tabs',
    name: 'Tabs',
    description: '标签页组件，用于内容分类展示',
    tags: ['导航', '布局'],
    thumbnail: '',
    likes: 134,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div style={{ width: '100%' }}>
  <div
    style={{
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: '16px',
      gap: type === 'card' ? '4px' : '0',
      padding: type === 'card' ? '0' : '0',
    }}
  >
    {items.map((item, index) => (
      <button
        key={index}
        onClick={() => {}}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: activeIndex === index ? 600 : 400,
          color: activeIndex === index ? (type === 'card' ? '#ffffff' : '#4f46e5') : '#6b7280',
          backgroundColor: type === 'card' ? (activeIndex === index ? '#6366f1' : '#f3f4f6') : 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          borderRadius: type === 'card' ? '8px 8px 0 0' : '0',
          transition: 'color 0.2s ease, background-color 0.2s ease',
          marginBottom: type === 'card' ? '-1px' : '0',
        }}
      >
        {item.label}
        {type === 'line' && activeIndex === index && (
          <span
            style={{
              position: 'absolute',
              bottom: '-1px',
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: '#6366f1',
            }}
          />
        )}
      </button>
    ))}
  </div>
  <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6, padding: '8px 0' }}>
    {items[activeIndex]?.content || '暂无内容'}
  </div>
</div>`,
        defaultProps: {
          type: 'line',
          activeIndex: 0,
          items: [
            { label: '标签一', content: '这是标签一的内容区域，展示相关信息。' },
            { label: '标签二', content: '这是标签二的内容区域，有不同的数据展示。' },
            { label: '标签三', content: '这是标签三的内容，提供更多功能选项。' },
          ]
        },
        createdAt: '2024-03-20T14:00:00Z'
      }
    ],
    createdAt: '2024-03-20T14:00:00Z',
    updatedAt: '2024-03-20T14:00:00Z'
  },
  {
    id: 'alert',
    name: 'Alert',
    description: '提示框组件，用于展示重要信息和警告',
    tags: ['反馈', '基础'],
    thumbnail: '',
    likes: 91,
    versions: [
      {
        version: 'v1.0.0',
        jsx: `<div
  style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: {
      info: '#eff6ff',
      success: '#f0fdf4',
      warning: '#fffbeb',
      error: '#fef2f2',
    }[type] || '#eff6ff',
    border: '1px solid',
    borderColor: {
      info: '#bfdbfe',
      success: '#bbf7d0',
      warning: '#fde68a',
      error: '#fecaca',
    }[type] || '#bfdbfe',
  }}
>
  <span style={{ fontSize: '18px', lineHeight: 1.4 }}>
    {{
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[type] || 'ℹ️'}
  </span>
  <div style={{ flex: 1 }}>
    {title && (
      <div style={{ fontWeight: 600, fontSize: '14px', color: { info: '#1e40af', success: '#166534', warning: '#92400e', error: '#991b1b' }[type] || '#1e40af', marginBottom: '4px' }}>
        {title}
      </div>
    )}
    <div style={{ fontSize: '14px', color: { info: '#1e40af', success: '#166534', warning: '#92400e', error: '#991b1b' }[type] || '#1e40af', lineHeight: 1.5 }}>
      {message}
    </div>
  </div>
  {closable && (
    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', padding: '0 4px' }}>
      ×
    </button>
  )}
</div>`,
        defaultProps: {
          type: 'info',
          title: '提示',
          message: '这是一条提示信息，请注意查看。',
          closable: false
        },
        createdAt: '2024-03-25T11:30:00Z'
      }
    ],
    createdAt: '2024-03-25T11:30:00Z',
    updatedAt: '2024-03-25T11:30:00Z'
  },
];

router.get('/', (req: Request, res: Response) => {
  const { tag, search } = req.query;
  
  let result = [...components];
  
  if (tag && typeof tag === 'string') {
    result = result.filter(c => c.tags.includes(tag));
  }
  
  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    result = result.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.description.toLowerCase().includes(searchLower)
    );
  }
  
  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const component = components.find(c => c.id === id);
  
  if (!component) {
    res.status(404).json({ success: false, message: '组件不存在' });
    return;
  }
  
  res.json(component);
});

router.post('/', (req: Request, res: Response) => {
  const { id, name, description, tags, jsx, defaultProps, thumbnail, version } = req.body;
  
  if (!name || !jsx) {
    res.status(400).json({ success: false, message: '组件名称和JSX源码不能为空' });
    return;
  }
  
  const componentId = id || uuidv4();
  const now = new Date().toISOString();
  
  const newComponent: Component = {
    id: componentId,
    name,
    description: description || '',
    tags: tags || [],
    thumbnail: thumbnail || '',
    likes: 0,
    versions: [
      {
        version: version || 'v1.0.0',
        jsx,
        defaultProps: defaultProps || {},
        createdAt: now,
      }
    ],
    createdAt: now,
    updatedAt: now,
  };
  
  components.push(newComponent);
  
  res.json({ success: true, id: componentId, message: '组件注册成功' });
});

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { version, jsx, defaultProps } = req.body;
  
  const componentIndex = components.findIndex(c => c.id === id);
  
  if (componentIndex === -1) {
    res.status(404).json({ success: false, message: '组件不存在' });
    return;
  }
  
  if (!version) {
    res.status(400).json({ success: false, message: '版本号不能为空' });
    return;
  }
  
  const component = components[componentIndex];
  const now = new Date().toISOString();
  
  component.versions.push({
    version,
    jsx: jsx || component.versions[component.versions.length - 1].jsx,
    defaultProps: defaultProps || component.versions[component.versions.length - 1].defaultProps,
    createdAt: now,
  });
  
  component.updatedAt = now;
  
  res.json({ success: true, message: '组件版本更新成功' });
});

router.post('/:id/like', (req: Request, res: Response) => {
  const { id } = req.params;
  const component = components.find(c => c.id === id);
  
  if (!component) {
    res.status(404).json({ success: false, message: '组件不存在' });
    return;
  }
  
  component.likes += 1;
  
  res.json({ success: true, likes: component.likes });
});

export default router;
