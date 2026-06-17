export type Difficulty = 'easy' | 'medium' | 'hard';

const EASY_WORDS: string[] = [
  '西瓜', '雨伞', '苹果', '太阳', '月亮', '星星', '花朵', '大树', '小鱼', '小鸟',
  '猫咪', '狗狗', '房子', '汽车', '飞机', '轮船', '火车', '书本', '铅笔', '橡皮',
  '桌子', '椅子', '杯子', '碗筷', '门锁', '窗户', '桥梁', '道路', '山峰', '河流',
  '雪花', '雨滴', '彩虹', '云朵', '闪电', '风车', '灯笼', '蜡烛', '钥匙', '钟表',
  '眼镜', '帽子', '鞋子', '围巾', '手套', '裙子', '裤子', '衬衫', '领带', '腰带',
  '面包', '牛奶', '鸡蛋', '米饭', '面条', '饺子', '汤圆', '月饼', '粽子', '蛋糕',
  '篮球', '足球', '网球', '乒乓球', '跳绳', '风筝', '秋千', '滑梯', '摇马', '积木',
  '冰箱', '电视', '手机', '电脑', '相机', '耳机', '音箱', '风扇', '空调', '台灯',
  '沙发', '床铺', '衣柜', '书架', '花瓶', '画框', '镜子', '地毯', '窗帘', '枕头',
];

const MEDIUM_WORDS: string[] = [
  '过山车', '手电筒', '望远镜', '红绿灯', '冰淇淋', '巧克力', '棒棒糖', '棉花糖',
  '热气球', '摩天轮', '旋转木马', '碰碰车', '跷跷板', '滑板车', '独轮车', '三轮车',
  '消防车', '救护车', '警车', '坦克', '潜艇', '火箭', '卫星', '雷达', '天线', '电池',
  '充电器', '计算器', '打印机', '扫描仪', '投影仪', '显微镜', '温度计', '血压计',
  '听诊器', '注射器', '创可贴', '轮椅', '拐杖', '假牙', '眼镜蛇', '变色龙', '啄木鸟',
  '猫头鹰', '企鹅', '海豚', '鲸鱼', '章鱼', '水母', '螃蟹', '龙虾', '蜗牛', '蝴蝶',
  '蜻蜓', '萤火虫', '七星瓢虫', '向日葵', '蒲公英', '仙人掌', '含羞草', '薰衣草',
  '玫瑰花', '百合花', '牡丹花', '康乃馨', '杜鹃花', '茉莉花', '桂花', '荷花', '梅花',
  '樱花', '桃花', '梨花', '杏花', '苹果树', '椰子树', '香蕉', '菠萝', '草莓', '樱桃',
];

const HARD_WORDS: string[] = [
  '守株待兔', '掩耳盗铃', '画蛇添足', '井底之蛙', '狐假虎威', '亡羊补牢', '刻舟求剑',
  '叶公好龙', '坐井观天', '对牛弹琴', '杯弓蛇影', '画龙点睛', '望梅止渴', '指鹿为马',
  '纸上谈兵', '胸有成竹', '卧薪尝胆', '破釜沉舟', '四面楚歌', '草船借箭', '三顾茅庐',
  '完璧归赵', '负荆请罪', '毛遂自荐', '闻鸡起舞', '投笔从戎', '约法三章', '萧规曹随',
  '运筹帷幄', '决胜千里', '出奇制胜', '声东击西', '围魏救赵', '暗度陈仓', '欲擒故纵',
  '釜底抽薪', '调虎离山', '抛砖引玉', '打草惊蛇', '指桑骂槐', '假痴不癫', '上屋抽梯',
  '空城计', '苦肉计', '连环计', '美人计', '走为上计', '拔苗助长', '杞人忧天',
  '班门弄斧', '一箭双雕', '百发百中', '朝三暮四', '自相矛盾', '滥竽充数',
  '南辕北辙', '买椟还珠', '鹬蚌相争', '螳螂捕蝉', '黔驴技穷', '塞翁失马',
  '精卫填海', '愚公移山', '夸父追日', '女娲补天', '后羿射日', '嫦娥奔月',
  '大禹治水', '铁杵成针', '水滴石穿', '绳锯木断', '闻一知十', '举一反三',
];

const WORD_BANK: Record<Difficulty, string[]> = {
  easy: [...EASY_WORDS],
  medium: [...MEDIUM_WORDS],
  hard: [...HARD_WORDS],
};

let usedWords: Record<Difficulty, Set<string>> = {
  easy: new Set(),
  medium: new Set(),
  hard: new Set(),
};

export function getRandomWord(difficulty: Difficulty): string {
  const pool = WORD_BANK[difficulty].filter(w => !usedWords[difficulty].has(w));
  if (pool.length === 0) {
    usedWords[difficulty] = new Set();
    return getRandomWord(difficulty);
  }
  const word = pool[Math.floor(Math.random() * pool.length)];
  usedWords[difficulty].add(word);
  return word;
}

export function resetWordBank(difficulty?: Difficulty): void {
  if (difficulty) {
    usedWords[difficulty] = new Set();
  } else {
    usedWords = { easy: new Set(), medium: new Set(), hard: new Set() };
  }
}

export function getWordCount(difficulty: Difficulty): number {
  return WORD_BANK[difficulty].length;
}

export { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS };
