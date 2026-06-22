import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Plant, Plan } from '@/types';
import { plantApi, planApi } from '@/utils/api';
import PlantCard from '@/components/PlantCard';
import AddPlantModal from '@/components/AddPlantModal';
import CalendarView from '@/components/CalendarView';
import GrowthTimeline from '@/components/GrowthTimeline';

interface GardenContextType {
  plants: Plant[];
  plans: Plan[];
  refreshPlants: () => void;
  refreshPlans: () => void;
}

const GardenContext = createContext<GardenContextType>({
  plants: [],
  plans: [],
  refreshPlants: () => {},
  refreshPlans: () => {},
});

export const useGarden = () => useContext(GardenContext);

type Page = 'plants' | 'plans' | 'growth';
type SubPage = 'list' | 'detail';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('plants');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [subPage, setSubPage] = useState<SubPage>('list');
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ plantId: '', sowDate: '', pots: '1' });
  const [fadeIn, setFadeIn] = useState(true);

  const refreshPlants = useCallback(async () => {
    try {
      const data = await plantApi.list();
      setPlants(data);
    } catch {}
  }, []);

  const refreshPlans = useCallback(async () => {
    try {
      const data = await planApi.list();
      setPlans(data);
    } catch {}
  }, []);

  useEffect(() => {
    refreshPlants();
    refreshPlans();
  }, [refreshPlants, refreshPlans]);

  const handleAddPlant = async (data: Omit<Plant, 'id'>) => {
    await plantApi.create(data);
    refreshPlants();
  };

  const handlePlantClick = (plant: Plant) => {
    setSelectedPlant(plant);
    setSubPage('detail');
  };

  const handlePageChange = (p: Page) => {
    setFadeIn(false);
    setTimeout(() => {
      setPage(p);
      setSelectedPlant(null);
      setSubPage('list');
      setFadeIn(true);
    }, 150);
  };

  const handleAddPlan = async () => {
    if (!planForm.plantId || !planForm.sowDate) return;
    const plant = plants.find((p) => p.id === planForm.plantId);
    if (!plant) return;
    await planApi.create({
      plantId: planForm.plantId,
      plantName: plant.name,
      sowDate: planForm.sowDate,
      pots: Number(planForm.pots) || 1,
    });
    setPlanForm({ plantId: '', sowDate: '', pots: '1' });
    setAddPlanOpen(false);
    refreshPlans();
  };

  const navItems: { key: Page; label: string }[] = [
    { key: 'plants', label: '植物库' },
    { key: 'plans', label: '种植计划' },
    { key: 'growth', label: '生长分析' },
  ];

  return (
    <GardenContext.Provider value={{ plants, plans, refreshPlants, refreshPlans }}>
      <div style={{ minHeight: '100vh', background: '#F0FDF4', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.8' }}>
        <nav
          style={{
            height: '64px',
            background: '#065F46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🌿</span>
            <span style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 700 }}>GardenPlan</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handlePageChange(item.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  position: 'relative',
                  opacity: page === item.key ? 1 : 0.75,
                  transition: 'opacity 0.2s',
                }}
                className="nav-item"
              >
                {item.label}
                {page === item.key && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      height: '2px',
                      background: '#10B981',
                      animation: 'underline-in 0.3s ease-out',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        <main
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '32px 24px',
            transition: 'opacity 0.3s ease-in-out',
            opacity: fadeIn ? 1 : 0,
          }}
        >
          {page === 'plants' && (
            <div>
              {subPage === 'list' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#065F46', margin: 0 }}>我的植物库</h1>
                    <button
                      onClick={() => setModalOpen(true)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#065F46',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(6,95,70,0.3)',
                      }}
                    >
                      + 添加植物
                    </button>
                  </div>

                  {plants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '64px 0', color: '#6B7280', fontSize: '16px' }}>
                      还没有添加任何植物，点击上方按钮开始吧 🌱
                    </div>
                  ) : (
                    <div className="card-grid">
                      {plants.map((plant, idx) => (
                        <div
                          key={plant.id}
                          style={{
                            animation: `fadeUp 0.4s ease-out ${idx * 0.05}s both`,
                          }}
                        >
                          <PlantCard plant={plant} onClick={handlePlantClick} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : selectedPlant ? (
                <div
                  style={{
                    animation: 'fadeUp 0.4s ease-out',
                  }}
                >
                  <button
                    onClick={() => setSubPage('list')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#065F46',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginBottom: '16px',
                      padding: '4px 0',
                    }}
                  >
                    ← 返回植物库
                  </button>
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '32px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      display: 'flex',
                      gap: '32px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        width: '240px',
                        height: '240px',
                        borderRadius: '12px',
                        background: `url(${selectedPlant.imageUrl}) center/cover no-repeat, linear-gradient(135deg, #D1FAE5, #A7F3D0)`,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#065F46', marginTop: 0 }}>
                        {selectedPlant.name}
                      </h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <InfoItem label="成熟周期" value={`${selectedPlant.maturityDays}天`} />
                        <InfoItem label="浇水频率" value={`每${selectedPlant.wateringFrequency}天`} />
                        <InfoItem label="施肥周期" value={`每${selectedPlant.fertilizingCycle}天`} />
                        <InfoItem
                          label="品种分类"
                          value={
                            selectedPlant.category === 'leaf'
                              ? '叶菜'
                              : selectedPlant.category === 'fruit'
                              ? '果实类'
                              : '根茎类'
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {page === 'plans' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#065F46', margin: 0 }}>种植计划</h1>
                <button
                  onClick={() => setAddPlanOpen(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#065F46',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(6,95,70,0.3)',
                  }}
                >
                  + 新建计划
                </button>
              </div>

              {plans.length > 0 && (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    marginBottom: '32px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#065F46', marginBottom: '16px' }}>当前计划</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {plans.map((plan) => {
                      const plant = plants.find((p) => p.id === plan.plantId);
                      const harvestDate = plant
                        ? new Date(new Date(plan.sowDate).getTime() + plant.maturityDays * 86400000)
                            .toISOString()
                            .split('T')[0]
                        : '-';
                      return (
                        <div
                          key={plan.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: '#F9FAFB',
                            animation: 'fadeUp 0.4s ease-out',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#065F46' }}>{plan.plantName}</div>
                            <div style={{ fontSize: '13px', color: '#6B7280' }}>
                              播种：{plan.sowDate} · 预计收获：{harvestDate} · {plan.pots}盆
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              await planApi.delete(plan.id);
                              refreshPlans();
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#6B7280',
                            }}
                          >
                            删除
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#065F46', marginBottom: '16px' }}>浇水施肥日历</h3>
                <CalendarView plants={plants} plans={plans} />
              </div>
            </div>
          )}

          {page === 'growth' && (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#065F46', margin: '0 0 24px' }}>生长记录与分析</h1>
              {plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#6B7280', fontSize: '16px' }}>
                  请先创建种植计划，再记录生长数据 📝
                </div>
              ) : (
                <GrowthTimeline plans={plans} plants={plants} />
              )}
            </div>
          )}
        </main>

        <AddPlantModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddPlant} />

        {addPlanOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setAddPlanOpen(false);
            }}
          >
            <div
              style={{
                width: '420px',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#065F46', fontWeight: 700 }}>新建种植计划</h2>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>选择植物</label>
                <select
                  value={planForm.plantId}
                  onChange={(e) => setPlanForm((f) => ({ ...f, plantId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="">请选择植物</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>播种日期</label>
                <input
                  type="date"
                  value={planForm.sowDate}
                  onChange={(e) => setPlanForm((f) => ({ ...f, sowDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>盆数</label>
                <input
                  type="number"
                  min="1"
                  value={planForm.pots}
                  onChange={(e) => setPlanForm((f) => ({ ...f, pots: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAddPlanOpen(false)}
                  style={{ padding: '8px 20px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddPlan}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#065F46', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                >
                  创建计划
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes underline-in {
            from {
              transform: scaleX(0);
              transform-origin: left;
            }
            to {
              transform: scaleX(1);
              transform-origin: left;
            }
          }

          .nav-item:hover::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #10B981;
            transform: scaleX(1);
            transform-origin: left;
            animation: underline-in 0.3s ease-out;
          }

          .card-grid {
            display: grid;
            grid-template-columns: repeat(3, 240px);
            gap: 24px;
            justify-content: start;
          }

          @media (max-width: 1024px) {
            .card-grid {
              grid-template-columns: repeat(2, 240px);
            }
          }

          @media (max-width: 768px) {
            .card-grid {
              grid-template-columns: 1fr;
            }
            .card-grid > div > .plant-card {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </GardenContext.Provider>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      background: '#F9FAFB',
      borderRadius: '10px',
      padding: '12px 16px',
    }}
  >
    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: 600, color: '#065F46' }}>{value}</div>
  </div>
);

export default App;
