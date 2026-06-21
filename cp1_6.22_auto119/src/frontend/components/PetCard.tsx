import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PetWithDetails } from '../types';
import './PetCard.css';

interface PetCardProps {
  pet: PetWithDetails;
  onAddVaccine: (petId: string) => void;
}

export const PetCard: React.FC<PetCardProps> = ({ pet, onAddVaccine }) => {
  const navigate = useNavigate();

  const formatAge = () => {
    const { years, months } = pet.age;
    if (years === 0) {
      return `${months}个月`;
    }
    if (months === 0) {
      return `${years}岁`;
    }
    return `${years}岁${months}个月`;
  };

  const getVaccineStatus = () => {
    if (!pet.nextVaccine) return null;
    const { daysUntil } = pet.nextVaccine;

    if (daysUntil < 0) {
      return {
        status: 'overdue',
        label: '已超期',
        days: Math.abs(daysUntil),
        className: 'status-overdue',
      };
    }
    if (daysUntil <= 7) {
      return {
        status: 'urgent',
        label: `还有 ${daysUntil} 天`,
        days: daysUntil,
        className: 'status-urgent',
      };
    }
    return {
      status: 'normal',
      label: `还有 ${daysUntil} 天`,
      days: daysUntil,
      className: 'status-normal',
    };
  };

  const getLatestVaccineDate = () => {
    if (pet.vaccines.length === 0) return '暂无记录';
    const sorted = [...pet.vaccines].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].date;
  };

  const getBorderClass = () => {
    const status = getVaccineStatus();
    if (!status) return '';
    if (status.status === 'overdue') return 'border-overdue';
    if (status.status === 'urgent') return 'border-urgent';
    return '';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.add-vaccine-btn')) return;
    navigate(`/pets/${pet.id}`);
  };

  const handleAddVaccine = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddVaccine(pet.id);
  };

  const status = getVaccineStatus();

  return (
    <div
      className={`pet-card ${getBorderClass()}`}
      onClick={handleCardClick}
    >
      <div className="pet-card-header">
        <div className="pet-avatar">{pet.avatar}</div>
        <div className="pet-info">
          <div className="pet-name">{pet.name}</div>
          <div className="pet-breed">{pet.breed}</div>
          <div className="pet-age">{formatAge()}</div>
        </div>
      </div>

      <div className="pet-card-body">
        <div className="vaccine-info">
          <span className="info-label">最近疫苗：</span>
          <span className="info-value">{getLatestVaccineDate()}</span>
        </div>
        {status && (
          <div className="vaccine-status">
            <span className="info-label">下次{pet.nextVaccine?.type}：</span>
            <span className={`info-value status-badge ${status.className}`}>
              {status.label}
            </span>
          </div>
        )}
      </div>

      <div className="pet-card-footer">
        <button className="add-vaccine-btn" onClick={handleAddVaccine}>
          💉 录入疫苗
        </button>
      </div>
    </div>
  );
};
