import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Users,
  Skull,
  Plus,
  Menu,
  X,
  Swords,
  ScrollText,
  BarChart3,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';
import { useGameStore } from './store/useGameStore';
import { CharacterEditor } from './components/editor/CharacterEditor';
import { BattleSimulator } from './components/simulation/BattleSimulator';
import { BattleLog } from './components/simulation/BattleLog';
import { AnalysisReport } from './components/analysis/AnalysisReport';
import { playClickSound } from './utils/audio';
import type { Skill } from './types';

type RightTab = 'logs' | 'analysis';

export default function App() {
  const {
    characters,
    monsters,
    selectedCharacterIds,
    selectedMonsterIds,
    isSimulating,
    battleStats,
    winner,
    totalRounds,
    battleLogs,
    addCharacter,
    addMonster,
    removeCharacter,
    removeMonster,
    updateCharacter,
    updateMonster,
    toggleCharacterSelection,
    toggleMonsterSelection,
    updateCharacterSkill,
    updateMonsterSkill,
    addCharacterSkill,
    addMonsterSkill,
    removeCharacterSkill,
    removeMonsterSkill,
  } = useGameStore();

  const [leftPanelWidth, setLeftPanelWidth] = useState(360);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  const [rightTab, setRightTab] = useState<RightTab>('logs');

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleResizeLeftStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return;
      e.preventDefault();
      setIsResizingLeft(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = leftPanelWidth;
    },
    [isMobile, leftPanelWidth]
  );

  const handleResizeRightStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return;
      e.preventDefault();
      setIsResizingRight(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = rightPanelWidth;
    },
    [isMobile, rightPanelWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const delta = e.clientX - resizeStartX.current;
        const newWidth = Math.min(520, Math.max(280, resizeStartWidth.current + delta));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const delta = resizeStartX.current - e.clientX;
        const newWidth = Math.min(560, Math.max(320, resizeStartWidth.current + delta));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  const handleToggleLeftSidebar = useCallback(() => {
    playClickSound();
    setLeftSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleRightSidebar = useCallback(() => {
    playClickSound();
    setRightSidebarOpen((prev) => !prev);
  }, []);

  const handleRightTabChange = useCallback((tab: RightTab) => {
    playClickSound();
    setRightTab(tab);
  }, []);

  const logCount = battleLogs.length;

  const editorDisabled = isSimulating;

  const handleUpdateCharSkill = useCallback(
    (charId: string) => (skillId: string, updates: Partial<Skill>) => {
      updateCharacterSkill(charId, skillId, updates);
    },
    [updateCharacterSkill]
  );

  const handleUpdateMonSkill = useCallback(
    (monId: string) => (skillId: string, updates: Partial<Skill>) => {
      updateMonsterSkill(monId, skillId, updates);
    },
    [updateMonsterSkill]
  );

  const handleAddCharSkill = useCallback(
    (charId: string) => () => addCharacterSkill(charId),
    [addCharacterSkill]
  );

  const handleAddMonSkill = useCallback(
    (monId: string) => () => addMonsterSkill(monId),
    [addMonsterSkill]
  );

  const handleRemoveCharSkill = useCallback(
    (charId: string) => (skillId: string) => removeCharacterSkill(charId, skillId),
    [removeCharacterSkill]
  );

  const handleRemoveMonSkill = useCallback(
    (monId: string) => (skillId: string) => removeMonsterSkill(monId, skillId),
    [removeMonsterSkill]
  );

  const LeftPanel = useMemo(
    () => (
      <div className="h-full flex flex-col grain-overlay">
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-accent">⚔️</span>
              数值平衡模拟器
            </h1>
            {isMobile && (
              <button
                onClick={handleToggleLeftSidebar}
                className="p-1.5 rounded-md text-gray-400 hover:bg-white/10
                  hover:text-white transition-colors duration-200"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            点击卡片选中单位加入战斗队伍，或编辑属性与技能
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <Users size={16} />
                角色模板 ({characters.length})
              </h2>
              <button
                onClick={() => {
                  playClickSound();
                  addCharacter();
                }}
                disabled={editorDisabled}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg
                  bg-blue-500/10 text-blue-400 hover:bg-blue-500/20
                  border border-blue-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300"
              >
                <Plus size={14} />
                添加角色
              </button>
            </div>
            <div className="space-y-3">
              {characters.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-secondary/30 border border-white/5">
                  <p className="text-gray-500 text-sm">暂无角色，点击上方按钮创建</p>
                </div>
              ) : (
                characters.map((unit) => (
                  <CharacterEditor
                    key={unit.id}
                    unit={unit}
                    onUpdate={(updates) => updateCharacter(unit.id, updates)}
                    onRemove={() => removeCharacter(unit.id)}
                    onToggleSelection={() => toggleCharacterSelection(unit.id)}
                    isSelected={selectedCharacterIds.includes(unit.id)}
                    onUpdateSkill={handleUpdateCharSkill(unit.id)}
                    onAddSkill={handleAddCharSkill(unit.id)}
                    onRemoveSkill={handleRemoveCharSkill(unit.id)}
                    disabled={editorDisabled}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                <Skull size={16} />
                怪物模板 ({monsters.length})
              </h2>
              <button
                onClick={() => {
                  playClickSound();
                  addMonster();
                }}
                disabled={editorDisabled}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg
                  bg-orange-500/10 text-orange-400 hover:bg-orange-500/20
                  border border-orange-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300"
              >
                <Plus size={14} />
                添加怪物
              </button>
            </div>
            <div className="space-y-3">
              {monsters.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-secondary/30 border border-white/5">
                  <p className="text-gray-500 text-sm">暂无怪物，点击上方按钮创建</p>
                </div>
              ) : (
                monsters.map((unit) => (
                  <CharacterEditor
                    key={unit.id}
                    unit={unit}
                    onUpdate={(updates) => updateMonster(unit.id, updates)}
                    onRemove={() => removeMonster(unit.id)}
                    onToggleSelection={() => toggleMonsterSelection(unit.id)}
                    isSelected={selectedMonsterIds.includes(unit.id)}
                    onUpdateSkill={handleUpdateMonSkill(unit.id)}
                    onAddSkill={handleAddMonSkill(unit.id)}
                    onRemoveSkill={handleRemoveMonSkill(unit.id)}
                    disabled={editorDisabled}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <div className="flex-shrink-0 p-3 border-t border-white/10 bg-secondary/30">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>选中角色: {selectedCharacterIds.length}/4</span>
            <span>选中怪物: {selectedMonsterIds.length}/4</span>
          </div>
        </div>
      </div>
    ),
    [
      characters,
      monsters,
      selectedCharacterIds,
      selectedMonsterIds,
      editorDisabled,
      isMobile,
      addCharacter,
      addMonster,
      removeCharacter,
      removeMonster,
      updateCharacter,
      updateMonster,
      toggleCharacterSelection,
      toggleMonsterSelection,
      handleUpdateCharSkill,
      handleUpdateMonSkill,
      handleAddCharSkill,
      handleAddMonSkill,
      handleRemoveCharSkill,
      handleRemoveMonSkill,
      handleToggleLeftSidebar,
    ]
  );

  const RightPanel = useMemo(
    () => (
      <div className="h-full flex flex-col grain-overlay">
        <div className="flex-shrink-0 p-2 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
              <button
                onClick={() => handleRightTabChange('logs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                  font-medium transition-all duration-200
                  ${rightTab === 'logs'
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <ScrollText size={13} />
                战斗日志
                {logCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-white/10">
                    {logCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleRightTabChange('analysis')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                  font-medium transition-all duration-200
                  ${rightTab === 'analysis'
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <BarChart3 size={13} />
                分析报告
                {battleStats && (
                  <span className="w-1.5 h-1.5 ml-1 rounded-full bg-green-400" />
                )}
              </button>
            </div>
            {isMobile && (
              <button
                onClick={handleToggleRightSidebar}
                className="p-1.5 rounded-md text-gray-400 hover:bg-white/10
                  hover:text-white transition-colors duration-200"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {rightTab === 'logs' ? (
            <BattleLog characters={characters} monsters={monsters} />
          ) : (
            <AnalysisReport
              stats={battleStats}
              winner={winner}
              totalRounds={totalRounds}
              characters={characters}
              monsters={monsters}
            />
          )}
        </div>
      </div>
    ),
    [
      rightTab,
      logCount,
      battleStats,
      winner,
      totalRounds,
      characters,
      monsters,
      isMobile,
      handleRightTabChange,
      handleToggleRightSidebar,
    ]
  );

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-primary text-white flex flex-col overflow-hidden font-mono"
    >
      {isMobile && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2
          border-b border-white/10 bg-secondary/50">
          <button
            onClick={handleToggleLeftSidebar}
            className="flex items-center gap-1.5 p-2 rounded-lg
              text-gray-400 hover:bg-white/10 hover:text-white
              transition-colors duration-200"
          >
            <Menu size={18} />
            <span className="text-xs">单位编辑</span>
          </button>

          <h1 className="text-sm font-bold flex items-center gap-1.5">
            <span className="text-accent">⚔️</span>
            数值模拟器
          </h1>

          <button
            onClick={handleToggleRightSidebar}
            className="flex items-center gap-1.5 p-2 rounded-lg
              text-gray-400 hover:bg-white/10 hover:text-white
              transition-colors duration-200"
          >
            <span className="text-xs">{rightTab === 'logs' ? '日志' : '报告'}</span>
            {rightTab === 'logs' ? <ScrollText size={18} /> : <BarChart3 size={18} />}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {isMobile ? (
          <>
            <div
              className={`fixed inset-y-0 left-0 z-40 w-[85%] max-w-sm bg-primary
                border-r border-white/10 sidebar-transition
                shadow-2xl shadow-black/50
                ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              {LeftPanel}
            </div>

            {leftSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 animate-fade-in"
                onClick={handleToggleLeftSidebar}
              />
            )}

            <div className="flex-1 min-w-0 overflow-hidden relative">
              <BattleSimulator characters={characters} monsters={monsters} />

              {!leftSidebarOpen && (
                <button
                  onClick={handleToggleLeftSidebar}
                  className="absolute top-3 left-3 z-10 p-2 rounded-lg
                    bg-secondary/80 backdrop-blur-sm text-gray-400
                    hover:bg-secondary hover:text-white
                    border border-white/10
                    transition-all duration-200"
                >
                  <PanelLeftClose size={18} />
                </button>
              )}

              {!rightSidebarOpen && (
                <button
                  onClick={handleToggleRightSidebar}
                  className="absolute top-3 right-3 z-10 p-2 rounded-lg
                    bg-secondary/80 backdrop-blur-sm text-gray-400
                    hover:bg-secondary hover:text-white
                    border border-white/10
                    transition-all duration-200"
                >
                  <PanelRightClose size={18} />
                </button>
              )}
            </div>

            <div
              className={`fixed inset-y-0 right-0 z-40 w-[85%] max-w-sm bg-primary
                border-l border-white/10 sidebar-transition
                shadow-2xl shadow-black/50
                ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              {RightPanel}
            </div>

            {rightSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 animate-fade-in"
                onClick={handleToggleRightSidebar}
              />
            )}
          </>
        ) : (
          <>
            <div
              className="flex-shrink-0 h-full bg-secondary/30 border-r border-white/10 overflow-hidden"
              style={{ width: `${leftPanelWidth}px` }}
            >
              {LeftPanel}
            </div>

            <div
              onMouseDown={handleResizeLeftStart}
              className={`flex-shrink-0 w-[6px] h-full cursor-col-resize bg-transparent
                hover:bg-accent/30 transition-colors duration-200
                drag-handle relative group
                ${isResizingLeft ? 'active bg-accent/50' : ''}`}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-1 h-10 rounded-full bg-white/10 group-hover:bg-accent/50
                transition-colors duration-200" />
            </div>

            <div className="flex-1 min-w-0 h-full flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2
                border-b border-white/10 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Swords className="text-accent" size={16} />
                  <span className="text-sm font-medium">战斗控制区</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    角色: <span className="text-blue-400 font-medium">{selectedCharacterIds.length}</span>
                    /4
                  </span>
                  <span className="text-white/20">vs</span>
                  <span>
                    怪物: <span className="text-orange-400 font-medium">{selectedMonsterIds.length}</span>
                    /4
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <BattleSimulator characters={characters} monsters={monsters} />
              </div>
            </div>

            <div
              onMouseDown={handleResizeRightStart}
              className={`flex-shrink-0 w-[6px] h-full cursor-col-resize bg-transparent
                hover:bg-accent/30 transition-colors duration-200
                drag-handle relative group
                ${isResizingRight ? 'active bg-accent/50' : ''}`}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-1 h-10 rounded-full bg-white/10 group-hover:bg-accent/50
                transition-colors duration-200" />
            </div>

            <div
              className="flex-shrink-0 h-full bg-secondary/30 border-l border-white/10 overflow-hidden"
              style={{ width: `${rightPanelWidth}px` }}
            >
              {RightPanel}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
