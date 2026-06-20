import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="initial"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="hero-section">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          AI 驱动的简历优化专家
        </motion.h1>
        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          上传简历，智能分析匹配度，获取专业修改建议
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/upload" className="hero-btn">
            开始优化简历
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="features-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="feature-card">
          <div className="feature-icon">📄</div>
          <h3 className="feature-title">智能解析</h3>
          <p className="feature-desc">自动识别PDF和图片格式简历，提取关键信息</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3 className="feature-title">精准匹配</h3>
          <p className="feature-desc">多维度技能分析，量化岗位匹配度评分</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💡</div>
          <h3 className="feature-title">专业建议</h3>
          <p className="feature-desc">针对薄弱环节提供具体可行的修改建议</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3 className="feature-title">历史记录</h3>
          <p className="feature-desc">保存多次分析结果，追踪简历优化进度</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomePage;
