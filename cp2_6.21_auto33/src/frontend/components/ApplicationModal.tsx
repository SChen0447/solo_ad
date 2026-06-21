import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Pet, HousingType } from '../types';

interface ApplicationModalProps {
  pet: Pet;
  onClose: () => void;
}

export default function ApplicationModal({ pet, onClose }: ApplicationModalProps) {
  const { submitApplication } = useApp();
  const [formData, setFormData] = useState({
    applicantName: '',
    contact: '',
    housingType: '公寓' as HousingType,
    hasOtherPets: false,
    dailyCompanionHours: 2,
    livingEnvImages: ['']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validImages = formData.livingEnvImages.filter(url => url.trim());
    if (validImages.length === 0) {
      alert('请至少上传一张居住环境图片');
      return;
    }
    await submitApplication({
      petId: pet.id,
      ...formData,
      livingEnvImages: validImages
    });
    onClose();
  };

  const addImageField = () => {
    if (formData.livingEnvImages.length < 2) {
      setFormData(prev => ({
        ...prev,
        livingEnvImages: [...prev.livingEnvImages, '']
      }));
    }
  };

  const updateImage = (index: number, value: string) => {
    setFormData(prev => {
      const newImages = [...prev.livingEnvImages];
      newImages[index] = value;
      return { ...prev, livingEnvImages: newImages };
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 className="modal-title">申请领养 {pet.name}</h2>
        <form onSubmit={handleSubmit} className="application-form">
          <div className="form-group">
            <label>申请人姓名</label>
            <input
              type="text"
              value={formData.applicantName}
              onChange={(e) => setFormData(prev => ({ ...prev, applicantName: e.target.value }))}
              required
              placeholder="请输入您的姓名"
            />
          </div>
          <div className="form-group">
            <label>联系方式</label>
            <input
              type="tel"
              value={formData.contact}
              onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
              required
              placeholder="请输入您的手机号"
            />
          </div>
          <div className="form-group">
            <label>居住类型</label>
            <select
              value={formData.housingType}
              onChange={(e) => setFormData(prev => ({ ...prev, housingType: e.target.value as HousingType }))}
            >
              <option value="公寓">公寓</option>
              <option value="独栋">独栋</option>
              <option value="合租">合租</option>
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.hasOtherPets}
                onChange={(e) => setFormData(prev => ({ ...prev, hasOtherPets: e.target.checked }))}
              />
              是否有其他宠物
            </label>
          </div>
          <div className="form-group">
            <label>每日可陪伴时间（小时）</label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={formData.dailyCompanionHours}
              onChange={(e) => setFormData(prev => ({ ...prev, dailyCompanionHours: parseFloat(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label>居住环境图片URL（1-2张）</label>
            {formData.livingEnvImages.map((url, idx) => (
              <input
                key={idx}
                type="url"
                value={url}
                onChange={(e) => updateImage(idx, e.target.value)}
                placeholder={`图片${idx + 1} URL`}
              />
            ))}
            {formData.livingEnvImages.length < 2 && (
              <button type="button" className="add-image-btn" onClick={addImageField}>
                + 添加第二张图片
              </button>
            )}
          </div>
          <button type="submit" className="submit-btn">
            提交申请
          </button>
        </form>
      </div>
    </div>
  );
}
