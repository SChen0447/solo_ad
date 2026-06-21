import Phaser from 'phaser';

export type SkillState = 'ready' | 'cooldown' | 'active';

export interface SkillDef {
  id: string;
  key: string;
  keyCode: number;
  cooldown: number;
  color: number;
  colorStr: string;
  name: string;
  damage: number;
}

export const SKILLS: SkillDef[] = [
  { id: 'skill_q', key: 'Q', keyCode: Phaser.Input.Keyboard.KeyCodes.Q, cooldown: 6000, color: 0x4488ff, colorStr: '#4488ff', name: '冰霜冲击', damage: 40 },
  { id: 'skill_e', key: 'E', keyCode: Phaser.Input.Keyboard.KeyCodes.E, cooldown: 10000, color: 0x44ff88, colorStr: '#44ff88', name: '毒雾弥漫', damage: 60 },
  { id: 'skill_r', key: 'R', keyCode: Phaser.Input.Keyboard.KeyCodes.R, cooldown: 15000, color: 0xffcc00, colorStr: '#ffcc00', name: '天雷降临', damage: 100 },
];

interface SkillInstance {
  def: SkillDef;
  state: SkillState;
  remainingCooldown: number;
  key: Phaser.Input.Keyboard.Key;
}

export class SkillManager {
  private scene: Phaser.Scene;
  private skills: SkillInstance[] = [];
  public readonly onSkillUsed = new Phaser.Events.EventEmitter();
  public readonly onCooldownUpdate = new Phaser.Events.EventEmitter();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupSkills();
  }

  private setupSkills(): void {
    const kb = this.scene.input.keyboard!;
    for (const def of SKILLS) {
      this.skills.push({
        def,
        state: 'ready',
        remainingCooldown: 0,
        key: kb.addKey(def.keyCode),
      });
    }
  }

  update(delta: number): void {
    for (const skill of this.skills) {
      if (skill.state === 'cooldown') {
        skill.remainingCooldown -= delta;
        if (skill.remainingCooldown <= 0) {
          skill.remainingCooldown = 0;
          skill.state = 'ready';
        }
        this.onCooldownUpdate.emit('update', {
          id: skill.def.id,
          progress: 1 - (skill.remainingCooldown / skill.def.cooldown),
          state: skill.state,
        });
      }

      if (Phaser.Input.Keyboard.JustDown(skill.key) && skill.state === 'ready') {
        this.activateSkill(skill);
      }
    }
  }

  private activateSkill(skill: SkillInstance): void {
    skill.state = 'cooldown';
    skill.remainingCooldown = skill.def.cooldown;
    this.onSkillUsed.emit('used', skill.def);
    this.onCooldownUpdate.emit('update', {
      id: skill.def.id,
      progress: 0,
      state: 'cooldown',
    });
  }

  getSkillProgress(id: string): number {
    const skill = this.skills.find(s => s.def.id === id);
    if (!skill) return 1;
    if (skill.state === 'ready') return 1;
    return 1 - (skill.remainingCooldown / skill.def.cooldown);
  }

  getSkillState(id: string): SkillState {
    const skill = this.skills.find(s => s.def.id === id);
    return skill ? skill.state : 'ready';
  }

  getAllSkills(): SkillInstance[] {
    return this.skills;
  }

  triggerFromCombo(skillId: string): void {
    const skill = this.skills.find(s => s.def.id === skillId);
    if (skill && skill.state === 'ready') {
      this.activateSkill(skill);
    }
  }
}
