export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: number;
}

export interface Proposal {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: '技术' | '设计' | '运营' | '公益';
  creator: User;
  likes: number;
  dislikes: number;
  comments: Comment[];
  createdAt: number;
}

const categories: Proposal['category'][] = ['技术', '设计', '运营', '公益'];

const avatarColors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
];

const sampleUsers: User[] = [
  { id: 'u1', name: '张三', avatar: avatarColors[0] },
  { id: 'u2', name: '李四', avatar: avatarColors[1] },
  { id: 'u3', name: '王五', avatar: avatarColors[2] },
  { id: 'u4', name: '赵六', avatar: avatarColors[3] },
  { id: 'u5', name: '陈七', avatar: avatarColors[4] },
  { id: 'u6', name: '周八', avatar: avatarColors[5] },
  { id: 'u7', name: '吴九', avatar: avatarColors[6] },
  { id: 'u8', name: '郑十', avatar: avatarColors[7] },
];

const proposalTitles: Record<Proposal['category'], string[]> = {
  技术: [
    '基于AI的代码审查自动化工具开发',
    '微服务架构下的服务网格优化方案',
    '低代码平台自定义组件引擎',
    '实时协作编辑器的OT算法改进',
  ],
  设计: [
    '品牌视觉识别系统全面升级',
    '移动端深色模式交互规范制定',
    '无障碍设计规范与组件库建设',
    '3D交互动效在产品中的应用探索',
  ],
  运营: [
    '用户增长裂变活动体系搭建',
    '社区内容激励机制重新设计',
    '会员等级权益体系优化方案',
    '数据驱动的精细化用户运营',
  ],
  公益: [
    '偏远地区儿童编程教育计划',
    '绿色办公环保倡议与行动',
    '老年群体数字技能培训项目',
    '开源社区文档翻译贡献计划',
  ],
};

const summaries: Record<Proposal['category'], string[]> = {
  技术: [
    '通过机器学习自动识别代码异味和潜在Bug',
    '解决服务间通信延迟和链路追踪问题',
    '让业务人员也能快速构建复杂界面',
    '提升多人同时编辑的实时性和一致性',
  ],
  设计: [
    '统一全产品线视觉语言，提升品牌辨识度',
    '兼顾用户体验与设备续航的最佳实践',
    '让产品更包容，服务更多有需要的人',
    '探索未来感设计提升产品差异化竞争力',
  ],
  运营: [
    '设计多层级分享奖励机制实现指数级增长',
    '构建从创作到变现的完整内容生态闭环',
    '提升高价值用户粘性与付费转化率',
    '用RFM模型实现千人千面的运营触达',
  ],
  公益: [
    '通过在线课程+志愿者辅导缩小数字鸿沟',
    '无纸化办公+碳中和足迹追踪从我做起',
    '帮助老年人拥抱智能时代享受便利生活',
    '让优质开源项目惠及更多非英语用户',
  ],
};

const descriptions: Record<Proposal['category'], string[]> = {
  技术: [
    '我们计划开发一款基于大语言模型的代码审查工具，能够自动识别代码中的潜在问题、性能瓶颈和安全漏洞。工具将集成到CI/CD流水线中，在代码提交阶段自动进行审查，给出详细的改进建议。预计可减少30%的人工代码审查时间，提升整体研发效率。',
    '针对当前微服务架构中存在的服务调用链路过长、故障排查困难等问题，我们提出引入服务网格技术，统一管理服务间的通信、认证、监控和流量控制。同时优化负载均衡策略，将P99延迟降低40%以上。',
    '现有低代码平台的自定义组件开发门槛较高，我们希望构建一套更易用的组件开发引擎，支持可视化属性配置、事件绑定和数据联动。开发者只需编写少量代码即可完成复杂组件的开发，预计组件开发效率提升60%。',
    '当前实时协作编辑器在冲突处理上存在延迟高、易丢失编辑的问题。我们计划对OT（操作转换）算法进行优化改进，引入增量同步机制和智能冲突消解策略，使多人协作延迟控制在50ms以内，确保编辑操作的最终一致性。',
  ],
  设计: [
    '随着产品线的不断扩展，各产品间视觉风格不统一的问题日益突出。我们计划对品牌视觉识别系统进行全面升级，包括logo优化、色彩体系定义、字体规范、图标库建设等，形成一套完整可落地的设计规范文档和组件库。',
    '深色模式已成为用户标配需求，但目前各端实现标准不一。我们将制定一套完整的深色模式交互规范，包括色彩对比度标准、适配策略、自动切换逻辑等，同时优化OLED屏幕下的显示效果，降低夜间使用的视觉疲劳。',
    '无障碍设计不仅仅是满足合规要求，更是产品人文关怀的体现。我们计划对照WCAG 2.1 AA标准，全面梳理现有产品的无障碍问题，并建设一套符合无障碍规范的组件库，确保视障、听障、运动障碍用户都能顺畅使用我们的产品。',
    '随着WebGL和Three.js技术的成熟，3D交互动效在产品中的应用成为可能。我们计划探索3D效果在产品展示、数据可视化、引导教育等场景的应用，通过恰到好处的动效提升产品的科技感和用户体验，建立差异化的品牌认知。',
  ],
  运营: [
    '用户增长进入存量时代，传统的拉新方式成本越来越高。我们计划设计一套完整的裂变活动体系，包括邀请有礼、拼团、砍价、助力等多种玩法，配合社交分享优化，实现低成本的用户指数级增长。目标获客成本降低50%，自然流量占比提升至60%。',
    '社区内容质量参差不齐，优质创作者流失严重。我们将重新设计内容激励机制，包括内容分级推荐、创作者等级体系、收益分成模式等，让优质内容获得更多曝光和收益，形成"创作-激励-更多创作"的正向循环。',
    '当前会员体系存在权益感知弱、续费率低等问题。我们计划对会员等级进行重新设计，将用户分层与权益精准匹配，同时引入成长值和保级机制，提升用户的荣誉感和归属感。预计会员ARPU值提升30%，年续费率提升至75%。',
    '粗放式的运营投放已无法满足精细化需求。我们将基于RFM模型构建用户分群体系，结合用户行为标签，实现千人千面的运营触达。通过A/B测试持续优化运营策略，目标用户转化率提升25%，营销ROI提升40%。',
  ],
  公益: [
    '编程教育资源在城乡间分布极不均衡。我们计划联合志愿者团队，开发适合偏远地区儿童的编程入门课程，并通过在线直播+录播+线下辅导的混合模式开展教学，同时捐赠学习用的平板设备，让每个孩子都有机会接触编程。',
    '全球气候变化迫在眉睫，企业应承担更多社会责任。我们倡议在全公司推行绿色办公，包括无纸化办公、节电节水、垃圾分类、绿色出行等措施，并开发一个碳足迹追踪小程序，让每位员工都能看到自己的环保贡献。',
    '数字时代老年人面临越来越多的"数字鸿沟"：不会用健康码、不会移动支付、不会网上挂号。我们计划开发一套通俗易懂的数字技能培训课程，并组织志愿者深入社区开展一对一辅导，帮助老年人享受智能生活的便利。',
    '大量优秀的开源项目文档只有英文版，非英语用户参与门槛高。我们计划发起开源文档翻译贡献计划，组织志愿者将主流开源项目的核心文档翻译成中文，并建立长期维护机制，让更多中文开发者受益于全球开源社区的成果。',
  ],
};

function generateComments(creatorId: string): Comment[] {
  const otherUsers = sampleUsers.filter((u) => u.id !== creatorId);
  const commentCount = Math.floor(Math.random() * 5) + 1;
  const commentTexts = [
    '这个想法很棒，非常支持！',
    '我有类似的经历，可以一起探讨。',
    '建议补充一下具体的时间规划。',
    '落地难度会不会太大？',
    '期待看到更多细节！',
    '这个方向很有前景。',
    '我们团队可以提供技术支持。',
  ];
  const comments: Comment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const user = otherUsers[Math.floor(Math.random() * otherUsers.length)];
    comments.push({
      id: `c${Date.now()}_${i}`,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 7),
    });
  }
  return comments.sort((a, b) => b.createdAt - a.createdAt);
}

function generateMockProposals(): Proposal[] {
  const proposals: Proposal[] = [];
  const totalPerCategory = 2;

  categories.forEach((category) => {
    for (let i = 0; i < totalPerCategory; i++) {
      const creator = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      const idx = i;
      proposals.push({
        id: `p_${category}_${i}_${Date.now()}`,
        title: proposalTitles[category][idx],
        summary: summaries[category][idx],
        description: descriptions[category][idx],
        category,
        creator,
        likes: Math.floor(Math.random() * 200) + 10,
        dislikes: Math.floor(Math.random() * 30),
        comments: generateComments(creator.id),
        createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 30),
      });
    }
  });

  return proposals.sort(() => Math.random() - 0.5);
}

let cachedProposals: Proposal[] | null = null;

export function fetchProposals(): Promise<Proposal[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!cachedProposals) {
        cachedProposals = generateMockProposals();
      }
      resolve(JSON.parse(JSON.stringify(cachedProposals)));
    }, 2000);
  });
}

export function fetchCurrentUser(): Promise<User> {
  return Promise.resolve({
    id: 'me',
    name: '我',
    avatar: avatarColors[Math.floor(Math.random() * avatarColors.length)],
  });
}
