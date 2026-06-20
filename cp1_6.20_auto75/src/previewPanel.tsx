import type { ThemeVariables } from '../types';

interface PreviewPanelProps {
  variables: ThemeVariables;
  variablesPrefix?: string;
}

export default function PreviewPanel({
  variables,
  variablesPrefix = '',
}: PreviewPanelProps) {
  const v = (key: string) => variables[`${variablesPrefix}${key}`] || variables[key] || '';
  const styleVars: React.CSSProperties = {
    ['--primary' as any]: v('--primary'),
    ['--primary-light' as any]: v('--primary-light'),
    ['--primary-dark' as any]: v('--primary-dark'),
    ['--secondary' as any]: v('--secondary'),
    ['--secondary-light' as any]: v('--secondary-light'),
    ['--accent' as any]: v('--accent'),
    ['--background' as any]: v('--background'),
    ['--surface' as any]: v('--surface'),
    ['--surface-hover' as any]: v('--surface-hover'),
    ['--text-primary' as any]: v('--text-primary'),
    ['--text-secondary' as any]: v('--text-secondary'),
    ['--text-muted' as any]: v('--text-muted'),
    ['--border' as any]: v('--border'),
    ['--border-light' as any]: v('--border-light'),
    ['--shadow-0' as any]: v('--shadow-0'),
    ['--shadow-1' as any]: v('--shadow-1'),
    ['--shadow-2' as any]: v('--shadow-2'),
    ['--shadow-3' as any]: v('--shadow-3'),
    ['--shadow-4' as any]: v('--shadow-4'),
    ['--radius-sm' as any]: v('--radius-sm'),
    ['--radius-md' as any]: v('--radius-md'),
    ['--radius-lg' as any]: v('--radius-lg'),
    ['--font-family' as any]: v('--font-family'),
  };

  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--background)',
        minHeight: '100%',
        fontFamily: 'var(--font-family)',
        color: 'var(--text-primary)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...styleVars,
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-1)',
          marginBottom: '24px',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, var(--primary), var(--accent))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#fff',
              fontSize: '14px',
            }}
          >
            D
          </div>
          {['首页', '组件', '文档', '关于'].map((item, idx) => (
            <span
              key={item}
              style={{
                fontSize: '14px',
                color: idx === 0 ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: idx === 0 ? 600 : 400,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                _hover: { background: 'var(--surface-hover)' },
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索组件..."
              style={{
                padding: '8px 12px 8px 36px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                width: '200px',
                transition: 'all 0.2s ease',
              }}
            />
          </div>
          <button
            style={{
              padding: '8px 20px',
              background: `linear-gradient(135deg, var(--primary), var(--accent))`,
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            立即开始
          </button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div
          className="preview-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            boxShadow: 'var(--shadow-2)',
            transition: 'all 0.2s ease-out',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, var(--primary)22, var(--accent)22)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '2px',
                }}
              >
                设计组件库
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                已更新 2 小时前
              </p>
            </div>
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '16px',
            }}
          >
            基于提取的主题色自动生成完整的设计组件系统，包含按钮、卡片、输入框等常用组件。
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[v('--primary'), v('--secondary'), v('--accent')].map((c, i) => (
              <div
                key={i}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: c,
                  border: '1px solid var(--border-light)',
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '16px',
                color: 'var(--text-primary)',
              }}
            >
              按钮样式
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '10px 20px',
                  background: `linear-gradient(135deg, var(--primary), var(--primary-dark))`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-1)',
                  transition: 'all 0.2s ease',
                }}
              >
                主要按钮
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                次要按钮
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                文本按钮
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '16px',
                color: 'var(--text-primary)',
              }}
            >
              输入框
            </h4>
            <div style={{ position: 'relative' }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="email"
                placeholder="请输入邮箱地址"
                defaultValue="design@example.com"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--background)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '24px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-1)',
        }}
      >
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--text-primary)',
          }}
        >
          阴影层级
        </h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {['--shadow-0', '--shadow-1', '--shadow-2', '--shadow-3', '--shadow-4'].map(
            (key, idx) => (
              <div
                key={key}
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: v(key) as string,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                }}
              >
                {idx}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
