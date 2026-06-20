import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { certService } from '../services/api';
import type { Certification, CertStatus } from '../types';

interface CertPageProps {
  isMobile: boolean;
}

type TabType = 'apply' | 'review';

interface FormData {
  company_name: string;
  registration_number: string;
  contact_person: string;
  phone: string;
  origin_description: string;
  qualification_files: File[];
}

interface FormErrors {
  company_name?: string;
  registration_number?: string;
  contact_person?: string;
  phone?: string;
  origin_description?: string;
  qualification_files?: string;
}

const CertPage: React.FC<CertPageProps> = ({ isMobile }) => {
  const [activeTab, setActiveTab] = useState<TabType>('apply');
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    registration_number: '',
    contact_person: '',
    phone: '',
    origin_description: '',
    qualification_files: [],
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    certId: number | null;
    action: 'approve' | 'reject' | null;
    rejectReason: string;
  }>({
    open: false,
    certId: null,
    action: null,
    rejectReason: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2000);
  };

  const loadCerts = async () => {
    setLoading(true);
    try {
      const response = await certService.list();
      if (response.success && response.data) {
        setCerts(response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'review') {
      loadCerts();
    }
  }, [activeTab]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.company_name.trim()) {
      errors.company_name = '请输入公司名称';
    } else if (formData.company_name.length > 100) {
      errors.company_name = '公司名称不能超过100个字符';
    }

    if (!formData.registration_number.trim()) {
      errors.registration_number = '请输入注册号';
    } else if (!/^[A-Za-z0-9]{10,20}$/.test(formData.registration_number)) {
      errors.registration_number = '注册号格式不正确（10-20位字母或数字）';
    }

    if (!formData.contact_person.trim()) {
      errors.contact_person = '请输入联系人姓名';
    } else if (formData.contact_person.length > 20) {
      errors.contact_person = '联系人姓名不能超过20个字符';
    }

    if (!formData.phone.trim()) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入正确的11位手机号';
    }

    if (!formData.origin_description.trim()) {
      errors.origin_description = '请输入产地描述';
    } else if (formData.origin_description.length > 500) {
      errors.origin_description = '产地描述不能超过500字';
    }

    if (formData.qualification_files.length === 0) {
      errors.qualification_files = '请至少上传一个资质文件';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', '请检查表单填写内容');
      return;
    }

    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('company_name', formData.company_name);
      formDataObj.append('registration_number', formData.registration_number);
      formDataObj.append('contact_person', formData.contact_person);
      formDataObj.append('phone', formData.phone);
      formDataObj.append('origin_description', formData.origin_description);
      formData.qualification_files.forEach((file) => {
        formDataObj.append('qualification_files', file);
      });

      const response = await certService.apply(formDataObj);
      if (response.success) {
        showToast('success', response.message || '提交成功');
        setFormData({
          company_name: '',
          registration_number: '',
          contact_person: '',
          phone: '',
          origin_description: '',
          qualification_files: [],
        });
        setFormErrors({});
        setTimeout(() => setActiveTab('review'), 800);
      } else {
        showToast('error', response.message || '提交失败');
      }
    } catch (e: any) {
      showToast('error', '网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const newFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        showToast('error', `${file.name} 超过5MB限制`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        showToast('error', `${file.name} 格式不支持（仅支持PDF/JPG/PNG）`);
        continue;
      }
      if (formData.qualification_files.length + newFiles.length >= 5) {
        showToast('error', '最多上传5个文件');
        break;
      }
      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setFormData((prev) => ({
        ...prev,
        qualification_files: [...prev.qualification_files, ...newFiles],
      }));
      if (formErrors.qualification_files) {
        setFormErrors((prev) => ({ ...prev, qualification_files: undefined }));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      qualification_files: prev.qualification_files.filter((_, i) => i !== index),
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const openConfirm = (certId: number, action: 'approve' | 'reject') => {
    setConfirmModal({
      open: true,
      certId,
      action,
      rejectReason: '',
    });
  };

  const handleConfirm = async () => {
    if (!confirmModal.certId || !confirmModal.action) return;

    try {
      const response = await certService.approve(
        confirmModal.certId,
        confirmModal.action,
        '系统管理员',
        confirmModal.action === 'reject' ? confirmModal.rejectReason : undefined
      );

      if (response.success && response.data) {
        setCerts((prev) =>
          prev.map((c) => (c.id === response.data!.id ? response.data! : c))
        );
        showToast(
          'success',
          confirmModal.action === 'approve' ? '审核通过成功' : '审核拒绝成功'
        );
      } else {
        showToast('error', response.message || '操作失败');
      }
    } catch (e: any) {
      showToast('error', '网络错误，请稍后重试');
    } finally {
      setConfirmModal({ open: false, certId: null, action: null, rejectReason: '' });
    }
  };

  const getStatusBadge = (status: CertStatus) => {
    const configs: Record<CertStatus, { bg: string; color: string; label: string; dot: string }> = {
      pending: {
        bg: 'rgba(253, 203, 110, 0.15)',
        color: '#fdcb6e',
        label: '待审核',
        dot: '#fdcb6e',
      },
      approved: {
        bg: 'rgba(0, 184, 148, 0.12)',
        color: '#00b894',
        label: '已通过',
        dot: '#00b894',
      },
      rejected: {
        bg: 'rgba(214, 48, 49, 0.12)',
        color: '#d63031',
        label: '已拒绝',
        dot: '#d63031',
      },
    };
    const cfg = configs[status];
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: cfg.bg,
          color: cfg.color,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: cfg.dot,
          }}
        />
        {cfg.label}
      </span>
    );
  };

  const tabs = [
    { key: 'apply', label: '提交认证申请', icon: '📝' },
    { key: 'review', label: '审核管理', icon: '✅' },
  ] as const;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: isMobile ? 16 : 24,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: 24,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: isMobile ? 16 : 20,
        }}>
          <div style={{
            width: 4,
            height: 24,
            borderRadius: 2,
            background: 'linear-gradient(180deg, #6c5ce7 0%, #a29bfe 100%)',
          }} />
          <h1 style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 700,
            color: '#2d3436',
            margin: 0,
          }}>
            产地认证管理
          </h1>
        </div>

        <div style={{
          display: 'flex',
          backgroundColor: '#f8f9fa',
          borderRadius: 12,
          padding: 4,
          gap: 4,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: isMobile ? '10px 8px' : '12px 16px',
                borderRadius: 10,
                fontSize: isMobile ? 13 : 14,
                fontWeight: 600,
                backgroundColor: activeTab === tab.key ? '#ffffff' : 'transparent',
                color: activeTab === tab.key ? '#6c5ce7' : '#636e72',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'apply' && (
          <motion.div
            key="apply"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: isMobile ? 20 : 32,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: isMobile ? 20 : 28,
                paddingBottom: isMobile ? 16 : 20,
                borderBottom: '1px solid #f1f2f6',
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h2 style={{
                    fontSize: isMobile ? 17 : 19,
                    fontWeight: 700,
                    color: '#2d3436',
                    margin: 0,
                    marginBottom: 2,
                  }}>
                    填写认证申请
                  </h2>
                  <p style={{
                    fontSize: 12,
                    color: '#636e72',
                    margin: 0,
                  }}>
                    请如实填写以下信息，审核通过后将获得产地认证数字证书
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? 8 : 16,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <label style={{
                    width: isMobile ? '100%' : '12rem',
                    paddingTop: 12,
                    textAlign: isMobile ? 'left' : 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3436',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#d63031', marginRight: 4 }}>*</span>
                    公司名称
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, company_name: e.target.value }));
                        if (formErrors.company_name) {
                          setFormErrors((prev) => ({ ...prev, company_name: undefined }));
                        }
                      }}
                      placeholder="请输入公司全称"
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 14px',
                        fontSize: 14,
                        border: formErrors.company_name
                          ? '1.5px solid #d63031'
                          : '1.5px solid #e0e0e0',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        color: '#2d3436',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        if (!formErrors.company_name) {
                          e.currentTarget.style.borderColor = '#6c5ce7';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = formErrors.company_name
                          ? '#d63031'
                          : '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {formErrors.company_name && (
                      <p style={errorTextStyle}>{formErrors.company_name}</p>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? 8 : 16,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <label style={{
                    width: isMobile ? '100%' : '12rem',
                    paddingTop: 12,
                    textAlign: isMobile ? 'left' : 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3436',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#d63031', marginRight: 4 }}>*</span>
                    注册号
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          registration_number: e.target.value.toUpperCase(),
                        }));
                        if (formErrors.registration_number) {
                          setFormErrors((prev) => ({ ...prev, registration_number: undefined }));
                        }
                      }}
                      placeholder="请输入营业执照注册号（10-20位）"
                      maxLength={20}
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 14px',
                        fontSize: 14,
                        letterSpacing: 0.5,
                        border: formErrors.registration_number
                          ? '1.5px solid #d63031'
                          : '1.5px solid #e0e0e0',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        color: '#2d3436',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        if (!formErrors.registration_number) {
                          e.currentTarget.style.borderColor = '#6c5ce7';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = formErrors.registration_number
                          ? '#d63031'
                          : '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {formErrors.registration_number && (
                      <p style={errorTextStyle}>{formErrors.registration_number}</p>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? 8 : 16,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <label style={{
                    width: isMobile ? '100%' : '12rem',
                    paddingTop: 12,
                    textAlign: isMobile ? 'left' : 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3436',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#d63031', marginRight: 4 }}>*</span>
                    联系人
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, contact_person: e.target.value }));
                        if (formErrors.contact_person) {
                          setFormErrors((prev) => ({ ...prev, contact_person: undefined }));
                        }
                      }}
                      placeholder="请输入联系人姓名"
                      maxLength={20}
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 14px',
                        fontSize: 14,
                        border: formErrors.contact_person
                          ? '1.5px solid #d63031'
                          : '1.5px solid #e0e0e0',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        color: '#2d3436',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        if (!formErrors.contact_person) {
                          e.currentTarget.style.borderColor = '#6c5ce7';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = formErrors.contact_person
                          ? '#d63031'
                          : '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {formErrors.contact_person && (
                      <p style={errorTextStyle}>{formErrors.contact_person}</p>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? 8 : 16,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <label style={{
                    width: isMobile ? '100%' : '12rem',
                    paddingTop: 12,
                    textAlign: isMobile ? 'left' : 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3436',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#d63031', marginRight: 4 }}>*</span>
                    联系电话
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData((prev) => ({ ...prev, phone: val }));
                        if (formErrors.phone) {
                          setFormErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      placeholder="请输入11位手机号码"
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 14px',
                        fontSize: 14,
                        border: formErrors.phone ? '1.5px solid #d63031' : '1.5px solid #e0e0e0',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        color: '#2d3436',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        if (!formErrors.phone) {
                          e.currentTarget.style.borderColor = '#6c5ce7';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = formErrors.phone
                          ? '#d63031'
                          : '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {formErrors.phone && <p style={errorTextStyle}>{formErrors.phone}</p>}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? 8 : 16,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <label style={{
                    width: isMobile ? '100%' : '12rem',
                    paddingTop: 12,
                    textAlign: isMobile ? 'left' : 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3436',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#d63031', marginRight: 4 }}>*</span>
                    产地描述
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <textarea
                      value={formData.origin_description}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 500);
                        setFormData((prev) => ({ ...prev, origin_description: val }));
                        if (formErrors.origin_description) {
                          setFormErrors((prev) => ({ ...prev, origin_description: undefined }));
                        }
                      }}
                      placeholder="请详细描述产地的位置、环境、规模、特色优势等（最多500字）"
                      rows={5}
                      style={{
                        width: '100%',
                        padding: 12,
                        fontSize: 14,
                        border: formErrors.origin_description
                          ? '1.5px solid #d63031'
                          : '1.5px solid #e0e0e0',
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        color: '#2d3436',
                        transition: 'all 0.2s ease',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: 1.6,
                      }}
                      onFocus={(e) => {
                        if (!formErrors.origin_description) {
                          e.currentTarget.style.borderColor = '#6c5ce7';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = formErrors.origin_description
                          ? '#d63031'
                          : '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      padding: '0 2px',
                    }}>
                      {formErrors.origin_description ? (
                        <p style={errorTextStyle}>{formErrors.origin_description}</p>
                      ) : (
                        <span />
                      )}
                      <span style={{
                        fontSize: 12,
                        color: formData.origin_description.length >= 480 ? '#d63031' : '#b2bec3',
                      }}>
                        {formData.origin_description.length}/500
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? 8 : 16,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <label style={{
                    width: isMobile ? '100%' : '12rem',
                    paddingTop: 12,
                    textAlign: isMobile ? 'left' : 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3436',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: '#d63031', marginRight: 4 }}>*</span>
                    资质文件
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: formErrors.qualification_files
                          ? '1.5px dashed #d63031'
                          : '1.5px dashed #c7c9cc',
                        borderRadius: 12,
                        padding: isMobile ? 20 : 28,
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#fafbfc',
                        transition: 'all 0.2s ease',
                        marginBottom: 12,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#6c5ce7';
                        e.currentTarget.style.backgroundColor = 'rgba(108, 92, 231, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = formErrors.qualification_files
                          ? '#d63031'
                          : '#c7c9cc';
                        e.currentTarget.style.backgroundColor = '#fafbfc';
                      }}
                    >
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: 'rgba(108, 92, 231, 0.1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6c5ce7',
                        marginBottom: 10,
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#2d3436',
                        marginBottom: 4,
                      }}>
                        点击上传或拖拽文件到此处
                      </p>
                      <p style={{
                        fontSize: 12,
                        color: '#b2bec3',
                        margin: 0,
                      }}>
                        支持 PDF/JPG/PNG，单个文件不超过5MB，最多5个
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />

                    {formData.qualification_files.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        {formData.qualification_files.map((file, idx) => (
                          <motion.div
                            key={idx}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 12px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: 10,
                              border: '1px solid #f1f2f6',
                            }}
                          >
                            <div style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              backgroundColor:
                                file.type === 'application/pdf'
                                  ? 'rgba(214, 48, 49, 0.1)'
                                  : 'rgba(0, 184, 148, 0.1)',
                              color:
                                file.type === 'application/pdf' ? '#d63031' : '#00b894',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M14 2v6h6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#2d3436',
                                margin: 0,
                                marginBottom: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {file.name}
                              </p>
                              <p style={{
                                fontSize: 11,
                                color: '#b2bec3',
                                margin: 0,
                              }}>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                backgroundColor: '#ffffff',
                                border: '1px solid #e0e0e0',
                                color: '#636e72',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(214, 48, 49, 0.1)';
                                e.currentTarget.style.borderColor = '#d63031';
                                e.currentTarget.style.color = '#d63031';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                                e.currentTarget.style.color = '#636e72';
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M18 6L6 18M6 6l12 12"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                    {formErrors.qualification_files && (
                      <p style={errorTextStyle}>{formErrors.qualification_files}</p>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: isMobile ? 'stretch' : 'center',
                  paddingTop: isMobile ? 8 : 16,
                  borderTop: '1px solid #f1f2f6',
                  gap: 12,
                  flexDirection: isMobile ? 'column' : 'row',
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        company_name: '',
                        registration_number: '',
                        contact_person: '',
                        phone: '',
                        origin_description: '',
                        qualification_files: [],
                      });
                      setFormErrors({});
                    }}
                    style={{
                      height: 48,
                      padding: '0 28px',
                      borderRadius: 12,
                      backgroundColor: '#f8f9fa',
                      color: '#636e72',
                      fontSize: 15,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      border: '1.5px solid #e0e0e0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                  >
                    重置表单
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      height: 48,
                      padding: '0 32px',
                      borderRadius: 12,
                      backgroundImage: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                      color: '#ffffff',
                      fontSize: 15,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                      opacity: submitting ? 0.7 : 1,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                      flex: isMobile ? 1 : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting) e.currentTarget.style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'none';
                    }}
                  >
                    {submitting ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M22 12a10 10 0 00-10-10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12l5 5L20 7"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {submitting ? '提交中...' : '提交申请'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: isMobile ? 16 : 24,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isMobile ? 16 : 20,
                paddingBottom: isMobile ? 16 : 20,
                borderBottom: '1px solid #f1f2f6',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 12 : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #00b894 0%, #55efc4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: isMobile ? 17 : 19,
                      fontWeight: 700,
                      color: '#2d3436',
                      margin: 0,
                      marginBottom: 2,
                    }}>
                      认证申请审核
                    </h2>
                    <p style={{ fontSize: 12, color: '#636e72', margin: 0 }}>
                      共 {certs.length} 条申请记录
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadCerts}
                  disabled={loading}
                  style={{
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 10,
                    backgroundColor: '#f8f9fa',
                    color: '#636e72',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                    border: '1.5px solid #e0e0e0',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
                  >
                    <path
                      d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  刷新
                </button>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <div style={{ marginBottom: 16 }}>
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto',
                        color: '#6c5ce7',
                      }}
                    >
                      <circle cx="12" cy="12" r="10" stroke="rgba(108,92,231,0.2)" strokeWidth="3" />
                      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 14, color: '#636e72', margin: 0 }}>加载中...</p>
                </div>
              ) : certs.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <div style={{ marginBottom: 16 }}>
                    <svg
                      width={isMobile ? 60 : 80}
                      height={isMobile ? 60 : 80}
                      viewBox="0 0 100 100"
                      fill="none"
                      style={{ margin: '0 auto', color: '#dfe6e9' }}
                    >
                      <rect x="20" y="15" width="60" height="70" rx="6" stroke="currentColor" strokeWidth="3" />
                      <path d="M30 35h40M30 48h40M30 61h28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 14, color: '#636e72', margin: 0 }}>暂无认证申请记录</p>
                </div>
              ) : isMobile ? (
                <Reorder.Group
                  axis="y"
                  values={certs}
                  onReorder={setCerts}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {certs.map((cert) => (
                    <Reorder.Item
                      key={cert.id}
                      value={cert}
                      layout
                      transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
                    >
                      <motion.div
                        layout
                        style={{
                          backgroundColor: '#fafbfc',
                          borderRadius: 12,
                          padding: 16,
                          border: '1px solid #f1f2f6',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 12,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: '#2d3436',
                              margin: 0,
                              marginBottom: 4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {cert.company_name}
                            </h3>
                            <p style={{ fontSize: 12, color: '#636e72', margin: 0 }}>
                              注册号：{cert.registration_number}
                            </p>
                          </div>
                          {getStatusBadge(cert.status)}
                        </div>

                        <div style={{
                          fontSize: 12,
                          color: '#636e72',
                          lineHeight: 1.8,
                          padding: '8px 10px',
                          backgroundColor: '#ffffff',
                          borderRadius: 8,
                          marginBottom: 12,
                        }}>
                          <div>联系人：{cert.contact_person} · {cert.phone}</div>
                          <div>提交时间：{cert.submitted_at}</div>
                          {cert.reviewed_at && <div>审核时间：{cert.reviewed_at}</div>}
                          {cert.reviewer && <div>审核人：{cert.reviewer}</div>}
                          {cert.certificate_number && (
                            <div style={{ color: '#00b894', fontWeight: 600 }}>
                              证书编号：{cert.certificate_number}
                            </div>
                          )}
                          {cert.reject_reason && (
                            <div style={{ color: '#d63031' }}>拒绝原因：{cert.reject_reason}</div>
                          )}
                        </div>

                        {cert.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              onClick={() => openConfirm(cert.id, 'approve')}
                              style={{
                                flex: 1,
                                height: 38,
                                borderRadius: 9,
                                backgroundColor: '#00b894',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.filter = 'brightness(1.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.filter = 'none';
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M5 12l5 5L20 7"
                                  stroke="#ffffff"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              通过
                            </button>
                            <button
                              onClick={() => openConfirm(cert.id, 'reject')}
                              style={{
                                flex: 1,
                                height: 38,
                                borderRadius: 9,
                                backgroundColor: '#d63031',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',