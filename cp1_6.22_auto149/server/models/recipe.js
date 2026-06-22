import { v4 as uuidv4 } from 'uuid';

class RecipeStore {
  constructor() {
    this.recipes = new Map();
    this.reviews = new Map();
    this.favorites = new Set();
    this.scaleLogs = [];
    this._seedData();
  }

  _seedData() {
    const authors = [
      { id: 'u1', name: '烘焙女王', avatar: 'https://i.pravatar.cc/150?img=1' },
      { id: 'u2', name: '糖霜艺术家', avatar: 'https://i.pravatar.cc/150?img=2' },
      { id: 'u3', name: '面包师傅小林', avatar: 'https://i.pravatar.cc/150?img=3' },
      { id: 'u4', name: '甜点猎人', avatar: 'https://i.pravatar.cc/150?img=4' },
      { id: 'u5', name: '黄油热爱者', avatar: 'https://i.pravatar.cc/150?img=5' },
    ];

    const baseRecipes = [
      {
        title: '经典巧克力戚风蛋糕',
        baseServings: 8,
        basePanSize: 8,
        description: '蓬松柔软，巧克力浓郁，是最受欢迎的生日蛋糕选择之一。',
        ingredients: [
          { name: '低筋面粉', amount: 85, unit: 'g' },
          { name: '可可粉', amount: 25, unit: 'g' },
          { name: '鸡蛋', amount: 5, unit: '个' },
          { name: '细砂糖', amount: 90, unit: 'g' },
          { name: '牛奶', amount: 50, unit: 'ml' },
          { name: '玉米油', amount: 50, unit: 'ml' },
          { name: '泡打粉', amount: 3, unit: 'g' },
          { name: '香草精', amount: 2, unit: 'ml' },
        ],
        steps: [
          '蛋黄蛋清分离，蛋清放入无油无水的容器中备用。',
          '蛋黄加入30g细砂糖搅拌均匀，加入牛奶和玉米油继续搅拌。',
          '筛入低筋面粉、可可粉和泡打粉，翻拌至顺滑无颗粒。',
          '蛋清分三次加入剩余60g细砂糖，打发至湿性发泡。',
          '取1/3蛋白霜加入蛋黄糊中翻拌均匀，再倒回剩余蛋白霜中。',
          '从底部向上翻拌均匀，倒入8寸模具中，震出大气泡。',
          '烤箱预热150°C，中下层烘烤55分钟。',
          '出炉后立即倒扣晾凉，脱模后即可享用。',
        ],
        tags: ['新手友好', '巧克力', '蛋糕'],
        cover: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
      },
      {
        title: '香浓北海道吐司',
        baseServings: 10,
        basePanSize: 10,
        description: '柔软拉丝，奶香浓郁，早餐的完美选择。',
        ingredients: [
          { name: '高筋面粉', amount: 300, unit: 'g' },
          { name: '淡奶油', amount: 80, unit: 'ml' },
          { name: '牛奶', amount: 120, unit: 'ml' },
          { name: '鸡蛋', amount: 1, unit: '个' },
          { name: '细砂糖', amount: 40, unit: 'g' },
          { name: '盐', amount: 4, unit: 'g' },
          { name: '干酵母', amount: 4, unit: 'g' },
          { name: '黄油', amount: 30, unit: 'g' },
        ],
        steps: [
          '除黄油外所有材料放入面包桶，启动揉面程序15分钟。',
          '加入软化的黄油，继续揉面至完全扩展阶段。',
          '面团滚圆，基础发酵至2倍大。',
          '排气后分成3等份，松弛15分钟。',
          '擀成长舌状卷起来，再松弛10分钟。',
          '再次擀开卷起，放入吐司盒中。',
          '二次发酵至8分满，盖盖。',
          '烤箱180°C烘烤40分钟，出炉立即脱模。',
        ],
        tags: ['面包', '吐司', '早餐'],
        cover: 'https://images.unsplash.com/photo-1598198414976-2b21001e62fe?w=600',
      },
      {
        title: '法式马卡龙',
        baseServings: 12,
        basePanSize: 8,
        description: '外壳酥脆，内里柔软，优雅的法式甜点。',
        ingredients: [
          { name: '杏仁粉', amount: 100, unit: 'g' },
          { name: '糖粉', amount: 100, unit: 'g' },
          { name: '蛋白（室温）', amount: 80, unit: 'g' },
          { name: '细砂糖', amount: 30, unit: 'g' },
          { name: '食用色素', amount: 1, unit: '滴' },
          { name: '淡奶油（夹馅）', amount: 80, unit: 'ml' },
          { name: '白巧克力（夹馅）', amount: 100, unit: 'g' },
        ],
        steps: [
          '杏仁粉和糖粉过筛2次，混合均匀备用。',
          '蛋白分次加细砂糖打发至硬性发泡。',
          '加入色素搅拌均匀，分三次加入粉类混合物。',
          '翻拌至缎带状，提起流下的面糊能形成明显的缎带纹。',
          '装入裱花袋，在烤盘上挤出直径3cm的圆形。',
          '震盘，静置至表面形成不粘手的硬壳。',
          '烤箱150°C烘烤12分钟，出炉晾凉。',
          '制作甘纳许夹馅，夹入两片马卡龙中间。',
        ],
        tags: ['高级', '法式', '马卡龙'],
        cover: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600',
      },
      {
        title: '低糖抹茶慕斯',
        baseServings: 6,
        basePanSize: 6,
        description: '清新抹茶风味，低糖健康，入口即化。',
        ingredients: [
          { name: '抹茶粉', amount: 10, unit: 'g' },
          { name: '淡奶油', amount: 200, unit: 'ml' },
          { name: '牛奶', amount: 100, unit: 'ml' },
          { name: '吉利丁片', amount: 3, unit: '片' },
          { name: '代糖', amount: 40, unit: 'g' },
          { name: '消化饼干', amount: 80, unit: 'g' },
          { name: '黄油', amount: 30, unit: 'g' },
        ],
        steps: [
          '消化饼干压碎，加入融化黄油搅拌均匀，铺入模具底部压实。',
          '吉利丁片冷水泡软。',
          '抹茶粉加入少量热牛奶调匀至无颗粒。',
          '剩余牛奶加热，加入泡软的吉利丁片融化。',
          '倒入抹茶液混合均匀，放凉备用。',
          '淡奶油加入代糖打发至6分发。',
          '将抹茶牛奶液倒入奶油中翻拌均匀。',
          '倒入模具，冷藏4小时以上至凝固。',
        ],
        tags: ['低糖', '抹茶', '慕斯', '新手友好'],
        cover: 'https://images.unsplash.com/photo-1515467837915-15c4777ba46a?w=600',
      },
      {
        title: '蓝莓酸奶磅蛋糕',
        baseServings: 8,
        basePanSize: 8,
        description: '湿润口感，蓝莓酸甜，酸奶增添了柔软质地。',
        ingredients: [
          { name: '低筋面粉', amount: 180, unit: 'g' },
          { name: '原味酸奶', amount: 120, unit: 'g' },
          { name: '蓝莓', amount: 100, unit: 'g' },
          { name: '黄油', amount: 100, unit: 'g' },
          { name: '细砂糖', amount: 120, unit: 'g' },
          { name: '鸡蛋', amount: 2, unit: '个' },
          { name: '泡打粉', amount: 5, unit: 'g' },
          { name: '香草精', amount: 2, unit: 'ml' },
          { name: '盐', amount: 1, unit: 'g' },
        ],
        steps: [
          '黄油软化加细砂糖打发至颜色变浅。',
          '分次加入打散的鸡蛋液，每次拌匀再加下一次。',
          '加入酸奶和香草精搅拌均匀。',
          '筛入低筋面粉、泡打粉和盐，翻拌至无干粉。',
          '蓝莓洗净沥干，裹少许面粉，拌入面糊中。',
          '倒入磅蛋糕模具，表面抹平。',
          '烤箱175°C烘烤40-45分钟。',
          '出炉后刷一层糖水，晾凉切块。',
        ],
        tags: ['新手友好', '蛋糕', '水果', '下午茶'],
        cover: 'https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=600',
      },
      {
        title: '酥皮拿破仑千层',
        baseServings: 8,
        basePanSize: 8,
        description: '层层酥脆，奶油香浓，经典的法式千层酥。',
        ingredients: [
          { name: '高筋面粉', amount: 250, unit: 'g' },
          { name: '低筋面粉', amount: 50, unit: 'g' },
          { name: '黄油（裹入）', amount: 200, unit: 'g' },
          { name: '黄油（面团）', amount: 50, unit: 'g' },
          { name: '冷水', amount: 150, unit: 'ml' },
          { name: '盐', amount: 3, unit: 'g' },
          { name: '淡奶油（卡仕达）', amount: 300, unit: 'ml' },
          { name: '蛋黄', amount: 4, unit: '个' },
          { name: '细砂糖', amount: 80, unit: 'g' },
          { name: '香草荚', amount: 1, unit: '根' },
        ],
        steps: [
          '面粉过筛，加入软化黄油丁和盐，逐步加入冷水揉成面团。',
          '裹入黄油包油纸擀成方形，冷藏30分钟。',
          '面团擀开包入黄油，完成三折三次，每次间隔冷藏30分钟。',
          '擀开酥皮至3mm厚，切成合适大小，用叉子扎孔。',
          '烤箱200°C烘烤20分钟至金黄酥脆，晾凉。',
          '制作卡仕达酱：蛋黄加糖打发，加入煮沸的香草牛奶。',
          '回锅小火煮至浓稠，冷却后拌入打发奶油。',
          '酥皮和卡仕达酱交替叠三层，顶部撒糖粉。',
        ],
        tags: ['高级', '法式', '酥皮', '千层'],
        cover: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600',
      },
    ];

    baseRecipes.forEach((recipe, idx) => {
      const author = authors[idx % authors.length];
      const id = uuidv4();
      this.recipes.set(id, {
        id,
        ...recipe,
        author,
        rating: 4.0 + Math.random(),
        reviewCount: 3 + Math.floor(Math.random() * 8),
        createdAt: Date.now() - idx * 86400000,
      });

      for (let r = 0; r < 3; r++) {
        const reviewAuthor = authors[(idx + r + 1) % authors.length];
        this._addReview(id, {
          userId: reviewAuthor.id,
          userName: reviewAuthor.name,
          userAvatar: reviewAuthor.avatar,
          rating: 4 + Math.floor(Math.random() * 2),
          content: ['超美味的食谱，一次就成功了！', '步骤很详细，跟着做没问题~', '家里人都很喜欢，下次还会再做！', '味道很好，稍微调整了糖的用量。'][r % 4],
          createdAt: Date.now() - r * 3600000,
        });
      }
    });

    for (let i = 0; i < 200; i++) {
      const baseRecipe = baseRecipes[i % baseRecipes.length];
      const author = authors[(i + 1) % authors.length];
      const id = uuidv4();
      this.recipes.set(id, {
        id,
        title: `${baseRecipe.title}（第${Math.floor(i / baseRecipes.length) + 1}版）`,
        baseServings: baseRecipe.baseServings,
        basePanSize: baseRecipe.basePanSize,
        description: baseRecipe.description,
        ingredients: baseRecipe.ingredients.map(ing => ({ ...ing, amount: ing.amount * (0.9 + Math.random() * 0.2) })),
        steps: baseRecipe.steps,
        tags: baseRecipe.tags,
        cover: baseRecipe.cover,
        author,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 15),
        createdAt: Date.now() - i * 3600000,
      });
    }
  }

  _addReview(recipeId, review) {
    const id = uuidv4();
    const fullReview = { id, recipeId, ...review };
    if (!this.reviews.has(recipeId)) {
      this.reviews.set(recipeId, []);
    }
    this.reviews.get(recipeId).push(fullReview);
    return fullReview;
  }

  getAllRecipes({ search = '', tags = [] } = {}) {
    let list = Array.from(this.recipes.values());
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        r.author.name.toLowerCase().includes(s)
      );
    }
    if (tags && tags.length) {
      list = list.filter(r => tags.every(t => r.tags.includes(t)));
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  getRecipeById(id) {
    return this.recipes.get(id);
  }

  createRecipe(data) {
    const id = uuidv4();
    const recipe = {
      id,
      ...data,
      rating: 0,
      reviewCount: 0,
      createdAt: Date.now(),
    };
    this.recipes.set(id, recipe);
    return recipe;
  }

  getReviews(recipeId) {
    const list = this.reviews.get(recipeId) || [];
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }

  addReview(recipeId, data) {
    const review = this._addReview(recipeId, data);
    const recipe = this.recipes.get(recipeId);
    if (recipe) {
      const allReviews = this.reviews.get(recipeId) || [];
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      recipe.rating = avg;
      recipe.reviewCount = allReviews.length;
    }
    return review;
  }

  toggleFavorite(recipeId) {
    if (this.favorites.has(recipeId)) {
      this.favorites.delete(recipeId);
      return { favorited: false };
    } else {
      this.favorites.add(recipeId);
      return { favorited: true };
    }
  }

  isFavorited(recipeId) {
    return this.favorites.has(recipeId);
  }

  getFavorites() {
    return Array.from(this.favorites)
      .map(id => this.recipes.get(id))
      .filter(Boolean);
  }

  logScale(data) {
    const log = { id: uuidv4(), ...data, timestamp: Date.now() };
    this.scaleLogs.push(log);
    if (this.scaleLogs.length > 500) this.scaleLogs.shift();
    return log;
  }
}

export default new RecipeStore();
