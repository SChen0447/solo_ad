import { useBattleStore } from '../store/battleStore';
import { bossAI } from './bossAI';
import { battleManager, PLAYER_SKILLS } from './battleManager';
import type { Skill } from '../types';

export class UIManager {
  private container: HTMLElement;
  private bossHpBar!: HTMLElement;
  private bossHpFill!: HTMLElement;
  private bossName!: HTMLElement;
  private bossStateText!: HTMLElement;
  private playerHpBar!: HTMLElement;
  private playerHpFill!: HTMLElement;
  private skillButtonsContainer!: HTMLElement;
  private battleLogContainer!: HTMLElement;
  private resultModal!: HTMLElement;
  private balanceMessage!: HTMLElement;
  private turnIndicator!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
    this.setupEventListeners();
    this.startUpdateLoop();
  }

  private createUI(): void {
    this.container.innerHTML = '';

    this.createBossHpBar();
    this.createPlayerHpBar();
    this.createSkillButtons();
    this.createBattleLog();
    this.createResultModal();
    this.createBalanceMessage();
    this.createTurnIndicator();
  }

  private createBossHpBar(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      max-width: 90vw;
      z-index: 100;
    `;

    const frame = document.createElement('div');
    frame.style.cssText = `
      position: relative;
      padding: 8px;
      background: linear-gradient(135deg, #2a1a4a 0%, #1a0a3e 50%, #2a1a4a 100%);
      border: 3px solid;
      border-image: linear-gradient(135deg, #ffd700, #ff8c00, #ffd700) 1;
      border-radius: 10px;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
    `;

    const ornamentLeft = document.createElement('div');
    ornamentLeft.innerHTML = '⚔️';
    ornamentLeft.style.cssText = `
      position: absolute;
      left: -15px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 28px;
      filter: drop-shadow(0 0 5px #ffd700);
    `;

    const ornamentRight = document.createElement('div');
    ornamentRight.innerHTML = '⚔️';
    ornamentRight.style.cssText = `
      position: absolute;
      right: -15px;
      top: 50%;
      transform: translateY(-50%) scaleX(-1);
      font-size: 28px;
      filter: drop-shadow(0 0 5px #ffd700);
    `;

    const hpContainer = document.createElement('div');
    hpContainer.style.cssText = `
      position: relative;
      height: 30px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 5px;
      overflow: hidden;
      border: 2px solid rgba(255, 215, 0, 0.5);
    `;

    this.bossHpFill = document.createElement('div');
    this.bossHpFill.style.cssText = `
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #ffd700, #ffaa00);
      transition: width 0.3s ease, background 0.5s ease;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    `;

    this.bossHpBar = document.createElement('div');
    this.bossHpBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      text-shadow: 1px 1px 2px black;
    `;

    hpContainer.appendChild(this.bossHpFill);
    hpContainer.appendChild(this.bossHpBar);

    this.bossName = document.createElement('div');
    this.bossName.style.cssText = `
      text-align: center;
      color: #ffd700;
      font-size: 20px;
      font-weight: bold;
      margin-top: 8px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      letter-spacing: 2px;
    `;

    this.bossStateText = document.createElement('div');
    this.bossStateText.style.cssText = `
      text-align: center;
      color: #ffffff;
      font-size: 14px;
      margin-top: 4px;
      text-shadow: 1px 1px 2px black;
      transition: color 0.3s ease;
    `;

    frame.appendChild(ornamentLeft);
    frame.appendChild(ornamentRight);
    frame.appendChild(hpContainer);
    wrapper.appendChild(frame);
    wrapper.appendChild(this.bossName);
    wrapper.appendChild(this.bossStateText);

    this.container.appendChild(wrapper);
  }

  private createPlayerHpBar(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 180px;
      left: 30px;
      width: 250px;
      z-index: 100;
    `;

    const label = document.createElement('div');
    label.textContent = '玩家生命值';
    label.style.cssText = `
      color: #4488ff;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
      text-shadow: 1px 1px 2px black;
    `;

    const hpContainer = document.createElement('div');
    hpContainer.style.cssText = `
      position: relative;
      height: 20px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid rgba(100, 150, 255, 0.5);
    `;

    this.playerHpFill = document.createElement('div');
    this.playerHpFill.style.cssText = `
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #22aa22, #44ff44);
      transition: width 0.3s ease;
      box-shadow: 0 0 10px rgba(100, 255, 100, 0.5);
    `;

    this.playerHpBar = document.createElement('div');
    this.playerHpBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      text-shadow: 1px 1px 2px black;
    `;

    hpContainer.appendChild(this.playerHpFill);
    hpContainer.appendChild(this.playerHpBar);

    wrapper.appendChild(label);
    wrapper.appendChild(hpContainer);

    this.container.appendChild(wrapper);
  }

  private createSkillButtons(): void {
    this.skillButtonsContainer = document.createElement('div');
    this.skillButtonsContainer.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 30px;
      z-index: 100;
    `;

    const basicAttackBtn = this.createSkillButton({
      id: 'basic_attack',
      name: '普通攻击',
      element: 'fire',
      baseDamage: 0,
      cooldown: 2000,
      description: '普通攻击'
    }, '⚔️');

    const dodgeBtn = this.createSkillButton({
      id: 'dodge',
      name: '闪避',
      element: 'ice',
      baseDamage: 0,
      cooldown: 5000,
      description: '闪避攻击'
    }, '💨');

    this.skillButtonsContainer.appendChild(basicAttackBtn);
    this.skillButtonsContainer.appendChild(dodgeBtn);

    PLAYER_SKILLS.forEach((skill) => {
      const icon = skill.element === 'fire' ? '🔥' : skill.element === 'ice' ? '❄️' : '⚡';
      const btn = this.createSkillButton(skill, icon);
      this.skillButtonsContainer.appendChild(btn);
    });

    this.container.appendChild(this.skillButtonsContainer);
  }

  private createSkillButton(skill: Skill, icon: string): HTMLElement {
    const btn = document.createElement('button');
    btn.dataset.skillId = skill.id;
    btn.style.cssText = `
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.3);
      background: linear-gradient(135deg, #2a1a4a 0%, #1a0a3e 100%);
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      overflow: hidden;
    `;

    const iconEl = document.createElement('div');
    iconEl.textContent = icon;
    iconEl.style.cssText = `
      font-size: 32px;
      margin-bottom: 2px;
      filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
    `;

    const nameEl = document.createElement('div');
    nameEl.textContent = skill.name;
    nameEl.style.cssText = `
      font-size: 10px;
      color: white;
      text-shadow: 1px 1px 2px black;
    `;

    const cooldownOverlay = document.createElement('div');
    cooldownOverlay.className = 'cooldown-overlay';
    cooldownOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px black;
      pointer-events: none;
    `;

    btn.appendChild(iconEl);
    btn.appendChild(nameEl);
    btn.appendChild(cooldownOverlay);

    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = '#ffd700';
      btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 15px rgba(255, 215, 0, 0.2)';
      btn.style.transform = 'scale(1.1)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      btn.style.boxShadow = 'none';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      if (skill.id === 'basic_attack') {
        battleManager.handlePlayerAction({ type: 'attack' });
      } else if (skill.id === 'dodge') {
        battleManager.handlePlayerAction({ type: 'dodge' });
      } else {
        battleManager.handlePlayerAction({ type: 'skill', skillId: skill.id });
      }
    });

    return btn;
  }

  private createBattleLog(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 40px;
      right: 30px;
      width: 320px;
      max-width: 25vw;
      z-index: 100;
    `;

    const header = document.createElement('div');
    header.textContent = '战斗日志';
    header.style.cssText = `
      color: #ffd700;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
      text-shadow: 1px 1px 2px black;
      padding-left: 8px;
      border-left: 3px solid #ffd700;
    `;

    this.battleLogContainer = document.createElement('div');
    this.battleLogContainer.style.cssText = `
      height: 200px;
      background: rgba(10, 10, 30, 0.85);
      border: 2px solid rgba(255, 215, 0, 0.3);
      border-radius: 8px;
      padding: 10px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.6;
      backdrop-filter: blur(5px);
    `;

    this.battleLogContainer.style.scrollbarWidth = 'thin';
    this.battleLogContainer.style.scrollbarColor = 'rgba(255, 215, 0, 0.5) transparent';

    wrapper.appendChild(header);
    wrapper.appendChild(this.battleLogContainer);

    this.container.appendChild(wrapper);
  }

  private createResultModal(): void {
    this.resultModal = document.createElement('div');
    this.resultModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #2a1a4a 0%, #1a0a3e 50%, #2a1a4a 100%);
      border: 3px solid;
      border-image: linear-gradient(135deg, #ffd700, #ff8c00, #ffd700) 1;
      border-radius: 15px;
      padding: 50px 80px;
      text-align: center;
      box-shadow: 0 0 50px rgba(255, 215, 0, 0.4);
    `;

    const resultText = document.createElement('div');
    resultText.id = 'result-text';
    resultText.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
    `;

    const resultDesc = document.createElement('div');
    resultDesc.id = 'result-desc';
    resultDesc.style.cssText = `
      font-size: 18px;
      color: #cccccc;
      margin-bottom: 40px;
    `;

    const retryBtn = document.createElement('button');
    retryBtn.textContent = '再次挑战';
    retryBtn.style.cssText = `
      padding: 15px 50px;
      font-size: 18px;
      font-weight: bold;
      color: #1a0a3e;
      background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
      border: none;
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
    `;

    retryBtn.addEventListener('mouseenter', () => {
      retryBtn.style.transform = 'scale(1.05)';
      retryBtn.style.boxShadow = '0 8px 30px rgba(255, 215, 0, 0.6)';
    });

    retryBtn.addEventListener('mouseleave', () => {
      retryBtn.style.transform = 'scale(1)';
      retryBtn.style.boxShadow = '0 5px 20px rgba(255, 215, 0, 0.4)';
    });

    retryBtn.addEventListener('click', () => {
      this.resultModal.style.display = 'none';
      battleManager.startNewBattle();
    });

    content.appendChild(resultText);
    content.appendChild(resultDesc);
    content.appendChild(retryBtn);
    this.resultModal.appendChild(content);

    this.container.appendChild(this.resultModal);
  }

  private createBalanceMessage(): void {
    this.balanceMessage = document.createElement('div');
    this.balanceMessage.style.cssText = `
      position: fixed;
      top: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(255, 100, 100, 0.9) 0%, rgba(255, 50, 50, 0.9) 100%);
      color: white;
      padding: 15px 30px;
      border-radius: 30px;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 5px 20px rgba(255, 100, 100, 0.5);
      display: none;
      z-index: 200;
      animation: pulse 2s infinite;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);

    this.container.appendChild(this.balanceMessage);
  }

  private createTurnIndicator(): void {
    this.turnIndicator = document.createElement('div');
    this.turnIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      font-weight: bold;
      color: #ffd700;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 150;
    `;
    this.container.appendChild(this.turnIndicator);
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === '1') {
        battleManager.handlePlayerAction({ type: 'attack' });
      } else if (e.key === '2') {
        battleManager.handlePlayerAction({ type: 'dodge' });
      } else if (e.key === '3') {
        battleManager.handlePlayerAction({ type: 'skill', skillId: 'fireball' });
      } else if (e.key === '4') {
        battleManager.handlePlayerAction({ type: 'skill', skillId: 'ice_spike' });
      } else if (e.key === '5') {
        battleManager.handlePlayerAction({ type: 'skill', skillId: 'lightning_bolt' });
      }
    });
  }

  private getHpBarColor(hpPercent: number): string {
    if (hpPercent >= 0.7) {
      return 'linear-gradient(90deg, #ffd700, #ffaa00)';
    } else if (hpPercent >= 0.3) {
      return 'linear-gradient(90deg, #ff6600, #ff4400)';
    } else {
      return 'linear-gradient(90deg, #cc0000, #880000)';
    }
  }

  private formatTime(ms: number): string {
    return (ms / 1000).toFixed(1);
  }

  private update(): void {
    const state = useBattleStore.getState();
    const { player, boss, battleResult, balanceAdjustmentMessage, battleLog, isPlayerTurn, turnTimer } = state;

    const bossHpPercent = boss.currentHp / boss.maxHp;
    this.bossHpFill.style.width = `${bossHpPercent * 100}%`;
    this.bossHpFill.style.background = this.getHpBarColor(bossHpPercent);
    this.bossHpBar.textContent = `${Math.ceil(boss.currentHp)} / ${boss.maxHp}`;
    this.bossName.textContent = boss.name;

    const stateText = bossAI.getStateDisplayText(boss.state);
    const stateColor = bossAI.getStateColor(boss.state);
    this.bossStateText.textContent = boss.stunDuration > 0
      ? `眩晕中 (${this.formatTime(boss.stunDuration)})`
      : stateText;
    this.bossStateText.style.color = boss.stunDuration > 0 ? '#ffff00' : stateColor;

    const playerHpPercent = player.currentHp / player.maxHp;
    this.playerHpFill.style.width = `${playerHpPercent * 100}%`;
    this.playerHpBar.textContent = `${Math.ceil(player.currentHp)} / ${player.maxHp}`;

    const buttons = this.skillButtonsContainer.querySelectorAll('button');
    buttons.forEach((btn) => {
      const skillId = btn.dataset.skillId;
      const overlay = btn.querySelector('.cooldown-overlay') as HTMLElement;
      let cooldown = 0;

      if (skillId === 'basic_attack') {
        cooldown = player.actionCooldown;
      } else if (skillId === 'dodge') {
        cooldown = player.dodgeCooldown;
      } else if (skillId) {
        cooldown = player.skillCooldowns[skillId] || 0;
      }

      if (cooldown > 0) {
        overlay.style.display = 'flex';
        overlay.textContent = this.formatTime(cooldown);
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
      } else {
        overlay.style.display = 'none';
        btn.style.opacity = battleResult ? '0.5' : '1';
        btn.style.pointerEvents = battleResult ? 'none' : 'auto';
      }
    });

    while (this.battleLogContainer.children.length < battleLog.length) {
      const entry = battleLog[this.battleLogContainer.children.length];
      const logEntry = document.createElement('div');
      const time = new Date(entry.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

      let color = '#ffffff';
      if (entry.type === 'damage') color = '#ff6666';
      else if (entry.type === 'heal') color = '#66ff66';
      else if (entry.type === 'state') color = '#66aaff';
      else if (entry.type === 'system') color = '#ffd700';

      logEntry.innerHTML = `<span style="color: #888;">[${timeStr}]</span> <span style="color: ${color};">${entry.message}</span>`;
      this.battleLogContainer.appendChild(logEntry);
    }
    this.battleLogContainer.scrollTop = this.battleLogContainer.scrollHeight;

    if (balanceAdjustmentMessage) {
      this.balanceMessage.textContent = balanceAdjustmentMessage;
      this.balanceMessage.style.display = 'block';
    } else {
      this.balanceMessage.style.display = 'none';
    }

    if (battleResult) {
      const resultText = this.resultModal.querySelector('#result-text') as HTMLElement;
      const resultDesc = this.resultModal.querySelector('#result-desc') as HTMLElement;

      if (battleResult === 'victory') {
        resultText.textContent = '🎉 胜利！';
        resultText.style.color = '#ffd700';
        resultDesc.textContent = `你成功击败了 ${boss.name}！`;
      } else {
        resultText.textContent = '💀 失败...';
        resultText.style.color = '#ff4444';
        resultDesc.textContent = '你被击败了，再接再厉！';
      }

      this.resultModal.style.display = 'flex';
    }

    if (!battleResult && turnTimer > 0 && turnTimer < 500) {
      this.turnIndicator.style.opacity = '1';
      this.turnIndicator.textContent = isPlayerTurn ? '你的回合' : 'Boss回合';
      this.turnIndicator.style.color = isPlayerTurn ? '#44ff44' : '#ff4444';
    } else {
      this.turnIndicator.style.opacity = '0';
    }
  }

  private startUpdateLoop(): void {
    const loop = () => {
      this.update();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
