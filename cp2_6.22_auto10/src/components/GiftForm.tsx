import React, { useState, useCallback, memo, useMemo } from 'react';
import type { CreateGiftDto, GiftCategory, FormErrors } from '../types';
import './GiftForm.css';

interface GiftFormProps {
  onSubmit: (dto: CreateGiftDto) => Promise<void>;
}

const categories: { value: GiftCategory; label: string }[] = [
  { value: 'handmade', label: '手工' },
  { value: 'postcard', label: '明信片' },
  { value: 'book', label: '书籍' },
  { value: 'other', label: '其他' },
];

const initialFormData: CreateGiftDto = {
  name: '',
  photoUrl: '',
  value: 0,
  city: '',
  category: 'handmade',
  owner: '',
};

const GiftForm: React.FC<GiftFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<CreateGiftDto>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photoPreviewError, setPhotoPreviewError] = useState(false);

  const isPhotoUrlValid = useMemo(() => {
    if (!formData.photoUrl.trim()) return false;
    try {
      new URL(formData.photoUrl);
      return true;
    } catch {
      return false;
    }
  }, [formData.photoUrl]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入礼物名称';
    }

    if (!formData.photoUrl.trim()) {
      newErrors.photoUrl = '请输入照片URL';
    } else {
      try {
        new URL(formData.photoUrl);
      } catch {
        newErrors.photoUrl = '请输入有效的URL地址';
      }
    }

    if (!formData.value || formData.value <= 0) {
      newErrors.value = '请输入有效的礼物价值';
    }

    if (!formData.city.trim()) {
      newErrors.city = '请输入所在城市';
    }

    if (!formData.owner.trim()) {
      newErrors.owner = '请输入您的昵称';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'value' ? Number(value) : value,
      }));
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
      if (name === 'photoUrl') {
        setPhotoPreviewError(false);
      }
    },
    [errors]
  );

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setPhotoPreviewError(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setFormData(initialFormData);
          setErrors({});
          setPhotoPreviewError(false);
        }, 2000);
      } catch (err) {
        if (err instanceof Error) {
          setErrors({ name: err.message });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onSubmit]
  );

  const handlePhotoLoadError = useCallback(() => {
    setPhotoPreviewError(true);
  }, []);

  return (
    <form className="gift-form" onSubmit={handleSubmit} onReset={handleReset}>
      <h2 className="form-title">登记礼物</h2>

      {showSuccess && (
        <div className="success-banner">
          <span className="success-icon">✓</span>
          <span>礼物登记成功！</span>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="name">礼物名称</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="请输入礼物名称，如：手绘明信片"
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="owner">您的昵称</label>
          <input
            type="text"
            id="owner"
            name="owner"
            value={formData.owner}
            onChange={handleChange}
            className={errors.owner ? 'error' : ''}
            placeholder="请输入您的昵称，如：小明"
          />
          {errors.owner && <span className="error-text">{errors.owner}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="photoUrl">照片URL</label>
        <input
          type="text"
          id="photoUrl"
          name="photoUrl"
          value={formData.photoUrl}
          onChange={handleChange}
          className={errors.photoUrl ? 'error' : ''}
          placeholder="请输入图片链接地址，如：https://example.com/photo.jpg"
        />
        {errors.photoUrl && <span className="error-text">{errors.photoUrl}</span>}

        {isPhotoUrlValid && !errors.photoUrl && (
          <div className="photo-preview-wrapper">
            <div className="photo-preview-title">图片预览</div>
            {photoPreviewError ? (
              <div className="photo-preview-failed">
                <span>⚠️ 图片无法加载，请检查链接是否正确</span>
              </div>
            ) : (
              <img
                src={formData.photoUrl}
                alt="预览"
                className="photo-preview"
                onError={handlePhotoLoadError}
              />
            )}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="value">礼物价值</label>
          <div className="input-with-prefix">
            <span className="input-prefix">¥</span>
            <input
              type="number"
              id="value"
              name="value"
              value={formData.value || ''}
              onChange={handleChange}
              className={errors.value ? 'error' : ''}
              placeholder="请输入礼物价值"
              min="0"
              step="0.01"
            />
          </div>
          {errors.value && <span className="error-text">{errors.value}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="city">所在城市</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={errors.city ? 'error' : ''}
            placeholder="请输入所在城市，如：北京"
          />
          {errors.city && <span className="error-text">{errors.city}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="category">礼物类别</label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-buttons">
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? '提交中...' : '登记礼物'}
        </button>
        <button type="reset" className="reset-btn" disabled={isSubmitting}>
          重置
        </button>
      </div>
    </form>
  );
};

export default memo(GiftForm);
