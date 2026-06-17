export interface HabitatInfo {
  icon: string;
  label: string;
}

export interface Plant {
  name: string;
  scientificName: string;
  family: string;
  distribution: string;
  description: string;
  imagePrompt: string;
  habitatIcons: HabitatInfo[];
  funFact: string;
}

export const plantDatabase: Plant[] = [
  {
    name: '玫瑰',
    scientificName: 'Rosa rugosa',
    family: '蔷薇科 · 蔷薇属',
    distribution: '原产于中国华北、日本和朝鲜，现世界各地广泛栽培',
    description: '玫瑰是直立灌木，高可达2米。茎粗壮，丛生，密生绒毛并带有针刺和腺毛。小叶5-9片，椭圆形至椭圆状倒卵形，边缘有锯齿。花单生或数朵簇生，花瓣倒卵形，重瓣至半重瓣，芳香，颜色有紫红色、粉红色、白色等。果实扁球形，砖红色。花期5-6月，果期8-9月。',
    imagePrompt: 'beautiful red rose flowers in garden close up photography',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '喜湿' },
      { icon: '🌡️', label: '耐寒' },
      { icon: '🌱', label: '肥沃土' },
    ],
    funFact: '玫瑰在古希腊神话中是爱神阿芙洛狄忒的化身，象征着爱情与美丽。全世界的玫瑰品种超过3万个！',
  },
  {
    name: '向日葵',
    scientificName: 'Helianthus annuus',
    family: '菊科 · 向日葵属',
    distribution: '原产北美洲，现全球温带和亚热带地区广泛种植',
    description: '向日葵是一年生高大草本，高1-3米。茎直立，粗壮，被白色粗硬毛。叶互生，心状卵圆形或卵圆形，边缘有粗锯齿。头状花序极大，直径可达30厘米，单生于茎端或枝端，常下倾。舌状花黄色，不结实；管状花棕色或紫色，结实。瘦果倒卵形或卵状长圆形，灰色或黑色。花期7-9月，果期8-9月。',
    imagePrompt: 'sunflower field golden hour bright yellow flowers',
    habitatIcons: [
      { icon: '☀️', label: '强喜光' },
      { icon: '💧', label: '适中' },
      { icon: '🌡️', label: '喜温' },
      { icon: '🌱', label: '不择土' },
    ],
    funFact: '向日葵的花盘会跟随太阳从东向西转动，这种现象称为"向日性"。花盘中的种子排列遵循斐波那契数列！',
  },
  {
    name: '梅花',
    scientificName: 'Prunus mume',
    family: '蔷薇科 · 李属',
    distribution: '原产中国南方，现日本、朝鲜等地均有栽培',
    description: '梅花是落叶小乔木或稀灌木，高4-10米。树皮浅灰色或带绿色，平滑。小枝绿色，光滑无毛。叶片卵形或椭圆形。花单生或有时2朵同生于1芽内，直径2-2.5厘米，香味浓，先于叶开放，花瓣倒卵形，白色至粉红色。果实近球形，黄色或绿白色。花期冬春季，果期5-6月。',
    imagePrompt: 'plum blossom flowers pink white spring branches',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '排水好' },
    ],
    funFact: '梅花是中国十大名花之首，与兰花、竹子、菊花并称为"四君子"，又与松、竹并称为"岁寒三友"。',
  },
  {
    name: '牡丹',
    scientificName: 'Paeonia suffruticosa',
    family: '芍药科 · 芍药属',
    distribution: '原产中国西部秦岭和大巴山一带山区，现各地广泛栽培',
    description: '牡丹是落叶灌木。茎高达2米，分枝短而粗。叶通常为二回三出复叶。花单生枝顶，直径10-17厘米，花瓣5或为重瓣，玫瑰色、红紫色、粉红色至白色，倒卵形。蓇葖长圆形，密生黄褐色硬毛。花期5月，果期6月。牡丹素有"花中之王"的美誉，品种繁多，色泽丰富。',
    imagePrompt: 'peony flowers garden pink red lush bloom',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '适中' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '牡丹被誉为"国色天香"，唐代诗人刘禹锡曾写"唯有牡丹真国色，花开时节动京城"。洛阳牡丹最为著名！',
  },
  {
    name: '荷花',
    scientificName: 'Nelumbo nucifera',
    family: '莲科 · 莲属',
    distribution: '原产中国和印度，现亚洲、大洋洲等温暖地区均有分布',
    description: '荷花是多年生水生草本。根状茎横生，肥厚，节间膨大，内有多数纵行通气孔道。叶圆形，盾状，直径25-90厘米，全缘稍呈波状。花单生于花梗顶端、高托水面之上，花直径10-20厘米，花瓣多数，嵌生在花托穴内，有红、粉红、白、紫等色。坚果椭圆形或卵形，种子卵形。花期6-8月，果期8-10月。',
    imagePrompt: 'lotus flower pond pink water lily elegant',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '水生' },
      { icon: '🌡️', label: '喜温' },
      { icon: '🌱', label: '淤泥' },
    ],
    funFact: '荷花出淤泥而不染，濯清涟而不妖，是中国文人心中品格高洁的象征。莲子的寿命极长，可达数百年！',
  },
  {
    name: '菊花',
    scientificName: 'Chrysanthemum morifolium',
    family: '菊科 · 菊属',
    distribution: '原产中国，现世界各地广泛栽培',
    description: '菊花是多年生草本，高60-150厘米。茎直立，分枝或不分枝，被柔毛。叶互生，有短柄，叶片卵形至披针形，边缘有粗大锯齿或深裂。头状花序单生或数个集生于茎枝顶端，直径2.5-20厘米，大小不一。舌状花有白色、红色、紫色或黄色等多种颜色，形态各异。花期9-11月。',
    imagePrompt: 'chrysanthemum flowers autumn colorful garden',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '菊花是中国十大名花之一，也是日本的国花。日本人在重阳节有赏菊的习俗，认为菊花能带来长寿与好运。',
  },
  {
    name: '兰花',
    scientificName: 'Cymbidium faberi',
    family: '兰科 · 兰属',
    distribution: '主要分布于亚洲热带和亚热带地区，中国是兰花重要原产地',
    description: '兰花是附生或地生草本。假鳞茎卵形至卵状长圆形，包藏于叶基之内。叶数枚至多枚，通常生于假鳞茎基部或下部节上，二列，带状或罕有倒披针形至狭椭圆形。花葶侧生或发自假鳞茎基部，直立、外弯或下垂。总状花序具数花或多花，花色丰富，常有香气。',
    imagePrompt: 'orchid flowers elegant purple white botanical',
    habitatIcons: [
      { icon: '🌤️', label: '半阴' },
      { icon: '💧', label: '喜湿' },
      { icon: '🌡️', label: '喜温' },
      { icon: '🌱', label: '腐殖土' },
    ],
    funFact: '全球约有800属28000种兰花，是开花植物中最大的家族之一。兰花种子极小，每颗果实可含数百万粒种子！',
  },
  {
    name: '桂花',
    scientificName: 'Osmanthus fragrans',
    family: '木犀科 · 木犀属',
    distribution: '原产中国西南部，现长江流域及以南广泛栽培',
    description: '桂花是常绿乔木或灌木，高3-5米，最高可达18米。树皮灰褐色。小枝黄褐色，无毛。叶片革质，椭圆形、长椭圆形或椭圆状披针形。聚伞花序簇生于叶腋，或近于帚状，每腋内有花多朵。花极芳香，花冠黄白色、淡黄色、黄色或桔红色。果歪斜，椭圆形，紫黑色。花期9-10月上旬，果期翌年3月。',
    imagePrompt: 'osmanthus flowers yellow fragrant tree autumn',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '适中' },
      { icon: '🌡️', label: '喜温暖' },
      { icon: '🌱', label: '微酸土' },
    ],
    funFact: '桂花的香气浓郁芬芳，"桂子月中落，天香云外飘"。桂花可做桂花糕、桂花茶、桂花酒，香甜可口！',
  },
  {
    name: '茉莉',
    scientificName: 'Jasminum sambac',
    family: '木犀科 · 素馨属',
    distribution: '原产印度，现中国南方和世界各地广泛栽培',
    description: '茉莉是直立或攀援灌木，高达3米。小枝圆柱形或稍压扁状，有时中空，疏被柔毛。叶对生，单叶，叶片纸质，圆形、椭圆形、卵状椭圆形或倒卵形。聚伞花序顶生，通常有花3朵，有时单花或多达5朵。花极芳香，花冠白色。果球形，呈紫黑色。花期5-8月，果期7-9月。',
    imagePrompt: 'jasmine flowers white fragrant vine summer',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '喜湿' },
      { icon: '🌡️', label: '喜高温' },
      { icon: '🌱', label: '酸性土' },
    ],
    funFact: '茉莉花香浓郁，是著名的花茶原料和重要的香精原料。"好一朵美丽的茉莉花"是世界闻名的中国民歌！',
  },
  {
    name: '山茶',
    scientificName: 'Camellia japonica',
    family: '山茶科 · 山茶属',
    distribution: '原产中国东部，现日本、朝鲜半岛均有分布',
    description: '山茶是常绿灌木或小乔木，高可达9米。嫩枝无毛。叶革质，椭圆形，上面深绿色，干后发亮，无毛，下面浅绿色。花顶生，红色，无柄。花瓣6-7片，外侧2片近圆形，几离生，长2厘米，外面有毛，内侧5片基部连生约8毫米，倒卵圆形。蒴果圆球形，2-3室，每室有种子1-2个。花期1-4月。',
    imagePrompt: 'camellia flowers red pink winter bloom evergreen',
    habitatIcons: [
      { icon: '🌤️', label: '半阴' },
      { icon: '💧', label: '喜湿' },
      { icon: '🌡️', label: '喜温暖' },
      { icon: '🌱', label: '酸性土' },
    ],
    funFact: '山茶花是昆明市、重庆市等多个城市的市花。它在寒冬时节绽放，花期长达数月，被誉为"花中珍品"。',
  },
  {
    name: '杜鹃花',
    scientificName: 'Rhododendron simsii',
    family: '杜鹃花科 · 杜鹃属',
    distribution: '原产中国长江流域以南，现世界各地广泛栽培',
    description: '杜鹃花是落叶灌木，高2-5米。分枝多而纤细，密被亮棕褐色扁平糙伏毛。叶革质，常集生枝端，卵形、椭圆状卵形或倒卵形至倒披针形。花2-3朵簇生枝顶，花冠阔漏斗形，玫瑰色、鲜红色或暗红色，裂片5，倒卵形。蒴果卵球形，长达1厘米。花期4-5月，果期6-8月。',
    imagePrompt: 'rhododendron azalea flowers pink mountain spring',
    habitatIcons: [
      { icon: '🌤️', label: '半阴' },
      { icon: '💧', label: '喜湿' },
      { icon: '🌡️', label: '喜凉爽' },
      { icon: '🌱', label: '酸性土' },
    ],
    funFact: '杜鹃花是中国十大名花之一，也是江西、安徽、贵州三省的省花。全球有近千种杜鹃，中国就占了约600种！',
  },
  {
    name: '紫荆',
    scientificName: 'Cercis chinensis',
    family: '豆科 · 紫荆属',
    distribution: '原产中国东南部，现华北、华东、中南、西南等地均有栽培',
    description: '紫荆是丛生或单生灌木，高2-5米。树皮和小枝灰白色。叶纸质，近圆形或三角状圆形，嫩叶绿色，仅叶柄略带紫色。花紫红色或粉红色，2-10余朵成束，簇生于老枝和主干上，尤以主干上花束较多，越到上部幼嫩枝条则花越少，通常先于叶开放。荚果扁狭长形，绿色。花期3-4月，果期8-10月。',
    imagePrompt: 'cercis chinensis redbud flowers pink purple spring',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '不择土' },
    ],
    funFact: '紫荆花春季先叶开放，满树紫红，非常美丽。在香港，紫荆花是市花和区旗图案，象征着繁荣昌盛！',
  },
  {
    name: '紫藤',
    scientificName: 'Wisteria sinensis',
    family: '豆科 · 紫藤属',
    distribution: '原产中国河北以南黄河长江流域及陕西、河南、广西等地',
    description: '紫藤是落叶藤本。茎左旋，枝较粗壮，嫩枝被白色柔毛，后秃净。奇数羽状复叶长15-25厘米，小叶3-6对，纸质，卵状椭圆形至卵状披针形。总状花序发自种植一年短枝的腋芽或顶芽，长15-30厘米，径8-10厘米，花序轴被白色柔毛。花冠紫色，旗瓣圆形。荚果倒披针形，密被绒毛。花期4月中旬至5月上旬，果期5-8月。',
    imagePrompt: 'wisteria flowers purple hanging garden spring',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '不择土' },
    ],
    funFact: '紫藤花如紫色瀑布垂挂而下，极为壮观。李白曾诗云："紫藤挂云木，花蔓宜阳春。密叶隐歌鸟，香风留美人。"',
  },
  {
    name: '海棠',
    scientificName: 'Malus spectabilis',
    family: '蔷薇科 · 苹果属',
    distribution: '原产中国河北、山东、陕西、江苏、浙江、云南等地',
    description: '海棠是乔木，高可达8米。小枝粗壮，圆柱形，幼时具短柔毛，逐渐脱落，老时红褐色或紫褐色，无毛。叶片椭圆形至长椭圆形，长5-8厘米，宽2-3厘米。花序近伞形，有花4-6朵，花直径4-5厘米。花瓣卵形，长2-2.5厘米，宽1.5-2厘米，基部有短爪，白色，在芽中呈粉红色。果实近球形，黄色。花期4-5月，果期8-9月。',
    imagePrompt: 'crabapple flowers pink white spring tree blossom',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '不择土' },
    ],
    funFact: '海棠花姿潇洒，花开似锦，被誉为"花中神仙"。苏轼曾写"只恐夜深花睡去，故烧高烛照红妆"来赞美海棠！',
  },
  {
    name: '薰衣草',
    scientificName: 'Lavandula angustifolia',
    family: '唇形科 · 薰衣草属',
    distribution: '原产地中海地区，现世界各地均有栽培',
    description: '薰衣草是半灌木或矮灌木，分枝，被星状绒毛。老枝灰褐色或暗褐色，皮层作条状剥落，具有长的花枝及短的更新枝。叶线形或披针状线形，在花枝上的叶较大，疏离，干时灰白色或橄绿色。轮伞花序通常具6-10花，多数，在枝顶聚集成间断或近连续的穗状花序。花冠蓝色或紫色，二唇形。花期6月。',
    imagePrompt: 'lavender flowers purple field provence summer',
    habitatIcons: [
      { icon: '☀️', label: '强喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '🌡️', label: '喜冬暖' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '薰衣草香气清新淡雅，有"香草之王"的美誉。它不仅用于制作香水和香薰，还有助眠、舒缓的功效！',
  },
  {
    name: '郁金香',
    scientificName: 'Tulipa gesneriana',
    family: '百合科 · 郁金香属',
    distribution: '原产地中海沿岸及中亚细亚、土耳其等地，现世界各地广泛栽培',
    description: '郁金香是多年生草本。鳞茎卵形，直径约2cm，外层皮纸质，内面顶端和基部有少数伏毛。叶3-5枚，条状披针形至卵状披针形。花单朵顶生，大型而艳丽，花被片红色或杂有白色和黄色，有时为白色或黄色，长5-7cm，宽2-4cm。6枚雄蕊等长，花丝无毛。花期4-5月。',
    imagePrompt: 'tulip flowers colorful spring garden red yellow pink',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '适中' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '郁金香是荷兰、土耳其、哈萨克斯坦等国的国花。历史上荷兰曾发生"郁金香狂热"，一株花球的价格堪比豪宅！',
  },
  {
    name: '康乃馨',
    scientificName: 'Dianthus caryophyllus',
    family: '石竹科 · 石竹属',
    distribution: '原产地中海地区，现世界各地广泛栽培',
    description: '康乃馨是多年生草本，高40-70厘米，全株无毛，粉绿色。茎丛生，直立，基部木质化，上部稀疏分枝。叶片线状披针形，顶端长渐尖，基部稍成短鞘，中脉明显。花常单生枝端，有时2或3朵，有香气，粉红、紫红或白色。花萼圆筒形，花瓣倒卵形，瓣片倒卵形，顶缘具不整齐齿。蒴果卵球形。花果期5-8月。',
    imagePrompt: 'carnation flowers pink red white bouquet',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '耐旱' },
      { icon: '🌡️', label: '喜凉爽' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '康乃馨是母亲节的象征，代表了爱、魅力和尊敬之情。红色康乃馨代表赞赏和崇拜，粉色代表不朽的母爱！',
  },
  {
    name: '百合',
    scientificName: 'Lilium brownii',
    family: '百合科 · 百合属',
    distribution: '原产中国，现日本、北美和欧洲等温带地区均有分布',
    description: '百合是多年生草本，株高70-150厘米。鳞茎球形，淡白色，先端常开放如莲座状，由多数肉质肥厚、卵匙形的鳞片聚合而成。茎直立，圆柱形，常有紫色斑点，无毛，绿色。叶互生，无柄，披针形至椭圆状披针形。花大、多白色、漏斗形，单生于茎顶。蒴果长卵圆形，具钝棱。种子多数，卵形，扁平。6月上旬现蕾，7月上旬始花，7月中旬盛花，7月下旬终花，果期7-10月。',
    imagePrompt: 'lily flowers white trumpet elegant garden',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '喜湿' },
      { icon: '🌡️', label: '喜凉爽' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '百合花素有"云裳仙子"之称，是梵蒂冈和法国的国花。在复活节时，白色百合花象征纯洁与神圣！',
  },
  {
    name: '樱花',
    scientificName: 'Cerasus serrulata',
    family: '蔷薇科 · 樱属',
    distribution: '原产中国长江流域和日本，现世界各地温带地区广泛栽培',
    description: '樱花是乔木，高3-8米，树皮灰褐色或灰黑色。小枝灰白色或淡褐色，无毛。冬芽卵圆形，无毛。叶片卵状椭圆形或倒卵椭圆形，长5-9厘米，宽2.5-5厘米，先端渐尖，基部圆形。花序伞形总状，总梗极短，有花3-4朵，先叶开放，花直径3-3.5厘米。花瓣白色或粉红色，椭圆卵形。核果球形或卵球形，紫黑色。花期4-5月，果期6-7月。',
    imagePrompt: 'sakura cherry blossom pink spring tree petals',
    habitatIcons: [
      { icon: '☀️', label: '喜光' },
      { icon: '💧', label: '喜湿' },
      { icon: '❄️', label: '耐寒' },
      { icon: '🌱', label: '沙壤土' },
    ],
    funFact: '樱花花期仅约一周，"樱花七日"说的就是这种短暂绚烂。日本每年有樱花前线，从南到北追踪花开的脚步！',
  },
  {
    name: '仙人掌',
    scientificName: 'Opuntia dillenii',
    family: '仙人掌科 · 仙人掌属',
    distribution: '原产墨西哥东海岸、美国南部及东南部沿海地区，现世界热带、亚热带地区广泛分布',
    description: '仙人掌是丛生肉质灌木，高（1-）1.5-3米。上部分枝宽倒卵形、倒卵状椭圆形或近圆形，长10-35（-40）厘米，宽7.5-20（-25）厘米，厚达1.2-2厘米，先端圆形，边缘通常不规则波状，基部楔形或渐狭，绿色至蓝绿色，无毛。小窠疏生，直径0.2-0.9厘米，明显突出，成长后刺常增粗并增多。花辐状，直径5-6.5厘米，花托倒卵形，瓣状花被片倒卵形或匙状倒卵形，黄色。浆果倒卵球形，紫红色。',
    imagePrompt: 'cactus plant desert green spiky flower',
    habitatIcons: [
      { icon: '☀️', label: '强喜光' },
      { icon: '🏜️', label: '极耐旱' },
      { icon: '🌡️', label: '喜高温' },
      { icon: '🌱', label: '沙质土' },
    ],
    funFact: '仙人掌的叶片退化为刺，减少水分蒸发，是沙漠生存的高手。墨西哥将仙人掌定为国花，国徽上就有仙人掌图案！',
  },
];

export function getPlantByName(name: string): Plant | undefined {
  return plantDatabase.find(
    (p) => p.name === name || p.name.includes(name) || name.includes(p.name)
  );
}

export function getAllPlantNames(): string[] {
  return plantDatabase.map((p) => p.name);
}
