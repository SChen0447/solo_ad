export interface Star {
  id: number
  ra: number
  dec: number
  brightness: number
  colorTemp: number
  name?: string
}

export interface Constellation {
  id: string
  name: string
  chineseName: string
  story: string
  fullStory: string
  starIds: number[]
  lines: [number, number][]
  mainStarId: number
}

const brightStars: Omit<Star, 'id'>[] = [
  { ra: 6.7525, dec: -16.7161, brightness: -1.46, colorTemp: 9940, name: '天狼星' },
  { ra: 14.2638, dec: 19.1825, brightness: -0.74, colorTemp: 9600, name: '织女星' },
  { ra: 13.2569, dec: 54.2781, brightness: 0.03, colorTemp: 8900, name: '五车二' },
  { ra: 18.6156, dec: 38.7837, brightness: 0.08, colorTemp: 4400, name: '天津四' },
  { ra: 5.2782, dec: 45.9980, brightness: 0.03, colorTemp: 9500, name: '五车五' },
  { ra: 1.6286, dec: 57.0450, brightness: 0.05, colorTemp: 4200, name: '北极星' },
  { ra: 2.5303, dec: 42.3060, brightness: 1.79, colorTemp: 9500, name: '天枢' },
  { ra: 2.6549, dec: 56.3824, brightness: 2.24, colorTemp: 10000, name: '天璇' },
  { ra: 3.5593, dec: 54.9253, brightness: 2.41, colorTemp: 8500, name: '天玑' },
  { ra: 3.8740, dec: 53.6947, brightness: 1.86, colorTemp: 9300, name: '天权' },
  { ra: 4.5820, dec: 55.9595, brightness: 1.77, colorTemp: 8800, name: '玉衡' },
  { ra: 5.0370, dec: 54.9253, brightness: 2.04, colorTemp: 8600, name: '开阳' },
  { ra: 5.3877, dec: 49.3132, brightness: 2.31, colorTemp: 9200, name: '摇光' },
  { ra: 5.6036, dec: -1.2019, brightness: 0.45, colorTemp: 4000, name: '参宿四' },
  { ra: 5.2423, dec: -8.2016, brightness: 0.13, colorTemp: 20000, name: '参宿七' },
  { ra: 5.9194, dec: -1.9426, brightness: 1.64, colorTemp: 15000, name: '参宿五' },
  { ra: 5.6793, dec: -9.5658, brightness: 2.06, colorTemp: 13000, name: '参宿六' },
  { ra: 5.6031, dec: -1.9967, brightness: 2.23, colorTemp: 12000, name: '参宿三' },
  { ra: 5.5857, dec: -2.3903, brightness: 2.29, colorTemp: 12500, name: '参宿二' },
  { ra: 5.5714, dec: -2.7862, brightness: 2.24, colorTemp: 13000, name: '参宿一' },
  { ra: 6.7945, dec: 16.4507, brightness: 0.92, colorTemp: 7500, name: '南河三' },
  { ra: 7.3977, dec: 5.2275, brightness: 0.38, colorTemp: 12000, name: '北河三' },
  { ra: 7.2923, dec: 31.8872, brightness: 2.85, colorTemp: 8000, name: '北河二' },
  { ra: 10.1395, dec: 11.9672, brightness: 0.42, colorTemp: 5000, name: '轩辕十四' },
  { ra: 12.4578, dec: -16.0414, brightness: 1.25, colorTemp: 14000, name: '角宿一' },
  { ra: 13.4194, dec: 49.3132, brightness: 2.24, colorTemp: 9000, name: '贯索四' },
  { ra: 15.8733, dec: 25.5931, brightness: 2.29, colorTemp: 3500, name: '心宿二' },
  { ra: 17.5002, dec: -37.0882, brightness: 1.62, colorTemp: 16000, name: '尾宿八' },
  { ra: 19.0757, dec: 8.8683, brightness: 2.44, colorTemp: 10000, name: '河鼓二' },
  { ra: 20.6907, dec: -14.6783, brightness: 2.01, colorTemp: 11000, name: '北落师门' },
  { ra: 22.0785, dec: 29.6078, brightness: 1.15, colorTemp: 13000, name: '室宿一' },
  { ra: 23.4617, dec: -29.6220, brightness: 1.68, colorTemp: 11500, name: '水委一' },
  { ra: 0.8856, dec: 29.0793, brightness: 2.46, colorTemp: 10500, name: '娄宿三' },
  { ra: 2.3283, dec: -13.0749, brightness: 2.01, colorTemp: 9800, name: '土司空' },
  { ra: 3.4716, dec: 23.4623, brightness: 2.28, colorTemp: 9200, name: '天关' },
  { ra: 4.5551, dec: -5.9863, brightness: 2.52, colorTemp: 8500, name: '毕宿五' },
  { ra: 8.8052, dec: 20.5231, brightness: 2.56, colorTemp: 7800, name: '柳宿增三' },
  { ra: 9.4768, dec: 15.2483, brightness: 2.14, colorTemp: 9000, name: '星宿一' },
  { ra: 11.0383, dec: 6.5453, brightness: 2.28, colorTemp: 7200, name: '轩辕十二' },
  { ra: 14.0637, dec: 60.7167, brightness: 2.00, colorTemp: 8000, name: '上卫增一' },
  { ra: 16.9977, dec: 36.4583, brightness: 2.45, colorTemp: 8500, name: '贯索九' },
  { ra: 19.4973, dec: 27.1333, brightness: 2.48, colorTemp: 9000, name: '天市右垣七' },
  { ra: 21.0705, dec: -66.1167, brightness: 2.45, colorTemp: 8000, name: '火鸟十' },
  { ra: 22.9478, dec: 58.7833, brightness: 2.45, colorTemp: 8000, name: '王良四' },
]

function generateStars(): Star[] {
  const stars: Star[] = []
  let id = 1

  for (const bs of brightStars) {
    stars.push({ ...bs, id: id++ })
  }

  const numRandomStars = 1960
  for (let i = 0; i < numRandomStars; i++) {
    const ra = Math.random() * 24
    const dec = (Math.random() - 0.5) * 180
    const brightness = Math.random() * 4 + 1.5
    const colorTemp = Math.random() * 15000 + 3000

    stars.push({
      id: id++,
      ra,
      dec,
      brightness,
      colorTemp,
    })
  }

  return stars
}

export const STARS: Star[] = generateStars()

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'ursa_major',
    name: 'Ursa Major',
    chineseName: '大熊座',
    story: '宙斯化身大熊与仙女卡利斯托相恋，赫拉嫉妒将其化为熊。',
    fullStory: '宙斯化身大熊与仙女卡利斯托相恋，赫拉嫉妒将其化为熊。后宙斯将她升上天界成为大熊座，其儿子成为牧夫座，永远在天上守护着母亲。',
    starIds: [7, 8, 9, 10, 11, 12, 13],
    lines: [[7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [10, 7]],
    mainStarId: 11,
  },
  {
    id: 'ursa_minor',
    name: 'Ursa Minor',
    chineseName: '小熊座',
    story: '小熊座尾端的北极星是天之中心，永远指引北方。',
    fullStory: '小熊座尾端的北极星是天之中心，永远指引北方。据神话，这是宙斯将自己的儿子化为小熊，升上天界成为小熊座，陪伴母亲大熊座。',
    starIds: [6, 7],
    lines: [[6, 7]],
    mainStarId: 6,
  },
  {
    id: 'orion',
    name: 'Orion',
    chineseName: '猎户座',
    story: '猎人俄里翁被女神阿尔忒弥斯误杀，宙斯将其升上天界。',
    fullStory: '猎人俄里翁因向女神阿尔忒弥斯挑战而被误杀，宙斯怜悯他，将其升上天界成为猎户座，永远带着他的猎犬（大犬座）在天上狩猎。',
    starIds: [14, 15, 16, 17, 18, 19, 20],
    lines: [[14, 16], [16, 15], [15, 17], [17, 14], [18, 19], [19, 20]],
    mainStarId: 14,
  },
  {
    id: 'canis_major',
    name: 'Canis Major',
    chineseName: '大犬座',
    story: '猎户座俄里翁忠实的猎犬，永远追随主人在天上狩猎。',
    fullStory: '猎户座俄里翁忠实的猎犬，永远追随主人在天上狩猎。大犬座最亮的天狼星是夜空中最亮的恒星，象征着猎犬敏锐的目光。',
    starIds: [1, 21],
    lines: [[1, 21]],
    mainStarId: 1,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    chineseName: '双子座',
    story: '卡斯托尔与波吕丢刻斯是一对情深的孪生兄弟。',
    fullStory: '卡斯托尔与波吕丢刻斯是一对情深的孪生兄弟，哥哥是凡人，弟弟是神。哥哥战死后，弟弟请求宙斯让两人永远在一起，宙斯便将他们化为双子座。',
    starIds: [22, 23],
    lines: [[22, 23]],
    mainStarId: 22,
  },
  {
    id: 'leo',
    name: 'Leo',
    chineseName: '狮子座',
    story: '宙斯之子赫拉克勒斯杀死的尼米亚巨狮，被升上天界。',
    fullStory: '宙斯之子赫拉克勒斯十二功绩的第一项就是杀死尼米亚巨狮，这头狮子刀枪不入。赫拉克勒斯用双手将其扼死后，宙斯将狮子升上天界成为狮子座。',
    starIds: [24, 37, 38],
    lines: [[24, 37], [37, 38]],
    mainStarId: 24,
  },
  {
    id: 'virgo',
    name: 'Virgo',
    chineseName: '室女座',
    story: '正义女神阿斯特赖亚在黄金时代结束后最后离开人间。',
    fullStory: '正义女神阿斯特赖亚在黄金时代结束后最后离开人间，升上天界成为室女座，手持天平（天秤座）衡量世间善恶，守护着正义与纯洁。',
    starIds: [25, 39],
    lines: [[25, 39]],
    mainStarId: 25,
  },
  {
    id: 'scorpius',
    name: 'Scorpius',
    chineseName: '天蝎座',
    story: '巨蝎被派去刺杀骄傲的猎人俄里翁。',
    fullStory: '巨蝎被女神派去刺杀骄傲的猎人俄里翁，两者在搏斗中同归于尽。宙斯将巨蝎升上天界成为天蝎座，与猎户座永远在天上遥遥相对。',
    starIds: [26, 27],
    lines: [[26, 27]],
    mainStarId: 26,
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    chineseName: '天鹅座',
    story: '宙斯化身天鹅与斯巴达王后勒达幽会。',
    fullStory: '宙斯化身天鹅与斯巴达王后勒达幽会，生下了绝世美女海伦。天鹅座在银河中展翅飞翔，夏季大三角之一的天津四就是它的尾羽。',
    starIds: [5, 28, 40],
    lines: [[5, 28], [28, 40]],
    mainStarId: 5,
  },
  {
    id: 'lyra',
    name: 'Lyra',
    chineseName: '天琴座',
    story: '俄耳甫斯的竖琴能使万物为之动容。',
    fullStory: '俄耳甫斯的竖琴能使万物为之动容，他曾深入冥界试图救回妻子欧律狄刻。他死后，宙斯将他的竖琴升上天界成为天琴座。',
    starIds: [2, 29],
    lines: [[2, 29]],
    mainStarId: 2,
  },
  {
    id: 'aquila',
    name: 'Aquila',
    chineseName: '天鹰座',
    story: '宙斯的神鹰，负责驮运闪电和执行神的旨意。',
    fullStory: '宙斯的神鹰，负责驮运闪电和执行神的旨意。天鹰座最亮的牛郎星（河鼓二）与天琴座的织女星隔着银河遥遥相对，讲述着七夕的美丽传说。',
    starIds: [28, 29],
    lines: [[28, 29]],
    mainStarId: 28,
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    chineseName: '仙后座',
    story: '虚荣的王后卡西奥佩娅因自夸美貌而被惩罚永远坐在天上。',
    fullStory: '虚荣的王后卡西奥佩娅因自夸美貌胜过海中仙女而被波塞冬惩罚，永远坐在天上的椅子上旋转，时而倒悬，成为她永恒的羞辱。',
    starIds: [3, 40, 41],
    lines: [[3, 40], [40, 41]],
    mainStarId: 3,
  },
  {
    id: 'perseus',
    name: 'Perseus',
    chineseName: '英仙座',
    story: '英雄珀尔修斯斩杀蛇发女妖美杜莎。',
    fullStory: '英雄珀尔修斯斩杀蛇发女妖美杜莎，救出被海怪囚禁的公主安德洛墨达（仙女座）。他手持美杜莎的头颅升上天界，成为英仙座。',
    starIds: [4, 41, 42],
    lines: [[4, 41], [41, 42]],
    mainStarId: 4,
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    chineseName: '仙女座',
    story: '公主安德洛墨达被绑在岩石上献祭给海怪。',
    fullStory: '公主安德洛墨达因母亲的虚荣而被绑在岩石上献祭给海怪，幸被英雄珀尔修斯所救。她被升上天界成为仙女座，永远与珀尔修斯相伴。',
    starIds: [4, 42],
    lines: [[4, 42]],
    mainStarId: 4,
  },
  {
    id: 'pegasus',
    name: 'Pegasus',
    chineseName: '飞马座',
    story: '从美杜莎颈血中诞生的飞马珀伽索斯。',
    fullStory: '从美杜莎颈血中诞生的飞马珀伽索斯，曾帮助英雄柏勒洛丰击败喷火怪物喀迈拉。后来它升上天界成为飞马座，成为灵感与诗歌的象征。',
    starIds: [30, 43],
    lines: [[30, 43]],
    mainStarId: 30,
  },
  {
    id: 'taurus',
    name: 'Taurus',
    chineseName: '金牛座',
    story: '宙斯化身白牛劫走腓尼基公主欧罗巴。',
    fullStory: '宙斯化身一头美丽的白牛劫走腓尼基公主欧罗巴，将她带到克里特岛。金牛座的红眼睛（毕宿五）闪耀着神秘的光芒。',
    starIds: [33, 34, 35],
    lines: [[33, 34], [34, 35]],
    mainStarId: 35,
  },
  {
    id: 'aries',
    name: 'Aries',
    chineseName: '白羊座',
    story: '金羊毛的金毛羊，载着王子佛里克索斯逃离迫害。',
    fullStory: '金羊毛的金毛羊，载着王子佛里克索斯逃离迫害。后来金羊毛成为英雄伊阿宋寻找的宝物，象征着勇气与冒险。',
    starIds: [32, 33],
    lines: [[32, 33]],
    mainStarId: 32,
  },
  {
    id: 'capricornus',
    name: 'Capricornus',
    chineseName: '摩羯座',
    story: '潘神在宴会上为躲避怪物而跳河变成半羊半鱼。',
    fullStory: '潘神在宴会上为躲避怪物提丰而跳河变成半羊半鱼，上半身是羊，下半身是鱼。宙斯将这个形象升上天界成为摩羯座。',
    starIds: [30, 31],
    lines: [[30, 31]],
    mainStarId: 30,
  },
  {
    id: 'aquarius',
    name: 'Aquarius',
    chineseName: '宝瓶座',
    story: '美少年伽倪墨得斯被宙斯带到天上成为众神的侍酒童。',
    fullStory: '美少年伽倪墨得斯被宙斯的神鹰带到天上成为众神的侍酒童，永远倾倒着美酒。宝瓶座在秋季星空中闪耀，象征着青春与永恒。',
    starIds: [43, 44],
    lines: [[43, 44]],
    mainStarId: 43,
  },
  {
    id: 'pisces',
    name: 'Pisces',
    chineseName: '双鱼座',
    story: '爱神阿芙洛狄忒与儿子厄洛斯为躲避怪物变成两条鱼。',
    fullStory: '爱神阿芙洛狄忒与儿子厄洛斯为躲避怪物提丰而变成两条鱼，用绳子将尾巴绑在一起以免失散。双鱼座象征着永恒的爱与联结。',
    starIds: [44, 32],
    lines: [[44, 32]],
    mainStarId: 44,
  },
]
