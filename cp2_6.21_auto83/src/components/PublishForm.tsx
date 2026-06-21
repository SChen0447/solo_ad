import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import './PublishForm.css';

const categories = ['吉他', '架子鼓', '钢琴', '小提琴', '萨克斯', '电子琴', '贝斯', '尤克里里'];
const conditions: ('全新' | '9成新' | '8成新')[] = ['全新', '9成新', '8成新'];
const brands = ['Fender', 'Gibson', 'Yamaha', 'Ibanez', 'Taylor', 'Martin', 'Pearl', 'Tama', 'Roland', 'Korg', 'Casio', '其他'];

function PublishForm() {
  const navigate = useNavigate();
  const { showNotification } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Yamaha',
    category: '吉他',
    condition: '9成新' as '全新' | '9成新' | '8成新',
    price: '',
    images: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const images = formData.images
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (images.length === 0) {
      showNotification('info', '请至少添加一张图片');
      return;
    }

    if (!formData.name || !formData.price || !formData.description) {
      showNotification('info', '请填写完整信息');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/instruments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          condition: formData.condition,
          price: Number(formData.price),
          images,
          description: formData.description,
        }),
      });

      if (res.ok) {
        showNotification('info', '乐器发布成功！');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to publish instrument:', error);
      showNotification('info', '发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="publish-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="publish-form-container">
        <h2 className="form-heading">发布闲置乐器</h2>
        <p className="form-subtitle">让你的闲置乐器找到新的主人</p>

        <form className="publish-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">乐器名称 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="field-input"
                placeholder="例如：Yamaha FG830 民谣吉他"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="field-label">品牌 *</label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="field-select"
              >
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label">类别 *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="field-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="field-label">成色 *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="field-select"
              >
                {conditions.map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label">价格 (¥) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="field-input"
                placeholder="请输入价格"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">图片URL *</label>
            <textarea
              name="images"
              value={formData.images}
              onChange={handleChange}
              className="field-textarea"
              placeholder="每行一个图片URL，至少一张图片"
              rows={4}
              required
            />
            <p className="field-hint">每行输入一个图片链接，支持多张图片</p>
          </div>

          <div className="form-field">
            <label className="field-label">商品描述 *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="field-textarea"
              placeholder="详细描述乐器的使用情况、配件等..."
              rows={5}
              required
            />
          </div>

          <button
            type="submit"
            className="publish-submit-btn"
            disabled={submitting}
          >
            {submitting ? '发布中...' : '立即发布'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PublishForm;
