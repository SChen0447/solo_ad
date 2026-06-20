import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { applicationAPI, petAPI, uploadAPI } from '../api';

interface Application {
  id: number;
  user_id: number;
  pet_id: number;
  introduction: string;
  experience: string;
  status: string;
  created_at: string;
  user_nickname: string;
  pet_name: string;
}

interface PetItem {
  id: number;
  name: string;
  breed: string;
  age: string;
  gender: string;
  personality: string;
  requirements: string;
  photos: string[];
  status: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'applications' | 'pets'>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [pets, setPets] = useState<PetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPet, setShowAddPet] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newPet, setNewPet] = useState({
    name: '', breed: '', age: '', gender: 'Male',
    personality: '', requirements: '',
  });
  const [newPetPhotos, setNewPetPhotos] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    try {
      const user = JSON.parse(stored);
      if (!user.is_admin) { navigate('/'); return; }
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationAPI.getApplications();
      setApplications(res.data.applications);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchPets = async () => {
    try {
      setLoading(true);
      const res = await petAPI.getPets({ per_page: 100, status: undefined });
      setPets(res.data.pets);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'applications') fetchApplications();
    else fetchPets();
  }, [tab]);

  const handleApplicationStatus = async (appId: number, status: string) => {
    try {
      await applicationAPI.updateApplication(appId, { status });
      setToast({
        message: status === 'approved' ? '已通过申请！用户将收到通知。' : '已拒绝申请',
        type: 'success',
      });
      fetchApplications();
    } catch {
      setToast({ message: '操作失败', type: 'error' });
    }
  };

  const handlePetImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) continue;
      try {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => { img.onload = () => resolve(); });
        const maxWidth = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        if (blob) {
          const compressed = new File([blob], file.name, { type: 'image/jpeg' });
          const res = await uploadAPI.uploadFile(compressed);
          setNewPetPhotos((prev) => [...prev, res.data.url]);
        }
      } catch {}
    }
  };

  const handleAddPet = async () => {
    if (!newPet.name || !newPet.breed || !newPet.age) {
      setToast({ message: '请填写必要信息', type: 'error' });
      return;
    }
    try {
      await petAPI.createPet({ ...newPet, photos: newPetPhotos });
      setToast({ message: '宠物信息已添加', type: 'success' });
      setShowAddPet(false);
      setNewPet({ name: '', breed: '', age: '', gender: 'Male', personality: '', requirements: '' });
      setNewPetPhotos([]);
      fetchPets();
    } catch {
      setToast({ message: '添加失败', type: 'error' });
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已通过';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      default: return '#999';
    }
  };

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: '960px' }}>
        <h1 className="section-title">管理后台</h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`btn ${tab === 'applications' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setTab('applications')}
          >
            领养申请
          </button>
          <button
            className={`btn ${tab === 'pets' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setTab('pets')}
          >
            宠物管理
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner" />
        ) : tab === 'applications' ? (
          <div>
            {applications.length === 0 ? (
              <div className="empty-state"><p>暂无领养申请</p></div>
            ) : (
              applications.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: app.status === 'pending' ? '#fff3e0' : 'var(--bg-white)',
                    borderRadius: '12px', padding: '20px',
                    marginBottom: '12px', boxShadow: '0 2px 8px #e0e0e0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{app.user_nickname}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>申请领养</span>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--primary)' }}>{app.pet_name}</span>
                        <span
                          style={{
                            fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                            background: statusColor(app.status) + '20',
                            color: statusColor(app.status), fontWeight: 500,
                          }}
                        >
                          {statusLabel(app.status)}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '4px' }}>
                        <strong>个人介绍：</strong>{app.introduction}
                      </p>
                      {app.experience && (
                        <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                          <strong>养宠经验：</strong>{app.experience}
                        </p>
                      )}
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        提交时间：{new Date(app.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApplicationStatus(app.id, 'approved')}
                        >
                          通过
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: '#f44336', color: '#f44336' }}
                          onClick={() => handleApplicationStatus(app.id, 'rejected')}
                        >
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddPet(true)}
              style={{ marginBottom: '20px' }}
            >
              + 添加宠物
            </button>

            <AnimatePresence>
              {showAddPet && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'var(--bg-white)', borderRadius: '12px',
                    padding: '24px', marginBottom: '20px',
                    boxShadow: '0 2px 8px #e0e0e0', overflow: 'hidden',
                  }}
                >
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>添加新宠物</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>名称 *</label>
                      <input value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>品种 *</label>
                      <input value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>年龄 *</label>
                      <input value={newPet.age} onChange={(e) => setNewPet({ ...newPet, age: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>性别</label>
                      <select value={newPet.gender} onChange={(e) => setNewPet({ ...newPet, gender: e.target.value })}>
                        <option value="Male">公</option>
                        <option value="Female">母</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>性格描述</label>
                    <textarea value={newPet.personality} onChange={(e) => setNewPet({ ...newPet, personality: e.target.value })} rows={3} />
                  </div>
                  <div className="form-group">
                    <label>领养要求</label>
                    <textarea value={newPet.requirements} onChange={(e) => setNewPet({ ...newPet, requirements: e.target.value })} rows={3} />
                  </div>
                  <div className="form-group">
                    <label>照片</label>
                    <input type="file" accept="image/*" multiple onChange={handlePetImageUpload} />
                    {newPetPhotos.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {newPetPhotos.map((p, idx) => (
                          <img key={idx} src={p} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowAddPet(false)}>取消</button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddPet}>添加</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pet-grid">
              {pets.map((pet) => (
                <div key={pet.id} style={{
                  background: 'var(--bg-white)', borderRadius: '12px',
                  padding: '16px', boxShadow: '0 2px 8px #e0e0e0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '8px',
                      overflow: 'hidden', flexShrink: 0, background: 'var(--placeholder)',
                    }}>
                      {pet.photos[0] && <img src={pet.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>{pet.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{pet.breed} · {pet.age}</p>
                    </div>
                    <span style={{
                      fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                      background: pet.status === 'available' ? '#e8f5e9' : '#fff3e0',
                      color: pet.status === 'available' ? '#2e7d32' : '#e65100',
                    }}>
                      {pet.status === 'available' ? '可领养' : '已领养'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`} onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
