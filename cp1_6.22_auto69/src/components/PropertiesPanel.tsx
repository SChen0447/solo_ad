import { useCallback, useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronRight,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { FabricObjectWithProps, TemplateData } from '../types/types';

interface PropertiesPanelProps {
  selectedObject: FabricObjectWithProps | null;
  templates: TemplateData[];
  onApplyTemplate: (template: TemplateData) => void;
}

export function PropertiesPanel({
  selectedObject,
  templates,
  onApplyTemplate,
}: PropertiesPanelProps) {
  const {
    activePanel,
    setActivePanel,
    updateSelectedObject,
    rightPanelOpen,
    setRightPanelOpen,
  } = useEditorStore();

  const [localProps, setLocalProps] = useState<Record<string, any>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedObject) {
      setLocalProps({
        left: Math.round(selectedObject.left || 0),
        top: Math.round(selectedObject.top || 0),
        width: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)),
        height: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)),
        angle: Math.round(selectedObject.angle || 0),
        fill: selectedObject.fill || '#000000',
        stroke: selectedObject.stroke || '#000000',
        strokeWidth: selectedObject.strokeWidth || 0,
        text: (selectedObject as any).text || '',
        fontFamily: (selectedObject as any).fontFamily || 'Arial',
        fontSize: (selectedObject as any).fontSize || 24,
        fontWeight: (selectedObject as any).fontWeight || 'normal',
        fontStyle: (selectedObject as any).fontStyle || 'normal',
        underline: (selectedObject as any).underline || false,
        textAlign: (selectedObject as any).textAlign || 'left',
        rx: (selectedObject as any).rx || 0,
        ry: (selectedObject as any).ry || 0,
      });
    }
  }, [selectedObject]);

  const debouncedUpdate = useCallback((key: string, value: any) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setLocalProps(prev => ({ ...prev, [key]: value }));

    debounceRef.current = setTimeout(() => {
      updateSelectedObject({ [key]: value });
    }, 50);
  }, [updateSelectedObject]);

  const handleNumberChange = useCallback((key: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      debouncedUpdate(key, num);
    }
  }, [debouncedUpdate]);

  const isText = selectedObject?.type === 'i-text' || selectedObject?.type === 'text';
  const isRect = selectedObject?.type === 'rect';
  const isCircle = selectedObject?.type === 'circle';

  const fontFamilies = ['Arial', 'Georgia', 'Courier New', 'Impact'];

  const renderTemplatesPanel = () => (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">选择模板</h3>
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onApplyTemplate(template)}
            className="group relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-[#4a90d9] transition-all duration-200"
          >
            <div
              className="aspect-[800/1131] w-full relative"
              style={{ backgroundColor: template.data.background }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 group-hover:text-[#4a90d9] transition-colors">
                  {template.name}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/90 backdrop-blur-sm">
              <p className="text-xs font-medium text-gray-700">{template.name}</p>
              <p className="text-[10px] text-gray-500">{template.category}</p>
            </div>
            <ChevronRight
              size={16}
              className="absolute top-2 right-2 text-gray-400 group-hover:text-[#4a90d9] opacity-0 group-hover:opacity-100 transition-all"
            />
          </button>
        ))}
      </div>
    </div>
  );

  const renderPropertiesPanel = () => {
    if (!selectedObject) {
      return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-gray-500">
          <Palette size={48} className="mb-4 opacity-50" />
          <p className="text-center">选择画布中的元素以编辑属性</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-100px)]">
        <h3 className="text-lg font-semibold text-gray-800">
          {isText ? '文字属性' : isRect ? '矩形属性' : isCircle ? '圆形属性' : '元素属性'}
        </h3>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">位置和尺寸</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">X 坐标</label>
              <input
                type="number"
                value={localProps.left ?? 0}
                onChange={(e) => handleNumberChange('left', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Y 坐标</label>
              <input
                type="number"
                value={localProps.top ?? 0}
                onChange={(e) => handleNumberChange('top', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">宽度</label>
              <input
                type="number"
                value={localProps.width ?? 0}
                min={20}
                onChange={(e) => handleNumberChange('width', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">高度</label>
              <input
                type="number"
                value={localProps.height ?? 0}
                min={20}
                onChange={(e) => handleNumberChange('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">旋转角度</label>
              <input
                type="range"
                value={localProps.angle ?? 0}
                min={0}
                max={360}
                onChange={(e) => handleNumberChange('angle', e.target.value)}
                className="w-full accent-[#4a90d9]"
              />
              <span className="text-xs text-gray-500">{localProps.angle ?? 0}°</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">颜色</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">填充颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localProps.fill || '#000000'}
                  onChange={(e) => debouncedUpdate('fill', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={localProps.fill || '#000000'}
                  onChange={(e) => debouncedUpdate('fill', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#4a90d9]"
                />
              </div>
            </div>
            {!isText && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">边框颜色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localProps.stroke || '#000000'}
                    onChange={(e) => debouncedUpdate('stroke', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={localProps.stroke || '#000000'}
                    onChange={(e) => debouncedUpdate('stroke', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#4a90d9]"
                  />
                </div>
              </div>
            )}
          </div>
          {!isText && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">边框宽度</label>
              <input
                type="range"
                value={localProps.strokeWidth ?? 0}
                min={0}
                max={10}
                step={1}
                onChange={(e) => handleNumberChange('strokeWidth', e.target.value)}
                className="w-full accent-[#4a90d9]"
              />
              <span className="text-xs text-gray-500">{localProps.strokeWidth ?? 0}px</span>
            </div>
          )}
        </div>

        {isRect && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">圆角</label>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">圆角半径</label>
              <input
                type="range"
                value={localProps.rx ?? 0}
                min={0}
                max={50}
                step={1}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  debouncedUpdate('rx', val);
                  debouncedUpdate('ry', val);
                }}
                className="w-full accent-[#4a90d9]"
              />
              <span className="text-xs text-gray-500">{localProps.rx ?? 0}px</span>
            </div>
          </div>
        )}

        {isText && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">文本内容</label>
              <textarea
                value={localProps.text || ''}
                onChange={(e) => debouncedUpdate('text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">字体</label>
              <select
                value={localProps.fontFamily || 'Arial'}
                onChange={(e) => debouncedUpdate('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm"
              >
                {fontFamilies.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">字号</label>
              <input
                type="number"
                value={localProps.fontSize || 24}
                min={12}
                max={120}
                step={1}
                onChange={(e) => handleNumberChange('fontSize', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent text-sm"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">文本样式</label>
              <div className="flex gap-2">
                <button
                  onClick={() => debouncedUpdate('fontWeight', localProps.fontWeight === 'bold' ? 'normal' : 'bold')}
                  className={`
                    flex-1 py-2 px-3 rounded-md border transition-all duration-200
                    ${localProps.fontWeight === 'bold'
                      ? 'bg-[#4a90d9] text-white border-[#4a90d9]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4a90d9]'
                    }
                  `}
                >
                  <Bold size={18} className="mx-auto" />
                </button>
                <button
                  onClick={() => debouncedUpdate('fontStyle', localProps.fontStyle === 'italic' ? 'normal' : 'italic')}
                  className={`
                    flex-1 py-2 px-3 rounded-md border transition-all duration-200
                    ${localProps.fontStyle === 'italic'
                      ? 'bg-[#4a90d9] text-white border-[#4a90d9]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4a90d9]'
                    }
                  `}
                >
                  <Italic size={18} className="mx-auto" />
                </button>
                <button
                  onClick={() => debouncedUpdate('underline', !localProps.underline)}
                  className={`
                    flex-1 py-2 px-3 rounded-md border transition-all duration-200
                    ${localProps.underline
                      ? 'bg-[#4a90d9] text-white border-[#4a90d9]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4a90d9]'
                    }
                  `}
                >
                  <Underline size={18} className="mx-auto" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">对齐方式</label>
              <div className="flex gap-2">
                <button
                  onClick={() => debouncedUpdate('textAlign', 'left')}
                  className={`
                    flex-1 py-2 px-3 rounded-md border transition-all duration-200
                    ${localProps.textAlign === 'left'
                      ? 'bg-[#4a90d9] text-white border-[#4a90d9]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4a90d9]'
                    }
                  `}
                >
                  <AlignLeft size={18} className="mx-auto" />
                </button>
                <button
                  onClick={() => debouncedUpdate('textAlign', 'center')}
                  className={`
                    flex-1 py-2 px-3 rounded-md border transition-all duration-200
                    ${localProps.textAlign === 'center'
                      ? 'bg-[#4a90d9] text-white border-[#4a90d9]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4a90d9]'
                    }
                  `}
                >
                  <AlignCenter size={18} className="mx-auto" />
                </button>
                <button
                  onClick={() => debouncedUpdate('textAlign', 'right')}
                  className={`
                    flex-1 py-2 px-3 rounded-md border transition-all duration-200
                    ${localProps.textAlign === 'right'
                      ? 'bg-[#4a90d9] text-white border-[#4a90d9]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4a90d9]'
                    }
                  `}
                >
                  <AlignRight size={18} className="mx-auto" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
      >
        <ChevronRight size={20} className="text-gray-700" />
      </button>

      <div
        className={`
          fixed lg:static right-0 top-0 h-full w-80 bg-white shadow-lg z-40
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActivePanel('templates')}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors duration-200
              ${activePanel === 'templates'
                ? 'text-[#4a90d9] border-b-2 border-[#4a90d9]'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            模板
          </button>
          <button
            onClick={() => setActivePanel('properties')}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors duration-200
              ${activePanel === 'properties'
                ? 'text-[#4a90d9] border-b-2 border-[#4a90d9]'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            属性
          </button>
          <button
            onClick={() => setRightPanelOpen(false)}
            className="lg:hidden px-3 hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activePanel === 'templates' ? renderTemplatesPanel() : renderPropertiesPanel()}
        </div>
      </div>

      {rightPanelOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setRightPanelOpen(false)}
        />
      )}
    </>
  );
}
