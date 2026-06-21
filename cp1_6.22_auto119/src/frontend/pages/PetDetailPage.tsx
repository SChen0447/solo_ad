import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WeightChart } from '../components/WeightChart';
import { VaccineModal } from '../components/VaccineModal';
import { petService } from '../api/petService';
import { PetWithDetails, VaccineRecord } from '../types';
import './PetDetailPage.css';

export const PetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<PetWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    breed: '',
    color: '',
    birthday: '',
    weight: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [addingWeight, setAddingWeight] = useState(false);

  const fetchPet = async () => {
    if (!id) return;
    try {
      const petData = await petService.getPetById(id);
      setPet(petData);
      setEditForm({
        name: petData.name,
        breed: petData.breed,
        color: petData.color,
        birthday: petData.birthday,
        weight: petData.weights.length > 0
          ? petData.weights[petData.weights.length - 1].weight.toString()
          : '',
      });
    } catch (error) {
      console.error('Failed to fetch pet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPet();
  }, [id]);

  const formatAge = () => {
    if (!pet) return '';
    const { years, months } = pet.age;
    if (years === 0) return `${months}个月`;
    if (months === 0) return `${years}岁`;
    return `${years}岁${months}个月`;
  };

  const getVaccineInterval = (vaccine: VaccineRecord): number => {
    if (!pet) return 0;
    const sameTypeVaccines = pet.vaccines
      .filter(v => v.vaccineType === vaccine.vaccineType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const index = sameTypeVaccines.findIndex(v => v.id === vaccine.id);
    if (index === 0) return 0;
    const prevDate = new Date(sameTypeVaccines[index - 1].date);
    const currDate = new Date(vaccine.date);
    return Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getNextVaccineStatus = () => {
    if (!pet || !pet.nextVaccine) return null;
    const { daysUntil, type } = pet.nextVaccine;
    if (daysUntil < 0) {
      return {
        className: 'status-overdue',
        text: `${type}已超期${Math.abs(daysUntil)}天`,
      };
    }
    if (daysUntil <= 7) {
      return {
        className: 'status-urgent',
        text: `${type}还有${daysUntil}天到期`,
      };
    }
    return {
      className: 'status-normal',
      text: `${type}还有${daysUntil}天到期`,
    };
  };

  const handleSaveEdit = async () => {
    if (!id || !pet) return;
    try {
      await petService.updatePet(id, {
        name: editForm.name,
        breed: editForm.breed,
        color: editForm.color,
        birthday: editForm.birthday,
        species: pet.species,
        avatar: pet.avatar,
      });

      if (editForm.weight && parseFloat(editForm.weight) > 0) {
        const currentWeight = pet.weights.length > 0
          ? pet.weights[pet.weights.length - 1].weight
          : 0;
        if (parseFloat(editForm.weight) !== currentWeight) {
          await petService.addWeight(id, {
            date: new Date().toISOString().split('T')[0],
            weight: parseFloat(editForm.weight),
          });
        }
      }

      setIsEditing(false);
      fetchPet();
    } catch (error) {
      console.error('Failed to update pet:', error);
    }
  };

  const handleAddWeight = async () => {
    if (!id || !weightInput || parseFloat(weightInput) <= 0) return;
    setAddingWeight(true);
    try {
      await petService.addWeight(id, {
        date: new Date().toISOString().split('T')[0],
        weight: parseFloat(weightInput),
      });
      setWeightInput('');
      fetchPet();
    } catch (error) {
      console.error('Failed to add weight:', error);
    } finally {
      setAddingWeight(false);
    }
  };

  const sortedVaccines = pet
    ? [...pet.vaccines].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const nextVaccineStatus = getNextVaccineStatus();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="error-container">
        <p>未找到该宠物信息</p>
        <button className="back-btn" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="pet-detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className="pet-header-info">
          <div className="pet-avatar-large">{pet.avatar}</div>
          <div className="pet-header-details">
            <h1 className="pet-name-large">{pet.name}</h1>
            <p className="pet-breed-large">{pet.breed} · {pet.species} · {formatAge()}</p>
            {nextVaccineStatus && (
              <span className={`next-vaccine-badge ${nextVaccineStatus.className}`}>
                ⏰ {nextVaccineStatus.text}
              </span>
            )}
          </div>
        </div>
        <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? '✕ 取消' : '✎ 编辑'}
        </button>
      </div>

      <main className="detail-content">
        <section className="detail-card">
          <h2 className="card-title">📋 基本信息</h2>
          {isEditing ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>昵称</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>品种</label>
                  <input
                    type="text"
                    value={editForm.breed}
                    onChange={e => setEditForm({ ...editForm, breed: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>毛色</label>
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>生日</label>
                  <input
                    type="date"
                    value={editForm.birthday}
                    onChange={e => setEditForm({ ...editForm, birthday: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>当前体重 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.weight}
                    onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                  />
                </div>
              </div>
              <button className="save-btn" onClick={handleSaveEdit}>
                ✓ 保存修改
              </button>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">昵称</span>
                <span className="info-value">{pet.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">品种</span>
                <span className="info-value">{pet.breed}</span>
              </div>
              <div className="info-item">
                <span className="info-label">毛色</span>
                <span className="info-value">{pet.color}</span>
              </div>
              <div className="info-item">
                <span className="info-label">生日</span>
                <span className="info-value">{pet.birthday}</span>
              </div>
              <div className="info-item">
                <span className="info-label">年龄</span>
                <span className="info-value">{formatAge()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">当前体重</span>
                <span className="info-value">
                  {pet.weights.length > 0
                    ? `${pet.weights[pet.weights.length - 1].weight} kg`
                    : '暂无记录'}
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="detail-card">
          <div className="card-header">
            <h2 className="card-title">📈 体重趋势</h2>
            <div className="add-weight-form">
              <input
                type="number"
                step="0.1"
                placeholder="录入今日体重 (kg)"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
              />
              <button className="add-weight-btn" onClick={handleAddWeight} disabled={addingWeight}>
                {addingWeight ? '添加中...' : '+ 添加'}
              </button>
            </div>
          </div>
          <WeightChart weights={pet.weights} species={pet.species} />
        </section>

        <section className="detail-card">
          <div className="card-header">
            <h2 className="card-title">💉 疫苗记录</h2>
            <button className="add-vaccine-btn-large" onClick={() => setModalOpen(true)}>
              + 添加新疫苗
            </button>
          </div>
          {sortedVaccines.length === 0 ? (
            <div className="empty-vaccines">
              <p>暂无疫苗记录</p>
            </div>
          ) : (
            <div className="vaccine-timeline">
              {sortedVaccines.map((vaccine, index) => {
                const interval = getVaccineInterval(vaccine);
                return (
                  <div key={vaccine.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    {index < sortedVaccines.length - 1 && <div className="timeline-line"></div>}
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="vaccine-type-badge">{vaccine.vaccineType}</span>
                        <span className="vaccine-date">{vaccine.date}</span>
                      </div>
                      <div className="timeline-details">
                        <p>👨‍⚕️ 兽医：{vaccine.vetName}</p>
                        {vaccine.nextDate && (
                          <p className="next-date">
                            ⏭️ 下次接种：{vaccine.nextDate}
                          </p>
                        )}
                        {interval > 0 && (
                          <p className="interval-info">
                            📅 与上次间隔：{interval} 天
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <VaccineModal
        isOpen={modalOpen}
        petId={pet.id}
        petName={pet.name}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchPet}
      />
    </div>
  );
};
