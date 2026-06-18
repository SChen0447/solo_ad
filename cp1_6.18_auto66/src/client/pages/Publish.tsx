import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../modules/product/ProductService';

const categories = [
  { value: 'ebook', label: '电子书', icon: '📚' },
  { value: 'course', label: '课程码', icon: '🎓' },
  { value: 'software', label: '软件激活码', icon: '💻' },
  { value: 'other', label: '其他', icon: '🔮' }
];

export const Publish = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    negotiable: false
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.title.trim()) {
      toast.error('请输入商品标题');
      return false;
    }
    if (!formData.category) {
      toast.error('请选择商品分类');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.description.trim()) {
      toast.error('请输入商品描述');
      return false;
    }
    if (formData.description.length < 10) {
      toast.error('商品描述至少10个字符');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('请输入有效的商品价格');
      return false;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      toast.error('请输入有效的库存数量');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setSubmitting(true);
    try {
      await ProductService.createProduct({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        negotiable: formData.negotiable
      });

      toast.success('商品发布成功！');
      navigate('/my-listings');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>发布商品 - 虚拟商品二手交易平台</title>
      </Helmet>

      <div className="publish-page">
        <div className="publish-container">
          <div className="publish-header">
            <h1>发布商品</h1>
            <div className="step-indicator">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`step-item ${step === s ? 'active' : step > s ? 'completed' : ''}`}>
                  <div className="step-number">{step > s ? '✓' : s}</div>
                  <span className="step-label">
                    {s === 1 ? '基本信息' : s === 2 ? '详细描述' : '库存与价格'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`step-content step-${step}`}>
            {step === 1 && (
              <div className="form-step fade-in">
                <div className="form-group">
                  <label>商品标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="请输入商品标题，简洁明了"
                    maxLength={100}
                  />
                  <div className="char-count">{formData.title.length}/100</div>
                </div>

                <div className="form-group">
                  <label>商品分类</label>
                  <div className="category-grid">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`category-option ${formData.category === cat.value ? 'selected' : ''}`}
                        onClick={() => handleInputChange('category', cat.value)}
                      >
                        <span className="category-icon">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="form-step fade-in">
                <div className="form-group">
                  <label>商品描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="详细描述您的商品，包括内容、有效期、使用方式等信息..."
                    rows={8}
                    maxLength={500}
                  />
                  <div className="char-count">{formData.description.length}/500</div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="form-step fade-in">
                <div className="form-group">
                  <label>售价（元）</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="请输入商品价格"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>库存数量</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                    placeholder="请输入库存数量"
                    min="1"
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.negotiable}
                      onChange={(e) => handleInputChange('negotiable', e.target.checked)}
                    />
                    <span>支持议价</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="step-actions">
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={prevStep}>
                上一步
              </button>
            )}
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                下一步
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '发布中...' : '立即发布'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
