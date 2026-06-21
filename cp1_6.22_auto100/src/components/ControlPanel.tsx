import { useState, useEffect } from 'react';
import { useMoleculeStore } from '../store/useMoleculeStore';
import { ELEMENT_COLORS, ELEMENT_NAMES } from '../types';
import type { ElementType } from '../types';

const ControlPanel = () => {
  const { 
    molecules, 
    currentMolecule, 
    params, 
    loading, 
    setCurrentMolecule, 
    setParams,
    fetchMolecules,
    selectedAtom,
    selectedBond,
    setSelectedAtom,
    setSelectedBond
  } = useMoleculeStore();

  const [bondScaleInput, setBondScaleInput] = useState(params.bondScale.toString());
  const [atomScaleInput, setAtomScaleInput] = useState(params.atomScale.toString());
  const [lightIntensityInput, setLightIntensityInput] = useState(params.lightIntensity.toString());

  useEffect(() => {
    fetchMolecules();
  }, [fetchMolecules]);

  useEffect(() => {
    setBondScaleInput(params.bondScale.toString());
    setAtomScaleInput(params.atomScale.toString());
    setLightIntensityInput(params.lightIntensity.toString());
  }, [params]);

  const handleBondScaleChange = (value: number) => {
    const clamped = Math.max(0.3, Math.min(3, value));
    setParams({ bondScale: clamped });
    setBondScaleInput(clamped.toString());
  };

  const handleAtomScaleChange = (value: number) => {
    const clamped = Math.max(0.3, Math.min(3, value));
    setParams({ atomScale: clamped });
    setAtomScaleInput(clamped.toString());
  };

  const handleLightIntensityChange = (value: number) => {
    const clamped = Math.max(0.1, Math.min(3, value));
    setParams({ lightIntensity: clamped });
    setLightIntensityInput(clamped.toString());
  };

  const handleInputChange = (
    inputValue: string,
    setter: (value: number) => void,
    inputSetter: (value: string) => void
  ) => {
    inputSetter(inputValue);
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      setter(num);
    }
  };

  const handleInputBlur = (
    inputValue: string,
    setter: (value: number) => void,
    inputSetter: (value: string) => void,
    min: number,
    max: number
  ) => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) {
      inputSetter(params.bondScale.toString());
    } else {
      const clamped = Math.max(min, Math.min(max, num));
      setter(clamped);
      inputSetter(clamped.toString());
    }
  };

  const handleReset = () => {
    setParams({
      bondScale: 1.0,
      atomScale: 1.0,
      lightIntensity: 1.0,
    });
    setSelectedAtom(null);
    setSelectedBond(null);
  };

  const elements: ElementType[] = ['C', 'H', 'O', 'N'];

  return (
    <div 
      className="w-full h-full flex flex-col p-5 overflow-y-auto"
      style={{ 
        backgroundColor: '#1a202c',
        color: '#e2e8f0',
      }}
    >
      <div className="mb-6">
        <h1 
          className="text-xl font-bold mb-1"
          style={{ transition: 'all 0.2s ease' }}
        >
          分子结构查看器
        </h1>
        <p className="text-sm text-gray-400">
          交互式3D分子模型教学工具
        </p>
      </div>

      <div className="mb-6">
        <label 
          className="block text-sm font-medium mb-2 text-gray-300"
          style={{ transition: 'all 0.2s ease' }}
        >
          选择分子
        </label>
        <select
          value={currentMolecule?.id || ''}
          onChange={(e) => {
            const molecule = molecules.find(m => m.id === e.target.value);
            if (molecule) setCurrentMolecule(molecule);
          }}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-blue-400 disabled:opacity-50"
          style={{ transition: 'all 0.2s ease' }}
        >
          {loading ? (
            <option value="">加载中...</option>
          ) : (
            molecules.map((mol) => (
              <option key={mol.id} value={mol.id}>
                {mol.name} ({mol.formula})
              </option>
            ))
          )}
        </select>
      </div>

      <div className="mb-6">
        <label 
          className="block text-sm font-medium mb-3 text-gray-300"
          style={{ transition: 'all 0.2s ease' }}
        >
          元素图例
        </label>
        <div className="grid grid-cols-2 gap-2">
          {elements.map((el) => (
            <div 
              key={el}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50"
              style={{ transition: 'all 0.2s ease' }}
            >
              <div 
                className="w-5 h-5 rounded-full border-2 border-gray-600"
                style={{ backgroundColor: ELEMENT_COLORS[el] }}
              />
              <span className="text-sm">
                {ELEMENT_NAMES[el]} ({el})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label 
              className="text-sm font-medium text-gray-300"
              style={{ transition: 'all 0.2s ease' }}
            >
              键长缩放
            </label>
            <input
              type="number"
              value={bondScaleInput}
              onChange={(e) => handleInputChange(e.target.value, handleBondScaleChange, setBondScaleInput)}
              onBlur={() => handleInputBlur(bondScaleInput, handleBondScaleChange, setBondScaleInput, 0.3, 3)}
              step="0.1"
              min="0.3"
              max="3"
              className="w-20 px-2 py-1 text-right text-sm rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-blue-400"
              style={{ transition: 'all 0.2s ease' }}
            />
          </div>
          <div className="relative">
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.01"
              value={params.bondScale}
              onChange={(e) => handleBondScaleChange(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                width: '240px',
                background: `linear-gradient(to right, #63b3ed 0%, #63b3ed ${((params.bondScale - 0.3) / 2.7) * 100}%, #4a5568 ${((params.bondScale - 0.3) / 2.7) * 100}%, #4a5568 100%)`,
                transition: 'all 0.2s ease',
              }}
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #63b3ed;
                cursor: pointer;
                border: 2px solid #ffffff;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              }
              input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
              }
              input[type="range"]::-webkit-slider-thumb:active {
                background: #63b3ed;
                transform: scale(1.15);
              }
              input[type="range"]::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #63b3ed;
                cursor: pointer;
                border: 2px solid #ffffff;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              }
            `}</style>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.3</span>
            <span>3.0</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label 
              className="text-sm font-medium text-gray-300"
              style={{ transition: 'all 0.2s ease' }}
            >
              原子半径缩放
            </label>
            <input
              type="number"
              value={atomScaleInput}
              onChange={(e) => handleInputChange(e.target.value, handleAtomScaleChange, setAtomScaleInput)}
              onBlur={() => handleInputBlur(atomScaleInput, handleAtomScaleChange, setAtomScaleInput, 0.3, 3)}
              step="0.1"
              min="0.3"
              max="3"
              className="w-20 px-2 py-1 text-right text-sm rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-blue-400"
              style={{ transition: 'all 0.2s ease' }}
            />
          </div>
          <div className="relative">
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.01"
              value={params.atomScale}
              onChange={(e) => handleAtomScaleChange(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                width: '240px',
                background: `linear-gradient(to right, #63b3ed 0%, #63b3ed ${((params.atomScale - 0.3) / 2.7) * 100}%, #4a5568 ${((params.atomScale - 0.3) / 2.7) * 100}%, #4a5568 100%)`,
                transition: 'all 0.2s ease',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.3</span>
            <span>3.0</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label 
              className="text-sm font-medium text-gray-300"
              style={{ transition: 'all 0.2s ease' }}
            >
              光照强度
            </label>
            <input
              type="number"
              value={lightIntensityInput}
              onChange={(e) => handleInputChange(e.target.value, handleLightIntensityChange, setLightIntensityInput)}
              onBlur={() => handleInputBlur(lightIntensityInput, handleLightIntensityChange, setLightIntensityInput, 0.1, 3)}
              step="0.1"
              min="0.1"
              max="3"
              className="w-20 px-2 py-1 text-right text-sm rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-blue-400"
              style={{ transition: 'all 0.2s ease' }}
            />
          </div>
          <div className="relative">
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={params.lightIntensity}
              onChange={(e) => handleLightIntensityChange(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                width: '240px',
                background: `linear-gradient(to right, #63b3ed 0%, #63b3ed ${((params.lightIntensity - 0.1) / 2.9) * 100}%, #4a5568 ${((params.lightIntensity - 0.1) / 2.9) * 100}%, #4a5568 100%)`,
                transition: 'all 0.2s ease',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.1</span>
            <span>3.0</span>
          </div>
        </div>
      </div>

      {(selectedAtom || selectedBond) && (
        <div 
          className="mt-6 p-3 rounded-lg bg-blue-900/30 border border-blue-500/30"
          style={{ transition: 'all 0.2s ease' }}
        >
          <div className="text-sm text-blue-300 font-medium mb-1">
            当前选中
          </div>
          {selectedAtom && (
            <div className="text-xs text-gray-300">
              {ELEMENT_NAMES[selectedAtom.element]}原子 #{selectedAtom.index}
            </div>
          )}
          {selectedBond && (
            <div className="text-xs text-gray-300">
              化学键: {selectedBond.atom1.element} — {selectedBond.atom2.element}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleReset}
          className="w-full py-3 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-400"
          style={{ transition: 'all 0.2s ease' }}
        >
          重置参数
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <div>性能指标:</div>
          <div>• 最大原子数: 50</div>
          <div>• 最大化学键: 100</div>
          <div>• 目标帧率: 60 FPS</div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
