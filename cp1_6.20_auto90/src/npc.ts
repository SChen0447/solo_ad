import { Player, SPELLS } from './player';

export interface DialogueOption {
  text: string;
  minAffection?: number;
  maxAffection?: number;
  condition?: (player: Player) => boolean;
  conditionText?: string;
  resolve: (player: Player, npc: NPC) => DialogueResult;
}

export interface DialogueResult {
  message: string;
  affectionChange?: number;
  expReward?: number;
  itemReward?: { id: string; name: string; type: 'consumable' | 'material' | 'quest'; description: string };
  spellLearn?: string;
  unlockSideStory?: boolean;
}

export interface DialogueBranch {
  minAffection: number;
  text: string;
}

export interface NPC {
  id: string;
  name: string;
  title: string;
  icon: string;
  color: string;
  affection: number;
  position: { x: number; y: number };
  greeting: DialogueBranch[];
  teachableSpells: string[];
  requiredAffectionForSpell: number;
  sideStoryTriggered: boolean;
  sideStoryDialogue?: DialogueOption[];
  dialogueOptions: DialogueOption[];
}

export const NPC_TEMPLATES: Record<string, NPC> = {
  potions_professor: {
    id: 'potions_professor',
    name: '艾琳娜·墨瑞根',
    title: '魔药教授',
    icon: '👩‍🔬',
    color: '#34d399',
    affection: 20,
    position: { x: 550, y: 330 },
    greeting: [
      { minAffection: 0, text: '「嗯？你是新来的学生吧？我是魔药课教授墨瑞根。有什么事吗？」' },
      { minAffection: 40, text: '「哦，是你啊。最近炼金学得怎么样？别光顾着玩，要认真练习。」' },
      { minAffection: 60, text: '「你来啦！我正好在调配新配方，要不要帮忙？说起来，你最近进步很大呢。」' },
      { minAffection: 80, text: '「啊，是你！太好了，我刚好有件重要的事想跟你说...」' }
    ],
    teachableSpells: ['poisonCloud', 'heal', 'magicShield'],
    requiredAffectionForSpell: 50,
    sideStoryTriggered: false,
    sideStoryDialogue: [
      {
        text: '询问教授的秘密',
        resolve: (_player: Player, npc: NPC): DialogueResult => {
          npc.sideStoryTriggered = true;
          return {
            message: '「其实...我年轻时曾误入禁林深处，在那里发现了一种能治愈一切的神奇草药。可惜当时我太害怕，没能带回来。如果你能帮我找到它...不，这太危险了，忘了我说的话吧。」',
            unlockSideStory: true
          };
        }
      }
    ],
    dialogueOptions: [
      {
        text: '送龙鳞草给教授',
        condition: (p: Player) => p.hasItem('dragon_herb'),
        conditionText: '需要龙鳞草',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          player.removeItem('dragon_herb');
          npc.affection = Math.min(100, npc.affection + 10);
          player.addExp(30);
          return {
            message: '「龙鳞草！你在哪里找到的？这可是非常稀有的材料！谢谢你，真是帮大忙了！」',
            affectionChange: 10,
            expReward: 30
          };
        }
      },
      {
        text: '请教魔药知识',
        minAffection: 0,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          player.data.stats.knowledge += 5;
          npc.affection = Math.min(100, npc.affection + 2);
          player.addExp(10);
          return {
            message: '「魔药学的关键是耐心与精准。每种材料都有自己的特性，要用心感受它们...」你学到了一些基础知识。知识+5',
            affectionChange: 2,
            expReward: 10
          };
        }
      },
      {
        text: '帮忙整理材料',
        minAffection: 20,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 5);
          player.addExp(20);
          if (Math.random() < 0.5) {
            player.addItem('hp_potion', '生命药水', 'consumable', '恢复40点生命');
            return {
              message: '「辛苦你了！这瓶药水你拿去吧，算是我的一点心意。」获得生命药水！好感+5，经验+20',
              affectionChange: 5,
              expReward: 20,
              itemReward: { id: 'hp_potion', name: '生命药水', type: 'consumable', description: '恢复40点生命' }
            };
          }
          return {
            message: '「谢谢你的帮忙！下次有需要再叫你。」好感+5，经验+20',
            affectionChange: 5,
            expReward: 20
          };
        }
      },
      {
        text: '学习魔法（需要好感>=50）',
        minAffection: 50,
        condition: (p: Player) => p.data.stats.skillPoints >= 1,
        conditionText: '需要1个技能点',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          for (const spellId of npc.teachableSpells) {
            if (!player.data.learnedSpells.find(s => s.spellId === spellId)) {
              const spell = SPELLS[spellId];
              if (player.data.stats.level < spell.requiredLevel) continue;
              if (player.learnSpell(spellId)) {
                return {
                  message: `「既然你这么有诚意，我就教你「${spell.name}」吧！仔细看了...」学会了 ${spell.name}！`,
                  spellLearn: spellId
                };
              }
            }
          }
          return {
            message: '「你已经学会了我能教的所有魔法，或者等级还不够。继续努力吧！」'
          };
        }
      },
      {
        text: '和教授闲聊',
        minAffection: 30,
        resolve: (_player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 3);
          const messages = [
            '「你知道吗？炼金术其实比战斗魔法还要危险，一个小失误就可能导致爆炸。」',
            '「我年轻时也曾是个冒险者...算了，不说这些陈年往事了。」',
            '「最近图书馆新进了一批古代魔药书籍，有兴趣可以去看看。」'
          ];
          return {
            message: messages[Math.floor(Math.random() * messages.length)] + ' 好感+3',
            affectionChange: 3
          };
        }
      }
    ]
  },
  librarian: {
    id: 'librarian',
    name: '马库斯·智慧',
    title: '图书管理员',
    icon: '🧙‍♂️',
    color: '#818cf8',
    affection: 15,
    position: { x: 350, y: 290 },
    greeting: [
      { minAffection: 0, text: '「嘘...这里是图书馆，请保持安静。需要什么书吗？」' },
      { minAffection: 40, text: '「是你啊，最近常来呢。找到感兴趣的书了吗？」' },
      { minAffection: 60, text: '「欢迎欢迎！我刚好整理出一批稀有书籍，你想先看看吗？」' },
      { minAffection: 80, text: '「哦！你来了！太好了，我有件必须告诉你的事...」' }
    ],
    teachableSpells: ['slowTime', 'iceSpear', 'powerUp'],
    requiredAffectionForSpell: 50,
    sideStoryTriggered: false,
    sideStoryDialogue: [
      {
        text: '倾听管理员的秘密',
        resolve: (_player: Player, npc: NPC): DialogueResult => {
          npc.sideStoryTriggered = true;
          return {
            message: '「其实...这座学院的图书馆下面，封印着一个远古的魔法生物。几千年前，由初代校长亲自封印的。而我...是守护这个秘密的家族后裔。最近，封印似乎在减弱...你愿意帮我吗？」',
            unlockSideStory: true
          };
        }
      }
    ],
    dialogueOptions: [
      {
        text: '请教魔法历史',
        minAffection: 0,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          player.data.stats.knowledge += 8;
          npc.affection = Math.min(100, npc.affection + 2);
          player.addExp(12);
          return {
            message: '「魔法学院创立于三千年前，由十二位大魔法师共同建立。这段历史中，有许多值得学习的故事...」知识+8，经验+12',
            affectionChange: 2,
            expReward: 12
          };
        }
      },
      {
        text: '帮忙整理书架',
        minAffection: 10,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 5);
          player.addExp(18);
          player.data.stats.knowledge += 3;
          return {
            message: '「真是帮大忙了！这些书的分类可是很有讲究的。」好感+5，知识+3，经验+18',
            affectionChange: 5,
            expReward: 18
          };
        }
      },
      {
        text: '询问禁书区',
        minAffection: 30,
        condition: (p: Player) => p.data.stats.knowledge >= 20,
        conditionText: '需要知识值>=20',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 8);
          player.data.stats.knowledge += 20;
          player.addExp(40);
          return {
            message: '「好吧，既然你有足够的知识基础，我就破例让你看看。不过...千万别碰最顶层的那本黑色封皮的书。」你阅读了一些高级魔法典籍！知识+20，好感+8，经验+40',
            affectionChange: 8,
            expReward: 40
          };
        }
      },
      {
        text: '学习魔法（需要好感>=50）',
        minAffection: 50,
        condition: (p: Player) => p.data.stats.skillPoints >= 1,
        conditionText: '需要1个技能点',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          for (const spellId of npc.teachableSpells) {
            if (!player.data.learnedSpells.find(s => s.spellId === spellId)) {
              const spell = SPELLS[spellId];
              if (player.data.stats.level < spell.requiredLevel) continue;
              if (player.learnSpell(spellId)) {
                return {
                  message: `「这些魔法都是我从古籍中学到的，现在传授给你。」学会了 ${spell.name}！`,
                  spellLearn: spellId
                };
              }
            }
          }
          return {
            message: '「你已经学会了我能教的所有魔法，或者等级还不够。去多看看书吧！」'
          };
        }
      },
      {
        text: '推荐一本好书',
        minAffection: 20,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 3);
          const rand = Math.random();
          if (rand < 0.4) {
            player.data.stats.maxMana += 3;
            player.restoreMana(3);
            return {
              message: '「这本《魔力的本质》很适合你。」读完后你对魔力的理解加深了！最大魔力+3',
              affectionChange: 3
            };
          } else if (rand < 0.7) {
            player.data.stats.knowledge += 10;
            return {
              message: '「这本书记载了许多失落的魔法知识。」知识+10！',
              affectionChange: 3
            };
          }
          player.addExp(15);
          return {
            message: '「这本冒险故事很不错，放松一下吧。」经验+15',
            affectionChange: 3,
            expReward: 15
          };
        }
      }
    ]
  },
  forest_guardian: {
    id: 'forest_guardian',
    name: '赛拉斯·铁卫',
    title: '禁林看守',
    icon: '🧝‍♂️',
    color: '#4ade80',
    affection: 10,
    position: { x: 500, y: 400 },
    greeting: [
      { minAffection: 0, text: '「...学生？这里是禁林，很危险的。快回去吧。」' },
      { minAffection: 40, text: '「又是你...算了，你看起来不像那种会乱来的人。小心点。」' },
      { minAffection: 60, text: '「你来了！正好，我需要有人帮忙处理一些事情。」' },
      { minAffection: 80, text: '「啊，太好了！我正想找你。有件事只有你能帮我...」' }
    ],
    teachableSpells: ['fireball', 'lightning'],
    requiredAffectionForSpell: 60,
    sideStoryTriggered: false,
    sideStoryDialogue: [
      {
        text: '询问看守的心事',
        resolve: (_player: Player, npc: NPC): DialogueResult => {
          npc.sideStoryTriggered = true;
          return {
            message: '「我的父亲...曾是这里的看守。三十年前，他为了保护学院，与禁林深处的暗影巨龙同归于尽。最近，我感觉到那股黑暗力量又在苏醒...但我一个人的力量不够。你愿意帮我完成父亲的遗愿吗？」',
            unlockSideStory: true
          };
        }
      }
    ],
    dialogueOptions: [
      {
        text: '询问禁林的情况',
        minAffection: 0,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          player.data.stats.knowledge += 3;
          npc.affection = Math.min(100, npc.affection + 1);
          player.addExp(8);
          return {
            message: '「禁林里栖息着各种魔法生物，东边相对安全，西边是绝对不能去的。记住了。」知识+3，经验+8',
            affectionChange: 1,
            expReward: 8
          };
        }
      },
      {
        text: '赠送发光蘑菇',
        condition: (p: Player) => p.hasItem('glow_mushroom'),
        conditionText: '需要发光蘑菇',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          player.removeItem('glow_mushroom');
          npc.affection = Math.min(100, npc.affection + 12);
          player.addExp(25);
          return {
            message: '「发光蘑菇？你在哪里采到的？这东西在夜里巡逻时很有用...谢谢你。」好感+12，经验+25',
            affectionChange: 12,
            expReward: 25
          };
        }
      },
      {
        text: '请求战斗指导',
        minAffection: 25,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 5);
          const levelUp = Math.random() < 0.35;
          if (levelUp && player.data.stats.combatLevel < 5) {
            player.data.stats.combatLevel++;
            return {
              message: `「好，我就指点你几招。注意脚步！」战斗等级提升至 ${player.data.stats.combatLevel}！好感+5`,
              affectionChange: 5
            };
          }
          player.addExp(22);
          return {
            message: '「记住，战斗最重要的是预判敌人的动作。」你学到了一些技巧。经验+22，好感+5',
            affectionChange: 5,
            expReward: 22
          };
        }
      },
      {
        text: '帮忙巡逻',
        minAffection: 35,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 8);
          player.addExp(45);
          if (Math.random() < 0.5) {
            player.addItem('wolf_fang', '魔法狼牙', 'material', '蕴含魔力的狼牙');
            return {
              message: '「巡逻很顺利，途中还猎杀了一只入侵的魔法狼。这个你拿去吧。」获得魔法狼牙！好感+8，经验+45',
              affectionChange: 8,
              expReward: 45,
              itemReward: { id: 'wolf_fang', name: '魔法狼牙', type: 'material', description: '蕴含魔力的狼牙' }
            };
          }
          return {
            message: '「今天一切平安，谢谢你的帮忙。」好感+8，经验+45',
            affectionChange: 8,
            expReward: 45
          };
        }
      },
      {
        text: '学习魔法（需要好感>=60）',
        minAffection: 60,
        condition: (p: Player) => p.data.stats.skillPoints >= 1,
        conditionText: '需要1个技能点',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          for (const spellId of npc.teachableSpells) {
            if (!player.data.learnedSpells.find(s => s.spellId === spellId)) {
              const spell = SPELLS[spellId];
              if (player.data.stats.level < spell.requiredLevel) continue;
              if (player.learnSpell(spellId)) {
                return {
                  message: `「这是我父亲教我的攻击魔法，现在传给你。」学会了 ${spell.name}！`,
                  spellLearn: spellId
                };
              }
            }
          }
          return {
            message: '「你已经学会了我能教的所有魔法，或者等级还不够。继续变强吧。」'
          };
        }
      }
    ]
  },
  senior: {
    id: 'senior',
    name: '卢西安·星辰',
    title: '神秘学长',
    icon: '🧑‍🎓',
    color: '#fbbf24',
    affection: 5,
    position: { x: 280, y: 360 },
    greeting: [
      { minAffection: 0, text: '「...哦？新生啊。有事吗？我很忙的。」' },
      { minAffection: 40, text: '「是你啊，最近过得怎么样？作为新生来说，你进步挺快嘛。」' },
      { minAffection: 60, text: '「嘿！你来了！正好，我发现了个有趣的地方，要不要一起？」' },
      { minAffection: 80, text: '「太好了，你来了！有件事我只能告诉你...」' }
    ],
    teachableSpells: ['powerUp', 'magicShield', 'slowTime'],
    requiredAffectionForSpell: 55,
    sideStoryTriggered: false,
    sideStoryDialogue: [
      {
        text: '倾听学长的秘密',
        resolve: (_player: Player, npc: NPC): DialogueResult => {
          npc.sideStoryTriggered = true;
          return {
            message: '「其实...我并不是普通的学生。我是学院创始人的后裔，这次回来是为了调查一件事——三十年前失踪的前代校长，据说是被陷害的。而证据，就藏在学院的某处...你愿意帮我揭开真相吗？」',
            unlockSideStory: true
          };
        }
      }
    ],
    dialogueOptions: [
      {
        text: '询问学院的秘密',
        minAffection: 0,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 2);
          player.data.stats.knowledge += 5;
          player.addExp(10);
          return {
            message: '「秘密？呵呵，这学院到处都是秘密。不过你可以先从密室开始查起...当然，你得先找到它才行。」知识+5，经验+10',
            affectionChange: 2,
            expReward: 10
          };
        }
      },
      {
        text: '送魔法卷轴',
        condition: (p: Player) => p.hasItem('spell_scroll'),
        conditionText: '需要魔法卷轴',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          player.removeItem('spell_scroll');
          npc.affection = Math.min(100, npc.affection + 15);
          player.addExp(40);
          player.data.stats.skillPoints += 1;
          return {
            message: '「魔法卷轴？！你从哪里弄到的？这可是好东西...作为感谢，我教你一个小技巧吧！」好感+15，技能点+1，经验+40',
            affectionChange: 15,
            expReward: 40
          };
        }
      },
      {
        text: '一起去冒险',
        minAffection: 30,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 6);
          player.addExp(35);
          const rewards = [
            { id: 'mana_potion', name: '魔力药水', type: 'consumable' as const, description: '恢复30点魔力' },
            { id: 'hp_potion', name: '生命药水', type: 'consumable' as const, description: '恢复40点生命' },
            { id: 'crystal_dust', name: '水晶粉', type: 'material' as const, description: '可用于增幅魔法' }
          ];
          const reward = rewards[Math.floor(Math.random() * rewards.length)];
          player.addItem(reward.id, reward.name, reward.type, reward.description);
          return {
            message: `「走，我带你去个好地方！」你们找到了一些好东西！获得 ${reward.name}！好感+6，经验+35`,
            affectionChange: 6,
            expReward: 35,
            itemReward: reward
          };
        }
      },
      {
        text: '请教考试技巧',
        minAffection: 15,
        resolve: (player: Player, npc: NPC): DialogueResult => {
          npc.affection = Math.min(100, npc.affection + 3);
          player.data.stats.knowledge += 6;
          player.addExp(15);
          return {
            message: '「考试？简单，重点是考前一周熬夜复习...开玩笑的。其实最重要的是理解原理而不是死记硬背。」知识+6，经验+15',
            affectionChange: 3,
            expReward: 15
          };
        }
      },
      {
        text: '学习魔法（需要好感>=55）',
        minAffection: 55,
        condition: (p: Player) => p.data.stats.skillPoints >= 1,
        conditionText: '需要1个技能点',
        resolve: (player: Player, npc: NPC): DialogueResult => {
          for (const spellId of npc.teachableSpells) {
            if (!player.data.learnedSpells.find(s => s.spellId === spellId)) {
              const spell = SPELLS[spellId];
              if (player.data.stats.level < spell.requiredLevel) continue;
              if (player.learnSpell(spellId)) {
                return {
                  message: `「这是我自己摸索出来的技巧，一般人我不教哦。」学会了 ${spell.name}！`,
                  spellLearn: spellId
                };
              }
            }
          }
          return {
            message: '「你已经学会了我能教的所有魔法，或者等级还不够。加油吧，学弟！」'
          };
        }
      }
    ]
  }
};

export class NPCManager {
  npcs: Record<string, NPC>;

  constructor() {
    this.npcs = this.loadNPCs();
  }

  loadNPCs(): Record<string, NPC> {
    return JSON.parse(JSON.stringify(NPC_TEMPLATES));
  }

  getNPC(npcId: string): NPC | null {
    return this.npcs[npcId] || null;
  }

  getAffectionLevel(npcId: string): string {
    const npc = this.npcs[npcId];
    if (!npc) return '陌生人';
    if (npc.affection >= 80) return '挚友';
    if (npc.affection >= 60) return '好友';
    if (npc.affection >= 40) return '熟人';
    if (npc.affection >= 20) return '认识';
    return '陌生人';
  }

  getGreeting(npcId: string): string {
    const npc = this.npcs[npcId];
    if (!npc) return '';
    let currentGreeting = npc.greeting[0].text;
    for (const branch of npc.greeting) {
      if (npc.affection >= branch.minAffection) {
        currentGreeting = branch.text;
      }
    }
    return currentGreeting;
  }

  getAvailableOptions(npcId: string, player: Player): DialogueOption[] {
    const npc = this.npcs[npcId];
    if (!npc) return [];

    const options: DialogueOption[] = [];

    if (npc.affection >= 80 && !npc.sideStoryTriggered && npc.sideStoryDialogue) {
      options.push(...npc.sideStoryDialogue);
    }

    for (const opt of npc.dialogueOptions) {
      let available = true;
      if (opt.minAffection !== undefined && npc.affection < opt.minAffection) available = false;
      if (opt.maxAffection !== undefined && npc.affection > opt.maxAffection) available = false;
      if (available) options.push(opt);
    }

    return options;
  }

  executeDialogue(npcId: string, optionIndex: number, player: Player): DialogueResult | null {
    const options = this.getAvailableOptions(npcId, player);
    if (optionIndex < 0 || optionIndex >= options.length) return null;
    const npc = this.npcs[npcId];
    if (!npc) return null;
    return options[optionIndex].resolve(player, npc);
  }

  serialize(): Record<string, NPC> {
    return JSON.parse(JSON.stringify(this.npcs));
  }

  deserialize(data: Record<string, NPC>) {
    this.npcs = JSON.parse(JSON.stringify(data));
  }
}
