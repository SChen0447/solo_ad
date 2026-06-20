import React, { useState, useEffect } from 'react';
import { Plant, CareRecord } from '../types';
import PlantCard from '../components/PlantCard';
import { getPlants, addPlant, waterPlant, fertilizePlant, repotPlant, getCareRecords } from '../api';

const PlantsPage: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [careRecords, setCareRecords] = useState<CareRecord[]>([]);
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterLight, setFilterLight] = useState('');
  const [formData, setFormData] = useState({ name: '', species: '', location: '', lightNeeds: '', imageUrl: '' });
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  useEffect(() => {
    getPlants().then(setPlants).catch(console.error);
  }, []);

  const handleAddPlant = async () => {
    if (!formData.name || !formData.species) return;
    const newPlant = await addPlant(formData);
    setAnimatingId(newPlant.id);
    setPlants(prev => [newPlant, ...prev]);
    setFormData({ name: '', species: '', location: '', lightNeeds: '', imageUrl: '' });
    setShowAddForm(false);
    setTimeout(() => setAnimatingId(null), 300);
  };

  const handleWater = async (id: string) => {
    const updated = await waterPlant(id);
    setPlants(prev => prev.map(p => p.id === id ? updated : p));
  };

  const handleSelectPlant = async (plant: Plant) => {
    setSelectedPlant(plant);
    const records = await getCareRecords(plant.id);
    setCareRecords(records);
  };

  const handleAction = async (type: 'fertilize' | 'repot') => {
    if (!selectedPlant) return;
    const fn = type === 'fertilize' ? fertilizePlant : repotPlant;
    await fn(selectedPlant.id);
    const records = await getCareRecords(selectedPlant.id);
    setCareRecords(records);
  };

  const filteredPlants = plants.filter(p => {
    if (filterSpecies && p.species !== filterSpecies) return false;
    if (filterLight && p.lightNeeds !== filterLight) return false;
    return true;
  });

  const speciesList = [...new Set(plants.map(p => p.species))];
  const lightList = [...new Set(plants.map(p => p.lightNeeds))];

  const typeColor: Record<string, string> = { water: '#42A5F5', fertilize: '#66BB6A', repot: '#FF9800' };
  const typeLabel: Record<string, string> = { water: '浇水', fertilize: '施肥', repot: '换盆' };

  return (
    <div style={{ padding: '16px', position: 'relative' }}>
      <h2 style={{ color: '#2E7D32', marginBottom: 16, fontSize: 22 }}>🌱 我的植物</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={filterSpecies}
          onChange={e => setFilterSpecies(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #C8E6C9', fontSize: 13, outline: 'none' }}
        >
          <option value="">全部种类</option>
          {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterLight}
          onChange={e => setFilterLight(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #C8E6C9', fontSize: 13, outline: 'none' }}
        >
          <option value="">全部光照</option>
          {lightList.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {filteredPlants.map(plant => (
          <div
            key={plant.id}
            style={{
              transition: 'opacity 0.3s, transform 0.3s',
              opacity: 1,
              transform: animatingId === plant.id ? 'scale(0.8)' : 'scale(1)',
            }}
          >
            <PlantCard plant={plant} onClick={handleSelectPlant} />
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAddForm(true)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 88,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #43A047, #66BB6A)',
          color: '#fff',
          border: 'none',
          fontSize: 28,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(67,160,71,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          lineHeight: 1,
        }}
      >
        +
      </button>

      {showAddForm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAddForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 24, width: 360, maxWidth: '90vw',
              animation: 'scaleIn 0.25s ease-out',
            }}
          >
            <h3 style={{ color: '#2E7D32', marginBottom: 16 }}>添加新植物</h3>
            {['name', 'species', 'location', 'lightNeeds', 'imageUrl'].map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                  {{ name: '名称', species: '种类', location: '位置', lightNeeds: '光照需求', imageUrl: '图片URL' }[field]}
                </label>
                <input
                  value={(formData as any)[field]}
                  onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 6,
                    border: '1px solid #C8E6C9', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>取消</button>
              <button onClick={handleAddPlant} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#43A047', color: '#fff', cursor: 'pointer' }}>添加</button>
            </div>
          </div>
        </div>
      )}

      {selectedPlant && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setSelectedPlant(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxWidth: 500,
              maxHeight: '80vh', overflowY: 'auto',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#2E7D32', fontSize: 20 }}>{selectedPlant.name}</h3>
              <button onClick={() => setSelectedPlant(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: '种类', value: selectedPlant.species },
                { label: '位置', value: selectedPlant.location },
                { label: '光照需求', value: selectedPlant.lightNeeds },
              ].map(item => (
                <div key={item.label} style={{ padding: '6px 14px', background: '#E8F5E9', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#666' }}>{item.label}:</span> <span style={{ color: '#2E7D32', fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => handleWater(selectedPlant.id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#42A5F5', color: '#fff', cursor: 'pointer', fontSize: 13 }}>💧 浇水</button>
              <button onClick={() => handleAction('fertilize')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#66BB6A', color: '#fff', cursor: 'pointer', fontSize: 13 }}>🧪 施肥</button>
              <button onClick={() => handleAction('repot')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#FF9800', color: '#fff', cursor: 'pointer', fontSize: 13 }}>🏺 换盆</button>
            </div>

            <h4 style={{ color: '#333', marginBottom: 12 }}>养护日历</h4>
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, background: '#E0E0E0' }} />
              {careRecords.map(record => (
                <div key={record.id} style={{ position: 'relative', marginBottom: 16, paddingLeft: 16 }}>
                  <div style={{
                    position: 'absolute', left: -14, top: 4,
                    width: 10, height: 10, borderRadius: '50%',
                    background: typeColor[record.type] || '#999',
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 1px ' + (typeColor[record.type] || '#999'),
                  }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: typeColor[record.type] || '#333' }}>
                    {typeLabel[record.type] || record.type}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {new Date(record.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {careRecords.length === 0 && (
                <div style={{ fontSize: 13, color: '#999', paddingLeft: 16 }}>暂无养护记录</div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PlantsPage;
