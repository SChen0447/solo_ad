import React, { useState } from 'react';
import type { CreatePackageRequest } from '../types';

interface PackageFormProps {
  onSubmit: (data: CreatePackageRequest) => void;
  onCancel: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<CreatePackageRequest>({
    recipientName: '',
    phone: '',
    courierCompany: '',
    remark: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.recipientName.trim()) {
      newErrors.recipientName = '请输入收件人姓名';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = '请输入联系电话';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码';
    }
    if (!formData.courierCompany.trim()) {
      newErrors.courierCompany = '请输入快递公司';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="form-section">
      <h2>包裹登记</h2>
      <form className="package-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="recipientName">收件人姓名 *</label>
          <input
            type="text"
            id="recipientName"
            name="recipientName"
            value={formData.recipientName}
            onChange={handleChange}
            placeholder="请输入收件人姓名"
          />
          {errors.recipientName && <span style={{ color: '#f44336', fontSize: '12px' }}>{errors.recipientName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">联系电话 *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="请输入11位手机号码"
            maxLength={11}
          />
          {errors.phone && <span style={{ color: '#f44336', fontSize: '12px' }}>{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="courierCompany">快递公司 *</label>
          <input
            type="text"
            id="courierCompany"
            name="courierCompany"
            value={formData.courierCompany}
            onChange={handleChange}
            placeholder="请输入快递公司名称"
          />
          {errors.courierCompany && <span style={{ color: '#f44336', fontSize: '12px' }}>{errors.courierCompany}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="remark">包裹备注（可选）</label>
          <textarea
            id="remark"
            name="remark"
            value={formData.remark}
            onChange={handleChange}
            placeholder="请输入包裹备注信息（如：易碎品、大件等）"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }} className="form-submit">
          <button type="submit" className="btn btn-primary">
            提交登记
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

export default PackageForm;
