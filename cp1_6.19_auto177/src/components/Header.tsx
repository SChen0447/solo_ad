import { Globe } from 'lucide-react';
import LayerToggle from './LayerToggle';

function Header() {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="glass-panel rounded-2xl px-5 py-3 inline-flex items-center gap-3 w-fit">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center shadow-lg">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white display-font leading-tight">
              全球洋流可视化器
            </h1>
            <p className="text-xs text-gray-400">
              Ocean Current Visualizer
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl px-2 py-1.5 inline-flex items-center w-fit">
          <LayerToggle />
        </div>
      </div>
    </div>
  );
}

export default Header;
