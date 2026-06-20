import { Player } from './player';

export interface SceneObject {
  id: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  options: ObjectOption[];
}

export interface ObjectOption {
  text: string;
  condition?: (player: Player) => boolean;
  conditionText?: string;
  action: (player: Player) => ObjectActionResult;
}

export interface ObjectActionResult {
  success: boolean;
  message: string;
  expReward?: number;
  itemReward?: { id: string; name: string; type: 'consumable' | 'material' | 'quest'; description: string; count?: number };
  manaChange?: number;
  hpChange?: number;
  knowledgeChange?: number;
  alchemyLevelUp?: boolean;
  combatLevelUp?: boolean;
  unlockScene?: string;
}

export interface SceneExit {
  id: string;
  targetSceneId: string;
  label: string;
  position: { x: number; y: number };
  locked?: boolean;
  unlockCondition?: (player: Player) => boolean;
  unlockText?: string;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  ambientColor: { start: string; end: string };
  decor: DecorElement[];
  objects: SceneObject[];
  exits: SceneExit[];
  npcIds: string[];
  randomEventChance: number;
}

export interface DecorElement {
  type: 'rect' | 'circle' | 'line' | 'text';
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  color?: string;
  text?: string;
  fontSize?: number;
}

export interface RandomEvent {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'treasure' | 'mystery' | 'trap';
  monster?: MonsterData;
  options: RandomEventOption[];
}

export interface MonsterData {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  expReward: number;
  icon: string;
  drops?: { id: string; name: string; type: 'consumable' | 'material' | 'quest'; description: string; chance: number }[];
}

export interface RandomEventOption {
  text: string;
  condition?: (player: Player) => boolean;
  resolve: (player: Player) => { message: string; result: 'fight' | 'flee_success' | 'flee_fail' | 'reward' | 'trap' | 'nothing'; data?: any };
}

export const MONSTERS: Record<string, MonsterData> = {
  slime: {
    name: '史莱姆',
    hp: 40,
    maxHp: 40,
    attack: 8,
    defense: 2,
    expReward: 25,
    icon: '🟢',
    drops: [{ id: 'slime_gel', name: '史莱姆凝胶', type: 'material', description: '黏糊糊的凝胶，可用于炼金', chance: 0.6 }]
  },
  goblin: {
    name: '哥布林',
    hp: 60,
    maxHp: 60,
    attack: 12,
    defense: 4,
    expReward: 40,
    icon: '👺',
    drops: [{ id: 'goblin_coin', name: '哥布林金币', type: 'material', description: '脏兮兮的金币', chance: 0.8 }]
  },
  shadow: {
    name: '暗影生物',
    hp: 80,
    maxHp: 80,
    attack: 18,
    defense: 6,
    expReward: 60,
    icon: '👤',
    drops: [{ id: 'shadow_essence', name: '暗影精华', type: 'material', description: '凝结的暗影能量', chance: 0.5 }]
  },
  wolf: {
    name: '魔法狼',
    hp: 70,
    maxHp: 70,
    attack: 15,
    defense: 5,
    expReward: 45,
    icon: '🐺',
    drops: [{ id: 'wolf_fang', name: '魔法狼牙', type: 'material', description: '蕴含魔力的狼牙', chance: 0.7 }]
  },
  spirit: {
    name: '远古精灵',
    hp: 100,
    maxHp: 100,
    attack: 22,
    defense: 8,
    expReward: 85,
    icon: '🧚',
    drops: [{ id: 'spirit_crystal', name: '精灵水晶', type: 'material', description: '闪烁着神秘光芒的水晶', chance: 0.4 }]
  }
};

function createMonster(monsterId: string): MonsterData {
  const template = MONSTERS[monsterId];
  return JSON.parse(JSON.stringify(template));
}

const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: 'slime_encounter',
    name: '遭遇史莱姆',
    description: '一只史莱姆从阴影中跳出，挡住了你的去路！',
    type: 'combat',
    monster: createMonster('slime'),
    options: [
      {
        text: '战斗',
        resolve: () => ({ message: '你决定战斗！', result: 'fight' })
      },
      {
        text: '尝试逃跑（60%成功率）',
        resolve: () => {
          const success = Math.random() < 0.6;
          return { message: success ? '你成功逃离了！' : '逃跑失败！', result: success ? 'flee_success' : 'flee_fail' };
        }
      }
    ]
  },
  {
    id: 'goblin_encounter',
    name: '哥布林伏击',
    description: '一只哥布林从角落跳出来，手持生锈的小刀！',
    type: 'combat',
    monster: createMonster('goblin'),
    options: [
      {
        text: '战斗',
        resolve: () => ({ message: '你拔剑应战！', result: 'fight' })
      },
      {
        text: '尝试逃跑（60%成功率）',
        resolve: () => {
          const success = Math.random() < 0.6;
          return { message: success ? '你成功躲过了追击！' : '哥布林追上了你！', result: success ? 'flee_success' : 'flee_fail' };
        }
      }
    ]
  },
  {
    id: 'treasure_chest',
    name: '神秘宝箱',
    description: '你发现了一个落满灰尘的宝箱，上面刻着古老的符文...',
    type: 'treasure',
    options: [
      {
        text: '打开宝箱',
        resolve: (player: Player) => {
          const rewards = [
            { id: 'mana_potion', name: '魔力药水', type: 'consumable' as const, description: '恢复30点魔力', exp: 15 },
            { id: 'hp_potion', name: '生命药水', type: 'consumable' as const, description: '恢复40点生命', exp: 15 },
            { id: 'spell_scroll', name: '魔法卷轴', type: 'material' as const, description: '记载着古老魔法的卷轴', exp: 25 },
            { id: 'gold_coin', name: '金币袋', type: 'material' as const, description: '闪闪发光的金币', exp: 20 }
          ];
          const reward = rewards[Math.floor(Math.random() * rewards.length)];
          player.addItem(reward.id, reward.name, reward.type, reward.description);
          player.addExp(reward.exp);
          return { message: `你获得了 ${reward.name}！`, result: 'reward', data: reward };
        }
      },
      {
        text: '谨慎离开',
        resolve: () => ({ message: '你决定不冒险，离开了宝箱。', result: 'nothing' })
      }
    ]
  },
  {
    id: 'secret_passage',
    name: '发现密道',
    description: '墙壁上的一块砖似乎可以移动...',
    type: 'mystery',
    options: [
      {
        text: '推动砖块',
        resolve: (player: Player) => {
          player.unlockScene('secret_room');
          player.addExp(30);
          player.addItem('ancient_key', '古老钥匙', 'quest', '一把锈迹斑斑的钥匙');
          return { message: '你发现了一条秘密通道！获得了古老钥匙，并解锁了密室！', result: 'reward' };
        }
      },
      {
        text: '忽略它',
        resolve: () => ({ message: '你决定不管这个奇怪的砖块。', result: 'nothing' })
      }
    ]
  },
  {
    id: 'magic_trap',
    name: '魔法陷阱',
    description: '你不小心触发了一个古老的魔法陷阱！',
    type: 'trap',
    options: [
      {
        text: '尝试破解（需要知识值>=20）',
        condition: (p: Player) => p.data.stats.knowledge >= 20,
        resolve: (player: Player) => {
          player.addExp(20);
          return { message: '你成功破解了陷阱，还学到了一些魔法知识！', result: 'reward' };
        }
      },
      {
        text: '硬闯',
        resolve: (player: Player) => {
          const damage = 15 + Math.floor(Math.random() * 10);
          player.takeDamage(damage);
          return { message: `你受到了 ${damage} 点伤害！`, result: 'trap' };
        }
      }
    ]
  },
  {
    id: 'wolf_encounter',
    name: '魔法狼出没',
    description: '一只浑身散发魔力光芒的狼出现在你面前！',
    type: 'combat',
    monster: createMonster('wolf'),
    options: [
      {
        text: '战斗',
        resolve: () => ({ message: '你准备好战斗！', result: 'fight' })
      },
      {
        text: '尝试逃跑（60%成功率）',
        resolve: () => {
          const success = Math.random() < 0.6;
          return { message: success ? '你绕开了魔法狼！' : '被发现了！', result: success ? 'flee_success' : 'flee_fail' };
        }
      }
    ]
  },
  {
    id: 'shadow_encounter',
    name: '暗影袭击',
    description: '一团暗影凝聚成了人形，向你袭来！',
    type: 'combat',
    monster: createMonster('shadow'),
    options: [
      {
        text: '战斗',
        resolve: () => ({ message: '用光驱散暗影！', result: 'fight' })
      },
      {
        text: '尝试逃跑（60%成功率）',
        resolve: () => {
          const success = Math.random() < 0.6;
          return { message: success ? '你逃到了亮处！' : '暗影困住了你！', result: success ? 'flee_success' : 'flee_fail' };
        }
      }
    ]
  },
  {
    id: 'old_spirit',
    name: '远古精灵',
    description: '一只闪烁着柔和光芒的精灵出现在你面前，似乎在注视着你...',
    type: 'mystery',
    options: [
      {
        text: '友好交流（需要等级>=3）',
        condition: (p: Player) => p.data.stats.level >= 3,
        resolve: (player: Player) => {
          player.data.stats.knowledge += 15;
          player.addExp(40);
          player.restoreMana(30);
          return { message: '精灵向你传授了古老的智慧！知识+15，魔力恢复30！', result: 'reward' };
        }
      },
      {
        text: '小心离开',
        resolve: () => ({ message: '你向精灵致意后离开了。', result: 'nothing' })
      }
    ]
  }
];

export const SCENES: Record<string, Scene> = {
  hall: {
    id: 'hall',
    name: '学院大厅',
    description: '宏伟的魔法学院大厅，高耸的穹顶漂浮着无数魔法蜡烛。巨大的水晶吊灯散发着温暖的光芒，学生们来来往往，空气中弥漫着神秘的魔力气息。',
    ambientColor: { start: '#1a0a2e', end: '#0d1b2a' },
    decor: [
      { type: 'rect', x: 50, y: 120, w: 700, h: 4, color: '#8b5cf6' },
      { type: 'rect', x: 50, y: 450, w: 700, h: 4, color: '#8b5cf6' },
      { type: 'circle', x: 400, y: 80, r: 30, color: '#fbbf24' },
      { type: 'text', x: 400, y: 200, text: '✨ Magic Academy ✨', fontSize: 28, color: '#a78bfa' },
      { type: 'rect', x: 100, y: 300, w: 80, h: 120, color: '#6b21a840' },
      { type: 'rect', x: 620, y: 300, w: 80, h: 120, color: '#6b21a840' }
    ],
    objects: [
      {
        id: 'notice_board',
        name: '公告板',
        description: '学院的公告板，上面贴着各种任务和通知。',
        icon: '📋',
        position: { x: 200, y: 350 },
        options: [
          {
            text: '查看任务告示',
            action: (player: Player): ObjectActionResult => {
              player.addExp(10);
              return { success: true, message: '你阅读了任务告示，了解到学院的最新动态。经验+10', expReward: 10 };
            }
          }
        ]
      },
      {
        id: 'grand_stairs',
        name: '主楼梯',
        description: '通往上层的宏伟楼梯，台阶由魔法石铺成。',
        icon: '🪜',
        position: { x: 400, y: 380 },
        options: [
          {
            text: '在楼梯上冥想（恢复魔力）',
            action: (player: Player): ObjectActionResult => {
              player.restoreMana(20);
              return { success: true, message: '你感受到魔力在体内流动，恢复了20点魔力！', manaChange: 20 };
            }
          }
        ]
      },
      {
        id: 'fountain',
        name: '许愿喷泉',
        description: '中央的喷泉散发着淡淡蓝光，据说投入金币可以实现愿望。',
        icon: '⛲',
        position: { x: 600, y: 340 },
        options: [
          {
            text: '投入金币许愿',
            condition: (p: Player) => p.hasItem('goblin_coin'),
            conditionText: '需要金币',
            action: (player: Player): ObjectActionResult => {
              player.removeItem('goblin_coin');
              const rand = Math.random();
              if (rand < 0.4) {
                player.data.stats.maxHp += 5;
                player.heal(5);
                return { success: true, message: '许愿成功！最大生命值+5！', hpChange: 5 };
              } else if (rand < 0.7) {
                player.data.stats.maxMana += 5;
                player.restoreMana(5);
                return { success: true, message: '许愿成功！最大魔力值+5！', manaChange: 5 };
              } else {
                return { success: true, message: '金币沉入水中，但似乎什么都没发生...' };
              }
            }
          },
          {
            text: '只是欣赏喷泉',
            action: (): ObjectActionResult => {
              return { success: true, message: '喷泉的水流声让你感到放松。' };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_library', targetSceneId: 'library', label: '📚 图书馆', position: { x: 80, y: 280 } },
      { id: 'to_alchemy', targetSceneId: 'alchemy', label: '⚗️ 炼金室', position: { x: 720, y: 280 } },
      { id: 'to_classroom', targetSceneId: 'classroom', label: '🏫 教室', position: { x: 200, y: 460 } },
      { id: 'to_dormitory', targetSceneId: 'dormitory', label: '🛏️ 宿舍', position: { x: 600, y: 460 } },
      { id: 'to_forbidden', targetSceneId: 'forbidden', label: '🌲 禁林', position: { x: 400, y: 460 } }
    ],
    npcIds: ['senior'],
    randomEventChance: 0.05
  },
  library: {
    id: 'library',
    name: '图书馆',
    description: '高耸的书架直达天花板，数万本魔法书籍整齐排列。空气中漂浮着古老的纸墨香气，几盏魔法灯悬浮在空中提供柔和的照明。',
    ambientColor: { start: '#1e1b4b', end: '#0c1322' },
    decor: [
      { type: 'rect', x: 60, y: 140, w: 100, h: 300, color: '#5b21b640' },
      { type: 'rect', x: 180, y: 140, w: 100, h: 300, color: '#5b21b640' },
      { type: 'rect', x: 520, y: 140, w: 100, h: 300, color: '#5b21b640' },
      { type: 'rect', x: 640, y: 140, w: 100, h: 300, color: '#5b21b640' },
      { type: 'text', x: 400, y: 100, text: '📖 Ancient Library 📖', fontSize: 22, color: '#818cf8' }
    ],
    objects: [
      {
        id: 'magic_bookshelf',
        name: '魔法书架',
        description: '存放着各种基础魔法书籍的书架。',
        icon: '📚',
        position: { x: 120, y: 280 },
        options: [
          {
            text: '阅读魔法入门（知识+10）',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 10;
              player.addExp(15);
              return { success: true, message: '你仔细阅读了魔法入门书籍，知识值+10！经验+15', knowledgeChange: 10, expReward: 15 };
            }
          },
          {
            text: '阅读高级魔法理论（需要知识>=30）',
            condition: (p: Player) => p.data.stats.knowledge >= 30,
            conditionText: '知识值不足（需30）',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 20;
              player.addExp(35);
              return { success: true, message: '你理解了高级魔法理论！知识+20，经验+35', knowledgeChange: 20, expReward: 35 };
            }
          }
        ]
      },
      {
        id: 'ancient_scrolls',
        name: '古代卷轴区',
        description: '用铁链锁住的古老卷轴，似乎记载着失传的魔法。',
        icon: '📜',
        position: { x: 400, y: 300 },
        options: [
          {
            text: '尝试解读卷轴（需要知识>=50）',
            condition: (p: Player) => p.data.stats.knowledge >= 50,
            conditionText: '知识值不足（需50）',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 30;
              player.addExp(60);
              player.unlockScene('secret_room');
              return { success: true, message: '你成功解读了卷轴！发现了密室的位置！知识+30，经验+60', knowledgeChange: 30, expReward: 60, unlockScene: 'secret_room' };
            }
          },
          {
            text: '只是看看',
            action: (): ObjectActionResult => {
              return { success: true, message: '卷轴上的文字太过古老，你无法理解。' };
            }
          }
        ]
      },
      {
        id: 'reading_desk',
        name: '阅读桌',
        description: '安静的阅读角落，配有舒适的座椅。',
        icon: '🪑',
        position: { x: 680, y: 280 },
        options: [
          {
            text: '静下心阅读（恢复生命和魔力）',
            action: (player: Player): ObjectActionResult => {
              player.heal(15);
              player.restoreMana(15);
              return { success: true, message: '在安静的阅读中，你恢复了15点生命和15点魔力！', hpChange: 15, manaChange: 15 };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_hall', targetSceneId: 'hall', label: '🏛️ 返回大厅', position: { x: 400, y: 460 } }
    ],
    npcIds: ['librarian'],
    randomEventChance: 0.1
  },
  alchemy: {
    id: 'alchemy',
    name: '炼金室',
    description: '蒸汽弥漫的炼金室，各种颜色的药剂在烧瓶中冒泡。墙上挂满了炼金配方和奇怪的工具，空气中混合着数百种草药的气味。',
    ambientColor: { start: '#134e4a', end: '#042f2e' },
    decor: [
      { type: 'circle', x: 200, y: 250, r: 25, color: '#10b98180' },
      { type: 'circle', x: 300, y: 230, r: 18, color: '#f472b680' },
      { type: 'circle', x: 500, y: 260, r: 22, color: '#fbbf2480' },
      { type: 'circle', x: 600, y: 240, r: 15, color: '#60a5fa80' },
      { type: 'rect', x: 100, y: 380, w: 600, h: 60, color: '#16653440' },
      { type: 'text', x: 400, y: 100, text: '⚗️ Alchemy Laboratory ⚗️', fontSize: 22, color: '#34d399' }
    ],
    objects: [
      {
        id: 'herb_cabinet',
        name: '草药柜',
        description: '抽屉里存放着各种珍稀草药。',
        icon: '🌿',
        position: { x: 150, y: 320 },
        options: [
          {
            text: '采集草药（需要炼金术等级2）',
            condition: (p: Player) => p.data.stats.alchemyLevel >= 2,
            conditionText: '炼金术等级不足（需2级）',
            action: (player: Player): ObjectActionResult => {
              player.addItem('dragon_herb', '龙鳞草', 'material', '稀有的炼金材料，教授非常喜欢');
              player.addExp(20);
              return { success: true, message: '你采集到了珍贵的龙鳞草！经验+20', expReward: 20 };
            }
          },
          {
            text: '取普通草药',
            action: (player: Player): ObjectActionResult => {
              player.addItem('common_herb', '普通草药', 'material', '常见的炼金材料');
              player.addExp(5);
              return { success: true, message: '你拿到了一些普通草药。经验+5', expReward: 5 };
            }
          }
        ]
      },
      {
        id: 'cauldron',
        name: '炼金炉',
        description: '熊熊燃烧的炼金炉，坩埚中的液体翻腾着。',
        icon: '🔥',
        position: { x: 400, y: 350 },
        options: [
          {
            text: '调配基础药剂（需要普通草药）',
            condition: (p: Player) => p.hasItem('common_herb'),
            conditionText: '需要普通草药',
            action: (player: Player): ObjectActionResult => {
              player.removeItem('common_herb');
              const type = Math.random() < 0.5 ? 'hp' : 'mana';
              if (type === 'hp') {
                player.addItem('hp_potion', '生命药水', 'consumable', '恢复40点生命');
              } else {
                player.addItem('mana_potion', '魔力药水', 'consumable', '恢复30点魔力');
              }
              player.addExp(15);
              return { success: true, message: `你成功调配了${type === 'hp' ? '生命药水' : '魔力药水'}！经验+15`, expReward: 15 };
            }
          },
          {
            text: '尝试高级炼金（需要炼金术等级3+龙鳞草）',
            condition: (p: Player) => p.data.stats.alchemyLevel >= 3 && p.hasItem('dragon_herb'),
            conditionText: '需要炼金术3级和龙鳞草',
            action: (player: Player): ObjectActionResult => {
              player.removeItem('dragon_herb');
              player.addItem('elixir', '万能药剂', 'consumable', '恢复全部生命和魔力');
              player.addExp(50);
              return { success: true, message: '你炼制出了万能药剂！经验+50', expReward: 50 };
            }
          },
          {
            text: '钻研炼金技术',
            action: (player: Player): ObjectActionResult => {
              const levelUp = Math.random() < 0.3;
              if (levelUp && player.data.stats.alchemyLevel < 5) {
                player.data.stats.alchemyLevel++;
                return { success: true, message: `炼金术等级提升至 ${player.data.stats.alchemyLevel} 级！`, alchemyLevelUp: true };
              }
              player.addExp(10);
              return { success: true, message: '你研究了炼金技术，但没有突破。经验+10', expReward: 10 };
            }
          }
        ]
      },
      {
        id: 'ingredient_shelf',
        name: '材料架',
        description: '摆满各种稀有材料的架子。',
        icon: '🧪',
        position: { x: 650, y: 320 },
        options: [
          {
            text: '搜索材料',
            action: (player: Player): ObjectActionResult => {
              const rand = Math.random();
              if (rand < 0.4) {
                player.addItem('crystal_dust', '水晶粉', 'material', '可用于增幅魔法');
                return { success: true, message: '你找到了一些水晶粉！' };
              } else if (rand < 0.7) {
                player.addItem('moonstone', '月光石', 'material', '蕴含月光能量的石头');
                return { success: true, message: '你找到了一块月光石！' };
              } else {
                return { success: true, message: '架子上只剩下空瓶子...' };
              }
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_hall2', targetSceneId: 'hall', label: '🏛️ 返回大厅', position: { x: 400, y: 460 } }
    ],
    npcIds: ['potions_professor'],
    randomEventChance: 0.08
  },
  classroom: {
    id: 'classroom',
    name: '魔法教室',
    description: '阶梯式的魔法教室，每张课桌上都刻有辅助施法的符文。黑板上还留着上节课的咒语图示。',
    ambientColor: { start: '#1e3a5f', end: '#0f172a' },
    decor: [
      { type: 'rect', x: 100, y: 350, w: 600, h: 8, color: '#3b82f640' },
      { type: 'rect', x: 100, y: 380, w: 600, h: 8, color: '#3b82f640' },
      { type: 'rect', x: 100, y: 410, w: 600, h: 8, color: '#3b82f640' },
      { type: 'rect', x: 250, y: 160, w: 300, h: 100, color: '#1e40af40' },
      { type: 'text', x: 400, y: 100, text: '🏫 Magic Classroom 🏫', fontSize: 22, color: '#60a5fa' }
    ],
    objects: [
      {
        id: 'blackboard',
        name: '魔法黑板',
        description: '黑板上写着复杂的咒语和魔法阵图示。',
        icon: '📝',
        position: { x: 400, y: 210 },
        options: [
          {
            text: '学习基础咒语',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 8;
              player.addExp(12);
              return { success: true, message: '你学习了基础咒语的原理。知识+8，经验+12', knowledgeChange: 8, expReward: 12 };
            }
          },
          {
            text: '研究魔法阵（需要知识>=40）',
            condition: (p: Player) => p.data.stats.knowledge >= 40,
            conditionText: '知识值不足（需40）',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 25;
              player.addExp(40);
              player.data.stats.maxMana += 5;
              return { success: true, message: '你理解了魔法阵的构造！知识+25，经验+40，最大魔力+5', knowledgeChange: 25, expReward: 40, manaChange: 5 };
            }
          }
        ]
      },
      {
        id: 'practice_dummy',
        name: '练习假人',
        description: '用于练习魔法攻击的假人，表面有防护附魔。',
        icon: '🎯',
        position: { x: 200, y: 320 },
        options: [
          {
            text: '进行战斗练习',
            action: (player: Player): ObjectActionResult => {
              const levelUp = Math.random() < 0.25;
              if (levelUp && player.data.stats.combatLevel < 5) {
                player.data.stats.combatLevel++;
                return { success: true, message: `战斗等级提升至 ${player.data.stats.combatLevel} 级！`, combatLevelUp: true };
              }
              player.addExp(15);
              player.useMana(5);
              return { success: true, message: '你进行了一番战斗练习。经验+15，消耗魔力5', expReward: 15, manaChange: -5 };
            }
          }
        ]
      },
      {
        id: 'desk',
        name: '课桌',
        description: '一张刻有符文的课桌，抽屉里似乎有东西...',
        icon: '📖',
        position: { x: 600, y: 340 },
        options: [
          {
            text: '查看抽屉',
            action: (player: Player): ObjectActionResult => {
              const rand = Math.random();
              if (rand < 0.3) {
                player.addItem('spell_scroll', '魔法卷轴', 'material', '记载着古老魔法的卷轴');
                return { success: true, message: '你找到了一张魔法卷轴！' };
              } else if (rand < 0.5) {
                player.addItem('mana_potion', '魔力药水', 'consumable', '恢复30点魔力');
                return { success: true, message: '你找到了一瓶魔力药水！' };
              } else {
                return { success: true, message: '抽屉里只有一些旧笔记。' };
              }
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_hall3', targetSceneId: 'hall', label: '🏛️ 返回大厅', position: { x: 400, y: 460 } },
      { id: 'to_training', targetSceneId: 'training', label: '⚔️ 训练场', position: { x: 80, y: 460 } }
    ],
    npcIds: [],
    randomEventChance: 0.08
  },
  training: {
    id: 'training',
    name: '战斗训练场',
    description: '开阔的露天训练场，地面上布满了各种魔法符文。远处传来武器碰撞的声音。',
    ambientColor: { start: '#3f3f46', end: '#18181b' },
    decor: [
      { type: 'circle', x: 400, y: 300, r: 100, color: '#ef444420' },
      { type: 'line', x: 200, y: 150, w: 400, color: '#a1a1aa40' },
      { type: 'line', x: 200, y: 430, w: 400, color: '#a1a1aa40' },
      { type: 'text', x: 400, y: 100, text: '⚔️ Training Ground ⚔️', fontSize: 22, color: '#f87171' }
    ],
    objects: [
      {
        id: 'combat_dummy',
        name: '高级假人',
        description: '更高级的训练假人，可以模拟真实战斗。',
        icon: '🥋',
        position: { x: 300, y: 300 },
        options: [
          {
            text: '高强度训练（消耗20魔力）',
            condition: (p: Player) => p.data.stats.mana >= 20,
            conditionText: '魔力不足',
            action: (player: Player): ObjectActionResult => {
              player.useMana(20);
              const levelUp = Math.random() < 0.4;
              if (levelUp && player.data.stats.combatLevel < 5) {
                player.data.stats.combatLevel++;
                player.addExp(30);
                return { success: true, message: `战斗等级提升至 ${player.data.stats.combatLevel} 级！经验+30`, combatLevelUp: true, expReward: 30, manaChange: -20 };
              }
              player.addExp(25);
              return { success: true, message: '你进行了高强度训练！经验+25', expReward: 25, manaChange: -20 };
            }
          },
          {
            text: '基础训练',
            action: (player: Player): ObjectActionResult => {
              player.addExp(18);
              return { success: true, message: '你完成了基础战斗训练。经验+18', expReward: 18 };
            }
          }
        ]
      },
      {
        id: 'weapon_rack',
        name: '武器架',
        description: '摆放着各种训练武器的架子。',
        icon: '🗡️',
        position: { x: 600, y: 280 },
        options: [
          {
            text: '熟悉武器',
            action: (player: Player): ObjectActionResult => {
              player.addExp(8);
              return { success: true, message: '你熟悉了不同武器的用法。经验+8', expReward: 8 };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_classroom2', targetSceneId: 'classroom', label: '🏫 返回教室', position: { x: 400, y: 460 } }
    ],
    npcIds: [],
    randomEventChance: 0.12
  },
  dormitory: {
    id: 'dormitory',
    name: '学生宿舍',
    description: '温馨的学生宿舍，每张床边都有一个小床头柜。透过窗户可以看到星空下的学院。',
    ambientColor: { start: '#312e81', end: '#1e1b4b' },
    decor: [
      { type: 'rect', x: 80, y: 200, w: 120, h: 180, color: '#4f46e540' },
      { type: 'rect', x: 250, y: 200, w: 120, h: 180, color: '#4f46e540' },
      { type: 'rect', x: 430, y: 200, w: 120, h: 180, color: '#4f46e540' },
      { type: 'rect', x: 600, y: 200, w: 120, h: 180, color: '#4f46e540' },
      { type: 'text', x: 400, y: 100, text: '🛏️ Dormitory 🛏️', fontSize: 22, color: '#a5b4fc' },
      { type: 'circle', x: 680, y: 130, r: 8, color: '#fef08a' },
      { type: 'circle', x: 720, y: 150, r: 5, color: '#fef08a' }
    ],
    objects: [
      {
        id: 'your_bed',
        name: '你的床铺',
        description: '属于你的舒适床铺，可以在这里休息恢复。',
        icon: '🛏️',
        position: { x: 140, y: 300 },
        options: [
          {
            text: '休息（完全恢复）',
            action: (player: Player): ObjectActionResult => {
              player.heal(player.data.stats.maxHp);
              player.restoreMana(player.data.stats.maxMana);
              player.addExp(5);
              return { success: true, message: '你美美地睡了一觉，生命值和魔力全部恢复！经验+5', hpChange: 999, manaChange: 999, expReward: 5 };
            }
          }
        ]
      },
      {
        id: 'nightstand',
        name: '床头柜',
        description: '你的床头柜，上面放着一些私人物品。',
        icon: '🗄️',
        position: { x: 310, y: 300 },
        options: [
          {
            text: '查看私人物品',
            action: (player: Player): ObjectActionResult => {
              if (!player.hasItem('student_id')) {
                player.addItem('student_id', '学生证', 'quest', '你的魔法学院学生证');
                return { success: true, message: '你拿到了自己的学生证！' };
              }
              return { success: true, message: '一切都井然有序。' };
            }
          }
        ]
      },
      {
        id: 'window',
        name: '窗户',
        description: '可以看到学院夜景的大窗户。',
        icon: '🪟',
        position: { x: 660, y: 280 },
        options: [
          {
            text: '欣赏星空',
            action: (player: Player): ObjectActionResult => {
              player.restoreMana(10);
              return { success: true, message: '璀璨的星空让你心神宁静，恢复了10点魔力。', manaChange: 10 };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_hall4', targetSceneId: 'hall', label: '🏛️ 返回大厅', position: { x: 400, y: 460 } }
    ],
    npcIds: [],
    randomEventChance: 0.03
  },
  forbidden: {
    id: 'forbidden',
    name: '禁林',
    description: '阴森的禁林入口，树木扭曲成诡异的形状。风吹过树叶的声音像是低语，据说深处栖息着各种魔法生物。',
    ambientColor: { start: '#14532d', end: '#052e16' },
    decor: [
      { type: 'rect', x: 80, y: 150, w: 30, h: 280, color: '#166534' },
      { type: 'circle', x: 95, y: 140, r: 45, color: '#15803d80' },
      { type: 'rect', x: 250, y: 130, w: 25, h: 300, color: '#166534' },
      { type: 'circle', x: 262, y: 120, r: 50, color: '#15803d80' },
      { type: 'rect', x: 480, y: 140, w: 28, h: 290, color: '#166534' },
      { type: 'circle', x: 494, y: 130, r: 48, color: '#15803d80' },
      { type: 'rect', x: 680, y: 160, w: 32, h: 270, color: '#166534' },
      { type: 'circle', x: 696, y: 150, r: 52, color: '#15803d80' },
      { type: 'text', x: 400, y: 100, text: '🌲 Forbidden Forest 🌲', fontSize: 22, color: '#4ade80' }
    ],
    objects: [
      {
        id: 'old_tree',
        name: '古树',
        description: '一棵巨大的古树，树干上刻着奇怪的符号。',
        icon: '🌳',
        position: { x: 150, y: 380 },
        options: [
          {
            text: '研究符号（需要知识>=60）',
            condition: (p: Player) => p.data.stats.knowledge >= 60,
            conditionText: '知识值不足（需60）',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 40;
              player.addExp(80);
              player.unlockScene('ancient_ruins');
              return { success: true, message: '符号是通往远古遗迹的指引！解锁了远古遗迹！知识+40，经验+80', knowledgeChange: 40, expReward: 80, unlockScene: 'ancient_ruins' };
            }
          },
          {
            text: '采集树皮',
            action: (player: Player): ObjectActionResult => {
              player.addItem('tree_bark', '古树皮', 'material', '具有魔力的古老树皮');
              player.addExp(8);
              return { success: true, message: '你采集了一些古树皮。经验+8', expReward: 8 };
            }
          }
        ]
      },
      {
        id: 'mushroom',
        name: '发光蘑菇',
        description: '一簇散发着柔和蓝光的蘑菇。',
        icon: '🍄',
        position: { x: 400, y: 400 },
        options: [
          {
            text: '小心采集',
            action: (player: Player): ObjectActionResult => {
              player.addItem('glow_mushroom', '发光蘑菇', 'material', '能在黑暗中发光的神奇蘑菇');
              return { success: true, message: '你成功采集了发光蘑菇！' };
            }
          },
          {
            text: '食用（危险）',
            action: (player: Player): ObjectActionResult => {
              const rand = Math.random();
              if (rand < 0.5) {
                player.heal(30);
                return { success: true, message: '意外地美味！恢复了30点生命！', hpChange: 30 };
              } else {
                player.takeDamage(20);
                return { success: true, message: '你中毒了！受到20点伤害！', hpChange: -20 };
              }
            }
          }
        ]
      },
      {
        id: 'forest_clearing',
        name: '林间空地',
        description: '一片被树木包围的空地，中央有奇怪的烧焦痕迹。',
        icon: '🔥',
        position: { x: 650, y: 380 },
        options: [
          {
            text: '调查烧焦痕迹',
            action: (player: Player): ObjectActionResult => {
              const rand = Math.random();
              if (rand < 0.4) {
                player.addItem('fire_crystal', '火晶石', 'material', '蕴含火焰能量的水晶');
                return { success: true, message: '你在灰烬中发现了火晶石！' };
              }
              player.addExp(12);
              return { success: true, message: '痕迹是某种强大魔法留下的，但你无法辨认。经验+12', expReward: 12 };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_hall5', targetSceneId: 'hall', label: '🏛️ 返回大厅', position: { x: 400, y: 460 } }
    ],
    npcIds: ['forest_guardian'],
    randomEventChance: 0.2
  },
  secret_room: {
    id: 'secret_room',
    name: '密室',
    description: '学院深处的神秘密室，墙上布满了失传的魔法符文。中央有一个发出微光的魔法阵。',
    ambientColor: { start: '#4a044e', end: '#1e1b4b' },
    decor: [
      { type: 'circle', x: 400, y: 300, r: 80, color: '#c026d340' },
      { type: 'circle', x: 400, y: 300, r: 60, color: '#a855f740' },
      { type: 'circle', x: 400, y: 300, r: 40, color: '#e879f940' },
      { type: 'text', x: 400, y: 100, text: '🔮 Secret Chamber 🔮', fontSize: 22, color: '#e879f9' }
    ],
    objects: [
      {
        id: 'magic_circle',
        name: '古老魔法阵',
        description: '中央的魔法阵散发着神秘的能量波动。',
        icon: '🌀',
        position: { x: 400, y: 300 },
        options: [
          {
            text: '进入魔法阵修炼',
            condition: (p: Player) => p.data.stats.level >= 4,
            conditionText: '等级不足（需4级）',
            action: (player: Player): ObjectActionResult => {
              player.addExp(100);
              player.data.stats.knowledge += 50;
              player.data.stats.maxMana += 15;
              player.data.stats.maxHp += 15;
              player.restoreMana(player.data.stats.maxMana);
              player.heal(player.data.stats.maxHp);
              return { success: true, message: '魔法阵的能量涌入你的身体！属性全面提升！经验+100', expReward: 100, knowledgeChange: 50, manaChange: 999, hpChange: 999 };
            }
          },
          {
            text: '仔细观察',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 15;
              player.addExp(25);
              return { success: true, message: '你对魔法阵的构造有了更深理解。知识+15，经验+25', knowledgeChange: 15, expReward: 25 };
            }
          }
        ]
      },
      {
        id: 'treasure',
        name: '神秘宝箱',
        description: '密室深处的宝箱，散发着诱人的光芒。',
        icon: '💎',
        position: { x: 150, y: 320 },
        options: [
          {
            text: '打开宝箱',
            action: (player: Player): ObjectActionResult => {
              if (!player.data.completedQuests.includes('secret_treasure')) {
                player.addItem('ancient_tome', '远古魔法书', 'quest', '记载着学院秘密的书籍');
                player.addItem('elixir', '万能药剂', 'consumable', '恢复全部生命和魔力', 2);
                player.addExp(80);
                player.data.completedQuests.push('secret_treasure');
                return { success: true, message: '你发现了远古魔法书和2瓶万能药剂！经验+80', expReward: 80 };
              }
              return { success: true, message: '宝箱已经被你打开过了。' };
            }
          }
        ]
      },
      {
        id: 'mirror',
        name: '真理之镜',
        description: '据说能映照出真实自我的魔法镜。',
        icon: '🪞',
        position: { x: 650, y: 300 },
        options: [
          {
            text: '凝视镜面',
            action: (player: Player): ObjectActionResult => {
              const benefit = Math.random() < 0.5;
              if (benefit) {
                player.data.stats.skillPoints += 1;
                return { success: true, message: '镜中的你向你传授了心得！技能点+1！' };
              }
              player.addExp(20);
              return { success: true, message: '你从镜中看到了自己的潜能。经验+20', expReward: 20 };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_hall6', targetSceneId: 'hall', label: '🏛️ 返回大厅', position: { x: 400, y: 460 } }
    ],
    npcIds: [],
    randomEventChance: 0.05
  },
  ancient_ruins: {
    id: 'ancient_ruins',
    name: '远古遗迹',
    description: '禁林深处的远古遗迹，残破的石柱诉说着千年前的辉煌。空气中弥漫着强大的魔力。',
    ambientColor: { start: '#78350f', end: '#1c1917' },
    decor: [
      { type: 'rect', x: 100, y: 180, w: 40, h: 260, color: '#a1620780' },
      { type: 'rect', x: 260, y: 140, w: 40, h: 300, color: '#a1620780' },
      { type: 'rect', x: 500, y: 160, w: 40, h: 280, color: '#a1620780' },
      { type: 'rect', x: 660, y: 200, w: 40, h: 240, color: '#a1620780' },
      { type: 'text', x: 400, y: 100, text: '🏛️ Ancient Ruins 🏛️', fontSize: 22, color: '#fbbf24' }
    ],
    objects: [
      {
        id: 'altar',
        name: '远古祭坛',
        description: '遗迹中央的祭坛，上面放着一颗发光的宝石。',
        icon: '✨',
        position: { x: 400, y: 330 },
        options: [
          {
            text: '献上祭品（需要精灵水晶）',
            condition: (p: Player) => p.hasItem('spirit_crystal'),
            conditionText: '需要精灵水晶',
            action: (player: Player): ObjectActionResult => {
              player.removeItem('spirit_crystal');
              player.data.stats.skillPoints += 3;
              player.addExp(150);
              player.data.stats.maxHp += 30;
              player.data.stats.maxMana += 30;
              return { success: true, message: '祭坛接受了你的献祭！技能点+3，最大生命+30，最大魔力+30，经验+150！', expReward: 150 };
            }
          },
          {
            text: '研究祭坛（知识>=80）',
            condition: (p: Player) => p.data.stats.knowledge >= 80,
            conditionText: '知识值不足（需80）',
            action: (player: Player): ObjectActionResult => {
              player.data.stats.knowledge += 60;
              player.addExp(120);
              return { success: true, message: '你破译了祭坛上的铭文！知识+60，经验+120', knowledgeChange: 60, expReward: 120 };
            }
          }
        ]
      },
      {
        id: 'rubble',
        name: '废墟堆',
        description: '倒塌的石柱形成的废墟堆。',
        icon: '🪨',
        position: { x: 180, y: 380 },
        options: [
          {
            text: '搜索废墟',
            action: (player: Player): ObjectActionResult => {
              const rand = Math.random();
              if (rand < 0.3) {
                player.addItem('ancient_coin', '古代金币', 'material', '千年前的金币，具有收藏价值');
                player.addExp(20);
                return { success: true, message: '你发现了古代金币！经验+20', expReward: 20 };
              } else if (rand < 0.5) {
                player.addItem('spirit_crystal', '精灵水晶', 'material', '闪烁着神秘光芒的水晶');
                return { success: true, message: '你找到了一块精灵水晶！' };
              }
              return { success: true, message: '你翻找了一番，但什么都没找到。' };
            }
          }
        ]
      },
      {
        id: 'broken_statue',
        name: '破碎雕像',
        description: '一尊已经破损的古代法师雕像。',
        icon: '🗿',
        position: { x: 580, y: 350 },
        options: [
          {
            text: '检查雕像底座',
            action: (player: Player): ObjectActionResult => {
              if (!player.data.completedQuests.includes('statue_secret')) {
                player.addItem('ultimate_scroll', '终极魔法卷轴', 'quest', '传说中记载终极魔法的卷轴');
                player.data.completedQuests.push('statue_secret');
                player.addExp(100);
                return { success: true, message: '你在雕像底座发现了终极魔法卷轴！经验+100', expReward: 100 };
              }
              return { success: true, message: '雕像底座已经没有其他东西了。' };
            }
          }
        ]
      }
    ],
    exits: [
      { id: 'to_forbidden2', targetSceneId: 'forbidden', label: '🌲 返回禁林', position: { x: 400, y: 460 } }
    ],
    npcIds: [],
    randomEventChance: 0.18
  }
};

export function triggerRandomEvent(scene: Scene): RandomEvent | null {
  if (Math.random() >= scene.randomEventChance) return null;
  const compatibleEvents = RANDOM_EVENTS.filter(e => {
    if (scene.id === 'dormitory') return e.type !== 'combat';
    return true;
  });
  return compatibleEvents[Math.floor(Math.random() * compatibleEvents.length)];
}
