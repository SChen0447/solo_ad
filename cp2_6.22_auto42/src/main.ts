/**
 * 卡牌对战与AI策略模拟 - 应用入口
 * 
 * 初始化游戏引擎、AI玩家和UI渲染器，
 * 启动游戏循环并处理AI回合逻辑。
 * 
 * 数据流:
 * main.ts → GameEngine ↔ UIRenderer
 *               ↓
 *           AIPlayer (AI回合时调用)
 */

import { GameEngine, GameState } from './engine/GameEngine';
import { AIPlayer } from './ai/AIPlayer';
import { UIRenderer } from './ui/UIRenderer';

const appContainer = document.getElementById('app');
if (!appContainer) {
  throw new Error('找不到 #app 容器元素');
}

const engine = new GameEngine();
const aiPlayer = new AIPlayer(engine);
const renderer = new UIRenderer(engine, appContainer);

let aiTurnInProgress = false;

engine.subscribe(async (state: GameState) => {
  if (state.phase === 'battle' && state.currentTurn === 'ai' && !aiTurnInProgress) {
    aiTurnInProgress = true;
    try {
      await aiPlayer.takeTurn();
    } finally {
      aiTurnInProgress = false;
    }
  }
});

console.log('🎮 卡牌对战与AI策略模拟已启动');
console.log('📁 项目结构:');
console.log('   - src/engine/types.ts - 类型定义');
console.log('   - src/engine/CardDeckManager.ts - 牌组管理');
console.log('   - src/engine/BattleResolver.ts - 战斗结算');
console.log('   - src/engine/GameEngine.ts - 核心引擎');
console.log('   - src/ai/AIPlayer.ts - AI决策');
console.log('   - src/ui/UIRenderer.ts - UI渲染');
console.log('   - src/main.ts - 入口');

export { engine, aiPlayer, renderer };
