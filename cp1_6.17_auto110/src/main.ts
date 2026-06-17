import { DiceEngine, DiceState, DiceType, SkillTier } from './DiceEngine';
import { CombatManager, SkillType } from './CombatManager';
import { Renderer } from './Renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const diceEngine = new DiceEngine();
const combat = new CombatManager();
const renderer = new Renderer(canvas);

const PLAYER_DICE_POSITIONS: { type: DiceType; x: number; y: number }[] = [
  { type: 'attack', x: 300, y: 380 },
  { type: 'defense', x: 400, y: 380 },
  { type: 'skill', x: 500, y: 380 }
];

const playerDice: DiceState[] = PLAYER_DICE_POSITIONS.map(pos =>
  diceEngine.createDice(pos.type, pos.x, pos.y)
);

let enemyDiceDisplay: { type: DiceType; value: number }[] = [];
let phaseTimer: number | null = null;
let playerRollResults: { attack: number; defense: number; skill: number; skillTier: SkillTier } | null = null;
let enemyRollResults: { attacks: number[]; defense: number } | null = null;
let criticalTriggeredThisTurn = false;

function getCanvasMouseCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const coords = getCanvasMouseCoords(e);
  renderer.handleMouseMove(coords.x, coords.y);
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const coords = getCanvasMouseCoords(e);
  const action = renderer.handleClick(coords.x, coords.y, combat);

  if (action === null) return;

  if (action === 'roll') {
    handleRollAction();
  } else if (action === 'restart') {
    handleRestartAction();
  } else {
    handleSkillSelection(action);
  }
});

function handleRollAction(): void {
  if (combat.currentPhase !== 'select') return;
  if (!allDiceSettled()) return;

  startPlayerRoll();
}

function handleRestartAction(): void {
  if (combat.currentPhase !== 'game_over') return;
  resetGame();
}

function handleSkillSelection(skillType: SkillType): void {
  if (combat.currentPhase !== 'select') return;
  if (!combat.canSelectSkill(skillType)) {
    combat.selectSkill(null);
    return;
  }
  if (combat.selectedSkill === skillType) {
    combat.selectSkill(null);
  } else {
    combat.selectSkill(skillType);
  }
}

function allDiceSettled(): boolean {
  return playerDice.every(d => d.settled);
}

function startPlayerRoll(): void {
  combat.setPhase('rolling');
  criticalTriggeredThisTurn = false;

  const attackRoll = diceEngine.rollDice(playerDice[0]);
  const defenseRoll = diceEngine.rollDice(playerDice[1]);
  const skillRoll = diceEngine.rollDice(playerDice[2]);

  playerRollResults = {
    attack: attackRoll.value,
    defense: defenseRoll.value,
    skill: skillRoll.value,
    skillTier: skillRoll.skillTier
  };

  if (attackRoll.isCritical) {
    criticalTriggeredThisTurn = true;
  }
}

function checkRollComplete(currentTime: number): boolean {
  return playerDice.every(d => {
    diceEngine.updateDice(d, currentTime);
    return d.settled;
  });
}

function startEnemyPhase(): void {
  combat.setPhase('enemy_turn');

  const attack1 = diceEngine.rollEnemyAttackDice();
  const attack2 = diceEngine.rollEnemyAttackDice();
  const defense = diceEngine.rollEnemyDefenseDice();

  enemyRollResults = {
    attacks: [attack1, attack2],
    defense
  };

  enemyDiceDisplay = [
    { type: 'attack', value: attack1 },
    { type: 'attack', value: attack2 },
    { type: 'defense', value: defense }
  ];

  schedulePhase(500, () => resolveCombat());
}

function resolveCombat(): void {
  if (!playerRollResults || !enemyRollResults) return;

  combat.setPhase('resolving');

  const skillTier = playerRollResults.skillTier;
  const result = combat.resolveTurn(
    playerRollResults.attack,
    playerRollResults.defense,
    playerRollResults.skill,
    enemyRollResults.attacks,
    enemyRollResults.defense,
    skillTier
  );

  if (criticalTriggeredThisTurn) {
    renderer.triggerCriticalEffect();
  }

  renderer.setSummaryText(result.summaryText, performance.now());

  schedulePhase(1600, () => {
    if (combat.currentPhase !== 'game_over') {
      combat.endTurn();
      combat.setPhase('select');
    }
  });
}

function schedulePhase(delayMs: number, callback: () => void): void {
  if (phaseTimer !== null) {
    clearTimeout(phaseTimer);
  }
  phaseTimer = window.setTimeout(callback, delayMs);
}

function resetGame(): void {
  if (phaseTimer !== null) {
    clearTimeout(phaseTimer);
    phaseTimer = null;
  }

  combat.reset();

  for (let i = 0; i < playerDice.length; i++) {
    const pos = PLAYER_DICE_POSITIONS[i];
    playerDice[i] = diceEngine.createDice(pos.type, pos.x, pos.y);
  }

  enemyDiceDisplay = [];
  playerRollResults = null;
  enemyRollResults = null;
  criticalTriggeredThisTurn = false;
}

function gameLoop(currentTime: number): void {
  if (combat.currentPhase === 'rolling') {
    const allSettled = checkRollComplete(currentTime);
    if (allSettled) {
      schedulePhase(300, () => startEnemyPhase());
    }
  } else {
    for (const d of playerDice) {
      diceEngine.updateDice(d, currentTime);
    }
  }

  renderer.render(combat, playerDice, enemyDiceDisplay, currentTime);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

export { };
