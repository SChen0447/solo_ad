export type RoomPhase = 'lobby' | 'playing' | 'finished';

export interface User {
  id: string;
  nickname: string;
  emoji: string;
  avatarColor: string;
  isHost: boolean;
  isOnline: boolean;
}

export interface Line {
  id: string;
  userId: string;
  nickname: string;
  emoji: string;
  content: string;
  roundIndex: number;
  turnIndex: number;
  timestamp: number;
}

export interface Script {
  roomId: string;
  scenePrompt: string;
  lines: Line[];
  participants: User[];
  createdAt: number;
  finishedAt: number;
}

export interface Room {
  id: string;
  hostId: string;
  users: User[];
  phase: RoomPhase;
  scenePrompt: string;
  currentTurnUserId: string | null;
  currentRound: number;
  totalRounds: number;
  turnOrder: string[];
  turnIndex: number;
  lines: Line[];
  countdown: number;
  maxUsers: number;
}

export interface ServerMessage {
  type: 'room_state' | 'new_turn' | 'line_added' | 'game_finished' | 'user_joined' | 'user_left' | 'error' | 'countdown_tick';
  payload: Record<string, unknown>;
}

export interface ClientMessage {
  type: 'create_room' | 'join_room' | 'start_game' | 'submit_line' | 'leave_room';
  payload: Record<string, unknown>;
}

export const SCENE_TEMPLATES: string[] = [
  '深夜便利店',
  '魔法学校的期末考试',
  '火星上的第一次约会',
  '电梯故障后的第37分钟',
  '外星人尝试理解地球人的外卖',
  '时光机停在了恐龙时代',
  '两个人争夺超市最后一盒鸡蛋',
  '猫咖里唯一的狗',
  '迷失在宜家商场里',
  '平行宇宙的自己在面前出现',
  '面试官是一只鹦鹉',
  '海底餐厅的开业典礼',
  '时间暂停5分钟的超市',
  '图书馆里的秘密通道',
  '云上的加油站',
  '未来博物馆里的古人展',
  '月亮背面的快递站',
  '会说话的自动售货机',
  '两个间谍在幼儿园卧底',
  '列车上发现了一张藏宝图',
  'AI学会了写诗',
  '暴风雪中的温泉旅馆',
  '树洞里的微型王国',
  '梦境旅行社',
  '被遗忘的失物招领处',
  '冰箱里的微型冰河世纪',
  '来自2077年的快递',
  '魔法部年度述职报告',
  '两个邻居隔墙吵架三年后初见',
  '时间循环的咖啡馆',
  '太空站上的除夕夜',
  '能预知5秒后的未来',
  '被诅咒只能说真话的一天',
  '精灵超市的收银台',
  '记忆可以交易的市场',
  '龙与骑士合租公寓',
  '量子物理学家和算命先生打赌',
  '穿越回小时候的家',
  '动物园里动物们开大会',
  '天气预报员控制了天气',
  '深夜电台的神秘来电',
  '两个时间旅行者意外相遇',
  '黑洞边缘的加油站',
  '吵架后被困在同一个电梯',
  '字面意义上喝下了一杯勇气',
  '每个人头顶显示着内心OS',
  '云端上的洗衣店',
  '考古队挖到了Wi-Fi路由器',
  '语言翻译器出了故障',
  '退休超级英雄的居委会',
  '发现了另一个自己留下的日记',
  '全城停电的一晚',
  '鲸鱼肚子里的会议室',
  '天气预报说今天心情多云',
  '午夜图书馆的秘密',
  '机器人学会了解释笑话',
  '可以交换人生一天的机器',
  '鱼缸里的文明',
  '发明了永不过期的蛋糕',
];
