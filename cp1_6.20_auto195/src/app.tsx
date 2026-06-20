import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlantCard from './plantCard';
import Calendar from './calendar';
import { Plant, Task, PlantSpecies, SensorData, CareAdvice, TaskType } from './types';
import { SPECIES_CONFIG, THEME } from './constants';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getTodayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const defaultPlants: Plant[] = [
  {
    id: generateId(),
    name: '小绿',
    species: '绿萝',
    plantDate: '2026-01-15',
    photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lush%20green%20pothos%20plant%20in%20white%20pot&image_size=square',
    waterFrequency: 3,
    fertilizeFrequency: 30,
    repotFrequency: 365,
    lastWatered: '2026-06-18',
    lastFertilized: '2026-05-20',
    lastRepotted: '2026-01-15',
    status: 'healthy'
  },
  {
    id: generateId(),
    name: '多肉宝宝',
    species: '多肉',
    plantDate: '2026-03-20',
    photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20succulent%20plant%20in%20terracotta%20pot&image_size=square',
    waterFrequency: 14,
    fertilizeFrequency: 60,
    repotFrequency: 545,
    lastWatered: '2026-06-10',
    lastFertilized: '2026-04-20',
    lastRepotted: '2026-03-20',
    status: 'thirsty'
  },
  {
    id: generateId(),
    name: '龟背先生',
    species: '龟背竹',
    plantDate: '2026-02-10',
    photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=large%20monstera%20deliciosa%20plant%20with%20split%20leaves&image_size=square',
    waterFrequency: 5,
    fertilizeFrequency: 21,
    repotFrequency: 365,
    lastWatered: '2026-06-15',
    lastFertilized: '2026-05-30',
    lastRepotted: '2026-02-10',
    status: 'low_light'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'archive' | 'calendar'>('archive');
  const [plants, setPlants] = useState<Plant[]>(defaultPlants);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 24,
    humidity: 65,
    light: 780,
    soilMoisture: 45
  });
  const [careAdvice, setCareAdvice] = useState<CareAdvice[]>([]);
  const [growthData, setGrowthData] = useState<{ date: string; count: number }[]>([]);

  const [newPlant, setNewPlant] = useState({
    name: '',
    species: '绿萝' as PlantSpecies,
    plantDate: getTodayStr(),
    photo: ''
  });
  const [customFrequencies, setCustomFrequencies] = useState({
    water: 3,
    fertilize: 30,
    repot: 365
  });

  const generateTasks = useCallback((plantList: Plant[]) => {
    const newTasks: Task[] = [];
    const today = new Date();

    plantList.forEach(plant => {
      const taskTypes: { type: TaskType; frequency: number; lastDate: string }[] = [
        { type: 'water', frequency: plant.waterFrequency, lastDate: plant.lastWatered },
        { type: 'fertilize', frequency: plant.fertilizeFrequency, lastDate: plant.lastFertilized },
        { type: 'repot', frequency: plant.repotFrequency, lastDate: plant.lastRepotted }
      ];

      taskTypes.forEach(({ type, frequency, lastDate }) => {
        const last = new Date(lastDate);
        for (let i = 0; i < 60; i++) {
          const nextDate = new Date(last);
          nextDate.setDate(last.getDate() + (i + 1) * frequency);
          if (nextDate >= today) {
            const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
            newTasks.push({
              id: `${plant.id}-${type}-${dateStr}`,
              plantId: plant.id,
              plantName: plant.name,
              type,
              date: dateStr,
              completed: false
            });
            break;
          }
        }
      });
    });

    setTasks(newTasks);
  }, []);

  useEffect(() => {
    generateTasks(plants);

    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      data.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count: Math.floor(Math.random() * 3) + 1
      });
    }
    setGrowthData(data);
  }, [plants, generateTasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData({
        temperature: Math.round((20 + Math.random() * 10) * 10) / 10,
        humidity: Math.round((50 + Math.random() * 30) * 10) / 10,
        light: Math.round(500 + Math.random() * 800),
        soilMoisture: Math.round((20 + Math.random() * 60) * 10) / 10
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const advice: CareAdvice[] = [];

    plants.forEach(plant => {
      if (sensorData.soilMoisture < 30 && plant.status !== 'thirsty') {
        advice.push({
          plantId: plant.id,
          plantName: plant.name,
          advice: '土壤湿度较低，建议及时浇水',
          priority: 'high'
        });
      }

      if (sensorData.light < 600 && plant.species !== '多肉') {
        advice.push({
          plantId: plant.id,
          plantName: plant.name,
          advice: '光照不足，建议移到光线更好的位置',
          priority: 'medium'
        });
      }

      if (sensorData.temperature > 30) {
        advice.push({
          plantId: plant.id,
          plantName: plant.name,
          advice: '温度过高，注意遮阳和通风',
          priority: 'medium'
        });
      }

      if (sensorData.humidity < 40 && plant.species === '龟背竹') {
        advice.push({
          plantId: plant.id,
          plantName: plant.name,
          advice: '空气太干燥，建议喷雾增湿',
          priority: 'low'
        });
      }
    });

    setCareAdvice(advice);
  }, [sensorData, plants]);

  const handleSpeciesChange = (species: PlantSpecies) => {
    setNewPlant(prev => ({ ...prev, species }));
    const config = SPECIES_CONFIG[species];
    setCustomFrequencies({
      water: config.waterFrequency,
      fertilize: config.fertilizeFrequency,
      repot: config.repotFrequency
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('照片大小不能超过2MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('仅支持JPG和PNG格式');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPlant(prev => ({ ...prev, photo: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPlant = () => {
    if (!newPlant.name.trim() || newPlant.name.length > 20) {
      alert('植物名称不能为空且最多20字');
      return;
    }
    if (!newPlant.photo) {
      alert('请上传植物照片');
      return;
    }

    const plant: Plant = {
      id: generateId(),
      name: newPlant.name.trim(),
      species: newPlant.species,
      plantDate: newPlant.plantDate,
      photo: newPlant.photo,
      waterFrequency: customFrequencies.water,
      fertilizeFrequency: customFrequencies.fertilize,
      repotFrequency: customFrequencies.repot,
      lastWatered: getTodayStr(),
      lastFertilized: getTodayStr(),
      lastRepotted: newPlant.plantDate,
      status: 'healthy'
    };

    setPlants(prev => [...prev, plant]);
    setShowAddModal(false);
    setNewPlant({
      name: '',
      species: '绿萝',
      plantDate: getTodayStr(),
      photo: ''
    });
  };

  const handleDeletePlant = (id: string) => {
    if (confirm('确定要删除这株植物吗？')) {
      setPlants(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const maxGrowth = Math.max(...growthData.map(d => d.count), 1);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌱 家庭绿植智能养护助手</h1>
        <div className="nav-tabs">
          <button
            className={`nav-btn ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            植物档案
          </button>
          <button
            className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            养护日历
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'archive' && (
          <motion.div
            key="archive"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', color: THEME.text }}>我的植物 ({plants.length})</h2>
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setShowAddModal(true)}
              >
                + 添加植物
              </motion.button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: THEME.cardShadow
                }}
              >
                <h3 style={{ fontSize: '16px', marginBottom: '16px', color: THEME.text }}>🌡️ 环境传感器</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#FFF3E0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px' }}>🌡️</div>
                    <div style={{ fontSize: '12px', color: '#E65100', marginTop: '4px' }}>温度</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#E65100' }}>{sensorData.temperature}°C</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#E3F2FD', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px' }}>💧</div>
                    <div style={{ fontSize: '12px', color: '#1565C0', marginTop: '4px' }}>湿度</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#1565C0' }}>{sensorData.humidity}%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#FFF8E1', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px' }}>☀️</div>
                    <div style={{ fontSize: '12px', color: '#FF8F00', marginTop: '4px' }}>光照</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#FF8F00' }}>{sensorData.light}lux</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#E8F5E9', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px' }}>🌱</div>
                    <div style={{ fontSize: '12px', color: '#2E7D32', marginTop: '4px' }}>土壤湿度</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#2E7D32' }}>{sensorData.soilMoisture}%</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: THEME.cardShadow,
                  gridColumn: 'span 2'
                }}
              >
                <h3 style={{ fontSize: '16px', marginBottom: '16px', color: THEME.text }}>📊 植物生长趋势（近30天养护记录）</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '4px' }}>
                  {growthData.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.count / maxGrowth) * 100}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.02 }}
                      style={{
                        flex: 1,
                        background: `linear-gradient(to top, ${THEME.primary}, ${THEME.secondary})`,
                        borderRadius: '4px 4px 0 0',
                        minWidth: '8px'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#9E9E9E' }}>
                  <span>30天前</span>
                  <span>今天</span>
                </div>
              </div>
            </div>

            {careAdvice.length > 0 && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: THEME.cardShadow,
                  marginBottom: '24px'
                }}
              >
                <h3 style={{ fontSize: '16px', marginBottom: '16px', color: THEME.text }}>💡 养护建议</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {careAdvice.map((advice, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: advice.priority === 'high' ? '#FFEBEE' : advice.priority === 'medium' ? '#FFF8E1' : '#E8F5E9',
                        borderLeft: `4px solid ${advice.priority === 'high' ? '#F44336' : advice.priority === 'medium' ? '#FFC107' : '#4CAF50'}`
                      }}
                    >
                      <div style={{ fontWeight: '500', color: THEME.text }}>{advice.plantName}</div>
                      <div style={{ fontSize: '14px', color: '#558B2F' }}>{advice.advice}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="plant-grid">
              {plants.map(plant => (
                <PlantCard key={plant.id} plant={plant} onDelete={handleDeletePlant} />
              ))}
            </div>

            {plants.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9E9E9E' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌿</div>
                <div style={{ fontSize: '18px' }}>还没有添加任何植物</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>点击上方按钮添加你的第一株植物吧！</div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Calendar tasks={tasks} onToggleTask={handleToggleTask} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <h2>🌱 添加新植物</h2>

              <div className="form-group">
                <label>植物名称（最多20字）</label>
                <input
                  type="text"
                  maxLength={20}
                  value={newPlant.name}
                  onChange={e => setNewPlant(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="给你的植物起个名字"
                />
                <div style={{ fontSize: '12px', color: '#9E9E9E', marginTop: '4px', textAlign: 'right' }}>
                  {newPlant.name.length}/20
                </div>
              </div>

              <div className="form-group">
                <label>品种</label>
                <select
                  value={newPlant.species}
                  onChange={e => handleSpeciesChange(e.target.value as PlantSpecies)}
                >
                  {Object.keys(SPECIES_CONFIG).map(species => (
                    <option key={species} value={species}>
                      {SPECIES_CONFIG[species as PlantSpecies].icon} {species}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>种植日期</label>
                <input
                  type="date"
                  value={newPlant.plantDate}
                  onChange={e => setNewPlant(prev => ({ ...prev, plantDate: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>自定义浇水频率（天）</label>
                <input
                  type="number"
                  min="1"
                  value={customFrequencies.water}
                  onChange={e => setCustomFrequencies(prev => ({ ...prev, water: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label>自定义施肥频率（天）</label>
                <input
                  type="number"
                  min="1"
                  value={customFrequencies.fertilize}
                  onChange={e => setCustomFrequencies(prev => ({ ...prev, fertilize: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label>自定义换土频率（天）</label>
                <input
                  type="number"
                  min="1"
                  value={customFrequencies.repot}
                  onChange={e => setCustomFrequencies(prev => ({ ...prev, repot: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label>植物照片（JPG/PNG，不超过2MB）</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handlePhotoUpload}
                  style={{ padding: '8px' }}
                />
                {newPlant.photo && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <img
                      src={newPlant.photo}
                      alt="预览"
                      style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <motion.button
                  className="btn btn-secondary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowAddModal(false)}
                >
                  取消
                </motion.button>
                <motion.button
                  className="btn btn-primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleAddPlant}
                >
                  添加
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
