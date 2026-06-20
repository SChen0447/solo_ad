import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../App';

const HomePage = () => {
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'share'>('home');
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [shareCode, setShareCode] = useState('');
  const { createRoom, joinRoom, loadSharedProject } = useApp();

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !userName.trim()) {
      alert('请输入房间名和用户名');
      return;
    }
    if (roomName.length > 20) {
      alert('房间名最多20个字符');
      return;
    }
    await createRoom(roomName.trim(), userName.trim());
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !userName.trim()) {
      alert('请输入房间码和用户名');
      return;
    }
    if (roomCode.length !== 6 || !/^\d+$/.test(roomCode)) {
      alert('房间码为6位数字');
      return;
    }
    await joinRoom(roomCode.trim(), userName.trim());
  };

  const handleLoadShare = async () => {
    if (!shareCode.trim()) {
      alert('请输入分享码');
      return;
    }
    await loadSharedProject(shareCode.trim());
  };

  if (mode === 'create') {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '40px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: '#16213e',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '420px'
          }}
        >
          <h1 style={{ color: '#00d2ff', marginBottom: '32px', textAlign: 'center', fontSize: '28px' }}>
            创建协作房间
          </h1>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#bdc3c7', fontSize: '14px' }}>
              你的昵称
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入你的昵称"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#0f3460',
                color: '#ecf0f1',
                fontSize: '16px',
                border: '1px solid #2c3e50'
              }}
              maxLength={20}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#bdc3c7', fontSize: '14px' }}>
              房间名称 (最多20字符)
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="输入房间名称"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#0f3460',
                color: '#ecf0f1',
                fontSize: '16px',
                border: '1px solid #2c3e50'
              }}
              maxLength={20}
            />
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#7f8c8d', textAlign: 'right' }}>
              {roomName.length}/20
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('home')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                background: '#2c3e50',
                color: '#ecf0f1',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              返回
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateRoom}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              创建房间
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '40px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: '#16213e',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '420px'
          }}
        >
          <h1 style={{ color: '#00d2ff', marginBottom: '32px', textAlign: 'center', fontSize: '28px' }}>
            加入协作房间
          </h1>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#bdc3c7', fontSize: '14px' }}>
              你的昵称
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入你的昵称"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#0f3460',
                color: '#ecf0f1',
                fontSize: '16px',
                border: '1px solid #2c3e50'
              }}
              maxLength={20}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#bdc3c7', fontSize: '14px' }}>
              房间码 (6位数字)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="输入6位房间码"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#0f3460',
                color: '#e94560',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: '8px',
                textAlign: 'center',
                border: '1px solid #2c3e50'
              }}
              maxLength={6}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('home')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                background: '#2c3e50',
                color: '#ecf0f1',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              返回
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinRoom}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              加入房间
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === 'share') {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '40px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: '#16213e',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '420px'
          }}
        >
          <h1 style={{ color: '#f9ca24', marginBottom: '32px', textAlign: 'center', fontSize: '28px' }}>
            加载分享项目
          </h1>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#bdc3c7', fontSize: '14px' }}>
              分享码 (8位字母数字)
            </label>
            <input
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="输入分享码"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#0f3460',
                color: '#f9ca24',
                fontSize: '20px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: '4px',
                textAlign: 'center',
                border: '1px solid #2c3e50'
              }}
              maxLength={8}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('home')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                background: '#2c3e50',
                color: '#ecf0f1',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              返回
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLoadShare}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #f9ca24, #f0932b)',
                color: '#1a1a2e',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              加载项目
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '40px'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '48px' }}
      >
        <div style={{ 
          fontSize: '56px', 
          fontWeight: 'bold', 
          background: 'linear-gradient(90deg, #00d2ff, #3a7bd5, #f9ca24)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '12px'
        }}>
          🎵 Collab Music Studio
        </div>
        <div style={{ fontSize: '18px', color: '#95a5a6', maxWidth: '500px', lineHeight: '1.6' }}>
          与朋友实时协作创作音乐，可视化波形与粒子特效，一键分享你的创意
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '360px' }}>
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0, 210, 255, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMode('create')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0, 210, 255, 0.2)'
          }}
        >
          ➕ 创建新房间
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(78, 205, 196, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMode('join')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(78, 205, 196, 0.2)'
          }}
        >
          🔑 加入房间
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(249, 202, 36, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMode('share')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f9ca24 0%, #f0932b 100%)',
            color: '#1a1a2e',
            fontSize: '18px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(249, 202, 36, 0.2)'
          }}
        >
          📤 加载分享
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        style={{ marginTop: '48px', textAlign: 'center', color: '#7f8c8d', fontSize: '14px' }}
      >
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff6b6b' }}></div>
            <span>鼓手</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ecdc4' }}></div>
            <span>键盘</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#45b7d1' }}></div>
            <span>贝斯</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f9ca24' }}></div>
            <span>主音</span>
          </div>
        </div>
        最多支持 4 人同时在线协作
      </motion.div>
    </div>
  );
};

export default HomePage;
