import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import PlotCard from './PlotCard';
import { Plot } from '../types';

interface GardenMapProps {
  userPoints: number;
  setUserPoints: (points: number) => void;
  currentUserId: number;
}

const GardenMap = ({ userPoints, setUserPoints, currentUserId }: GardenMapProps) => {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'claim' | 'water' | 'fertilize' | 'diary'>('claim');
  const [diaryContent, setDiaryContent] = useState('');
  const [diaryImage, setDiaryImage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPlots = useCallback(async () => {
    try {
      const response = await axios.get('/api/plots');
      setPlots(response.data);
    } catch (error) {
      console.error('获取地块列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  const handlePlotClick = (plot: Plot) => {
    setSelectedPlot(plot);
    if (plot.user_id === null) {
      setActionType('claim');
      setShowConfirmDialog(true);
    } else {
      setActionType('water');
      setShowConfirmDialog(true);
    }
  };

  const handleClaim = async () => {
    if (!selectedPlot) return;
    setLoading(true);
    try {
      const response = await axios.post(`/api/plots/${selectedPlot.id}/claim`, {
        user_id: currentUserId,
      });
      setPlots((prev) =>
        prev.map((p) => (p.id === selectedPlot.id ? response.data.plot : p))
      );
      setUserPoints(response.data.points);
      setShowConfirmDialog(false);
      setSelectedPlot(null);
    } catch (error: any) {
      alert(error.response?.data?.error || '认领失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWater = async () => {
    if (!selectedPlot) return;
    if (userPoints < 5) {
      alert('积分不足');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`/api/plots/${selectedPlot.id}/water`, {
        user_id: currentUserId,
      });
      setPlots((prev) =>
        prev.map((p) =>
          p.id === selectedPlot.id
            ? { ...p, water_level: response.data.water_level }
            : p
        )
      );
      setUserPoints(response.data.from_user_points);
      setShowConfirmDialog(false);
      setSelectedPlot(null);
    } catch (error: any) {
      alert(error.response?.data?.error || '浇水失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFertilize = async () => {
    if (!selectedPlot) return;
    if (userPoints < 5) {
      alert('积分不足');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`/api/plots/${selectedPlot.id}/fertilize`, {
        user_id: currentUserId,
      });
      setPlots((prev) =>
        prev.map((p) =>
          p.id === selectedPlot.id
            ? { ...p, fertilizer_level: response.data.fertilizer_level }
            : p
        )
      );
      setUserPoints(response.data.from_user_points);
      setShowConfirmDialog(false);
      setSelectedPlot(null);
    } catch (error: any) {
      alert(error.response?.data?.error || '施肥失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDiary = async () => {
    if (!selectedPlot || !diaryContent.trim()) {
      alert('请输入日记内容');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`/api/plots/${selectedPlot.id}/diary`, {
        user_id: currentUserId,
        content: diaryContent,
        image_url: diaryImage,
      });
      setDiaryContent('');
      setDiaryImage('');
      setShowConfirmDialog(false);
      setSelectedPlot(null);
      alert('日记发布成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const gridRows: Plot[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: Plot[] = [];
    for (let x = 0; x < 10; x++) {
      const plot = plots.find((p) => p.grid_x === x && p.grid_y === y);
      if (plot) row.push(plot);
    }
    if (row.length > 0) gridRows.push(row);
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ color: '#4a7c59', fontSize: '24px', marginBottom: '8px' }}>
            🏡 社区花园
          </h2>
          <p style={{ color: '#b5a48b', fontSize: '14px' }}>
            点击未认领的地块认领，点击已认领的地块可以浇水、施肥或写日记
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#666',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#e8e0d4',
                borderRadius: '2px',
              }}
            />
            <span>未认领</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#666',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#7ebc59',
                borderRadius: '2px',
              }}
            />
            <span>已认领</span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'inline-block',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {gridRows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: '8px' }}>
              {row.map((plot) => (
                <PlotCard
                  key={plot.id}
                  plot={plot}
                  onClick={() => handlePlotClick(plot)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={() => {
              setShowConfirmDialog(false);
              setSelectedPlot(null);
              setDiaryContent('');
              setDiaryImage('');
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff',
                width: '320px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                padding: '24px',
              }}
            >
              {actionType === 'claim' && (
                <>
                  <h3 style={{ color: '#4a7c59', marginBottom: '12px', fontSize: '18px' }}>
                    确认认领
                  </h3>
                  <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    确定要认领位置 ({selectedPlot?.grid_x}, {selectedPlot?.grid_y}) 的地块吗？
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowConfirmDialog(false);
                        setSelectedPlot(null);
                      }}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#f5efe6',
                        color: '#666',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleClaim}
                      disabled={loading}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#4a7c59',
                        color: '#fff',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading ? '认领中...' : '确认认领'}
                    </button>
                  </div>
                </>
              )}

              {(actionType === 'water' || actionType === 'fertilize') && (
                <>
                  <h3 style={{ color: '#4a7c59', marginBottom: '16px', fontSize: '18px' }}>
                    选择操作
                  </h3>
                  <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
                    地块主人: {selectedPlot?.username}
                  </p>
                  <p style={{ color: '#999', marginBottom: '20px', fontSize: '12px' }}>
                    每次操作消耗 5 积分，对方获得 3 积分
                  </p>

                  {actionType === 'water' && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        当前含水量: {selectedPlot?.water_level}%
                      </p>
                      <div
                        style={{
                          height: '8px',
                          backgroundColor: '#d9cdc1',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${selectedPlot?.water_level}%`,
                            backgroundColor: '#4ca6e6',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {actionType === 'fertilize' && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        当前施肥量: {selectedPlot?.fertilizer_level}%
                      </p>
                      <div
                        style={{
                          height: '8px',
                          backgroundColor: '#d9cdc1',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${selectedPlot?.fertilizer_level}%`,
                            backgroundColor: '#8b5e3c',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button
                      onClick={() => setActionType('water')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: actionType === 'water' ? '#4ca6e6' : '#f5efe6',
                        color: actionType === 'water' ? '#fff' : '#666',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      💧 浇水
                    </button>
                    <button
                      onClick={() => setActionType('fertilize')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: actionType === 'fertilize' ? '#8b5e3c' : '#f5efe6',
                        color: actionType === 'fertilize' ? '#fff' : '#666',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🌱 施肥
                    </button>
                  </div>

                  {selectedPlot?.user_id === currentUserId && (
                    <button
                      onClick={() => setActionType('diary')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#f5efe6',
                        color: '#4a7c59',
                        fontSize: '14px',
                        marginBottom: '16px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      📝 写日记
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowConfirmDialog(false);
                        setSelectedPlot(null);
                      }}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#f5efe6',
                        color: '#666',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={actionType === 'water' ? handleWater : handleFertilize}
                      disabled={loading || userPoints < 5}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: userPoints < 5 ? '#ccc' : '#4a7c59',
                        color: '#fff',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading
                        ? '操作中...'
                        : userPoints < 5
                        ? '积分不足'
                        : `确认${actionType === 'water' ? '浇水' : '施肥'}`}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'diary' && (
                <>
                  <h3 style={{ color: '#4a7c59', marginBottom: '16px', fontSize: '18px' }}>
                    写种植日记
                  </h3>
                  <textarea
                    value={diaryContent}
                    onChange={(e) => setDiaryContent(e.target.value)}
                    placeholder="记录今天的种植心得..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d9cdc1',
                      fontSize: '14px',
                      resize: 'vertical',
                      marginBottom: '12px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <input
                    type="text"
                    value={diaryImage}
                    onChange={(e) => setDiaryImage(e.target.value)}
                    placeholder="图片URL（可选）"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d9cdc1',
                      fontSize: '14px',
                      marginBottom: '20px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setActionType('water');
                        setDiaryContent('');
                        setDiaryImage('');
                      }}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#f5efe6',
                        color: '#666',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      返回
                    </button>
                    <button
                      onClick={handleDiary}
                      disabled={loading || !diaryContent.trim()}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: !diaryContent.trim() ? '#ccc' : '#4a7c59',
                        color: '#fff',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading ? '发布中...' : '发布日记'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GardenMap;
