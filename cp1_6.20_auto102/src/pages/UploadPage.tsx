import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ResumeUploader from '../components/ResumeUploader';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 }
  };

  const handleUploadComplete = (fileId: string) => {
    navigate(`/analyze?fileId=${fileId}`);
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="initial"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <h1 className="page-title">上传简历</h1>
      <p className="page-subtitle">上传您的简历文件，系统将自动解析并分析匹配度</p>
      <ResumeUploader onUploadComplete={handleUploadComplete} />
    </motion.div>
  );
};

export default UploadPage;
