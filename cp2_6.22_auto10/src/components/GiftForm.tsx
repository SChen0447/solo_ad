import React, { useState, useCallback, memo } from 'react';
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

const GiftForm: React.FC<GiftFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<CreateGiftDto>({
    name: '',
    photoUrl: '',
    value: 0,
    city: '',
    category: 'handmade',
    owner: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        setFormData({
          name: '',
          photoUrl: '',
          value: 0,
          city: '',
          category: 'handmade',
          owner: '',
        });
        setErrors({});
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

  return (
    <form className="gift-form" onSubmit={handleSubmit}>
      <h2 className="form-title">登记礼物</h2>

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
            placeholder="给你的礼物起个名字"
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
            placeholder="怎么称呼您"
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
          placeholder="https://example.com/photo.jpg"
        />
        {errors.photoUrl && <span className="error-text">{errors.photoUrl}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="value">礼物价值 (元)</label>
          <input
            type="number"
            id="value"
            name="value"
            value={formData.value || ''}
            onChange={handleChange}
            className={errors.value ? 'error' : ''}
            placeholder="0"
            min="0"
            step="0.01"
          />
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
            placeholder="您所在的城市"
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

      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? '提交中...' : '登记礼物'}
      </button>
    </form>
  );
};

export default memo(GiftForm);
