import React, { useState, useEffect } from 'react';
import type { Pet, ServiceRecord } from '../types';
import { getCoatBgColor, getBreedIcon, api } from '../utils/storage';
import '../styles/PetCard.css';

interface PetCardProps {
  pet: Pet;
}

const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [showRecords, setShowRecords] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await api.getPetServiceRecords(pet.id);
        setRecords(data);
      } catch (error) {
        console.error('获取服务记录失败:', error);
      }
    };
    fetchRecords();
  }, [pet.id]);

  const calculateAge = (birthday: string) => {
    const birth = new Date(birthday);
    const now = new Date();
    const diff = now.getTime() - birth.getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    if (years > 0) {
      return `${years}岁${months > 0 ? months + '个月' : ''}`;
    }
    return `${months}个月`;
  };

  return (
    <div
      className="pet-card card"
      style={{ backgroundColor: getCoatBgColor(pet.coatColor) }}
      onMouseEnter={() => setShowRecords(true)}
      onMouseLeave={() => setShowRecords(false)}
    >
      <div className="pet-card-icon">{getBreedIcon(pet.breed)}</div>
      <div className="pet-card-content">
        <h3 className="pet-card-name">{pet.name}</h3>
        <div className="pet-card-info">
          <span className="pet-card-breed">{pet.breed}</span>
          <span className="pet-card-dot">·</span>
          <span className="pet-card-weight">{pet.weight}kg</span>
        </div>
        <p className="pet-card-age">年龄：{calculateAge(pet.birthday)}</p>
        {pet.allergies && pet.allergies !== '无' && (
          <p className="pet-card-allergies">过敏：{pet.allergies}</p>
        )}
      </div>
      <div className={`pet-card-records ${showRecords ? 'show' : ''}`}>
        <div className="pet-card-records-title">最近服务记录</div>
        {records.length > 0 ? (
          <ul className="pet-card-records-list">
            {records.map((record) => (
              <li key={record.id} className="pet-card-record-item">
                <span className="pet-card-record-date">{record.date}</span>
                <span className="pet-card-record-service">
                  {record.service?.name || '未知服务'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pet-card-no-records">暂无服务记录</p>
        )}
      </div>
    </div>
  );
};

export default PetCard;
