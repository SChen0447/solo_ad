import { Route, Review } from '../types';
import { v4 as uuidv4 } from 'uuid';

let routes: Route[] = [];
let reviews: Map<string, Review[]> = new Map();

const randomUsernames = [
  '山野行者', '风的孩子', '骑行侠', '跑步达人', '登山爱好者',
  '自然探索者', '蓝天白云', '徒步小白', '户外摄影师', '山川旅人',
  '晨曦跑者', '林间漫步', '征服山峰', '追风少年', '自由之翼',
  '阳光旅者', '山路弯弯', '绿野仙踪', '探险家', '背包客小明'
];

const avatarColors = [
  '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea',
  '#ed64a6', '#f56565', '#ed8936', '#ecc94b', '#68d391',
  '#81e6d9', '#63b3ed', '#a78bfa', '#f687b3', '#fc8181'
];

const routeNames = [
  { name: '香山公园徒步路线', type: 'hiking' },
  { name: '奥森公园跑步环线', type: 'running' },
  { name: '妙峰山骑行挑战', type: 'cycling' },
  { name: '八达岭长城徒步', type: 'hiking' },
  { name: '颐和园环湖跑', type: 'running' },
  { name: '十渡山水骑行线', type: 'cycling' },
  { name: '灵山高山草甸徒步', type: 'hiking' },
  { name: '奥林匹克公园夜跑', type: 'running' },
  { name: '怀柔水库骑行线', type: 'cycling' },
  { name: '凤凰岭穿越路线', type: 'hiking' },
  { name: '朝阳公园晨跑路线', type: 'running' },
  { name: '密云水库环线骑行', type: 'cycling' },
  { name: '云蒙山探险徒步', type: 'hiking' },
  { name: '通州运河跑步道', type: 'running' },
  { name: '百花山赏花路线', type: 'hiking' },
  { name: '十三陵水库骑行', type: 'cycling' },
  { name: '海淀公园跑步圈', type: 'running' },
  { name: '狼牙口长城徒步', type: 'hiking' },
  { name: '妫水河骑行线', type: 'cycling' },
  { name: '玉渊潭公园健走', type: 'walking' },
  { name: '红螺寺登山路线', type: 'hiking' },
  { name: '亦庄滨河跑步道', type: 'running' },
  { name: '百望山轻松徒步', type: 'hiking' },
  { name: '雁栖湖环湖骑行', type: 'cycling' },
  { name: '黑龙潭峡谷徒步', type: 'hiking' },
  { name: '回龙观到奥森跑步', type: 'running' },
  { name: '潭柘寺古刹徒步', type: 'hiking' },
  { name: '温榆河骑行绿道', type: 'cycling' },
  { name: '云峰山徒步探险', type: 'hiking' },
  { name: '房山地质公园骑行', type: 'cycling' },
  { name: '白河峡谷徒步', type: 'hiking' },
  { name: '首钢园跑步打卡', type: 'running' },
  { name: '上方山云水洞徒步', type: 'hiking' },
  { name: '大兴滨河骑行道', type: 'cycling' },
  { name: '石林峡徒步挑战', type: 'hiking' },
  { name: '望和公园跑步路线', type: 'running' },
  { name: '喇叭沟门原始林徒步', type: 'hiking' },
  { name: '平谷骑行桃花源', type: 'cycling' },
  { name: '景山公园登高望远', type: 'walking' },
  { name: '紫竹院公园跑步', type: 'running' },
  { name: '海坨山露营徒步', type: 'hiking' },
  { name: '莲石湖骑行道', type: 'cycling' },
  { name: '东灵山主峰挑战', type: 'hiking' },
  { name: '园博园跑步环线', type: 'running' },
  { name: '双龙峡徒步小火车', type: 'hiking' },
  { name: '金海湖环湖骑行', type: 'cycling' },
  { name: '桃源仙谷徒步', type: 'hiking' },
  { name: '北小河跑步道', type: 'running' },
  { name: '妙峰山-禅房骑行', type: 'cycling' },
  { name: '古北口长城徒步', type: 'hiking' }
];

const routeDescriptions = [
  '沿途风景秀丽，空气清新，非常适合周末放松身心。',
  '经典路线，路况良好，适合初学者和有经验的户外爱好者。',
  '挑战性十足，登顶后可俯瞰整个城市美景。',
  '历史与自然的完美结合，沿途有多处历史遗迹。',
  '适合家庭出游，难度适中，孩子也能轻松完成。',
  '专业级别路线，建议有一定经验的户外爱好者尝试。',
  '四季皆宜，每个季节都有不同的风景。',
  '绿树成荫，夏天也不会太热，是避暑的好去处。',
  '视野开阔，可以看到远处的山脉和城市天际线。',
  '路况多变，有平路也有陡坡，锻炼效果很好。',
  '沿途有补给点和休息区，设施完善。',
  '原生态路线，人少景美，适合喜欢安静的徒步者。',
  '摄影爱好者的天堂，随手一拍都是大片。',
  '环线设计，不走回头路，体验更丰富。',
  '强度适中，可以作为进阶训练路线。'
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockElevation(distanceKm: number, difficulty: string): { gain: number; points: number[] } {
  const gainMultiplier = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
  const totalGain = Math.round(distanceKm * gainMultiplier * (0.7 + Math.random() * 0.6));
  
  const numPoints = Math.max(5, Math.floor(distanceKm * 2));
  const elevations: number[] = [];
  let currentElev = 50 + Math.random() * 100;
  
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const trend = Math.sin(progress * Math.PI) * totalGain * 0.6;
    const noise = (Math.random() - 0.5) * totalGain * 0.2;
    currentElev = 50 + trend + noise + Math.random() * 20;
    elevations.push(Math.round(currentElev));
  }
  
  return { gain: totalGain, points: elevations };
}

function generateRoutePoints(centerLat: number, centerLng: number, distanceKm: number, difficulty: string): { points: RoutePoint[]; elevationGain: number } {
  const numPoints = Math.max(8, Math.floor(distanceKm * 3));
  const points: RoutePoint[] = [];
  
  const { gain, points: elevations } = generateMockElevation(distanceKm, difficulty);
  
  const angleStep = (Math.PI * 2) / numPoints;
  const radius = (distanceKm / (2 * Math.PI)) * 0.8;
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep;
    const r = radius * (0.7 + Math.random() * 0.6);
    const latOffset = (r * Math.cos(angle)) / 111;
    const lngOffset = (r * Math.sin(angle)) / (111 * Math.cos(centerLat * Math.PI / 180));
    
    points.push({
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      elevation: elevations[i]
    });
  }
  
  return { points, elevationGain: gain };
}

function generateDuration(distanceKm: number, difficulty: string, type: string): string {
  let speedKmh: number;
  
  if (type === 'running') {
    speedKmh = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 7 : 5.5;
  } else if (type === 'cycling') {
    speedKmh = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 15 : 10;
  } else {
    speedKmh = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3.5 : 2.5;
  }
  
  const hours = distanceKm / speedKmh;
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h === 0) {
    return `${m}分钟`;
  } else if (m === 0) {
    return `${h}小时`;
  } else {
    return `${h}小时${m}分钟`;
  }
}

function generateMockRoutes(): Route[] {
  const result: Route[] = [];
  const baseLat = 39.9042;
  const baseLng = 116.4074;
  
  for (let i = 0; i < 50; i++) {
    const routeInfo = routeNames[i % routeNames.length];
    const rand = Math.random();
    const difficulty: 'easy' | 'medium' | 'hard' = rand < 0.3 ? 'easy' : rand < 0.8 ? 'medium' : 'hard';
    
    const type = routeInfo.type;
    let distanceKm: number;
    
    if (type === 'cycling') {
      distanceKm = difficulty === 'easy' ? 10 + Math.random() * 15 : 
                   difficulty === 'medium' ? 25 + Math.random() * 25 : 
                   50 + Math.random() * 50;
    } else if (type === 'running') {
      distanceKm = difficulty === 'easy' ? 3 + Math.random() * 5 : 
                   difficulty === 'medium' ? 8 + Math.random() * 7 : 
                   15 + Math.random() * 15;
    } else {
      distanceKm = difficulty === 'easy' ? 2 + Math.random() * 4 : 
                   difficulty === 'medium' ? 6 + Math.random() * 6 : 
                   12 + Math.random() * 10;
    }
    
    distanceKm = Math.round(distanceKm * 10) / 10;
    
    const latOffset = (Math.random() - 0.5) * 1.5;
    const lngOffset = (Math.random() - 0.5) * 2;
    
    const { points, elevationGain } = generateRoutePoints(
      baseLat + latOffset,
      baseLng + lngOffset,
      distanceKm,
      difficulty
    );
    
    const reviewCount = 3 + Math.floor(Math.random() * 6);
    const averageRating = 3 + Math.random() * 2;
    
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    result.push({
      id: uuidv4(),
      name: routeInfo.name,
      description: getRandomElement(routeDescriptions),
      distance: distanceKm,
      duration: generateDuration(distanceKm, difficulty, type),
      difficulty,
      points,
      elevationGain: Math.round(elevationGain),
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount,
      createdAt,
      author: getRandomElement(randomUsernames)
    });
  }
  
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function generateMockReviews(routeId: string, count: number): Review[] {
  const result: Review[] = [];
  const usedNames = new Set<string>();
  
  const comments = [
    '路线很棒，风景优美，强烈推荐！',
    '难度适中，适合周末出游。',
    '路况比预期的好，下次还会再来。',
    '建议早点出发，人少景更美。',
    '全程有信号，不用担心迷路。',
    '沿途有补给点，很方便。',
    '拍照超级出片，推荐给摄影爱好者。',
    '有几段比较陡，需要一定体力。',
    '带孩子去的，孩子玩得很开心。',
    '路标很清晰，不会走错路。',
    '秋天去的，红叶太美了！',
    '夏天有点热，建议春秋去。',
    '锻炼身体的好地方，每周都来。',
    '可以看到野生动物，很惊喜。',
    '设施完善，有休息区和卫生间。'
  ];
  
  for (let i = 0; i < count; i++) {
    let username = getRandomElement(randomUsernames);
    while (usedNames.has(username)) {
      username = getRandomElement(randomUsernames);
    }
    usedNames.add(username);
    
    const daysAgo = Math.floor(Math.random() * 60);
    
    result.push({
      id: uuidv4(),
      routeId,
      userId: uuidv4(),
      username,
      rating: 3 + Math.floor(Math.random() * 3),
      comment: getRandomElement(comments),
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      avatarColor: getRandomElement(avatarColors)
    });
  }
  
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function initializeData() {
  routes = generateMockRoutes();
  
  routes.forEach(route => {
    reviews.set(route.id, generateMockReviews(route.id, route.reviewCount));
  });
  
  console.log(`Initialized ${routes.length} routes with reviews`);
}

export function getRoutes(): Route[] {
  return routes.map(r => ({ ...r, points: [] }));
}

export function getRouteById(id: string): Route | undefined {
  return routes.find(r => r.id === id);
}

export function createRoute(data: Omit<Route, 'id' | 'averageRating' | 'reviewCount' | 'createdAt'>): Route {
  const newRoute: Route = {
    ...data,
    id: uuidv4(),
    averageRating: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString()
  };
  
  routes.unshift(newRoute);
  reviews.set(newRoute.id, []);
  
  return newRoute;
}

export function getReviewsByRouteId(routeId: string): Review[] {
  return reviews.get(routeId) || [];
}

export function addReview(routeId: string, data: Omit<Review, 'id' | 'routeId' | 'createdAt'>): Review | null {
  const route = routes.find(r => r.id === routeId);
  if (!route) return null;
  
  const newReview: Review = {
    ...data,
    id: uuidv4(),
    routeId,
    createdAt: new Date().toISOString()
  };
  
  const routeReviews = reviews.get(routeId) || [];
  routeReviews.unshift(newReview);
  reviews.set(routeId, routeReviews);
  
  route.reviewCount = routeReviews.length;
  route.averageRating = Math.round(
    routeReviews.reduce((sum, r) => sum + r.rating, 0) / routeReviews.length * 10
  ) / 10;
  
  return newReview;
}

export { avatarColors, randomUsernames };
