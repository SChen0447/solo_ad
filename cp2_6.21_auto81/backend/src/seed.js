const presetBooks = [
  {
    id: 'b001',
    title: '三体',
    author: '刘慈欣',
    coverUrl: 'https://picsum.photos/seed/santi/400/580',
    totalPages: 380,
    tags: ['科幻', '悬疑'],
    isbn: '9787536692930'
  },
  {
    id: 'b002',
    title: '黑暗森林',
    author: '刘慈欣',
    coverUrl: 'https://picsum.photos/seed/heiansenlin/400/580',
    totalPages: 470,
    tags: ['科幻', '悬疑'],
    isbn: '9787536693968'
  },
  {
    id: 'b003',
    title: '死神永生',
    author: '刘慈欣',
    coverUrl: 'https://picsum.photos/seed/sishengyongsheng/400/580',
    totalPages: 540,
    tags: ['科幻'],
    isbn: '9787229075125'
  },
  {
    id: 'b004',
    title: '沙丘',
    author: '弗兰克·赫伯特',
    coverUrl: 'https://picsum.photos/seed/shaqiu/400/580',
    totalPages: 680,
    tags: ['科幻', '奇幻'],
    isbn: '9787540466572'
  },
  {
    id: 'b005',
    title: '魔戒',
    author: '托尔金',
    coverUrl: 'https://picsum.photos/seed/mojie/400/580',
    totalPages: 1200,
    tags: ['奇幻', '史诗'],
    isbn: '9787544730327'
  },
  {
    id: 'b006',
    title: '冰与火之歌',
    author: '乔治·R·R·马丁',
    coverUrl: 'https://picsum.photos/seed/bingyuhuozhige/400/580',
    totalPages: 1500,
    tags: ['奇幻', '史诗'],
    isbn: '9787536691519'
  },
  {
    id: 'b007',
    title: '哈利波特与魔法石',
    author: 'J·K·罗琳',
    coverUrl: 'https://picsum.photos/seed/halibote1/400/580',
    totalPages: 320,
    tags: ['奇幻', '冒险'],
    isbn: '9787020033430'
  },
  {
    id: 'b008',
    title: '嫌疑人X的献身',
    author: '东野圭吾',
    coverUrl: 'https://picsum.photos/seed/xianyirenx/400/580',
    totalPages: 280,
    tags: ['悬疑', '推理'],
    isbn: '9787544257771'
  },
  {
    id: 'b009',
    title: '白夜行',
    author: '东野圭吾',
    coverUrl: 'https://picsum.photos/seed/baiyexing/400/580',
    totalPages: 420,
    tags: ['悬疑', '推理'],
    isbn: '9787544258609'
  },
  {
    id: 'b010',
    title: '解忧杂货店',
    author: '东野圭吾',
    coverUrl: 'https://picsum.photos/seed/jieyouzahuodian/400/580',
    totalPages: 300,
    tags: ['治愈', '温情'],
    isbn: '9787544270878'
  },
  {
    id: 'b011',
    title: '百年孤独',
    author: '马尔克斯',
    coverUrl: 'https://picsum.photos/seed/bainiangu/400/580',
    totalPages: 400,
    tags: ['文学', '魔幻现实'],
    isbn: '9787544269988'
  },
  {
    id: 'b012',
    title: '活着',
    author: '余华',
    coverUrl: 'https://picsum.photos/seed/huozhuo/400/580',
    totalPages: 220,
    tags: ['文学', '现实'],
    isbn: '9787506365437'
  },
  {
    id: 'b013',
    title: '平凡的世界',
    author: '路遥',
    coverUrl: 'https://picsum.photos/seed/pingfandeshijie/400/580',
    totalPages: 1450,
    tags: ['文学', '现实'],
    isbn: '9787530212004'
  },
  {
    id: 'b014',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    coverUrl: 'https://picsum.photos/seed/renleijianshi/400/580',
    totalPages: 440,
    tags: ['历史', '科普'],
    isbn: '9787508647357'
  },
  {
    id: 'b015',
    title: '未来简史',
    author: '尤瓦尔·赫拉利',
    coverUrl: 'https://picsum.photos/seed/weilaijianshi/400/580',
    totalPages: 480,
    tags: ['历史', '科幻'],
    isbn: '9787508672069'
  },
  {
    id: 'b016',
    title: '1984',
    author: '乔治·奥威尔',
    coverUrl: 'https://picsum.photos/seed/1984/400/580',
    totalPages: 340,
    tags: ['科幻', '反乌托邦'],
    isbn: '9787544742542'
  },
  {
    id: 'b017',
    title: '了不起的盖茨比',
    author: '菲茨杰拉德',
    coverUrl: 'https://picsum.photos/seed/liaoqigaicibi/400/580',
    totalPages: 200,
    tags: ['文学', '经典'],
    isbn: '9787547019713'
  },
  {
    id: 'b018',
    title: '月亮与六便士',
    author: '毛姆',
    coverUrl: 'https://picsum.photos/seed/yueliuyubianshi/400/580',
    totalPages: 280,
    tags: ['文学', '经典'],
    isbn: '9787508660827'
  },
  {
    id: 'b019',
    title: '无人生还',
    author: '阿加莎·克里斯蒂',
    coverUrl: 'https://picsum.photos/seed/wurenshenghuan/400/580',
    totalPages: 260,
    tags: ['悬疑', '推理'],
    isbn: '9787513311389'
  },
  {
    id: 'b020',
    title: '东方快车谋杀案',
    author: '阿加莎·克里斯蒂',
    coverUrl: 'https://picsum.photos/seed/dongfangkuaiche/400/580',
    totalPages: 300,
    tags: ['悬疑', '推理'],
    isbn: '9787513311761'
  },
  {
    id: 'b021',
    title: '安德的游戏',
    author: '奥森·斯科特·卡德',
    coverUrl: 'https://picsum.photos/seed/andede/400/580',
    totalPages: 360,
    tags: ['科幻'],
    isbn: '9787555103890'
  },
  {
    id: 'b022',
    title: '基地',
    author: '阿西莫夫',
    coverUrl: 'https://picsum.photos/seed/jidi/400/580',
    totalPages: 420,
    tags: ['科幻', '太空歌剧'],
    isbn: '9787544731207'
  },
  {
    id: 'b023',
    title: '时间机器',
    author: 'H·G·威尔斯',
    coverUrl: 'https://picsum.photos/seed/shijianjiqi/400/580',
    totalPages: 180,
    tags: ['科幻', '经典'],
    isbn: '9787540454600'
  },
  {
    id: 'b024',
    title: '纳尼亚传奇',
    author: 'C·S·刘易斯',
    coverUrl: 'https://picsum.photos/seed/naniyachuanqi/400/580',
    totalPages: 600,
    tags: ['奇幻', '冒险'],
    isbn: '9787544731126'
  }
];

module.exports = { presetBooks };
