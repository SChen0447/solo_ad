import { motion, AnimatePresence } from 'framer-motion';
import { X, Thermometer, Droplets, Wind, MapPin } from 'lucide-react';
import type { OceanCurrent } from '../types';
import { useStore } from '../store/useStore';

function InfoPanel() {
  const { selectedCurrent, setSelectedCurrent } = useStore();

  if (!selectedCurrent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className="fixed right-4 md:right-6 bottom-4 md:bottom-24 w-full md:w-[300px] max-h-[80vh] z-50"
      >
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl gradient-border">
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white display-font">
                  {selectedCurrent.name}
                </h3>
                <p className="text-sm text-gray-400 font-medium">
                  {selectedCurrent.nameEn}
                </p>
              </div>
              <button
                onClick={() => setSelectedCurrent(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div
              className="h-1.5 rounded-full mb-5"
              style={{
                background: `linear-gradient(90deg, ${selectedCurrent.colorStart}, ${selectedCurrent.colorEnd})`,
              }}
            />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedCurrent.type === 'warm'
                      ? 'bg-orange-500/20'
                      : 'bg-blue-500/20'
                  }`}
                >
                  <span className="text-xs font-bold">
                    {selectedCurrent.type === 'warm' ? '暖' : '寒'}
                  </span>
                </div>
                <span className="text-sm text-gray-300">
                  {selectedCurrent.type === 'warm' ? '暖流' : '寒流'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>平均温度</span>
                  </div>
                  <p className="text-lg font-bold text-white mono">
                    {selectedCurrent.avgTemperature}
                    <span className="text-sm font-normal text-gray-400 ml-1">
                      ℃
                    </span>
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>平均盐度</span>
                  </div>
                  <p className="text-lg font-bold text-white mono">
                    {selectedCurrent.avgSalinity}
                    <span className="text-sm font-normal text-gray-400 ml-1">
                      ‰
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Wind className="w-3.5 h-3.5" />
                  <span>流量</span>
                </div>
                <p className="text-lg font-bold text-white mono">
                  {selectedCurrent.flowRate}
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    Sv
                  </span>
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>影响区域</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCurrent.affectedRegions.map((region, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-white/10 rounded-md text-xs text-gray-300"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedCurrent.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InfoPanel;
