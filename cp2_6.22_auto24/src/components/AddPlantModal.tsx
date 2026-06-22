import React, { useState } from 'react';
import type { Plant } from '@/types';

interface AddPlantModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Plant, 'id'>) => void;
}

const AddPlantModal: React.FC<AddPlantModalProps> = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    category: 'leaf' as Plant['category'],
    maturityDays: '',
    wateringFrequency: '',
    fertilizingCycle: '',
    imageUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '请输入植物名称';
    if (!form.maturityDays || Number(form.maturityDays) <= 0) e.maturityDays = '请输入有效的成熟周期（正整数）';
    if (!form.wateringFrequency || Number(form.wateringFrequency) <= 0) e.wateringFrequency = '请输入有效的浇水频率（正整数）';
    if (!form.fertilizingCycle || Number(form.fertilizingCycle) <= 0) e.fertilizingCycle = '请输入有效的施肥周期（正整数）';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (value.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: form.name.trim(),
      category: form.category,
      maturityDays: Number(form.maturityDays),
      wateringFrequency: Number(form.wateringFrequency),
      fertilizingCycle: Number(form.fertilizingCycle),
      imageUrl: form.imageUrl.trim() || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=green%20plant%20in%20pot&image_size=square',
    });
    setForm({ name: '', category: 'leaf', maturityDays: '', wateringFrequency: '', fertilizingCycle: '', imageUrl: '' });
    setErrors({});
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '420px',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#065F46', fontWeight: 700 }}>添加植物</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>植物名称</label>
          <input
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="如：小番茄"
          />
          {errors.name && <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{errors.name}</div>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>品种分类</label>
          <select
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="leaf">叶菜</option>
            <option value="fruit">果实类</option>
            <option value="root">根茎类</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>预计成熟周期（天）</label>
          <input
            type="number"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            value={form.maturityDays}
            onChange={(e) => handleChange('maturityDays', e.target.value)}
            placeholder="如：90"
          />
          {errors.maturityDays && <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{errors.maturityDays}</div>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>浇水频率（天）</label>
          <input
            type="number"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            value={form.wateringFrequency}
            onChange={(e) => handleChange('wateringFrequency', e.target.value)}
            placeholder="如：2"
          />
          {errors.wateringFrequency && <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{errors.wateringFrequency}</div>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>施肥周期（天）</label>
          <input
            type="number"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            value={form.fertilizingCycle}
            onChange={(e) => handleChange('fertilizingCycle', e.target.value)}
            placeholder="如：14"
          />
          {errors.fertilizingCycle && <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{errors.fertilizingCycle}</div>}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>图片URL（可选）</label>
          <input
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            value={form.imageUrl}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            placeholder="留空使用默认图片"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#065F46', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;
