import React, { useRef, useCallback } from 'react';
import { Upload, FileText, Play, Clock, Users, MapPin, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMetaStore } from '../stores/metaStore';
import type { EventNode, Character } from '../types';

const ControlPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    rawText,
    events,
    characters,
    config,
    isParsing,
    parseError,
    isLeftPanelCollapsed,
    setRawText,
    parseText,
    setShowEditModal,
    setNodeSpacing,
    setIsLeftPanelCollapsed,
    setHighlightedCharacter,
    addEvent
  } = useMetaStore(state => ({
    rawText: state.rawText,
    events: state.events,
    characters: state.characters,
    config: state.config,
    isParsing: state.isParsing,
    parseError: state.parseError,
    isLeftPanelCollapsed: state.isLeftPanelCollapsed,
    setRawText: state.setRawText,
    parseText: state.parseText,
    setShowEditModal: state.setShowEditModal,
    setNodeSpacing: state.setNodeSpacing,
    setIsLeftPanelCollapsed: state.setIsLeftPanelCollapsed,
    setHighlightedCharacter: state.setHighlightedCharacter,
    addEvent: state.addEvent
  }));

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  }, [setRawText]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawText(text);
      };
      reader.readAsText(file);
    }
  }, [setRawText]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const getCharacterColor = (charId: string): string => {
    const char = characters.find(c => c.id === charId);
    return char?.color || '#e8a87c';
  };

  const getCharacterName = (charId: string): string => {
    const char = characters.find(c => c.id === charId);
    return char?.name || '未知';
  };

  const handleAddEvent = () => {
    addEvent({
      title: '新事件',
      description: '',
      timestamp: null,
      order: events.length,
      characterIds: [],
      location: null,
      type: 'default'
    });
  };

  if (isLeftPanelCollapsed) {
    return (
      <div 
        className="h-full bg-[#faf6f0] border-r border-[#e8e0d5] flex items-center justify-center cursor-pointer hover:bg-[#f5efe6] transition-all duration-300"
        style={{ width: '32px' }}
        onClick={() => setIsLeftPanelCollapsed(false)}
      >
        <ChevronRight size={20} className="text-[#8b7355]" />
      </div>
    );
  }

  return (
    <div 
      className="h-full bg-[#faf6f0] border-r border-[#e8e0d5] flex flex-col transition-all duration-300 overflow-hidden"
      style={{ width: '320px' }}
    >
      <div className="p-4 border-b border-[#e8e0d5] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#3d3d3d]">控制面板</h2>
        <button
          onClick={() => setIsLeftPanelCollapsed(true)}
          className="p-1 rounded hover:bg-[#f0e8dc] transition-colors"
          aria-label="收起面板"
        >
          <ChevronLeft size={20} className="text-[#8b7355]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b6b6b] flex items-center gap-2">
          <FileText size={16} />
            文本导入
          </h3>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-[#d4c8b8] rounded-lg p-4 text-center cursor-pointer hover:border-[#8b7355] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-2 text-[#8b7355]" />
            <p className="text-sm text-[#6b6b6b]">拖拽文件到此处</p>
            <p className="text-xs text-[#9b9b9b] mt-1">或点击选择 .txt 或 .md 文件</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b6b6b] flex items-center gap-2">
          <FileText size={16} />
            文本内容
          </h3>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="在此粘贴或输入文本内容..."
            className="w-full h-32 p-3 border border-[#d4c8b8] rounded-lg bg-white text-sm text-[#3d3d3d] placeholder-[#9b9b9b] resize-none focus:outline-none focus:border-[#8b7355] transition-colors"
          />
          
          <button
            onClick={parseText}
            disabled={isParsing || !rawText.trim()}
            className="w-full py-2 px-4 bg-[#8b7355] text-white rounded-lg font-medium hover:bg-[#7a6348] disabled:bg-[#c4b8a8] disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Play size={16} className={isParsing ? 'animate-spin' : ''} />
            {isParsing ? '解析中...' : '解析文本'}
          </button>
          
          {parseError && (
            <p className="text-sm text-[#8b4557]">{parseError}</p>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b6b6b] flex items-center justify-between">
            <span className="flex items-center gap-2">
          <Clock size={16} />
              事件列表 ({events.length})
            </span>
            <button
              onClick={handleAddEvent}
              className="p-1 rounded hover:bg-[#f0e8dc] transition-colors"
              aria-label="添加事件"
            >
              <Plus size={16} className="text-[#8b7355]" />
            </button>
          </h3>
          
          {events.length === 0 ? (
            <p className="text-sm text-[#9b9b9b] text-center py-4">
              暂无事件，请先解析文本
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((event: EventNode, index: number) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  characters={characters}
                  onEdit={() => setShowEditModal(true, event.id)}
                  getCharacterColor={getCharacterColor}
                  getCharacterName={getCharacterName}
                />
              ))}
            </div>
          )}
        </div>

        {characters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#6b6b6b] flex items-center gap-2">
          <Users size={16} />
              人物列表 ({characters.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {characters.map((char: Character) => (
                <div
                  key={char.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f0e8dc] ${
                    config.highlightedCharacterId === char.id
                      ? 'bg-[#f0e8dc] ring-2 ring-[#8b7355]'
                      : ''
                  }`}
                  onClick={() => setHighlightedCharacter(
                    config.highlightedCharacterId === char.id ? null : char.id
                  )}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: char.color }}
                  />
                  <span className="text-sm text-[#3d3d3d] flex-1">{char.name}</span>
                  <span className="text-xs text-[#9b9b9b]">{char.eventCount}个事件</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b6b6b]">配置参数</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#6b6b6b] flex justify-between mb-1">
                <span>节点间距</span>
                <span>{config.nodeSpacing}px</span>
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={config.nodeSpacing}
                onChange={(e) => setNodeSpacing(Number(e.target.value))}
                className="w-full h-2 bg-[#d4c8b8] rounded-lg appearance-none cursor-pointer accent-[#8b7355]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b6b6b] flex justify-between mb-1">
                <span>缩放比例</span>
                <span>{(config.scale * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="300"
                value={config.scale * 100}
                onChange={(e) => useMetaStore.getState().setScale(Number(e.target.value) / 100))}
                className="w-full h-2 bg-[#d4c8b8] rounded-lg appearance-none cursor-pointer accent-[#8b7355]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EventCardProps {
  event: EventNode;
  index: number;
  characters: Character[];
  onEdit: () => void;
  getCharacterColor: (id: string) => string;
  getCharacterName: (id: string) => string;
}

const EventCard: React.FC<EventCardProps> = ({
  event, onEdit, getCharacterColor, getCharacterName }) => {
  return (
    <div
      onClick={onEdit}
      className="p-3 bg-white rounded-lg shadow-sm border border-[#e8e0d5] cursor-pointer hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-[#3d3d3d] line-clamp-1">
          {event.title}
        </h4>
        <span className="text-xs text-[#9b9b9b]">#{event.order + 1}</span>
      </div>
      
      {event.timestamp && (
        <div className="flex items-center gap-1 text-xs text-[#8b7355] mb-1">
          <Clock size={12} />
          {event.timestamp}
        </div>
      )}
      
      {event.location && (
        <div className="flex items-center gap-1 text-xs text-[#6b8e6b] mb-2">
          <MapPin size={12} />
          {event.location}
        </div>
      )}
      
      {event.characterIds.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {event.characterIds.map(charId => (
            <span
              key={charId}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: getCharacterColor(charId) }}
            >
              {getCharacterName(charId)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
