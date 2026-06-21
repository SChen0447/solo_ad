import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Pet,
  PetType,
  ActionType,
  PET_PRESETS,
  STATE_DECREASE_INTERVAL
} from './types';
import PetCard from './components/PetCard';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [myPet, setMyPet] = useState<Pet | null>(null);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const fetchMyPet = useCallback(async () => {
    try {
      const response = await fetch('/api/pets/mine');
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setMyPet(data[0]);
      } else {
        setMyPet(null);
      }
    } catch (error) {
      console.error('获取我的宠物失败:', error);
    }
  }, []);

  const fetchAllPets = useCallback(async () => {
    try {
      const response = await fetch('/api/pets');
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllPets(data);
      }
    } catch (error) {
      console.error('获取所有宠物失败:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyPet(), fetchAllPets()]);
    setLoading(false);
  }, [fetchMyPet, fetchAllPets]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, STATE_DECREASE_INTERVAL / 2);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAdopt = useCallback(async (type: PetType, name: string) => {
    try {
      const response = await fetch('/api/pets/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name })
      });
      
      if (response.ok) {
        const newPet = await response.json();
        setMyPet(newPet);
        showToast(`恭喜领养了 ${newPet.name}！`, 'success');
        navigate('/');
      } else {
        const error = await response.json();
        showToast(error.error || '领养失败', 'warning');
      }
    } catch (error) {
      showToast('网络错误，请稍后重试', 'warning');
    }
  }, [navigate, showToast]);

  const handleAction = useCallback(async (petId: string, action: ActionType) => {
    try {
      const response = await fetch(`/api/pets/${petId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const updatedPet = await response.json();
        setMyPet(updatedPet);
        setAllPets(prev => prev.map(p => p.id === updatedPet.id ? updatedPet : p));
      } else {
        const error = await response.json();
        showToast(error.error || '操作失败', 'warning');
      }
    } catch (error) {
      showToast('网络错误，请稍后重试', 'warning');
    }
  }, [showToast]);

  const handleInteract = useCallback(async (toPetId: string, type: 'greet' | 'gift') => {
    if (!myPet) {
      showToast('请先领养一只宠物', 'warning');
      return;
    }
    
    try {
      const response = await fetch(`/api/pets/${toPetId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPetId: myPet.id, type })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyPet(data.fromPet);
        setAllPets(prev => {
          return prev.map(p => {
            if (p.id === data.fromPet.id) return data.fromPet;
            if (p.id === data.toPet.id) return data.toPet;
            return p;
          });
        });
        
        const actionText = type === 'greet' ? '打招呼' : '送礼物';
        showToast(`成功向 ${data.toPet.name} ${actionText}！双方快乐度+${data.happinessIncrease}`, 'success');
      }
    } catch (error) {
      showToast('网络错误，请稍后重试', 'warning');
    }
  }, [myPet, showToast]);

  const openInteractionModal = useCallback((petId: string) => {
    const pet = allPets.find(p => p.id === petId);
    if (pet) {
      setSelectedPet(pet);
      setShowInteractionModal(true);
    }
  }, [allPets]);

  const currentTab = useMemo(() => {
    if (location.pathname === '/community') return 'community';
    return 'home';
  }, [location.pathname]);

  const otherPets = useMemo(() => {
    return allPets.filter(p => p.id !== myPet?.id);
  }, [allPets, myPet]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f7fafc',
        color: '#8b5cf6',
        fontSize: '20px'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7fafc',
      color: '#2d3748'
    }}>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 700,
          color: '#8b5cf6'
        }}>
          🐾 虚拟宠物社区
        </h1>
        
        {isMobile ? (
          <>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              {showMobileMenu ? '✕' : '☰'}
            </button>
            
            {showMobileMenu && (
              <div style={{
                position: 'absolute',
                top: '60px',
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <button
                  onClick={() => { navigate('/'); setShowMobileMenu(false); }}
                  style={{
                    padding: '16px 24px',
                    border: 'none',
                    background: currentTab === 'home' ? '#8b5cf6' : 'transparent',
                    color: currentTab === 'home' ? '#fff' : '#2d3748',
                    fontSize: '16px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🏠 我的宠物
                </button>
                <button
                  onClick={() => { navigate('/community'); setShowMobileMenu(false); }}
                  style={{
                    padding: '16px 24px',
                    border: 'none',
                    background: currentTab === 'community' ? '#8b5cf6' : 'transparent',
                    color: currentTab === 'community' ? '#fff' : '#2d3748',
                    fontSize: '16px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🌍 社区广场
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: currentTab === 'home' ? '#8b5cf6' : 'transparent',
                color: currentTab === 'home' ? '#fff' : '#2d3748',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentTab !== 'home') {
                  e.currentTarget.style.backgroundColor = '#f3e8ff';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== 'home') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              🏠 我的宠物
            </button>
            <button
              onClick={() => navigate('/community')}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: currentTab === 'community' ? '#8b5cf6' : 'transparent',
                color: currentTab === 'community' ? '#fff' : '#2d3748',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentTab !== 'community') {
                  e.currentTarget.style.backgroundColor = '#f3e8ff';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== 'community') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              🌍 社区广场
            </button>
          </div>
        )}
      </nav>

      <main style={{
        paddingTop: '80px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '40px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <Routes>
          <Route path="/" element={
            myPet ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px'
              }}>
                <h2 style={{
                  margin: '16px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#2d3748'
                }}>
                  我的宝贝
                </h2>
                <PetCard
                  pet={myPet}
                  onAction={handleAction}
                  showActions={true}
                />
                {myPet.isSick && (
                  <div style={{
                    backgroundColor: '#fed7d7',
                    color: '#c53030',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    ⚠️ 宠物生病了！请尽快照顾它，否则5分钟后它将离开...
                  </div>
                )}
              </div>
            ) : (
              <AdoptPage onAdopt={handleAdopt} />
            )
          } />
          
          <Route path="/community" element={
            <div>
              <h2 style={{
                margin: '16px 0 24px 0',
                fontSize: '24px',
                fontWeight: 600,
                color: '#2d3748',
                textAlign: 'center'
              }}>
                🌍 社区广场
              </h2>
              
              {!myPet && (
                <div style={{
                  backgroundColor: '#fefcbf',
                  color: '#975a16',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  💡 领养一只宠物后才能与其他宠物互动哦！
                </div>
              )}
              
              {otherPets.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#718096',
                  fontSize: '16px'
                }}>
                  还没有其他用户领养宠物，快来成为第一个吧！
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '24px',
                  justifyContent: 'center',
                  maxWidth: '1280px',
                  margin: '0 auto'
                }}>
                  {otherPets.map(pet => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      isInteractive={!!myPet}
                      onInteract={openInteractionModal}
                    />
                  ))}
                </div>
              )}
            </div>
          } />
        </Routes>
      </main>

      {showInteractionModal && selectedPet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}
        onClick={() => setShowInteractionModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              与 {selectedPet.name} 互动
            </h3>
            <p style={{
              color: '#718096',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              选择一种互动方式，双方的快乐度都会增加哦！
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  handleInteract(selectedPet.id, 'greet');
                  setShowInteractionModal(false);
                }}
                style={{
                  padding: '16px',
                  border: '2px solid #e9d8fd',
                  borderRadius: '12px',
                  backgroundColor: '#faf5ff',
                  color: '#8b5cf6',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3e8ff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#faf5ff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                👋 打招呼
              </button>
              <button
                onClick={() => {
                  handleInteract(selectedPet.id, 'gift');
                  setShowInteractionModal(false);
                }}
                style={{
                  padding: '16px',
                  border: '2px solid #c6f6d5',
                  borderRadius: '12px',
                  backgroundColor: '#f0fff4',
                  color: '#48bb78',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c6f6d5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fff4';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🎁 送礼物
              </button>
              <button
                onClick={() => setShowInteractionModal(false)}
                style={{
                  padding: '12px',
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 150
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              backgroundColor: toast.type === 'success' ? '#c6f6d5' :
                               toast.type === 'warning' ? '#fed7d7' : '#bee3f8',
              color: toast.type === 'success' ? '#276749' :
                     toast.type === 'warning' ? '#c53030' : '#2b6cb0',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards',
              maxWidth: '300px'
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function AdoptPage({ onAdopt }: { onAdopt: (type: PetType, name: string) => void }) {
  const [selectedType, setSelectedType] = useState<PetType | null>(null);
  const [petName, setPetName] = useState('');

  const handleAdopt = () => {
    if (selectedType) {
      onAdopt(selectedType, petName.trim() || PET_PRESETS.find(p => p.type === selectedType)?.name || '');
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{
        margin: '16px 0 8px 0',
        fontSize: '28px',
        fontWeight: 700,
        textAlign: 'center',
        color: '#2d3748'
      }}>
        🐾 领养一只宠物吧！
      </h2>
      <p style={{
        textAlign: 'center',
        color: '#718096',
        marginBottom: '32px'
      }}>
        选择一只你喜欢的宠物，给它起个名字开始你的养成之旅
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {PET_PRESETS.map(preset => (
          <div
            key={preset.type}
            onClick={() => setSelectedType(preset.type)}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${preset.colors.from}, ${preset.colors.to})`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: selectedType === preset.type ? '3px solid #8b5cf6' : '3px solid transparent',
              boxShadow: selectedType === preset.type ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
              transform: selectedType === preset.type ? 'translateY(-4px)' : 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              if (selectedType !== preset.type) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }
            }}
          >
            <div style={{
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '48px' }}>
                {preset.type === 'cat' ? '🐱' :
                 preset.type === 'dog' ? '🐶' :
                 preset.type === 'dragon' ? '🐲' :
                 preset.type === 'unicorn' ? '🦄' :
                 preset.type === 'penguin' ? '🐧' : '🦊'}
              </span>
            </div>
            <h3 style={{
              margin: '0 0 4px 0',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 600,
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              {preset.name}
            </h3>
            <p style={{
              margin: 0,
              color: 'rgba(255,255,255,0.9)',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              {preset.description}
            </p>
          </div>
        ))}
      </div>
      
      {selectedType && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d3748'
          }}>
            给你的宠物起个名字：
          </label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder={PET_PRESETS.find(p => p.type === selectedType)?.name}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '16px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#8b5cf6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          />
          <button
            onClick={handleAdopt}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: '#8b5cf6',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7c3aed';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8b5cf6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🎉 确认领养
          </button>
        </div>
      )}
    </div>
  );
}
