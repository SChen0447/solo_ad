import express from 'express';
import { createRouter } from './routes.js';

const app = express();
app.use(express.json());

const plants = new Map();
const careRecords = new Map();
const posts = new Map();
const users = new Map();

const seedPlants = [
  {
    id: 'p1',
    name: '绿萝',
    species: '天南星科',
    location: '客厅',
    lightNeeds: '散射光',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lush%20green%20pothos%20plant%20in%20white%20ceramic%20pot%20on%20wooden%20shelf%2C%20natural%20light%2C%20soft%20bokeh%20background&image_size=square',
    lastWatered: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'p2',
    name: '多肉',
    species: '景天科',
    location: '阳台',
    lightNeeds: '全日照',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=colorful%20succulent%20arrangement%20in%20terracotta%20pots%2C%20bright%20sunlight%2C%20minimalist%20background&image_size=square',
    lastWatered: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'p3',
    name: '吊兰',
    species: '百合科',
    location: '书房',
    lightNeeds: '半阴',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elegant%20spider%20plant%20hanging%20in%20macrame%20holder%2C%20indirect%20light%2C%20cozy%20room&image_size=square',
    lastWatered: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'p4',
    name: '茉莉花',
    species: '木犀科',
    location: '窗台',
    lightNeeds: '全日照',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blooming%20jasmine%20plant%20with%20white%20flowers%20on%20windowsill%2C%20morning%20light%2C%20soft%20focus&image_size=square',
    lastWatered: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'p5',
    name: '龟背竹',
    species: '天南星科',
    location: '卧室',
    lightNeeds: '散射光',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=monstera%20deliciosa%20plant%20in%20modern%20living%20room%2C%20large%20split%20leaves%2C%20natural%20light&image_size=square',
    lastWatered: new Date(Date.now() - 0.5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'p6',
    name: '虎皮兰',
    species: '百合科',
    location: '走廊',
    lightNeeds: '半阴',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=snake%20plant%20in%20modern%20concrete%20planter%2C%20architectural%20leaves%2C%20minimalist%20interior&image_size=square',
    lastWatered: new Date(Date.now() - 6 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const seedCareRecords = [
  { id: 'c1', plantId: 'p1', type: 'water', date: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'c2', plantId: 'p1', type: 'fertilize', date: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'c3', plantId: 'p2', type: 'water', date: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'c4', plantId: 'p2', type: 'repot', date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'c5', plantId: 'p3', type: 'water', date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'c6', plantId: 'p4', type: 'water', date: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'c7', plantId: 'p4', type: 'fertilize', date: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'c8', plantId: 'p5', type: 'water', date: new Date(Date.now() - 0.5 * 86400000).toISOString() },
  { id: 'c9', plantId: 'p6', type: 'water', date: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'c10', plantId: 'p1', type: 'water', date: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'c11', plantId: 'p3', type: 'fertilize', date: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'c12', plantId: 'p5', type: 'repot', date: new Date(Date.now() - 7 * 86400000).toISOString() },
];

const seedPosts = [
  {
    id: 'post1',
    author: '花语者',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20gardener%20avatar%20with%20flower%20hat%2C%20cartoon%20style%2C%20bright%20colors&image_size=square_hd',
    time: new Date(Date.now() - 3 * 60000).toISOString(),
    content: '今天发现我家绿萝叶片发黄，查了一下是浇水过多导致的。分享给大家：绿萝虽然喜湿，但盆土不能积水，冬天更要控制浇水频率，大概7-10天浇一次就好。另外可以用手指插入土壤2-3厘米，感觉干了再浇。',
    likes: 12,
    liked: false,
    saved: false,
    comments: [
      { id: 'cm1', author: '植物小白', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20plant%20lover%20avatar%2C%20watering%20can%2C%20pastel%20colors&image_size=square_hd', content: '谢谢分享！我之前也是浇水太勤了', time: new Date(Date.now() - 2 * 60000).toISOString() },
    ],
  },
  {
    id: 'post2',
    author: '阳光花园',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cheerful%20sunflower%20garden%20avatar%2C%20cartoon%20style%2C%20warm%20yellow%20tones&image_size=square_hd',
    time: new Date(Date.now() - 30 * 60000).toISOString(),
    content: '提醒大家注意蚜虫防治！最近天气变暖，蚜虫开始活跃。我用的方法是用稀释的洗洁精水喷洒叶面，效果很好而且不伤植物。也可以用烟丝泡水喷洒，天然又安全。大家有其他好方法吗？',
    likes: 25,
    liked: false,
    saved: false,
    comments: [
      { id: 'cm2', author: '绿手指', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=green%20thumb%20gardener%20avatar%2C%20cartoon%20style%2C%20emerald%20green&image_size=square_hd', content: '我用的是苦楝油，效果也不错', time: new Date(Date.now() - 20 * 60000).toISOString() },
      { id: 'cm3', author: '花间集', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=botanical%20illustration%20avatar%2C%20vintage%20style%2C%20soft%20colors&image_size=square_hd', content: '还可以引入瓢虫，天然的蚜虫克星', time: new Date(Date.now() - 10 * 60000).toISOString() },
    ],
  },
  {
    id: 'post3',
    author: '多肉控',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=succulent%20enthusiast%20avatar%2C%20cute%20cartoon%20style%2C%20pink%20and%20green&image_size=square_hd',
    time: new Date(Date.now() - 120 * 60000).toISOString(),
    content: '换盆季来了！分享一下我的换盆心得：1.选择比原盆大一号的盆 2.底部放陶粒增加排水 3.用专用多肉土 4.换盆后三天再浇水 5.放在阴凉处缓苗一周。祝大家的多肉都长得美美的！',
    likes: 38,
    liked: false,
    saved: false,
    comments: [],
  },
  {
    id: 'post4',
    author: '阳台农夫',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=balcony%20farmer%20avatar%2C%20cartoon%20style%2C%20earthy%20tones&image_size=square_hd',
    time: new Date(Date.now() - 300 * 60000).toISOString(),
    content: '推荐一种自制有机肥的方法：将果皮、菜叶切碎放入密封桶中发酵，加入少量红糖加速发酵，大约一个月就能用。发酵后的液体稀释10倍后浇花，固体残渣可以拌入土壤。既环保又省钱！',
    likes: 45,
    liked: false,
    saved: false,
    comments: [
      { id: 'cm4', author: '花语者', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20gardener%20avatar%20with%20flower%20hat%2C%20cartoon%20style%2C%20bright%20colors&image_size=square_hd', content: '这个方法我试过，效果确实好！', time: new Date(Date.now() - 240 * 60000).toISOString() },
    ],
  },
];

const seedUser = {
  id: 'u1',
  name: '植物爱好者',
  email: 'plantlover@example.com',
  avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=plant%20enthusiast%20portrait%20avatar%2C%20warm%20smile%2C%20surrounded%20by%20greenery%2C%20watercolor%20style&image_size=square_hd',
  level: 3,
  stats: {
    totalPlants: 6,
    healthIndex: 85,
    careDays: 120,
  },
};

seedPlants.forEach(p => plants.set(p.id, p));
seedCareRecords.forEach(c => careRecords.set(c.id, c));
seedPosts.forEach(p => posts.set(p.id, p));
users.set(seedUser.id, seedUser);

const router = createRouter(plants, careRecords, posts, users);
app.use('/api', router);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
