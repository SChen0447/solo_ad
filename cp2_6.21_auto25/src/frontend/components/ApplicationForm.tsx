import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ApplicationForm() {
  const { selectedPet, showApplicationForm, setShowApplicationForm, submitApplication } = useAppContext();
  const [form, setForm] = useState({
    applicantName: '',
    contactInfo: '',
    housingType: 'apartment' as 'apartment' | 'house',
    hasOtherPets: false,
    dailyCompanionHours: 2,
    environmentImage1: '',
    environmentImage2: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!showApplicationForm || !selectedPet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const envImages = [form.environmentImage1, form.environmentImage2].filter(Boolean);
      await submitApplication({
        petId: selectedPet.id,
        applicantName: form.applicantName,
        contactInfo: form.contactInfo,
        housingType: form.housingType,
        hasOtherPets: form.hasOtherPets,
        dailyCompanionHours: form.dailyCompanionHours,
        environmentImages: envImages,
      });
      setShowApplicationForm(false);
      setForm({
        applicantName: '',
        contactInfo: '',
        housingType: 'apartment',
        hasOtherPets: false,
        dailyCompanionHours: 2,
        environmentImage1: '',
        environmentImage2: '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => setShowApplicationForm(false)}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          width: '480px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeInUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes fadeInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: '0 0 4px 0' }}>
          申请领养 {selectedPet.name}
        </h2>
        <p style={{ fontSize: '13px', color: '#999', margin: '0 0 20px 0' }}>
          请认真填写以下信息，管理员将根据您的条件进行匹配审核
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              姓名 *
            </label>
            <input
              required
              value={form.applicantName}
              onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#F58F29')}
              onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              联系方式 *
            </label>
            <input
              required
              value={form.contactInfo}
              onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
              placeholder="手机号码"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#F58F29')}
              onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              居住类型 *
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['apartment', 'house'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, housingType: type })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: form.housingType === type ? '2px solid #F58F29' : '1px solid #E0E0E0',
                    borderRadius: '12px',
                    background: form.housingType === type ? '#FFF8F0' : '#FFFFFF',
                    color: form.housingType === type ? '#F58F29' : '#666',
                    fontSize: '14px',
                    fontWeight: form.housingType === type ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {type === 'apartment' ? '公寓' : '独栋'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#333', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.hasOtherPets}
                onChange={(e) => setForm({ ...form, hasOtherPets: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#F58F29' }}
              />
              家中已有其他宠物
            </label>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              每日陪伴时间：{form.dailyCompanionHours}小时
            </label>
            <input
              type="range"
              min={1}
              max={12}
              value={form.dailyCompanionHours}
              onChange={(e) => setForm({ ...form, dailyCompanionHours: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#F58F29' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
              <span>1小时</span>
              <span>12小时</span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              居住环境图片URL（1-2张）
            </label>
            <input
              value={form.environmentImage1}
              onChange={(e) => setForm({ ...form, environmentImage1: e.target.value })}
              placeholder="图片URL 1"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '8px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#F58F29')}
              onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
            />
            <input
              value={form.environmentImage2}
              onChange={(e) => setForm({ ...form, environmentImage2: e.target.value })}
              placeholder="图片URL 2"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#F58F29')}
              onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setShowApplicationForm(false)}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #E0E0E0',
                borderRadius: '12px',
                background: '#FFFFFF',
                color: '#666',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '12px',
                background: '#F58F29',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.background = '#E07D1A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F58F29')}
            >
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
