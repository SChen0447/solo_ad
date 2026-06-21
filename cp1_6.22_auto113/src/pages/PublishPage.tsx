import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, RefreshCw, Gift, ShoppingBag } from 'lucide-react';
import StarRating from '../components/StarRating';
import type { ExchangeType } from '../backend/types';

interface PublishPageProps {
  userId: string;
  userName: string;
}

const PublishPage: React.FC<PublishPageProps> = ({ userId, userName }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    condition: 0,
    exchangeType: '' as ExchangeType | '',
    expectCondition: '',
  });
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConditionChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, condition: rating }));
  };

  const handleExchangeTypeChange = (type: ExchangeType) => {
    setFormData((prev) => ({ ...prev, exchangeType: type }));
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 4 - selectedFiles.length);
    const newPreviews: string[] = [];

    newFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === newFiles.length) {
            setPreviewImages((prev) => [...prev, ...newPreviews]);
            setSelectedFiles((prev) => [...prev, ...newFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [selectedFiles.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemoveImage = (index: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.description.trim() !== '' &&
      formData.condition > 0 &&
      formData.exchangeType !== ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('condition', formData.condition.toString());
      formDataToSend.append('exchangeType', formData.exchangeType);
      formDataToSend.append('expectCondition', formData.expectCondition);
      formDataToSend.append('userId', userId);
      formDataToSend.append('userName', userName);

      selectedFiles.forEach((file) => {
        formDataToSend.append('images', file);
      });

      const response = await fetch('/api/items', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        alert('🎉 发布成功！获得50积分奖励！');
        navigate('/');
      } else {
        alert('发布失败，请重试');
      }
    } catch (error) {
      console.error('发布失败:', error);
      alert('发布失败，请检查网络连接');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="page-title">发布漂流瓶</h1>

      <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', padding: '24px' }}>
        <div className="form-group">
          <label className="form-label">物品名称 *</label>
          <input
            type="text"
            name="name"
            className="form-input"
            placeholder="例如：高等数学教材、USB小风扇..."
            value={formData.name}
            onChange={handleInputChange}
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label">物品图片（最多4张）</label>
          <div
            className={`upload-area ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            <div className="upload-area-content">
              <Upload size={40} color="#9ca3af" />
              <div>
                <p style={{ fontWeight: '500' }}>拖拽图片到此处，或点击选择</p>
                <p style={{ fontSize: '12px' }}>支持 JPG、PNG 格式，最多4张图片</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>

          {previewImages.length > 0 && (
            <div className="upload-preview">
              {previewImages.map((src, index) => (
                <div key={index} className="upload-preview-item">
                  <img src={src} alt={`预览 ${index + 1}`} />
                  <button
                    type="button"
                    className="upload-remove-btn"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">物品描述 *</label>
          <textarea
            name="description"
            className="form-textarea"
            placeholder="详细描述物品的使用情况、特点、注意事项等..."
            value={formData.description}
            onChange={handleInputChange}
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label className="form-label">新旧程度 *</label>
          <StarRating
            rating={formData.condition}
            onChange={handleConditionChange}
            size={32}
          />
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            {formData.condition > 0
              ? `${formData.condition} 星 - ${
                  formData.condition === 1
                    ? '较旧'
                    : formData.condition === 2
                    ? '一般'
                    : formData.condition