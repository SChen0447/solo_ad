import React, { useState, useEffect } from 'react';
import { VaccineType } from '../types';
import { petService } from '../api/petService';
import './VaccineModal.css';

interface VaccineModalProps {
  isOpen: boolean;
  petId: string;
  petName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VaccineModal: React.FC<VaccineModalProps> = ({ isOpen, petId, petName, onClose, onSuccess }) => {
  const [vaccineType, setVaccineType] = useState<VaccineType>('狂犬病');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vetName, setVetName] = useState('');
  const [vaccineTypes, setVaccineTypes] = useState<VaccineType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      petService.getVaccineTypes().then(types => {
        setVaccineTypes(types);
      });
      setDate(new Date().toISOString().split('T')[0]);
      setVetName('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineType || !date || !vetName) return;

    setLoading(true);
    try {
      await petService.addVaccine(petId, { vaccineType, date, vetName });
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to add vaccine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVaccineType('狂犬病');
    setDate(new Date().toISOString().split('T')[0]);
    setVetName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💉 录入疫苗 - {petName}</h3>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>疫苗类型</label>
            <select
              value={vaccineType}
              onChange={e => setVaccineType(e.target.value as VaccineType)}
              required
            >
              {vaccineTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>接种日期</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>兽医名称</label>
            <input
              type="text"
              value={vetName}
              onChange={e => setVetName(e.target.value)}
              placeholder="请输入兽医名称"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              取消
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? '提交中...' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
