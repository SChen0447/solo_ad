import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TrackEditor from '../components/TrackEditor';
import Visualizer from '../components/Visualizer';
import { useApp } from '../App';
import { audioEngine, getNoteFrequency } from '../utils/audioUtils';
import { NUM_STEPS, INSTRUMENT_TYPES, TRACK_NAMES, TRACK_COLORS } from '../types';

const CreatePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { currentRoom, currentUser, leaveRoom, notes, bpm, setBpm } = useApp();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedCells, setHighlightedCells] = useState<{ [key: string]: number }>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [shareCode, setShareCode] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentRoom || !currentUser) {
      navigate('/');
    }
  }, [currentRoom, currentUser, navigate]);

  const playStepNotes = useCallback((step: number) => {
    audioEngine.init();
    
    for (let track = 0; track < 16; track++) {
      const key = `${track}-${step}`;
      if (notes[key]) {
        const frequency = getNoteFrequency(track);
        const instrument = INSTRUMENT_TYPES[track];
        
        switch (instrument) {
          case 'piano':
            audioEngine.playPiano(frequency);
            break;
          case 'drum':
            audioEngine.playDrum(80 + track * 30);
            break;
          case 'bass':
            audioEngine.playBass(frequency / 2);
            break;
          case 'lead':
            audioEngine.playLead(frequency);
            break;
        }
        
        setHighlightedCells(prev => ({ ...prev, [key]: Date.now() }));
        setTimeout(() => {
          setHighlightedCells(prev => {
            const newCells = { ...prev };
            delete newCells[key];
            return newCells;
          });
        }, 300);
      }
    }
  }, [notes]);

  const startPlayback = useCallback(() => {
    if (isPlaying) return;
    
    audioEngine.init();
    setIsPlaying(true);
    
    const stepDuration = (60 / bpm) * 1000 / 2;
    let step = currentStep;
    
    playIntervalRef.current = setInterval(() => {
      playStepNotes(step);
      setCurrentStep(step);
      step++;
      if (step >= NUM_STEPS) {
        step = 0;
      }
    }, stepDuration);
  }, [isPlaying, bpm, currentStep, playStepNotes]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, []);

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const jumpToStep = (step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, NUM_STEPS - 1)));
  };

  const resetPlayback = () => {
    stopPlayback();
    setCurrentStep(0);
  };

  const startRecording = async () => {
    if (!currentRoom) return;
    
    setIsRecording(true);
    setRecordingProgress(0);
    
    const noteData = Object.entries(notes).map(([key, _]) => {
      const [track, step] = key.split('-').map(Number);
      return {
        id: `note_${track}_${step}`,
        track,
        step,
        velocity: 100,
        userId: currentUser?.id || '',
        timestamp: Date.now()
      };
    });
    
    const tracksData = TRACK_NAMES.map((name, i) => ({
      id: i,
      name,
      instrument: INSTRUMENT_TYPES[i],
      color: TRACK_COLORS[i]
    }));
    
    const recordingData = {
      notes: noteData,
      bpm,
      tracks: tracksData,
      duration: 30
    };
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingProgress(prev => {
        if (prev >= 100) {
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    
    try {
      const response = await axios.post('/api/record', recordingData);
      const { shareCode: newShareCode, downloadUrl: newDownloadUrl } = response.data;
      
      setShareCode(newShareCode);
      setDownloadUrl(newDownloadUrl);
      setShowShareModal(true);
    } catch (error) {
      console.error('Recording failed:', error);
      alert('录音生成失败，请稍后重试');
    } finally {
      setIsRecording(false);
      setRecordingProgress(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const copyShareCode = () => {
    navigator.clipboard.writeText(shareCode);
    alert('分享码已复制到剪贴板');
  };

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  if (!currentRoom || !currentUser) {
    return <div style={{ color: '#ecf0f1', padding: '20px' }}>正在加载...</div>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      <motion.div
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          height: '50px',
          background: '#0f3460',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid #2c3e50',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🎵</div>
          <div style={{ color: '#ecf0f1', fontWeight: 600, fontSize: '16px' }}>
            {currentRoom.name}
          </div>
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: '20px', 
            color: '#e94560', 
            fontWeight: 'bold',
            letterSpacing: '2px'
          }}>
            #{code}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentRoom.users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredUser(user.id)}
              onMouseLeave={() => setHoveredUser(null)}
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: user.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                animation: 'breathe 2s infinite',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              {user.name.charAt(0).toUpperCase()}
              
              <AnimatePresence>
                {hoveredUser === user.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      position: 'absolute',
                      top: '44px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#16213e',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      zIndex: 100,
                      border: '1px solid #2c3e50'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#ecf0f1', marginBottom: '2px' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '11px', color: user.color }}>
                      {user.role}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          
          {Array.from({ length: 4 - currentRoom.users.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px dashed #2c3e50',
                opacity: 0.5
              }}
            />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={leaveRoom}
          style={{
            marginLeft: '20px',
            padding: '6px 14px',
            borderRadius: '6px',
            background: '#e74c3c',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          离开房间
        </motion.button>
      </motion.div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        minHeight: 0,
        padding: '16px',
        gap: '16px'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <TrackEditor
              currentStep={currentStep}
              isPlaying={isPlaying}
              highlightedCells={highlightedCells}
            />
          </div>
        </div>

        <div style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          flexShrink: 0
        }}>
          <Visualizer isPlaying={isPlaying} />

          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '16px' 
            }}>
              <span style={{ color: '#bdc3c7', fontSize: '13px' }}>播放控制</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#7f8c8d', fontSize: '12px' }}>BPM</span>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Math.max(60, Math.min(200, parseInt(e.target.value) || 120)))}
                  style={{
                    width: '60px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: '#0f3460',
                    color: '#00d2ff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetPlayback}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#2c3e50',
                  color: '#ecf0f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
              >
                ⏮
              </motion.button>

              <motion.button
                whileHover={{ 
                  scale: 1.1, 
                  boxShadow: isPlaying 
                    ? '0 0 20px rgba(231, 76, 60, 0.5)' 
                    : '0 0 20px rgba(46, 204, 113, 0.5)' 
                }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlayback}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isPlaying ? '#e74c3c' : '#2ecc71',
                  color: '#ecf0f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => jumpToStep(currentStep + 1)}
                disabled={currentStep >= NUM_STEPS - 1}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: currentStep >= NUM_STEPS - 1 ? '#2c3e50' : '#2c3e50',
                  color: '#ecf0f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  opacity: currentStep >= NUM_STEPS - 1 ? 0.5 : 1,
                  cursor: currentStep >= NUM_STEPS - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ⏭
              </motion.button>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f8c8d', fontSize: '11px', marginBottom: '4px' }}>
                <span>位置: {currentStep + 1} / {NUM_STEPS}</span>
                <span>{Math.floor(currentStep / 4) + 1} 小节</span>
              </div>
              <input
                type="range"
                min="0"
                max={NUM_STEPS - 1}
                value={currentStep}
                onChange={(e) => jumpToStep(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
            </div>
          </div>

          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ color: '#bdc3c7', fontSize: '13px', marginBottom: '16px' }}>
              录音导出
            </div>

            {isRecording && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#e74c3c'
                    }}
                  />
                  <span style={{ color: '#e74c3c', fontSize: '12px' }}>正在生成录音...</span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#0f3460',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    animate={{ width: `${recordingProgress}%` }}
                    transition={{ duration: 0.1 }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #e74c3c, #c0392b)'
                    }}
                  />
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              disabled={isRecording}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: isRecording ? '#2c3e50' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isRecording ? 'not-allowed' : 'pointer',
                opacity: isRecording ? 0.7 : 1
              }}
            >
              {isRecording ? '⏳ 生成中...' : '🔴 录制并导出 (30秒)'}
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#16213e',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ 
                fontSize: '28px', 
                textAlign: 'center', 
                marginBottom: '8px' 
              }}>
                🎉
              </div>
              <h2 style={{ 
                textAlign: 'center', 
                color: '#00d2ff', 
                marginBottom: '24px',
                fontSize: '22px'
              }}>
                录音生成成功！
              </h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#bdc3c7', fontSize: '13px', marginBottom: '8px' }}>
                  分享码
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#0f3460',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '20px',
                    letterSpacing: '4px',
                    color: '#f9ca24',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {shareCode}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyShareCode}
                    style={{
                      padding: '0 16px',
                      borderRadius: '8px',
                      background: '#3498db',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    复制
                  </motion.button>
                </div>
              </div>

              {downloadUrl && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={downloadUrl}
                  download="collab-music.wav"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    marginBottom: '12px'
                  }}
                >
                  📥 下载 WAV 音频
                </motion.a>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowShareModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#2c3e50',
                  color: '#ecf0f1',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                关闭
              </motion.button>

              <div style={{ 
                marginTop: '16px', 
                color: '#7f8c8d', 
                fontSize: '12px', 
                textAlign: 'center' 
              }}>
                💡 其他人可在首页输入分享码加载你的作品
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatePage;
