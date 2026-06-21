import { eventBus, GameEvents } from '../utils/EventBus';

export interface Choice {
  id: string;
  text: string;
  nextNodeId: string;
  requiredClue?: string;
  lockedText?: string;
  grantsItem?: string;
  isCritical?: boolean;
  criticalValue?: 'good' | 'neutral' | 'bad';
}

export interface StoryNode {
  id: string;
  chapter: number;
  title: string;
  text: string;
  choices: Choice[];
  dropZoneItem?: string;
  dropZoneSuccessNode?: string;
  dropZoneClueId?: string;
  isEnding?: boolean;
  endingType?: 'victory' | 'normal' | 'defeat';
}

export interface Chapter {
  id: number;
  name: string;
  themeColor: string;
  startNodeId: string;
  criticalChoices: number;
}

export interface GameState {
  currentNodeId: string;
  currentChapter: number;
  visitedNodes: string[];
  collectedItems: string[];
  unlockedClues: string[];
  choiceHistory: { nodeId: string; choiceId: string }[];
  criticalGoodCount: number;
  criticalBadCount: number;
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '第一章：迷雾庄园',
    themeColor: '#DAA520',
    startNodeId: 'ch1_start',
    criticalChoices: 2,
  },
  {
    id: 2,
    name: '第二章：幽蓝深海',
    themeColor: '#4682B4',
    startNodeId: 'ch2_start',
    criticalChoices: 2,
  },
  {
    id: 3,
    name: '第三章：暗影神殿',
    themeColor: '#9370DB',
    startNodeId: 'ch3_start',
    criticalChoices: 2,
  },
];

const NODES: Record<string, StoryNode> = {
  ch1_start: {
    id: 'ch1_start',
    chapter: 1,
    title: '迷雾庄园的入口',
    text: '浓雾笼罩着这座被遗忘的庄园。你站在锈迹斑斑的铁门前，空气中弥漫着潮湿泥土与枯萎花朵的气息。门旁的石桌上放着几样东西，而门缝中似乎透出微弱的烛光...',
    choices: [
      { id: 'c1_take_key', text: '拿起石桌上的钥匙', nextNodeId: 'ch1_key_taken', grantsItem: 'old_key', isCritical: true, criticalValue: 'good' },
      { id: 'c1_take_letter', text: '查看那张残破的信件', nextNodeId: 'ch1_letter_read', grantsItem: 'torn_letter' },
      { id: 'c1_push_door', text: '直接用力推开大门', nextNodeId: 'ch1_door_stuck', isCritical: true, criticalValue: 'bad' },
    ],
  },
  ch1_key_taken: {
    id: 'ch1_key_taken',
    chapter: 1,
    title: '钥匙入手',
    text: '钥匙沉甸甸的，铜绿在指尖留下淡淡的痕迹。你注意到钥匙柄上的花纹与门上的某个标记十分相似。石桌下还有个抽屉，里面放着其他物品。',
    choices: [
      { id: 'c1_search_drawer', text: '搜索抽屉', nextNodeId: 'ch1_found_more', grantsItem: 'magnifier' },
      { id: 'c1_use_key', text: '用钥匙尝试开门', nextNodeId: 'ch1_door_unlocked' },
    ],
  },
  ch1_letter_read: {
    id: 'ch1_letter_read',
    chapter: 1,
    title: '残破的信件',
    text: '信件大部分被烧毁，只能辨认出片段："...务必在日落前找到...隐藏在花园深处的..." 信纸的折痕处似乎藏着什么，但你的肉眼看不清楚。',
    choices: [
      { id: 'c1_take_candle', text: '拿起旁边的蜡烛照明', nextNodeId: 'ch1_candle_taken', grantsItem: 'candle' },
      { id: 'c1_go_back', text: '先看看其他东西', nextNodeId: 'ch1_start' },
    ],
  },
  ch1_door_stuck: {
    id: 'ch1_door_stuck',
    chapter: 1,
    title: '大门纹丝不动',
    text: '你用力推门，但大门仿佛被封印了一般，纹丝不动。更糟的是，你撞门的声音惊动了什么——灌木丛中传来窸窸窣窣的声响，一股不祥的预感涌上心头。',
    choices: [
      { id: 'c1_calm_down', text: '冷静下来，寻找其他方法', nextNodeId: 'ch1_key_taken' },
      { id: 'c1_force_more', text: '继续强行撞门', nextNodeId: 'ch1_injured' },
    ],
  },
  ch1_found_more: {
    id: 'ch1_found_more',
    chapter: 1,
    title: '抽屉里的发现',
    text: '抽屉里有一把精致的放大镜和更多散落的信纸碎片。放大镜的黄铜边框虽然暗淡，但擦拭后应该还能用。',
    choices: [
      { id: 'c1_letter_clue', text: '用放大镜仔细查看信件（需线索）', nextNodeId: 'ch1_garden_revealed', requiredClue: 'ch1_garden_clue', lockedText: '需要先组合信件和放大镜...' },
      { id: 'c1_use_key_door', text: '去开门', nextNodeId: 'ch1_door_unlocked', grantsItem: 'old_key' },
    ],
    dropZoneItem: 'torn_letter',
    dropZoneSuccessNode: 'ch1_garden_revealed',
    dropZoneClueId: 'ch1_garden_clue',
  },
  ch1_candle_taken: {
    id: 'ch1_candle_taken',
    chapter: 1,
    title: '烛光摇曳',
    text: '蜡烛点燃后，温暖的光驱散了些许寒意。你注意到蜡烛底座上刻着一行小字："光明之后，真相自显。"',
    choices: [
      { id: 'c1_check_table', text: '继续搜查石桌', nextNodeId: 'ch1_found_more', grantsItem: 'magnifier' },
      { id: 'c1_enter_door', text: '用烛光照亮门缝，尝试推门', nextNodeId: 'ch1_door_unlocked' },
    ],
  },
  ch1_injured: {
    id: 'ch1_injured',
    chapter: 1,
    title: '代价',
    text: '你再一次撞向大门，这次大门稍微松动了些，但你的肩膀也被尖锐的铁刺划伤。鲜血渗出，疼痛让你的意识有些模糊。',
    choices: [
      { id: 'c1_persist', text: '忍住伤痛，继续前进', nextNodeId: 'ch1_door_unlocked' },
      { id: 'c1_rest', text: '先包扎伤口休息片刻', nextNodeId: 'ch1_key_taken' },
    ],
  },
  ch1_door_unlocked: {
    id: 'ch1_door_unlocked',
    chapter: 1,
    title: '庄园大厅',
    text: '大门缓缓打开，映入眼帘的是一座空旷的大厅。蜘蛛网遍布角落，尘埃在透过破碎窗户的阳光中飞舞。大厅中央有一座楼梯通向二楼，而左侧则是一扇标着"花园"的拱门。',
    choices: [
      { id: 'c1_garden_path', text: '沿着花园拱门前进（需花园线索）', nextNodeId: 'ch1_garden_true', requiredClue: 'ch1_garden_clue', lockedText: '总觉得花园里藏着什么关键...' },
      { id: 'c1_upstairs', text: '走上二楼探索', nextNodeId: 'ch1_upstairs', isCritical: true, criticalValue: 'neutral' },
      { id: 'c1_hall_search', text: '仔细搜查大厅', nextNodeId: 'ch2_start' },
    ],
  },
  ch1_garden_revealed: {
    id: 'ch1_garden_revealed',
    chapter: 1,
    title: '隐秘的线索',
    text: '放大镜下，信件折痕处的痕迹逐渐清晰——那是一把用隐形墨水绘制的绿色小钥匙，旁边标注着"花园入口的秘密"。你感觉自己找到了关键的突破口！',
    choices: [
      { id: 'c1_garden_goto', text: '立刻前往花园拱门', nextNodeId: 'ch1_garden_true', grantsItem: 'hidden_garden_key' },
      { id: 'c1_still_search', text: '先搜索大厅其他地方', nextNodeId: 'ch1_door_unlocked' },
    ],
  },
  ch1_garden_true: {
    id: 'ch1_garden_true',
    chapter: 1,
    title: '秘密花园',
    text: '花园拱门之后是另一番景象——枯萎的藤蔓间点缀着奇异的蓝色花朵，花丛中央有一口古井，井壁上镶嵌着发光的水晶。你取下一块水晶碎片，它在你手中微微颤动。',
    choices: [
      { id: 'c1_enter_well', text: '探索古井深处', nextNodeId: 'ch2_start', grantsItem: 'crystal_shard', isCritical: true, criticalValue: 'good' },
      { id: 'c1_garden_back', text: '返回大厅，走正门路线', nextNodeId: 'ch2_start', grantsItem: 'crystal_shard' },
    ],
  },
  ch1_upstairs: {
    id: 'ch1_upstairs',
    chapter: 1,
    title: '二楼走廊',
    text: '二楼走廊两侧排列着紧闭的房门，尽头的窗户被木板钉死。地板吱呀作响，你感觉时间在这里停滞了很久。你捡到了一张被遗落的古老地图。',
    choices: [
      { id: 'c1_downstairs_continue', text: '下楼继续前进', nextNodeId: 'ch2_start', grantsItem: 'ancient_map' },
    ],
  },

  ch2_start: {
    id: 'ch2_start',
    chapter: 2,
    title: '幽蓝深海的入口',
    text: '穿越庄园的密道后，你来到了一处地下洞穴。地下水脉汇聚成一片发光的幽蓝色湖泊，水面上漂浮着古老的石砖，形成一条通向深处的道路。空气中弥漫着咸涩的气息。',
    choices: [
      { id: 'c2_take_flask', text: '用烧瓶收集湖水样本', nextNodeId: 'ch2_flask_collected', grantsItem: 'water_flask' },
      { id: 'c2_stone_path', text: '沿着石砖路前进', nextNodeId: 'ch2_water_path' },
      { id: 'c2_cave_wall', text: '观察洞穴墙壁上的壁画', nextNodeId: 'ch2_mural_found', grantsItem: 'ancient_map' },
    ],
  },
  ch2_flask_collected: {
    id: 'ch2_flask_collected',
    chapter: 2,
    title: '湖水的秘密',
    text: '湖水盛入烧瓶后，你注意到它在阳光下会折射出彩虹般的光晕，而当水晶碎片靠近时，液体会剧烈地旋转起来。这水一定不简单。',
    choices: [
      { id: 'c2_combine_test', text: '用水晶碎片与地图进行组合（需线索）', nextNodeId: 'ch2_treasure_revealed', requiredClue: 'ch2_treasure_clue', lockedText: '感觉这些物品之间有某种联系...' },
      { id: 'c2_continue_path', text: '继续沿石砖路前进', nextNodeId: 'ch2_water_path' },
    ],
    dropZoneItem: 'crystal_shard',
    dropZoneSuccessNode: 'ch2_treasure_revealed',
    dropZoneClueId: 'ch2_treasure_clue',
  },
  ch2_water_path: {
    id: 'ch2_water_path',
    chapter: 2,
    title: '水晶通道',
    text: '石砖路带你来到一个巨大的水晶洞穴。洞顶垂下无数蓝水晶，折射的光线在洞壁上绘出流动的图案。中央的祭坛上摆放着一个密封的石匣。',
    choices: [
      { id: 'c2_open_casket', text: '尝试打开石匣', nextNodeId: 'ch2_casket_opened', isCritical: true, criticalValue: 'good' },
      { id: 'c2_smash_casket', text: '用暴力砸开石匣', nextNodeId: 'ch2_cave_collapse', isCritical: true, criticalValue: 'bad' },
      { id: 'c2_ignore_casket', text: '绕过石匣，深入洞穴', nextNodeId: 'ch2_deep_cave' },
    ],
  },
  ch2_mural_found: {
    id: 'ch2_mural_found',
    chapter: 2,
    title: '古老壁画',
    text: '壁画描绘了一个古老文明的兴衰：人们崇拜海神，建造了辉煌的水下城市，直到一场灾难将一切埋葬。最后一幅壁画上，一位贤者将什么东西藏在了"光明交汇之处"。',
    choices: [
      { id: 'c2_ponder_mural', text: '仔细思考壁画的含义', nextNodeId: 'ch2_flask_collected', grantsItem: 'water_flask' },
      { id: 'c2_follow_path', text: '继续前进', nextNodeId: 'ch2_water_path' },
    ],
  },
  ch2_casket_opened: {
    id: 'ch2_casket_opened',
    chapter: 2,
    title: '石匣的秘密',
    text: '石匣在你的触碰下缓缓打开，里面是一卷更加古老的地图和一把镶嵌蓝宝石的匕首。地图上标注的路线与你之前的发现吻合，指向神殿的方向。',
    choices: [
      { id: 'c2_treasure_check', text: '检查水晶碎片与地图的联系（需线索）', nextNodeId: 'ch2_treasure_revealed', requiredClue: 'ch2_treasure_clue', lockedText: '需要用碎片激活地图...' },
      { id: 'c2_to_temple', text: '根据地图前往神殿', nextNodeId: 'ch3_start', grantsItem: 'ancient_map' },
    ],
  },
  ch2_cave_collapse: {
    id: 'ch2_cave_collapse',
    chapter: 2,
    title: '洞穴崩塌',
    text: '你用力砸向石匣，触发了古老的机关！头顶的水晶开始纷纷坠落，碎石如雨。你拼命奔跑，虽然逃过一劫，但宝贵的线索也被埋葬了。',
    choices: [
      { id: 'c2_flee_cave', text: '逃离崩塌区域', nextNodeId: 'ch3_start', isCritical: true, criticalValue: 'bad' },
    ],
  },
  ch2_deep_cave: {
    id: 'ch2_deep_cave',
    chapter: 2,
    title: '洞穴深处',
    text: '你深入洞穴，发现了一个隐藏的修炼室。墙上挂着一件奇怪的法器，桌上还有一些尚未变质的药草。你在其中发现了一块特别的水晶碎片。',
    choices: [
      { id: 'c2_take_crystal', text: '收集水晶碎片', nextNodeId: 'ch2_casket_opened', grantsItem: 'crystal_shard' },
    ],
  },
  ch2_treasure_revealed: {
    id: 'ch2_treasure_revealed',
    chapter: 2,
    title: '宝藏的坐标',
    text: '水晶碎片靠近地图的瞬间，蓝色光芒汇聚，在地图的某一点上形成一个明亮的光点——那是神殿最深处的位置。你不仅找到了方向，还掌握了避开陷阱的关键路线！',
    choices: [
      { id: 'c2_to_temple_true', text: '带着完整线索前往神殿', nextNodeId: 'ch3_start', grantsItem: 'treasure_location', isCritical: true, criticalValue: 'good' },
    ],
  },

  ch3_start: {
    id: 'ch3_start',
    chapter: 3,
    title: '暗影神殿',
    text: '你终于来到了传说中的暗影神殿。巨大的黑色石柱上雕刻着扭曲的符文，神殿深处传来低沉的吟唱声。大厅中央悬浮着三块石板，每块都通向不同的试炼之路。入口处的供桌上放着一些物品。',
    choices: [
      { id: 'c3_take_feather', text: '拿起燃烧的羽毛', nextNodeId: 'c3_feather_taken', grantsItem: 'phoenix_feather' },
      { id: 'c3_take_amulet', text: '拿起银色的护符', nextNodeId: 'c3_amulet_taken', grantsItem: 'silver_amulet' },
      { id: 'c3_choose_path', text: '直接选择试炼之路', nextNodeId: 'c3_three_paths' },
    ],
  },
  c3_feather_taken: {
    id: 'c3_feather_taken',
    chapter: 3,
    title: '凤凰之羽',
    text: '羽毛触手温暖，仿佛握着一团永不熄灭的火焰。你感觉到它在与你的心跳产生共鸣，似乎在期待着什么。',
    choices: [
      { id: 'c3_take_amulet_too', text: '拿起银色护符', nextNodeId: 'c3_both_items', grantsItem: 'silver_amulet' },
      { id: 'c3_go_paths', text: '前往选择试炼之路', nextNodeId: 'c3_three_paths' },
    ],
  },
  c3_amulet_taken: {
    id: 'c3_amulet_taken',
    chapter: 3,
    title: '白银护符',
    text: '护符上的符文在你触碰时亮起柔和的白光，低声吟唱的古老咒语在你脑海中回响，仿佛在警告着什么，又像是在给予祝福。',
    choices: [
      { id: 'c3_take_feather_too', text: '拿起凤凰羽毛', nextNodeId: 'c3_both_items', grantsItem: 'phoenix_feather' },
      { id: 'c3_go_paths_2', text: '前往选择试炼之路', nextNodeId: 'c3_three_paths' },
    ],
  },
  c3_both_items: {
    id: 'c3_both_items',
    chapter: 3,
    title: '双重力量',
    text: '你同时持有凤凰羽毛与白银护符，两者之间开始产生微妙的反应。羽毛的火焰与护符的光芒交织，但它们似乎还需要某种契机才能完全融合...',
    choices: [
      { id: 'c3_bless_combine', text: '尝试融合羽毛与护符（需线索）', nextNodeId: 'c3_blessing_received', requiredClue: 'ch3_ritual_clue', lockedText: '这两种力量需要正确的方式结合...' },
      { id: 'c3_enter_paths', text: '前往试炼之路', nextNodeId: 'c3_three_paths' },
    ],
    dropZoneItem: 'phoenix_feather',
    dropZoneSuccessNode: 'c3_blessing_received',
    dropZoneClueId: 'ch3_ritual_clue',
  },
  c3_three_paths: {
    id: 'c3_three_paths',
    chapter: 3,
    title: '三条道路',
    text: '三块石板分别发出不同的光芒：左侧是代表勇气的赤红，中央是代表智慧的幽蓝，右侧是代表力量的暗紫。你的选择将决定最终的命运。',
    choices: [
      { id: 'c3_path_red', text: '选择赤红的勇气之路', nextNodeId: 'c3_trial_courage', isCritical: true, criticalValue: 'neutral' },
      { id: 'c3_path_blue', text: '选择幽蓝的智慧之路', nextNodeId: 'c3_trial_wisdom', isCritical: true, criticalValue: 'good' },
      { id: 'c3_path_purple', text: '选择暗紫的力量之路', nextNodeId: 'c3_trial_power', isCritical: true, criticalValue: 'bad' },
    ],
  },
  c3_blessing_received: {
    id: 'c3_blessing_received',
    chapter: 3,
    title: '神圣祝福',
    text: '凤凰羽毛与白银护符在你面前交织旋转，火焰与白光完美融合，化作一道温暖的光柱笼罩全身。你感觉自己的身体变得轻盈，内心充满了前所未有的勇气与智慧——这是古老贤者留下的终极祝福！',
    choices: [
      { id: 'c3_blessed_paths', text: '带着祝福踏上试炼', nextNodeId: 'c3_three_paths', grantsItem: 'ritual_blessing', isCritical: true, criticalValue: 'good' },
    ],
  },
  c3_trial_courage: {
    id: 'c3_trial_courage',
    chapter: 3,
    title: '勇气的试炼',
    text: '你踏入赤红的光芒中，四周化为一片火海。烈焰翻腾，但你咬紧牙关，一步步向前。最终，你穿过了火焰，面前出现了通向最终房间的大门。',
    choices: [
      { id: 'c3_enter_final', text: '推开最终之门', nextNodeId: 'c3_final_room' },
    ],
  },
  c3_trial_wisdom: {
    id: 'c3_trial_wisdom',
    chapter: 3,
    title: '智慧的试炼',
    text: '幽蓝光芒中浮现出无数谜题与幻象。你冷静地分析每一个线索，识破虚假的幻影，找到真正的道路。谜题逐一解开，最终大门在你面前缓缓开启。',
    choices: [
      { id: 'c3_enter_final_2', text: '走入最终房间', nextNodeId: 'c3_final_room' },
    ],
  },
  c3_trial_power: {
    id: 'c3_trial_power',
    chapter: 3,
    title: '力量的试炼',
    text: '暗紫光化作一只巨大的暗影魔兽向你扑来。你选择用力量对抗力量，但魔兽的力量似乎无穷无尽。在激烈的战斗中，你虽然击退了它，但也付出了不小的代价。',
    choices: [
      { id: 'c3_enter_final_3', text: '带伤进入最终房间', nextNodeId: 'c3_final_room_damaged' },
    ],
  },
  c3_final_room: {
    id: 'c3_final_room',
    chapter: 3,
    title: '最终密室',
    text: '最终密室中，一座古老的祭坛矗立在正中央，上面安放着你一直追寻的东西——传说中的"真理之眼"。它静静悬浮着，等待着合格的继承者。',
    choices: [
      { id: 'c3_take_relic_blessed', text: '（拥有祝福）以纯净之心接受传承', nextNodeId: 'ending_victory', requiredClue: 'ch3_ritual_clue', lockedText: '需要获得古老贤者的祝福...' },
      { id: 'c3_take_relic_normal', text: '小心地拿起真理之眼', nextNodeId: 'ending_normal' },
    ],
  },
  c3_final_room_damaged: {
    id: 'c3_final_room_damaged',
    chapter: 3,
    title: '最终密室（带伤）',
    text: '你带伤进入密室，身体的疼痛让你的意识有些模糊。祭坛上的真理之眼散发着诱人的光芒，但你隐约感觉到周围有什么不对——似乎有暗影在悄悄逼近。',
    choices: [
      { id: 'c3_rush_take', text: '忍住伤痛，快速夺取宝物', nextNodeId: 'ending_defeat', isCritical: true, criticalValue: 'bad' },
      { id: 'c3_careful_approach', text: '谨慎地观察四周', nextNodeId: 'ending_normal' },
    ],
  },

  ending_victory: {
    id: 'ending_victory',
    chapter: 3,
    title: '结局：真理的继承者',
    text: '在神圣祝福的加持下，真理之眼与你完美融合。无尽的智慧涌入你的意识，你看到了世界的过去、现在与未来的无数可能。古老文明的真正使命托付给了你——你将成为新一代的守护者，将光明继续传承下去。',
    choices: [],
    isEnding: true,
    endingType: 'victory',
  },
  ending_normal: {
    id: 'ending_normal',
    chapter: 3,
    title: '结局：寻宝者的归途',
    text: '你成功获得了真理之眼，虽然没有完全解开它所有的秘密，但这次冒险足以改变你的一生。带着珍贵的宝物与无数回忆，你踏上了归途。有些谜题或许永远没有答案，但追寻的过程本身就是最好的奖赏。',
    choices: [],
    isEnding: true,
    endingType: 'normal',
  },
  ending_defeat: {
    id: 'ending_defeat',
    chapter: 3,
    title: '结局：暗影的祭品',
    text: '你太急于求成，忽略了隐藏的陷阱。暗影从四面八方涌来，将你拖入无尽的黑暗。真理之眼再次沉睡，等待下一个冒险者的到来...而你的故事，将成为后来者的警示。',
    choices: [],
    isEnding: true,
    endingType: 'defeat',
  },
};

const INITIAL_STATE: GameState = {
  currentNodeId: 'ch1_start',
  currentChapter: 1,
  visitedNodes: ['ch1_start'],
  collectedItems: [],
  unlockedClues: [],
  choiceHistory: [],
  criticalGoodCount: 0,
  criticalBadCount: 0,
};

class ChaptersManager {
  private state: GameState;

  constructor() {
    this.state = { ...INITIAL_STATE };
  }

  public reset(): void {
    this.state = {
      ...INITIAL_STATE,
      visitedNodes: [INITIAL_STATE.currentNodeId],
      collectedItems: [],
      unlockedClues: [],
      choiceHistory: [],
    };
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getChapters(): Chapter[] {
    return CHAPTERS;
  }

  public getCurrentChapter(): Chapter | undefined {
    return CHAPTERS.find((c) => c.id === this.state.currentChapter);
  }

  public getChapter(id: number): Chapter | undefined {
    return CHAPTERS.find((c) => c.id === id);
  }

  public getCurrentNode(): StoryNode {
    return NODES[this.state.currentNodeId];
  }

  public getNode(nodeId: string): StoryNode | undefined {
    return NODES[nodeId];
  }

  public getCollectedItems(): string[] {
    return [...this.state.collectedItems];
  }

  public hasItem(itemId: string): boolean {
    return this.state.collectedItems.includes(itemId);
  }

  public hasClue(clueId: string): boolean {
    return this.state.unlockedClues.includes(clueId);
  }

  public collectItem(itemId: string): boolean {
    if (this.state.collectedItems.includes(itemId) || this.state.collectedItems.length >= 10) {
      return false;
    }
    this.state.collectedItems.push(itemId);
    eventBus.emit(GameEvents.ITEM_COLLECTED, itemId);
    eventBus.emit(GameEvents.INVENTORY_UPDATED, this.getCollectedItems());
    return true;
  }

  public unlockClue(clueId: string): boolean {
    if (this.state.unlockedClues.includes(clueId)) {
      return false;
    }
    this.state.unlockedClues.push(clueId);
    eventBus.emit(GameEvents.CLUE_UNLOCKED, clueId);
    return true;
  }

  public makeChoice(choiceId: string): StoryNode | null {
    const currentNode = this.getCurrentNode();
    const choice = currentNode.choices.find((c) => c.id === choiceId);
    if (!choice) return null;

    if (choice.requiredClue && !this.hasClue(choice.requiredClue)) {
      return null;
    }

    this.state.choiceHistory.push({ nodeId: currentNode.id, choiceId });

    if (choice.isCritical) {
      if (choice.criticalValue === 'good') this.state.criticalGoodCount++;
      else if (choice.criticalValue === 'bad') this.state.criticalBadCount++;
    }

    if (choice.grantsItem) {
      this.collectItem(choice.grantsItem);
    }

    this.goToNode(choice.nextNodeId);

    eventBus.emit(GameEvents.CHOICE_MADE, choice);
    eventBus.emit(GameEvents.STORY_PROGRESS, this.state);

    return this.getCurrentNode();
  }

  public goToNode(nodeId: string): boolean {
    const node = NODES[nodeId];
    if (!node) return false;

    this.state.currentNodeId = nodeId;
    this.state.currentChapter = node.chapter;
    if (!this.state.visitedNodes.includes(nodeId)) {
      this.state.visitedNodes.push(nodeId);
    }
    return true;
  }

  public unlockDropZoneClue(clueId: string, successNodeId: string): boolean {
    const unlocked = this.unlockClue(clueId);
    if (unlocked && successNodeId) {
      eventBus.emit(GameEvents.ITEM_DROP_ZONE, { clueId, successNodeId });
    }
    return unlocked;
  }

  public determineEnding(): 'victory' | 'normal' | 'defeat' {
    const currentNode = this.getCurrentNode();
    if (currentNode.isEnding && currentNode.endingType) {
      return currentNode.endingType;
    }
    if (this.state.criticalBadCount >= 3) return 'defeat';
    if (this.state.criticalGoodCount >= 4 && this.hasClue('ch3_ritual_clue')) return 'victory';
    if (this.state.criticalGoodCount >= this.state.criticalBadCount + 2) return 'victory';
    if (this.state.criticalGoodCount <= this.state.criticalBadCount) return 'defeat';
    return 'normal';
  }

  public getEndingEvaluation(): { type: 'victory' | 'normal' | 'defeat'; title: string; lines: string[] } {
    const endingType = this.determineEnding();
    const totalChoices = this.state.choiceHistory.length;
    const cluesFound = this.state.unlockedClues.length;
    const itemsCollected = this.state.collectedItems.length;

    const evaluations: Record<string, { title: string; lines: string[] }> = {
      victory: {
        title: '★ 真理的继承者 ★',
        lines: [
          '',
          `冒险选择总数：${totalChoices} 次`,
          `发现隐藏线索：${cluesFound} / 3 条`,
          `收集物品数量：${itemsCollected} 件`,
          '',
          '你展现了非凡的智慧与勇气，',
          '解开了所有隐藏的谜题，',
          '成功继承了古老文明的遗志。',
          '',
          '你的名字将被铭刻在历史之中，',
          '成为未来冒险者们仰望的传奇。',
          '',
          '—— 完美通关 ——',
        ],
      },
      normal: {
        title: '✦ 寻宝者的归途 ✦',
        lines: [
          '',
          `冒险选择总数：${totalChoices} 次`,
          `发现隐藏线索：${cluesFound} / 3 条`,
          `收集物品数量：${itemsCollected} 件`,
          '',
          '你完成了这段冒险之旅，',
          '虽未揭开全部的秘密，',
          '但收获了宝贵的经历与成长。',
          '',
          '人生的道路总是充满遗憾，',
          '但每一次选择都有它的意义。',
          '',
          '—— 期待下一次的冒险 ——',
        ],
      },
      defeat: {
        title: '✕ 暗影的祭品 ✕',
        lines: [
          '',
          `冒险选择总数：${totalChoices} 次`,
          `发现隐藏线索：${cluesFound} / 3 条`,
          `收集物品数量：${itemsCollected} 件`,
          '',
          '你在关键的抉择中迷失了方向，',
          '急于求成让你忽略了重要的线索，',
          '最终被暗影吞噬在无尽的迷雾中。',
          '',
          '但请不要气馁，',
          '每一次失败都是通往成功的基石。',
          '',
          '—— 重新开始，再次挑战 ——',
        ],
      },
    };

    return { type: endingType, ...evaluations[endingType] };
  }
}

export const chaptersManager = new ChaptersManager();
