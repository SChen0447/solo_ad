import { motion } from 'framer-motion';
import { Thermometer, Droplets } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { LayerType } from '../types';

function LayerToggle() {
  const { activeLayer, setActiveLayer } = useStore();

  const layers: { id: LayerType; icon: typeof Thermometer; label: string }[] = [
    { id: 'temperature', icon: Thermometer, label: '温度' },
    { id: 'salinity', icon: Droplets, label: '盐度' },
  ];

  return (
    <div className="flex items-center gap-2">
      {layers.map((layer) => {
        const Icon = layer.icon;
        const isActive = activeLayer === layer.id;

        return (
          <motion.button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeLayer"
                className="absolute inset-0 bg-gradient-to-r from-ocean-500/30 to-ocean-400/30 rounded-xl"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="text-sm font-medium relative z-10 hidden md:inline">
              {layer.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default LayerToggle;
