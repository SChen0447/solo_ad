import React, { useState, useEffect } from 'react';
import { FormField, formApi } from './api';
import { useParams, useNavigate } from 'react-router-dom';

interface FormRendererProps {
  fields?: FormField[];
  title?: string;
  preview?: boolean;
  formId?: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f7ff 0%, #fff8f0 100%)',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  formCard: {
    maxWidth: 600,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(74, 144, 217, 0.12)',
    padding: 40
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 32
  },
  field: {
    marginBottom: 24
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#34495e',
    marginBottom: 8
  },
  required: {
    color: '#e74c3c',
    marginLeft: 4
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid #ecf0f1',
    borderRadius: 10,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  inputFocus: {
    borderColor: '#4A90D9',
    boxShadow: '0 0 0 3px rgba(74, 144, 217, 0.1)'
  },
  optionGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: '2px solid #ecf0f1',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 14,
    color: '#34495e'
  },
  radioOptionActive: {
    borderColor: '#4A90D9',
    background: '#ebf4ff'
  },
  checkboxOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: '2px solid #ecf0f1',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 14,
    color: '#34495e'
  },
  checkboxOptionActive: {
    borderColor: '#F5A623',
    background: '#fff7eb'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid #ecf0f1',
    borderRadius: 10,
    outline: 'none',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  starRating: {
    display: 'flex',
    gap: 8
  },
  star: {
    fontSize: 32,
    cursor: 'pointer',
    transition: 'transform 0.15s',
    color: '#ecf0f1',
    userSelect: 'none'
  },
  starActive: {
    color: '#F5A623'
  },
  fileInput: {
    width: '100%',
    padding: '16px',
    border: '2px dashed #4A90D9',
    borderRadius: 10,
    textAlign: 'center',
    cursor: 'pointer',
    background: '#f0f7ff',
    color: '#4A90D9',
    fontSize: 14
  },
  submitBtn: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357abd 100%)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.2s',
    marginTop: 8
  },
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.98)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  checkMark: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    boxShadow: '0 8px 24px rgba(46, 204, 113, 0.3)'
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: 8
  },
  successSub: {
    fontSize: 14,
    color: '#7f8c8d'
  }
};

const FormRenderer: React.FC<FormRendererProps> = ({ fields: propFields, title: propTitle, preview = false, formId }) => {
  const { id: urlFormId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const actualFormId = formId || urlFormId;

  const [fields, setFields] = useState<FormField[]>(propFields || []);
  const [title, setTitle] = useState(propTitle || '');
  const [values, setValues] = useState<Record<string, any>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propFields && actualFormId && !preview) {
      formApi.getForm(actualFormId).then(form => {
        setFields(form.fields || []);
        setTitle(form.title || '');
      }).catch(console.error);
    }
  }, [propFields, actualFormId, preview]);

  useEffect(() => {
    if (submitted && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (submitted && countdown === 0 && !preview) {
      navigate('/');
    }
  }, [submitted, countdown, navigate, preview]);

  const handleChange = (fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxToggle = (fieldId: string, option: string) => {
    setValues(prev => {
      const current = prev[fieldId] || [];
      if (current.includes(option)) {
        return { ...prev, [fieldId]: current.filter((o: string) => o !== option) };
      }
      return { ...prev, [fieldId]: [...current, option] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) {
      setSubmitted(true);
      return;
    }
    setLoading(true);
    try {
      await formApi.submitForm(actualFormId!, values);
      setSubmitted(true);
    } catch (err) {
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = values[field.id];
    const isFocused = focusedField === field.id;

    const labelStyle = { ...styles.label };
    const requiredMark = field.required ? <span style={styles.required}>*</span> : null;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} style={styles.field}>
            <label style={labelStyle}>{field.label}{requiredMark}</label>
            <input
              type="text"
              value={value || ''}
              onChange={e => handleChange(field.id, e.target.value)}
              onFocus={() => setFocusedField(field.id)}
              onBlur={() => setFocusedField(null)}
              style={{ ...styles.input, ...(isFocused ? styles.inputFocus : {}) }}
              placeholder={`请输入${field.label}`}
            />
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} style={styles.field}>
            <label style={labelStyle}>{field.label}{requiredMark}</label>
            <div style={styles.optionGroup}>
              {(field.options || []).map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => handleChange(field.id, opt)}
                  style={{
                    ...styles.radioOption,
                    ...(value === opt ? styles.radioOptionActive : {})
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid #bdc3c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...(value === opt ? { borderColor: '#4A90D9' } : {})
                  }}>
                    {value === opt && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A90D9' }} />}
                  </div>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} style={styles.field}>
            <label style={labelStyle}>{field.label}{requiredMark}</label>
            <div style={styles.optionGroup}>
              {(field.options || []).map((opt, idx) => {
                const checked = (value || []).includes(opt);
                return (
                  <div
                    key={idx}
                    onClick={() => handleCheckboxToggle(field.id, opt)}
                    style={{
                      ...styles.checkboxOption,
                      ...(checked ? styles.checkboxOptionActive : {})
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: '2px solid #bdc3c7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ...(checked ? { borderColor: '#F5A623', background: '#F5A623' } : {})
                    }}>
                      {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.id} style={styles.field}>
            <label style={labelStyle}>{field.label}{requiredMark}</label>
            <select
              value={value || ''}
              onChange={e => handleChange(field.id, e.target.value)}
              style={{ ...styles.select, ...(isFocused ? styles.inputFocus : {}) }}
              onFocus={() => setFocusedField(field.id)}
              onBlur={() => setFocusedField(null)}
            >
              <option value="">请选择...</option>
              {(field.options || []).map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );

      case 'rating':
        return (
          <div key={field.id} style={styles.field}>
            <label style={labelStyle}>{field.label}{requiredMark}</label>
            <div style={styles.starRating}>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  onClick={() => handleChange(field.id, star)}
                  style={{
                    ...styles.star,
                    ...(star <= (value || 0) ? styles.starActive : {})
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        );

      case 'file':
        return (
          <div key={field.id} style={styles.field}>
            <label style={labelStyle}>{field.label}{requiredMark}</label>
            <label style={styles.fileInput}>
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={e => handleChange(field.id, e.target.files?.[0]?.name || '')}
              />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>📁 点击上传文件</div>
              <div style={{ fontSize: 12, color: '#7f8c8d' }}>{value || '支持所有文件格式'}</div>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.successOverlay}>
          <div style={styles.checkMark}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={styles.successTitle}>提交成功！</div>
          <div style={styles.successSub}>
            {preview ? '这是预览模式' : `${countdown} 秒后返回首页...`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h1 style={styles.title}>{title || '未命名表单'}</h1>
        <p style={styles.subtitle}>请填写以下信息</p>
        <form onSubmit={handleSubmit}>
          {fields.map(renderField)}
          {fields.length > 0 && (
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? '提交中...' : '提交表单'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default FormRenderer;
