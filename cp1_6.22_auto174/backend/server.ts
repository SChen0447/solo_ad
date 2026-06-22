import express, { Request, Response } from 'express';
import cors from 'cors';
import { EnemyAI, EnemyDecision, EnemyState } from './src/ai/EnemyAI';
import { LevelManager, LevelData } from './src/level/LevelManager';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const enemyAI = new EnemyAI();
const levelManager = new LevelManager();

interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  facingRight: boolean;
}

interface EnemyDecisionRequest {
  playerState: PlayerState;
  enemies: Array<{
    id: string;
    type: 'grunt' | 'elite';
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    state: EnemyState;
    lastAttackTime: number;
    lastSkillTime: number;
  }>;
  deltaTime: number;
  currentTime: number;
}

app.get('/api/level/:id', (req: Request, res: Response) => {
  const levelId = parseInt(req.params.id);
  const levelData = levelManager.getLevel(levelId);
  if (levelData) {
    res.json(levelData);
  } else {
    res.status(404).json({ error: 'Level not found' });
  }
});

app.post('/api/ai/decision', (req: Request, res: Response) => {
  const { playerState, enemies, deltaTime, currentTime }: EnemyDecisionRequest = req.body;

  const simulateLatency = Math.random() * 100;

  setTimeout(() => {
    const decisions: Record<string, EnemyDecision> = {};

    for (const enemy of enemies) {
      decisions[enemy.id] = enemyAI.makeDecision(
        enemy,
        playerState,
        deltaTime,
        currentTime
      );
    }

    res.json({ decisions });
  }, simulateLatency);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
