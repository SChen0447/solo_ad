import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

interface LoadingScreenProps {
  progress?: number;
}

function LoadingScreen({ progress = 0 }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-space-dark flex flex-col items-center justify-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center shadow-2xl shadow-ocean-500/30">
          <Globe className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2 display-font">
        全球洋流可视化器
      </h2>
      <p className="text-gray-400 mb-6">正在加载地球数据...</p>

      <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-ocean-500 to-ocean-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <p className="text-sm text-gray-500 mt-3 font-mono">
        {Math.round(progress)}%
      </p>
    </motion.div>
  );
}

export default LoadingScreen;
