import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAllScenes, SceneData } from './DialogueData';
import './SceneSelector.css';

const SceneSelector: React.FC = () => {
  const navigate = useNavigate();
  const scenes = getAllScenes();

  const handleSceneClick = (sceneId: string) => {
    navigate(`/dialogue/${sceneId}`);
  };

  const handleRecordsClick = () => {
    navigate('/records');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="scene-selector-page">
      <header className="page-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🗣️</span>
            LinguaFlow
          </h1>
          <p className="app-subtitle">沉浸式英语口语训练</p>
        </div>
        <motion.button
          className="nav-button"
          onClick={handleRecordsClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
        >
          <span className="nav-icon">📊</span>
          学习记录
        </motion.button>
      </header>

      <main className="main-content">
        <div className="scene-section">
          <h2 className="section-title">选择练习场景</h2>
          <p className="section-desc">
            真实场景模拟，30秒限时对话，让你的口语更地道
          </p>

          <motion.div 
            className="scene-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {scenes.map((scene: SceneData) => (
              <motion.div
                key={scene.id}
                className="scene-card"
                variants={cardVariants}
                onClick={() => handleSceneClick(scene.id)}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3, ease: 'ease' }}
              >
                <div className="card-icon">{scene.icon}</div>
                <div className="card-info">
                  <h3 className="card-title">{scene.name}</h3>
                  <p className="card-subtitle">
                    <span className="role-name">{scene.roleName}</span>
                    <span className="rounds-count">· {scene.turns.length}轮对话</span>
                  </p>
                </div>
                <div className="card-arrow">→</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="features-section">
          <div className="feature-item">
            <div className="feature-icon">⏱️</div>
            <h4>限时挑战</h4>
            <p>每轮30秒作答，模拟真实对话压力</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <h4>即时评分</h4>
            <p>发音准确度 + 语法检测，全面反馈</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📈</div>
            <h4>进度追踪</h4>
            <p>历史成绩可视化，见证进步轨迹</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SceneSelector;
