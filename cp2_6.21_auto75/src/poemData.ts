import type { Poem } from './types'

const poems: Poem[] = [
  {
    id: 1,
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    content: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'],
    notes: '诗人在寂静的夜晚，望着明月思念远方的故乡。'
  },
  {
    id: 2,
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    content: ['春眠不觉晓，', '处处闻啼鸟。', '夜来风雨声，', '花落知多少。'],
    notes: '描绘春日清晨的美好景象，表达对春光易逝的惋惜。'
  },
  {
    id: 3,
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    content: ['白日依山尽，', '黄河入海流。', '欲穷千里目，', '更上一层楼。'],
    notes: '登高望远，表达积极向上的进取精神。'
  },
  {
    id: 4,
    title: '相思',
    author: '王维',
    dynasty: '唐',
    content: ['红豆生南国，', '春来发几枝。', '愿君多采撷，', '此物最相思。'],
    notes: '借红豆寄托相思之情，语言朴素而情感真挚。'
  },
  {
    id: 5,
    title: '江雪',
    author: '柳宗元',
    dynasty: '唐',
    content: ['千山鸟飞绝，', '万径人踪灭。', '孤舟蓑笠翁，', '独钓寒江雪。'],
    notes: '描绘寒江独钓的孤寂画面，展现诗人超然物外的心境。'
  },
  {
    id: 6,
    title: '悯农',
    author: '李绅',
    dynasty: '唐',
    content: ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。'],
    notes: '描写农民劳作的艰辛，告诫人们珍惜粮食。'
  },
  {
    id: 7,
    title: '游子吟',
    author: '孟郊',
    dynasty: '唐',
    content: ['慈母手中线，', '游子身上衣。', '临行密密缝，', '意恐迟迟归。', '谁言寸草心，', '报得三春晖。'],
    notes: '歌颂母爱的伟大，表达对母亲的感激之情。'
  },
  {
    id: 8,
    title: '望庐山瀑布',
    author: '李白',
    dynasty: '唐',
    content: ['日照香炉生紫烟，', '遥看瀑布挂前川。', '飞流直下三千尺，', '疑是银河落九天。'],
    notes: '以夸张的笔法描绘庐山瀑布的壮观景象。'
  },
  {
    id: 9,
    title: '绝句',
    author: '杜甫',
    dynasty: '唐',
    content: ['两个黄鹂鸣翠柳，', '一行白鹭上青天。', '窗含西岭千秋雪，', '门泊东吴万里船。'],
    notes: '四幅画面构成一幅生动的春景图，色彩鲜明。'
  },
  {
    id: 10,
    title: '枫桥夜泊',
    author: '张继',
    dynasty: '唐',
    content: ['月落乌啼霜满天，', '江枫渔火对愁眠。', '姑苏城外寒山寺，', '夜半钟声到客船。'],
    notes: '描绘秋夜泊船枫桥的所见所闻，抒发羁旅之愁。'
  },
  {
    id: 11,
    title: '水调歌头',
    author: '苏轼',
    dynasty: '宋',
    content: ['明月几时有？把酒问青天。', '不知天上宫阙，今夕是何年。', '我欲乘风归去，又恐琼楼玉宇，', '高处不胜寒。', '起舞弄清影，何似在人间。', '转朱阁，低绮户，照无眠。', '不应有恨，何事长向别时圆？', '人有悲欢离合，月有阴晴圆缺，', '此事古难全。', '但愿人长久，千里共婵娟。'],
    notes: '中秋望月怀人，表达对亲人的思念和美好祝愿。'
  },
  {
    id: 12,
    title: '念奴娇·赤壁怀古',
    author: '苏轼',
    dynasty: '宋',
    content: ['大江东去，浪淘尽，千古风流人物。', '故垒西边，人道是，三国周郎赤壁。', '乱石穿空，惊涛拍岸，卷起千堆雪。', '江山如画，一时多少豪杰。', '遥想公瑾当年，小乔初嫁了，雄姿英发。', '羽扇纶巾，谈笑间，樯橹灰飞烟灭。', '故国神游，多情应笑我，早生华发。', '人生如梦，一尊还酹江月。'],
    notes: '借赤壁古迹抒发对历史英雄的敬仰和人生感慨。'
  },
  {
    id: 13,
    title: '如梦令',
    author: '李清照',
    dynasty: '宋',
    content: ['常记溪亭日暮，', '沉醉不知归路。', '兴尽晚回舟，', '误入藕花深处。', '争渡，争渡，', '惊起一滩鸥鹭。'],
    notes: '回忆往昔郊游的欢乐场景，语言清新自然。'
  },
  {
    id: 14,
    title: '声声慢',
    author: '李清照',
    dynasty: '宋',
    content: ['寻寻觅觅，冷冷清清，凄凄惨惨戚戚。', '乍暖还寒时候，最难将息。', '三杯两盏淡酒，怎敌他、晚来风急？', '雁过也，正伤心，却是旧时相识。', '满地黄花堆积。', '憔悴损，如今有谁堪摘？', '守着窗儿，独自怎生得黑？', '梧桐更兼细雨，到黄昏、点点滴滴。', '这次第，怎一个愁字了得！'],
    notes: '抒写国破家亡后的孤苦凄凉，情感深沉哀婉。'
  },
  {
    id: 15,
    title: '江城子·密州出猎',
    author: '苏轼',
    dynasty: '宋',
    content: ['老夫聊发少年狂，左牵黄，右擎苍，', '锦帽貂裘，千骑卷平冈。', '为报倾城随太守，亲射虎，看孙郎。', '酒酣胸胆尚开张。鬓微霜，又何妨！', '持节云中，何日遣冯唐？', '会挽雕弓如满月，西北望，射天狼。'],
    notes: '描写出猎的壮观场面，抒发报国之志。'
  },
  {
    id: 16,
    title: '破阵子',
    author: '辛弃疾',
    dynasty: '宋',
    content: ['醉里挑灯看剑，梦回吹角连营。', '八百里分麾下炙，五十弦翻塞外声，', '沙场秋点兵。', '马作的卢飞快，弓如霹雳弦惊。', '了却君王天下事，赢得生前身后名。', '可怜白发生！'],
    notes: '追忆军旅生涯，抒发壮志难酬的悲愤。'
  },
  {
    id: 17,
    title: '永遇乐·京口北固亭怀古',
    author: '辛弃疾',
    dynasty: '宋',
    content: ['千古江山，英雄无觅孙仲谋处。', '舞榭歌台，风流总被雨打风吹去。', '斜阳草树，寻常巷陌，人道寄奴曾住。', '想当年，金戈铁马，气吞万里如虎。', '元嘉草草，封狼居胥，赢得仓皇北顾。', '四十三年，望中犹记，烽火扬州路。', '可堪回首，佛狸祠下，一片神鸦社鼓。', '凭谁问：廉颇老矣，尚能饭否？'],
    notes: '借古讽今，抒发收复失地的壮志和不被重用的愤懑。'
  },
  {
    id: 18,
    title: '雨霖铃',
    author: '柳永',
    dynasty: '宋',
    content: ['寒蝉凄切，对长亭晚，骤雨初歇。', '都门帐饮无绪，留恋处，兰舟催发。', '执手相看泪眼，竟无语凝噎。', '念去去，千里烟波，暮霭沉沉楚天阔。', '多情自古伤离别，更那堪，冷落清秋节！', '今宵酒醒何处？杨柳岸，晓风残月。', '此去经年，应是良辰好景虚设。', '便纵有千种风情，更与何人说？'],
    notes: '抒写离情别绪，情景交融，凄婉动人。'
  },
  {
    id: 19,
    title: '浣溪沙',
    author: '晏殊',
    dynasty: '宋',
    content: ['一曲新词酒一杯，', '去年天气旧亭台。', '夕阳西下几时回？', '无可奈何花落去，', '似曾相识燕归来。', '小园香径独徘徊。'],
    notes: '伤春惜时，蕴含对人生哲理的思考。'
  },
  {
    id: 20,
    title: '题西林壁',
    author: '苏轼',
    dynasty: '宋',
    content: ['横看成岭侧成峰，', '远近高低各不同。', '不识庐山真面目，', '只缘身在此山中。'],
    notes: '借庐山写景，蕴含深刻的哲理。'
  },
  {
    id: 21,
    title: '天净沙·秋思',
    author: '马致远',
    dynasty: '元',
    content: ['枯藤老树昏鸦，', '小桥流水人家，', '古道西风瘦马。', '夕阳西下，', '断肠人在天涯。'],
    notes: '以景物烘托游子思乡的凄苦之情。'
  },
  {
    id: 22,
    title: '山坡羊·潼关怀古',
    author: '张养浩',
    dynasty: '元',
    content: ['峰峦如聚，波涛如怒，', '山河表里潼关路。', '望西都，意踌躇。', '伤心秦汉经行处，', '宫阙万间都做了土。', '兴，百姓苦；', '亡，百姓苦。'],
    notes: '怀古伤今，揭示封建王朝兴亡给百姓带来的苦难。'
  },
  {
    id: 23,
    title: '醉太平',
    author: '张可久',
    dynasty: '元',
    content: ['人皆嫌命窘，谁不见钱亲？', '水晶环入面糊盆，才沾粘便滚。', '文章糊了盛钱囤，门庭改做迷魂阵，', '清廉贬入睡馄饨。', '胡芦提倒稳。'],
    notes: '讽刺世态炎凉、金钱至上的社会风气。'
  },
  {
    id: 24,
    title: '石灰吟',
    author: '于谦',
    dynasty: '明',
    content: ['千锤万凿出深山，', '烈火焚烧若等闲。', '粉骨碎身浑不怕，', '要留清白在人间。'],
    notes: '借石灰自喻，表达坚守清白节操的决心。'
  },
  {
    id: 25,
    title: '咏竹',
    author: '于谦',
    dynasty: '明',
    content: ['咬定青山不放松，', '立根原在破岩中。', '千磨万击还坚劲，', '任尔东西南北风。'],
    notes: '赞美竹子坚韧不拔的品格。'
  },
  {
    id: 26,
    title: '临江仙',
    author: '杨慎',
    dynasty: '明',
    content: ['滚滚长江东逝水，浪花淘尽英雄。', '是非成败转头空。', '青山依旧在，几度夕阳红。', '白发渔樵江渚上，惯看秋月春风。', '一壶浊酒喜相逢。', '古今多少事，都付笑谈中。'],
    notes: '借历史兴衰抒发人生感慨，意境旷达。'
  },
  {
    id: 27,
    title: '己亥杂诗',
    author: '龚自珍',
    dynasty: '清',
    content: ['九州生气恃风雷，', '万马齐喑究可哀。', '我劝天公重抖擞，', '不拘一格降人才。'],
    notes: '呼吁社会变革，渴望人才辈出。'
  },
  {
    id: 28,
    title: '竹石',
    author: '郑燮',
    dynasty: '清',
    content: ['咬定青山不放松，', '立根原在破岩中。', '千磨万击还坚劲，', '任尔东西南北风。'],
    notes: '托物言志，表达坚韧刚毅的品格。'
  },
  {
    id: 29,
    title: '浣溪沙',
    author: '纳兰性德',
    dynasty: '清',
    content: ['谁念西风独自凉？', '萧萧黄叶闭疏窗。', '沉思往事立残阳。', '被酒莫惊春睡重，', '赌书消得泼茶香。', '当时只道是寻常。'],
    notes: '悼念亡妻，追忆往昔幸福时光，情真意切。'
  },
  {
    id: 30,
    title: '长相思',
    author: '纳兰性德',
    dynasty: '清',
    content: ['山一程，水一程，', '身向榆关那畔行，', '夜深千帐灯。', '风一更，雪一更，', '聒碎乡心梦不成，', '故园无此声。'],
    notes: '抒写羁旅思乡之情，语言质朴而深情。'
  },
  {
    id: 31,
    title: '将进酒',
    author: '李白',
    dynasty: '唐',
    content: ['君不见，黄河之水天上来，', '奔流到海不复回。', '君不见，高堂明镜悲白发，', '朝如青丝暮成雪。', '人生得意须尽欢，莫使金樽空对月。', '天生我材必有用，千金散尽还复来。', '烹羊宰牛且为乐，会须一饮三百杯。'],
    notes: '借酒抒怀，表达豪放乐观的人生态度。'
  },
  {
    id: 32,
    title: '茅屋为秋风所破歌',
    author: '杜甫',
    dynasty: '唐',
    content: ['八月秋高风怒号，卷我屋上三重茅。', '茅飞渡江洒江郊，高者挂罥长林梢，', '下者飘转沉塘坳。', '安得广厦千万间，大庇天下寒士俱欢颜！', '风雨不动安如山。', '呜呼！', '何时眼前突兀见此屋，吾庐独破受冻死亦足！'],
    notes: '由自身遭遇推及天下寒士，表达忧国忧民的情怀。'
  }
]

export function getRandomPoems(limit: number): Poem[] {
  const shuffled = [...poems].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
}

export function filterByDynasty(dynasty: string): Poem[] {
  if (!dynasty) return poems
  return poems.filter((poem) => poem.dynasty === dynasty)
}

export function searchPoems(query: string): Poem[] {
  if (!query.trim()) return poems
  const lowerQuery = query.toLowerCase()
  return poems.filter(
    (poem) =>
      poem.title.toLowerCase().includes(lowerQuery) ||
      poem.author.toLowerCase().includes(lowerQuery) ||
      poem.content.some((line) => line.toLowerCase().includes(lowerQuery))
  )
}

export function getFilteredPoems(dynasty: string, query: string): Poem[] {
  let result = poems
  if (dynasty) {
    result = result.filter((poem) => poem.dynasty === dynasty)
  }
  if (query.trim()) {
    const lowerQuery = query.toLowerCase()
    result = result.filter(
      (poem) =>
        poem.title.toLowerCase().includes(lowerQuery) ||
        poem.author.toLowerCase().includes(lowerQuery) ||
        poem.content.some((line) => line.toLowerCase().includes(lowerQuery))
    )
  }
  return result
}
