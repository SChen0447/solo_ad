export interface Template {
  title: string;
  prefix?: string;
  suffix?: string;
  connector?: string;
}

export const templates: Template[] = [
  { title: '震惊！{content}，99%的人都不知道！', connector: '' },
  { title: '惊天内幕：{content}背后的真相', connector: '' },
  { title: '刚刚曝光！{content}，看完我沉默了', connector: '' },
  { title: '紧急通知：{content}，现在知道还不晚！', connector: '' },
  { title: '深度揭秘：{content}，竟然藏着这么大的秘密', connector: '' },
  { title: '疯传全网！{content}，转发量已破10万+', connector: '' },
  { title: '央视都报道了！{content}，再不看就删了', connector: '' },
  { title: '速看！{content}，专家都吓傻了', connector: '' },
  { title: '罕见曝光：{content}，看完让人后背发凉', connector: '' },
  { title: '重大发现！{content}，改变你的一生', connector: '' },
  { title: '不敢相信！{content}，真相竟然是这样', connector: '' },
  { title: '国家终于出手了！{content}，大快人心', connector: '' },
  { title: '深夜突发：{content}，所有人都要注意！', connector: '' },
  { title: '独家爆料：{content}，内幕太惊人！', connector: '' },
  { title: '看哭了！{content}，是中国人就转！', connector: '' },
  { title: '警惕！{content}，家里有老人小孩的必看', connector: '' },
  { title: '全球首发：{content}，颠覆你的认知', connector: '' },
  { title: '失传已久！{content}，价值连城', connector: '' },
  { title: '紧急提醒：{content}，赶紧告诉你身边的人', connector: '' },
  { title: '万万没想到！{content}，结局令人震惊', connector: '' }
];

export const getRandomTemplate = (): Template => {
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
};

export const formatTemplate = (template: Template, content: string): string => {
  return template.title.replace('{content}', content);
};
