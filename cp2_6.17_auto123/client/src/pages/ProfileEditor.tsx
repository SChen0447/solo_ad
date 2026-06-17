import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateProfile } from '../services/api';

function ProfileEditor() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    position: user?.position || '',
    company: user?.company || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || '',
    socialLinks: {
      wechat: user?.socialLinks?.wechat || '',
      linkedin: user?.socialLinks?.linkedin || '',
      twitter: user?.socialLinks?.twitter || '',
      github: user?.socialLinks?.github || '',
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('请输入姓名', 'error');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await updateProfile(user!.id, formData);
      updateUser(updatedUser);
      showToast('保存成功');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container profile-editor-page">
      <div className="page-content">
        <div className="profile-header">
          <div className="profile-gradient">
            <div className="avatar-section">
              <div
                className={`avatar-upload ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="头像" className="avatar-preview" />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="fas fa-user"></i>
                    <p>点击或拖放上传头像</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        <div className="profile-form-container">
          <div className="form-card card">
            <h2 className="form-title">基本信息</h2>
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="请输入姓名"
                  />
                </div>
                <div className="form-group">
                  <label>职位</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="请输入职位"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>公司</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="请输入公司名称"
                  />
                </div>
                <div className="form-group">
                  <label>邮箱</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>电话</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="请输入电话号码"
                  />
                </div>
                <div className="form-group">
                  <label>头像URL</label>
                  <input
                    type="url"
                    value={formData.avatarUrl.startsWith('data:') ? '' : formData.avatarUrl}
                    onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
                    placeholder="或输入头像图片URL"
                  />
                </div>
              </div>

              <h3 className="form-subtitle">社交媒体</h3>

              <div className="form-row">
                <div className="form-group">
                  <label><i className="fab fa-weixin"></i> 微信</label>
                  <input
                    type="text"
                    value={formData.socialLinks.wechat}
                    onChange={(e) => handleSocialChange('wechat', e.target.value)}
                    placeholder="微信号"
                  />
                </div>
                <div className="form-group">
                  <label><i className="fab fa-linkedin"></i> LinkedIn</label>
                  <input
                    type="text"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    placeholder="LinkedIn链接"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><i className="fab fa-twitter"></i> Twitter</label>
                  <input
                    type="text"
                    value={formData.socialLinks.twitter}
                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                    placeholder="Twitter用户名"
                  />
                </div>
                <div className="form-group">
                  <label><i className="fab fa-github"></i> GitHub</label>
                  <input
                    type="text"
                    value={formData.socialLinks.github}
                    onChange={(e) => handleSocialChange('github', e.target.value)}
                    placeholder="GitHub用户名"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary btn-submit" disabled={loading}>
                {loading ? '保存中...' : '保存修改'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileEditor;
