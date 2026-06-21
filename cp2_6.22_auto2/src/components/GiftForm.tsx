import React, { useState, useCallback } from 'react';
import type { GiftCategory } from '@/types';
import { createGift } from '@/utils/storage';

const CATEGORIES: GiftCategory[] = ['手工', '明信片', '书籍', '其他'];

interface GiftFormProps {
  onGiftAdded: () => void;
}

const GiftForm: React.FC<GiftFormProps> = React.memo(({ onGiftAdded }) => {
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [value, setValue] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<GiftCategory>('手工');
  const [owner, setOwner] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '请输入礼物名称';
    if (!photoUrl.trim()) {
      e.photoUrl = '请输入照片URL';
    } else if (!/^https?:\/\/.+/.test(photoUrl.trim())) {
      e.photoUrl = 'URL格式不正确，需以http://或https://开头';
    }
    if (!value.trim()) e.value = '请输入价值';
    if (!city.trim()) e.city = '请输入所在城市';
    if (!owner.trim()) e.owner = '请输入您的昵称';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, photoUrl, value, city, owner]);

  const handleSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        await createGift({
          name: name.trim(),
          photoUrl: photoUrl.trim(),
          value: Number(value),
          city: city.trim(),
          category,
          owner: owner.trim(),
        });
        setName('');
        setPhotoUrl('');
        setValue('');
        setCity('');
        setCategory('手工');
        setOwner('');
        setErrors({});
        onGiftAdded();
      } catch {
        setErrors({ submit: '提交失败，请重试' });
      } finally {
        setSubmitting(false);
      }
    },
    [name, photoUrl, value, city, category, owner, validate, onGiftAdded]
  );

  return (
    <form className="gift-form" onSubmit={handleSubmit} noValidate>
      <h2 className="gift-form__title">🎁 登记礼物</h2>

      <div className={`gift-form__field ${errors.name ? 'gift-form__field--error' : ''}`}>
        <label>礼物名称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：手绘明信片"
        />
        {errors.name && <span className="gift-form__error">{errors.name}</span>}
      </div>

      <div className={`gift-form__field ${errors.photoUrl ? 'gift-form__field--error' : ''}`}>
        <label>照片URL</label>
        <input
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
        {errors.photoUrl && <span className="gift-form__error">{errors.photoUrl}</span>}
      </div>

      <div className={`gift-form__field ${errors.value ? 'gift-form__field--error' : ''}`}>
        <label>价值（元）</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="50"
        />
        {errors.value && <span className="gift-form__error">{errors.value}</span>}
      </div>

      <div className={`gift-form__field ${errors.city ? 'gift-form__field--error' : ''}`}>
        <label>所在城市</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="北京"
        />
        {errors.city && <span className="gift-form__error">{errors.city}</span>}
      </div>

      <div className="gift-form__field">
        <label>类别</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as GiftCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={`gift-form__field ${errors.owner ? 'gift-form__field--error' : ''}`}>
        <label>您的昵称</label>
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="小木"
        />
        {errors.owner && <span className="gift-form__error">{errors.owner}</span>}
      </div>

      {errors.submit && <div className="gift-form__error gift-form__error--global">{errors.submit}</div>}

      <button type="submit" className="gift-form__submit" disabled={submitting}>
        {submitting ? '提交中...' : '登记礼物'}
      </button>
    </form>
  );
});

GiftForm.displayName = 'GiftForm';

export default GiftForm;
