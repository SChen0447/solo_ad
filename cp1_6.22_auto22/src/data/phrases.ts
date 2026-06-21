export const quickPhrases: string[] = [
  '惊天内幕',
  '疯狂转发',
  '不看后悔',
  '独家揭秘',
  '真相大白',
  '令人发指',
  '惨不忍睹',
  '触目惊心',
  '匪夷所思',
  '骇人听闻',
  '惊心动魄',
  '振奋人心',
  '大快人心',
  '喜大普奔',
  '泪奔了',
  '看哭了',
  '吓尿了',
  '笑喷了',
  '萌翻了',
  '碉堡了',
  '给力',
  '逆天',
  '神反转',
  '神操作',
  '神回复',
  '涨知识了',
  '毁三观',
  '活久见',
  '细思极恐',
  '细思极甜'
];

export const getRandomPhrases = (count: number = 5): string[] => {
  const shuffled = [...quickPhrases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const refreshPhrases = (excludePhrases: string[], count: number = 5): string[] => {
  const available = quickPhrases.filter(p => !excludePhrases.includes(p));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
