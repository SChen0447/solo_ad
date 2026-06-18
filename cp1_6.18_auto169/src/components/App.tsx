import React, { useEffect, useRef } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import { TeamPanel } from './TeamPanel';
import { GridMap } from './GridMap';
import { SkillWheel } from './SkillWheel';
import { ActionQueue } from './ActionQueue';
import { BattleLog } from './BattleLog';
import { TurnHeader } from './TurnHeader';

const App: React.FC = () => {
  const { phase, isExecuting, executeStep, cleanupFloatingTexts } = useBattleStore();
  const executionRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'executing' && isExecuting) {
      executionRef.current = window.setInterval(() => {
        executeStep();
      }, 800);
    } else {
      if (executionRef.current) {
        clearInterval(executionRef.current);
        executionRef.current = null;
      }
    }

    return () => {
      if (executionRef.current) {
        clearInterval(executionRef.current);
      }
    };
  }, [phase, isExecuting, executeStep]);

  useEffect(() => {
    const cleanupInterval = window.setInterval(() => {
      cleanupFloatingTexts();
    }, 500);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [cleanupFloatingTexts]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4">
      <div className="max-w-[1800px] mx-auto flex flex-col gap-4">
        <TurnHeader />
        
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0">
            <TeamPanel team="A" />
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex justify-center">
              <GridMap />
            </div>
            
            <ActionQueue />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BattleLog />
              
              <div className="bg-[#16213e] rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-[#f5a623] mb-3">💡 游戏说明</h3>
                <div className="text-sm text-gray-400 space-y-2">
                  <p><span className="text-white font-semibold">部署阶段：</span>从左侧选择角色，点击网格左半区部署队伍A，右半区部署队伍B。</p>
                  <p><span className="text-white font-semibold">规划阶段：</span>选择已部署的角色，点击弧形技能轮盘中的技能，然后选择目标释放。</p>
                  <p><span className="text-white font-semibold">连锁效果：</span>按顺序释放不同元素技能可触发连锁，造成额外伤害和效果！</p>
                  <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-[#f5a623] font-semibold mb-1">🔗 连锁规则：</p>
                    <ul className="text-xs space-y-1">
                      <li>🔥+🌪️ 燃烧扩散：周围敌人燃烧</li>
                      <li>⚡+💧 导电麻痹：目标及后方麻痹</li>
                      <li>🌪️+⚡ 雷暴风暴：范围雷系伤害</li>
                      <li>💧+🔥 蒸汽爆发：伤害+减防</li>
                      <li>🔥+⚡ 超载爆炸：范围爆炸</li>
                      <li>🪨+🌪️ 沙尘暴：范围伤害+中毒</li>
                      <li>✨+🌑 光暗湮灭：真实伤害</li>
                      <li>💧+🪨 泥沼陷阱：伤害+眩晕</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <TeamPanel team="B" />
          </div>
        </div>
      </div>
      
      <SkillWheel />
    </div>
  );
};

export default App;
