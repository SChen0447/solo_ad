import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { RequestItem } from '../../backend/types';
import { createRequest } from '../Api';
import { useAppStore } from '../store';

interface FormItem extends RequestItem {
  id: string;
}

export function RequestFormPage() {
  const [title, setTitle] = useState('');
  const [applicant, setApplicant] = useState('');
  const [items, setItems] = useState<FormItem[]>([
    { id: '1', name: '', quantity: 1, unitPrice: 0 },
  ]);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = isNaN(item.quantity) ? 0 : item.quantity;
      const price = isNaN(item.unitPrice) ? 0 : item.unitPrice;
      return sum + qty * price;
    }, 0);
  }, [items]);

  if (total !== previousTotal && !isAnimating) {
    setIsAnimating(true);
    const startValue = previousTotal;
    const endValue = total;
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      setDisplayTotal(Math.round(currentValue * 100) / 100);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPreviousTotal(endValue);
        setDisplayTotal(endValue);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }

  const addItem = useCallback(() => {
    const newItem: FormItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unitPrice: 0,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const updateItem = useCallback((id: string, field: keyof FormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'name') {
          return { ...item, [field]: value as string };
        }
        const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
        return { ...item, [field]: Math.max(0, numValue) };
      })
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('请填写申购标题', 'error');
      return;
    }
    if (!applicant.trim()) {
      showToast('请填写申请人', 'error');
      return;
    }
    const validItems = items.filter((item) => item.name.trim() && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      showToast('请至少填写一个有效的物品', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        title: title.trim(),
        applicant: applicant.trim(),
        items: validItems.map(({ name, quantity, unitPrice }) => ({
          name,
          quantity,
          unitPrice,
        })),
        total: Math.round(total * 100) / 100,
      };

      await createRequest(requestData);
      showToast('申购单创建成功！', 'success');
      navigate('/');
    } catch (error) {
      console.error('Failed to create request:', error);
      showToast('创建失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s ease-out',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.2s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <h1 style={titleStyle}>新建申购单</h1>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>申购标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：2024年Q1办公文具采购"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>申请人</label>
            <input
              type="text"
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="请输入您的姓名"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={fieldStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={labelStyle}>物品清单</label>
              <button
                type="button"
                onClick={addItem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: '1px solid #3b82f6',
                  color: '#3b82f6',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#3b82f6';
                }}
              >
                <Plus size={16} />
                添加物品
              </button>
            </div>

            <div style={itemHeadersStyle}>
              <span style={{ flex: 2 }}>物品名称</span>
              <span style={{ flex: 1, textAlign: 'center' }}>数量</span>
              <span style={{ flex: 1, textAlign: 'center' }}>单价(¥)</span>
              <span style={{ width: '40px' }}></span>
            </div>

            {items.map((item) => (
              <div key={item.id} style={itemRowStyle}>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  placeholder="例如：A4打印纸"
                  style={{ ...inputStyle, flex: 2 }}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                  style={{ ...inputStyle, flex: 1, textAlign: 'center' }}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice || ''}
                  onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                  style={{ ...inputStyle, flex: 1, textAlign: 'center' }}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease-out',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  disabled={items.length <= 1}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div style={totalStyle}>
            <span style={{ fontSize: '16px', color: '#374151' }}>总金额：</span>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                transition: 'opacity 0.3s ease-out',
                opacity: isAnimating ? 0.8 : 1,
              }}
            >
              ¥{displayTotal.toLocaleString()}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease-out',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            {isSubmitting ? '提交中...' : '提交申购单'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 56px)',
  backgroundColor: '#f3f4f6',
  padding: '32px 24px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  padding: '32px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  border: '1px solid #e5e7eb',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '12px 0 0 0',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
};

const itemHeadersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '8px',
};

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  marginBottom: '12px',
};

const totalStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '10px',
  marginBottom: '8px',
};
