import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { PersonalityTag } from '../types';

interface AddPetModalProps {
  onClose: () => void;
}

const AVAILABLE_TAGS: PersonalityTag[] = ['亲人', '活泼', '胆小', '安静', '独立', '爱玩'];

export default function AddPetModal({ onClose }: AddPetModalProps) {
  const { addPet } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: 1,
    health: '',
    personality: [] as PersonalityTag[],
    mainImage: '',
    images: ['', '', ''],
    description: '',
    adoptable: true
  });

  const toggleTag = (tag: PersonalityTag) => {
    setFormData(prev => {
      if (prev.personality.includes(tag)) {
        return {
          ...prev,
          personality: prev.personality.filter(t => t !== tag)
        };
      }
      if (prev.personality.length >= 3) {
        return prev;
      }
      return {
        ...prev,
        personality: [...prev.personality, tag]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.personality.length === 0) {
      alert('请至少选择一个性格标签');
      return;
    }
    const validImages = formData.images.filter(url => url.trim());
    await addPet({
      ...formData,
      mainImage: formData.mainImage || validImages[0] || '',
      images: validImages
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 className="modal-title">添加宠物档案</h2>
        <form onSubmit={handleSubmit} className="application-form">
          <div className="form-group">
            <label>宠物名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="请输入宠物名称"
            />
          </div>
          <div className="form-group">
            <label>品种</label>
            <input
              type="text"
              value={formData.breed}
              onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
              required
              placeholder="如：橘猫、金毛犬"
            />
          </div>
          <div className="form-group">
            <label>年龄（岁）</label>
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: parseFloat(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label>健康状况</label>
            <input
              type="text"
              value={formData.health}
              onChange={(e) => setFormData(prev => ({ ...prev, health: e.target.value }))}
              placeholder="如：已绝育、已驱虫、疫苗齐全"
            />
          </div>
          <div className="form-group">
            <label>性格标签（最多3个）</label>
            <div className="tags-selector">
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-select-btn ${formData.personality.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                  disabled={!formData.personality.includes(tag) && formData.personality.length >= 3}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="hint-text">已选 {formData.personality.length}/3</p>
          </div>
          <div className="form-group">
            <label>主图URL</label>
            <input
              type="url"
              value={formData.mainImage}
              onChange={(e) => setFormData(prev => ({ ...prev, mainImage: e.target.value }))}
              placeholder="请输入主图URL"
            />
          </div>
          <div className="form-group">
            <label>副图URL（最多3张）</label>
            {formData.images.map((url, idx) => (
              <input
                key={idx}
                type="url"
                value={url}
                onChange={(e) => {
                  const newImages = [...formData.images];
                  newImages[idx] = e.target.value;
                  setFormData(prev => ({ ...prev, images: newImages }));
                }}
                placeholder={`副图${idx + 1} URL`}
              />
            ))}
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请输入宠物描述..."
              rows={3}
            />
          </div>
          <button type="submit" className="submit-btn">
            添加宠物
          </button>
        </form>
      </div>
    </div>
  );
}
