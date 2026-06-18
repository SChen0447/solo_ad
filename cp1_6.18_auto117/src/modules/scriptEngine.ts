export interface ScriptSection {
  id: string;
  title: string;
  icon: string;
  description: string[];
  storyboards: Storyboard[];
}

export interface Storyboard {
  id: string;
  timestamp: string;
  scene: string;
  dialogue: string;
}

export type StyleType = 'funny' | 'suspense' | 'healing' | 'action' | 'romantic';

const STYLE_ICONS: Record<StyleType, string[]> = {
  funny: ['😂', '🤪', '😜', '🥸', '😆'],
  suspense: ['🕵️', '🔍', '🌑', '🗝️', '⚰️'],
  healing: ['🌸', '🌿', '🌻', '🦋', '☀️'],
  action: ['🔥', '💥', '⚡', '🏃', '🦸'],
  romantic: ['💕', '🌹', '💌', '🎀', '✨'],
};

const STYLE_NAMES: Record<StyleType, string> = {
  funny: '搞笑',
  suspense: '悬疑',
  healing: '治愈',
  action: '热血',
  romantic: '浪漫',
};

function detectStyle(keywords: string): StyleType {
  const lower = keywords.toLowerCase();
  if (lower.includes('搞笑') || lower.includes('funny') || lower.includes('笑') || lower.includes('搞怪')) return 'funny';
  if (lower.includes('悬疑') || lower.includes('suspense') || lower.includes('推理') || lower.includes('侦探')) return 'suspense';
  if (lower.includes('治愈') || lower.includes('healing') || lower.includes('温暖') || lower.includes('温馨')) return 'healing';
  if (lower.includes('热血') || lower.includes('action') || lower.includes('动作') || lower.includes('冒险')) return 'action';
  if (lower.includes('浪漫') || lower.includes('romantic') || lower.includes('爱情') || lower.includes('甜蜜')) return 'romantic';
  return 'healing';
}

function generateStoryboards(style: StyleType, sectionIndex: number): Storyboard[] {
  const templates: Record<StyleType, string[][]> = {
    funny: [
      [
        ['0:00-0:05', '主角一脸正经地站在镜头前，背景是乱糟糟的房间', '大家好，今天我要教大家一个特别的...'],
        ['0:05-0:10', '镜头特写主角的手，手里拿着一个看起来很专业的道具', '首先，你需要这样一个东西...'],
        ['0:10-0:15', '道具突然散架，主角表情瞬间石化', '...呃，当我没说。'],
      ],
      [
        ['0:15-0:22', '主角试图掩饰尴尬，假装在检查道具', '其实这是一个高级测试，看你们有没有发现...'],
        ['0:22-0:28', '背景里的猫跳上桌，把剩余的道具全打翻了', '（猫叫声）喂！那是我最后的希望！'],
        ['0:28-0:35', '主角捂脸，镜头拉远展示一片狼藉', '好吧，今天的教程到此结束...'],
      ],
      [
        ['0:35-0:42', '快速蒙太奇：主角各种失败尝试的搞笑片段', '（欢快BGM起）'],
        ['0:42-0:48', '主角终于成功了一次，但方式完全不对', '等等...这好像也不对？'],
        ['0:48-0:55', '定格画面，主角哭笑不得的表情配大字标题', '"人生就是不断翻车"'],
      ],
      [
        ['0:55-1:02', '主角收拾残局，对着镜头摊手', '所以今天的结论是...'],
        ['1:02-1:08', '主角突然笑场，无法继续', '（笑到说不出话）'],
        ['1:08-1:15', '片尾字幕：下次一定成功！(大概)', '片尾音乐 + 花絮片段'],
      ],
    ],
    suspense: [
      [
        ['0:00-0:06', '昏暗的走廊，镜头缓缓推进，尽头有一扇半开的门', '（低沉环境音）'],
        ['0:06-0:12', '特写门把手，似乎有什么东西在另一侧', '（心跳声逐渐加快）'],
        ['0:12-0:18', '门突然被风吹开，外面空无一人', '呼...只是风吗？'],
      ],
      [
        ['0:18-0:25', '主角走进房间，桌上有一封未开封的信', '这是...谁放在这里的？'],
        ['0:25-0:32', '主角拿起信，信封上写着他的名字，但字迹陌生', '我不记得告诉过别人我会来这里...'],
        ['0:32-0:40', '镜头切到窗外，一个黑影一闪而过', '（突然的音效）谁！'],
      ],
      [
        ['0:40-0:48', '主角冲到窗前，外面空无一人', '（紧张的呼吸声）'],
        ['0:48-0:56', '主角回头，发现桌上的信自己打开了', '！！信怎么...'],
        ['0:56-1:05', '信上只有一行字："你终于来了"，墨迹还未干', '这不可能...我才刚到！'],
      ],
      [
        ['1:05-1:14', '镜头拉远，主角站在房间中央，门在身后缓缓关上', '（门吱呀关上的声音）'],
        ['1:14-1:22', '黑屏，只有主角的声音', '等等，门锁上了？喂！'],
        ['1:22-1:30', '片尾：屏幕上出现一行小字"下一集：真相"', '（悬疑音效收尾）'],
      ],
    ],
    healing: [
      [
        ['0:00-0:06', '清晨阳光透过窗帘，洒在窗台的小花上', '（轻柔的钢琴声）'],
        ['0:06-0:12', '主角伸懒腰，微笑着看向窗外', '又是新的一天呢。'],
        ['0:12-0:18', '镜头跟随主角走到厨房，煮一杯热咖啡', '（咖啡咕噜咕噜的声音）'],
      ],
      [
        ['0:18-0:26', '主角捧着咖啡坐在窗边，看着街道上的行人', '每个人都在努力过着自己的生活。'],
        ['0:26-0:34', '一只小鸟停在窗台上，歪头看着主角', '你也早上好呀~'],
        ['0:34-0:42', '主角轻轻一笑，小鸟飞走，镜头追着小鸟飞向天空', '（BGM渐强）'],
      ],
      [
        ['0:42-0:50', '蒙太奇：公园里老人散步、孩子玩耍、情侣牵手', '世界其实很美好，只是有时我们忘了停下脚步。'],
        ['0:50-0:58', '主角在公园长椅坐下，翻开一本书', '今天也请温柔地对待自己。'],
        ['0:58-1:08', '夕阳西下，主角的剪影，配暖色滤镜', '（温暖的弦乐）'],
      ],
      [
        ['1:08-1:16', '镜头回到早晨的窗台，花似乎开得更盛了', '每一天都是值得期待的礼物。'],
        ['1:16-1:24', '主角对镜头眨眼，比了个心', '愿你今天也有好心情。'],
        ['1:24-1:32', '片尾：柔和的光晕中出现"明天见"', '（BGM缓缓淡出）'],
      ],
    ],
    action: [
      [
        ['0:00-0:05', '城市夜景，镜头快速穿越街道，冲向一座大楼', '（电子音效 + 鼓点）'],
        ['0:05-0:11', '主角从楼顶跃下，打开滑翔翼', '任务开始。'],
        ['0:11-0:17', '主角在空中闪避各种障碍物', '（风声呼啸）'],
      ],
      [
        ['0:17-0:24', '主角精准降落在目标楼层，破窗而入', '（玻璃碎裂声）'],
        ['0:24-0:32', '快速打斗镜头，主角以一敌三', '（拳拳到肉的音效）'],
        ['0:32-0:40', '主角拿到目标物品，但警报响起', '来得正好，我正嫌不够热闹。'],
      ],
      [
        ['0:40-0:48', '追逐战：主角在走廊中奔跑，身后追兵不断', '（BGM节奏加快）'],
        ['0:48-0:56', '主角滑铲躲过子弹，踹开一扇门', '太慢了！'],
        ['0:56-1:06', '屋顶对决：主角与反派BOSS对峙', '该结束了。'],
      ],
      [
        ['1:06-1:15', '高潮打斗，慢动作特写关键招式', '（爆炸声 + 闪光特效）'],
        ['1:15-1:24', '反派倒下，主角撤离，远处警笛响起', '任务完成。'],
        ['1:24-1:35', '主角消失在夜色中，镜头拉远展示城市全景', '片尾音乐 + 彩蛋：新的任务信息出现'],
      ],
    ],
    romantic: [
      [
        ['0:00-0:06', '咖啡馆内，男主在看书，阳光从窗户洒进来', '（轻柔的爵士乐）'],
        ['0:06-0:13', '女主推门而入，风铃轻响，男主不经意抬头', '（心跳声）'],
        ['0:13-0:20', '两人目光相遇，时间仿佛静止，周围一切虚化', ''],
      ],
      [
        ['0:20-0:28', '女主走到邻桌坐下，点了一杯同样的咖啡', '（男主内心）她...也喜欢喝这个？'],
        ['0:28-0:36', '男主鼓起勇气想要搭话，但总是被打断', '呃...那个...'],
        ['0:36-0:45', '女主突然起身离开，留下了一本书', '等等！你的书...'],
      ],
      [
        ['0:45-0:54', '男主追出去，在街角找到女主，递上书本', '你...落下了这个。'],
        ['0:54-1:03', '女主微笑感谢，发现书里夹着一张书签', '这张书签是...？'],
        ['1:03-1:13', '特写：两张相同的书签，两人同时笑了', '原来...我们一直在找的就是彼此。'],
      ],
      [
        ['1:13-1:22', '蒙太奇：两人一起喝咖啡、逛公园、看日落', '（BGM推向高潮）'],
        ['1:22-1:30', '夜晚的桥上，两人牵手眺望星空', '能遇见你，真好。'],
        ['1:30-1:40', '片尾：两人同框背影，配文字"有些相遇，命中注定"', '（音乐温柔收尾）'],
      ],
    ],
  };

  const storyData = templates[style][sectionIndex] || templates[style][0];
  return storyData.map(([timestamp, scene, dialogue], i) => ({
    id: `sb-${sectionIndex}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    scene,
    dialogue,
  }));
}

export function generateScript(topic: string, keywords: string): ScriptSection[] {
  const style = detectStyle(keywords);
  const styleName = STYLE_NAMES[style];
  const icons = STYLE_ICONS[style];

  const sectionTitles = {
    funny: ['开场翻车', '状况百出', '搞笑高潮', '尴尬收尾'],
    suspense: ['诡异开场', '线索浮现', '真相逼近', '悬念结局'],
    healing: ['温暖清晨', '日常小确幸', '治愈时光', '美好收尾'],
    action: ['任务开始', '潜入行动', '激烈对决', '完美脱身'],
    romantic: ['初遇瞬间', '阴差阳错', '缘分揭秘', '甜蜜结局'],
  };

  const titles = sectionTitles[style];
  const sections: ScriptSection[] = [];

  for (let i = 0; i < 4; i++) {
    const baseDesc = [
      `${styleName}风格视频《${topic || '未命名'}》的${titles[i]}部分，`,
      `整体节奏${i === 2 ? '加快推向情绪顶点' : i === 3 ? '放缓留下回味' : i === 0 ? '明快迅速抓住注意力' : '稳步铺垫情绪'}，`,
      `画面以${style === 'healing' ? '暖色调柔光' : style === 'suspense' ? '暗色调对比强烈' : style === 'action' ? '动感运镜快速剪辑' : style === 'romantic' ? '梦幻滤镜柔和对焦' : '明亮色彩夸张表情'}为主，`,
    ];

    sections.push({
      id: `sec-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: titles[i],
      icon: icons[i % icons.length],
      description: [
        baseDesc.join(''),
        `建议时长约${[15, 20, 25, 20][i]}秒，配${styleName}风格BGM增强氛围。`,
        `注意${['角色出场要鲜明有记忆点', '节奏张弛有度不要拖沓', '情绪要饱满达到最高点', '结尾要有余韵让人回味'][i]}。`,
      ],
      storyboards: generateStoryboards(style, i),
    });
  }

  return sections;
}

export function getStyleIcons(): Record<StyleType, string[]> {
  return STYLE_ICONS;
}

export function getAvailableStyles(): { key: StyleType; name: string; icon: string }[] {
  return (Object.keys(STYLE_NAMES) as StyleType[]).map(k => ({
    key: k,
    name: STYLE_NAMES[k],
    icon: STYLE_ICONS[k][0],
  }));
}
