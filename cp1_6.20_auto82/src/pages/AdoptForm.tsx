import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { petAPI, applicationAPI } from '../api';

const MAX_INTRO = 300;

export default function AdoptForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<{ name: string; breed: string; photos: string[] } | null>(null);
  const [introduction, setIntroduction] = useState('');
  const [experience, setExperience] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    if (id) {
      petAPI.getPet(Number(id)).then(res => {
        setPet({ name: res.data.name, breed: res.data.breed, photos: res.data.photos });
      }).catch(() => {});
    }
  }, [id, navigate]);

  const introRemaining = MAX_INTRO - introduction.length;
  const canSubmit = introduction.trim().length > 0 && introduction.length <= MAX_INTRO && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !id) return;

    setSubmitting(true);
    try {
      await applicationAPI.submit({
        pet_id: Number(id),
        introduction: introduction.trim(),
        experience: experience.trim(),
      });
      setToast({ message: '领养申请已提交，请耐心等待审核！', type: 'success' });
      setTimeout(() => navigate(`/pet/${id}`), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.error || '提交失败，请重试';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: '640px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', color: 'var(--text-light)', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          ← 返回
        </button>

        {pet && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '32px', padding: '16px', background: 'var(--bg-white)',
            borderRadius: '12px', boxShadow: '0 2px 8px #e0e0e0',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden',
              flexShrink: 0, background: 'var(--placeholder)',
            }}>
              {pet.photos[0] && (
                <img src={pet.photos[0]} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{pet.name}</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>{pet.breed}</p>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>申请领养</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '28px' }}>
            请认真填写以下信息，帮助救助站更好地了解您
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>个人介绍 <span style={{ color: 'var(--heart)' }}>*</span></label>
              <textarea
                value={introduction}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_INTRO) {
                    setIntroduction(e.target.value);
                  }
                }}
                placeholder="请介绍一下您自己，包括居住环境、家庭成员等..."
                rows={5}
              />
              <div className={`char-counter ${introRemaining < 30 ? 'warning' : ''}`}>
                剩余 {introRemaining} 字
              </div>
            </div>

            <div className="form-group">
              <label>养宠经验</label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="请分享您的养宠经历，包括养过什么宠物、时间多久等..."
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600,
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              {submitting ? '提交中...' : '提交领养申请'}
            </button>
          </form>
        </motion.div>
      </div>

      {toast && (
        <div
          className={`toast toast-${toast.type}`}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
