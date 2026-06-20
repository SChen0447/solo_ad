export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export const mockEvents: TimelineEvent[] = [
  {
    id: "1",
    title: "项目启动",
    description: "在旧金山团队齐聚一堂，正式开启时间轴故事书项目。我们讨论了核心功能和技术架构，制定了开发路线图。",
    date: "2024-01-15",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=San%20Francisco%20cityscape%20golden%20gate%20bridge%20sunset%20professional%20photography&image_size=landscape_16_9",
    latitude: 37.7749,
    longitude: -122.4194,
  },
  {
    id: "2",
    title: "原型设计完成",
    description: "设计团队完成了所有页面的高保真原型，包括时间轴编辑器和故事书浏览器的交互细节。",
    date: "2024-02-20",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20UI%20design%20workspace%20minimalist%20desk%20setup&image_size=landscape_16_9",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    id: "3",
    title: "核心功能开发",
    description: "前端团队完成了拖拽排序、地图标记和翻页动画三大核心功能的开发，进入集成测试阶段。",
    date: "2024-04-10",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=code%20on%20screen%20dark%20theme%20programming%20developer&image_size=landscape_16_9",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    id: "4",
    title: "用户测试",
    description: "邀请50名内测用户进行为期两周的可用性测试，收集反馈并优化交互体验。",
    date: "2024-06-05",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=people%20testing%20app%20on%20laptop%20modern%20office&image_size=landscape_16_9",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    id: "5",
    title: "正式发布",
    description: "经过多轮迭代优化，时间轴故事书应用正式上线发布！感谢每一位参与者的贡献。",
    date: "2024-08-01",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=celebration%20launch%20party%20confetti%20sparkles&image_size=landscape_16_9",
    latitude: 39.9042,
    longitude: 116.4074,
  },
];
