import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSceneById, SceneData, DialogueTurn } from './DialogueData';
import ScoringPanel from '../components/ScoringPanel';
import { startListening, stopListening, isVoiceRecognitionAvailable } from '../utils/voiceRecognition';
import { calculateScore, ScoreResult } from '../utils/textComparison';
import './DialogueEngine.css';

interface Message {
  id: string;
  type: 'user' | 'role';
  text: string;
  isPassed?: boolean;
  isTimeout?: boolean;
}

interface TrainingRecord {
  id: string;
  date: string;
  sceneId: string;
  sceneName: string;
  totalTurns: number;
  passedTurns: number;
  avgResponseTime: number;
  grammarErrorCount: number;
  score: number;
}

const COUNTDOWN_SECONDS = 30;
const STORAGE_KEY = 'linguaflow_records';

const DialogueEngine: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  
  const [scene, setScene] = useState<SceneData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [currentScore, setCurrentScore] = useState<ScoreResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [passedRounds, setPassedRounds] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [grammarErrorCount, setGrammarErrorCount] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isWaitingRole, setIsWaitingRole] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roundStartTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sceneId) {
      const sceneData = getSceneById(sceneId);
      if (sceneData) {
        setScene(sceneData);
        initializeDialogue(sceneData);
      } else {
        navigate('/');
      }
    }
    setVoiceSupported(isVoiceRecognitionAvailable());
  }, [sceneId, navigate]);

  const initializeDialogue = (sceneData: SceneData) => {
    if (sceneData.turns.length > 0) {
      const firstMessage: Message = {
        id: 'role-0',
        type: 'role',
        text: sceneData.turns[0].roleLine,
      };
      setMessages([firstMessage]);
      setCurrentRound(0);
      setIsTimerActive(true);
      roundStartTimeRef.current = Date.now();
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerActive]);

  const handleTimeout = () => {
    setIsTimerActive(false);
    stopListening();
    setIsRecording(false);
    
    const userMessage: Message = {
      id: `user-${currentRound}`,
      type: 'user',
      text: '（超时未作答）',
      isPassed: false,
      isTimeout: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentScore(null);
    setRecognizedText('');
    
    setTimeout(() => {
      proceedToNextRound(false, 0);
    }, 1500);
  };

  const handleStartRecording = () => {
    if (!voiceSupported) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器');
      return;
    }
    
    if (isRecording || isSessionComplete || isWaitingRole) return;
    
    setIsRecording(true);
    
    startListening({
      onResult: (text) => {
        setRecognizedText(text);
        handleRecognitionComplete(text);
      },
      onError: (error) => {
        console.error('语音识别错误:', error);
        setIsRecording(false);
        if (!isTimerActive) return;
      },
      onEnd: () => {
        setIsRecording(false);
      },
    });
  };

  const handleRecognitionComplete = (text: string) => {
    if (!scene || !isTimerActive) return;
    
    setIsTimerActive(false);
    stopListening();
    setIsRecording(false);
    
    const responseTime = (Date.now() - roundStartTimeRef.current) / 1000;
    setResponseTimes(prev => [...prev, responseTime]);
    
    const currentTurn = scene.turns[currentRound];
    const score = calculateScore(text, currentTurn.standardAnswer);
    setCurrentScore(score);
    
    if (score.grammarErrors) {
      setGrammarErrorCount(prev => prev + score.grammarErrors.length);
    }
    
    const userMessage: Message = {
      id: `user-${currentRound}`,
      type: 'user',
      text: text,
      isPassed: score.isPassed,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    if (score.isPassed) {
      setPassedRounds(prev => prev + 1);
    }
    
    setTimeout(() => {
      proceedToNextRound(score.isPassed, responseTime);
    }, 2000);
  };

  const proceedToNextRound = (passed: boolean, responseTime: number) => {
    if (!scene) return;
    
    setIsWaitingRole(true);
    
    setTimeout(() => {
      const nextRound = currentRound + 1;
      
      if (nextRound >= scene.turns.length) {
        handleSessionComplete();
        return;
      }
      
      const nextTurn = scene.turns[nextRound];
      let roleResponse = nextTurn.roleLine;
      
      if (!passed && currentRound < scene.turns.length - 1) {
        const encouragement = getEncouragement();
        roleResponse = encouragement + ' ' + roleResponse;
      }
      
      const roleMessage: Message = {
        id: `role-${nextRound}`,
        type: 'role',
        text: roleResponse,
      };
      
      setMessages(prev => [...prev, roleMessage]);
      setCurrentRound(nextRound);
      setCurrentScore(null);
      setRecognizedText('');
      setTimeLeft(COUNTDOWN_SECONDS);
      setIsTimerActive(true);
      setIsWaitingRole(false);
      roundStartTimeRef.current = Date.now();
    }, 1000);
  };

  const getEncouragement = (): string => {
    const encouragements = [
      "没关系，继续加油！",
      "别担心，我们继续。",
      "说得不错，再来一句！",
      "很好，继续保持！",
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  const handleSessionComplete = () => {
    setIsSessionComplete(true);
    setIsTimerActive(false);
    stopListening();
    
    if (scene) {
      const totalRounds = scene.turns.length;
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      const finalScore = Math.round((passedRounds / totalRounds) * 100);
      
      const record: TrainingRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        sceneId: scene.id,
        sceneName: scene.name,
        totalTurns: totalRounds,
        passedTurns: passedRounds,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        grammarErrorCount,
        score: finalScore,
      };
      
      saveRecord(record);
    }
  };

  const saveRecord = (record: TrainingRecord) => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const records: TrainingRecord[] = existing ? JSON.parse(existing) : [];
      records.unshift(record);
      if (records.length > 50) {
        records.splice(50);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('保存记录失败:', e);
    }
  };

  const handleGoBack = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopListening();
    navigate('/');
  };

  const handleRestart = () => {
    if (scene) {
      setMessages([]);
      setCurrentRound(0);
      setCurrentScore(null);
      setRecognizedText('');
      setTimeLeft(COUNTDOWN_SECONDS);
      setIsTimerActive(false);
      setPassedRounds(0);
      setResponseTimes([]);
      setGrammarErrorCount(0);
      setIsSessionComplete(false);
      setIsWaitingRole(false);
      
      setTimeout(() => {
        initializeDialogue(scene);
      }, 100);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (timeLeft <= 10) return '#ff4444';
    if (timeLeft <= 20) return '#e6a23c';
    return '#00c853';
  };

  if (!scene) {
    return (
      <div className="dialogue-loading">
        <p>加载中...</p>
      </div>
    );
  }

  const currentTurn = scene.turns[currentRound];
  const standardText = currentTurn?.standardAnswer || '';

  return (
    <div className="dialogue-page">
      <header className="dialogue-header">
        <motion.button
          className="back-button"
          onClick={handleGoBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
        >
          ← 返回
        </motion.button>
        <div className="scene-info">
          <span className="scene-icon">{scene.icon}</span>
          <h2 className="scene-name">{scene.name}</h2>
        </div>
        <div className="header-spacer" />
      </header>

      <div className="dialogue-container">
        <div className="dialogue-left">
          <div className="dialogue-messages">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`message-bubble ${message.type} ${message.isTimeout ? 'timeout' : ''}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {message.type === 'role' && (
                    <div className="message-avatar role">
                      {scene.icon}
                    </div>
                  )}
                  <div className="message-content">
                    {message.type === 'role' && (
                      <span className="message-name">{scene.roleName}</span>
                    )}
                    <p className="message-text">{message.text}</p>
                    {message.type === 'user' && 'isPassed' in message && (
                      <span className={`message-status ${message.isPassed ? 'passed' : 'failed'}`}>
                        {message.isTimeout ? '⏱ 超时' : message.isPassed ? '✓ 通过' : '✗ 未通过'}
                      </span>
                    )}
                  </div>
                  {message.type === 'user' && (
                    <div className="message-avatar user">
                      👤
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="timer-bar" style={{ width: `${(timeLeft / COUNTDOWN_SECONDS) * 100}%`, backgroundColor: getTimerColor() }} />
            
            <div className="input-controls">
              <div className="timer-display" style={{ color: getTimerColor() }}>
                <span className="timer-icon">⏱</span>
                <span className="timer-text">{formatTime(timeLeft)}</span>
              </div>
              
              {!isSessionComplete && !isWaitingRole && (
                <motion.button
                  className={`record-button ${isRecording ? 'recording' : ''}`}
                  onClick={handleStartRecording}
                  disabled={!isTimerActive || isRecording}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                >
                  {isRecording ? (
                    <>
                      <span className="recording-pulse" />
                      录音中...
                    </>
                  ) : (
                    <>
                      <span className="mic-icon">🎤</span>
                      开始回答
                    </>
                  )}
                </motion.button>
              )}
              
              {isWaitingRole && (
                <div className="waiting-role">
                  <span className="typing-indicator">
                    <span /><span /><span />
                  </span>
                  对方正在输入...
                </div>
              )}
              
              {isSessionComplete && (
                <motion.button
                  className="restart-button"
                  onClick={handleRestart}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                >
                  🔄 再来一次
                </motion.button>
              )}
            </div>
            
            {recognizedText && (
              <div className="recognized-text-preview">
                识别中: {recognizedText}
              </div>
            )}
            
            {!voiceSupported && (
              <div className="voice-not-supported">
                ⚠️ 您的浏览器不支持语音识别，请使用 Chrome 浏览器
              </div>
            )}
          </div>
        </div>

        <div className="dialogue-right">
          <div className="scoring-panel-wrapper">
            <ScoringPanel
              score={currentScore}
              currentRound={isSessionComplete ? scene.turns.length : currentRound + 1}
              totalRounds={scene.turns.length}
              passedRounds={passedRounds}
              recognizedText={recognizedText}
              standardText={standardText}
            />
            
            {isSessionComplete && (
              <motion.div 
                className="session-summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h4>🎉 训练完成！</h4>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-value">{passedRounds}/{scene.turns.length}</span>
                    <span className="stat-label">通过轮次</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : '0'}s</span>
                    <span className="stat-label">平均响应</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{grammarErrorCount}</span>
                    <span className="stat-label">语法错误</span>
                  </div>
                </div>
                <motion.button
                  className="view-records-btn"
                  onClick={() => navigate('/records')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                >
                  查看学习记录 →
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueEngine;
