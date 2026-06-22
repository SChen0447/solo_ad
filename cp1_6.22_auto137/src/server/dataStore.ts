import { v4 as uuidv4 } from 'uuid';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: string;
  updatedAt: string;
}

export type POIType = 'viewpoint' | 'farmstay' | 'gasstation' | 'photospot';

export interface POI {
  id: string;
  name: string;
  type: POIType;
  description: string;
  lat: number;
  lng: number;
}

export interface Checkin {
  id: string;
  routeId: string;
  poiId: string;
  comment: string;
  photoName: string | null;
  timestamp: string;
  lat: number;
  lng: number;
}

export interface TripReport {
  id: string;
  routeId: string;
  totalDistance: number;
  totalDuration: number;
  cityCount: number;
  checkins: Checkin[];
  route: Route;
  createdAt: string;
}

class DataStore {
  private routes: Map<string, Route> = new Map();
  private pois: Map<string, POI> = new Map();
  private checkins: Map<string, Checkin> = new Map();
  private reports: Map<string, TripReport> = new Map();

  constructor() {
    this.initializePOIs();
  }

  private initializePOIs() {
    const mockPOIs: Omit<POI, 'id'>[] = [
      { name: '云顶观景台', type: 'viewpoint', description: '俯瞰整个城市夜景的绝佳位置，傍晚时分最美', lat: 31.2304, lng: 121.4737 },
      { name: '青山绿水农家乐', type: 'farmstay', description: '地道农家菜，自种蔬菜，散养土鸡', lat: 31.2504, lng: 121.4937 },
      { name: '湖畔加油站', type: 'gasstation', description: '风景优美的湖边加油站，设有便利店', lat: 31.2104, lng: 121.4537 },
      { name: '彩虹公路拍照点', type: 'photospot', description: '网红彩虹公路，适合打卡拍照', lat: 31.2704, lng: 121.5137 },
      { name: '日出观景台', type: 'viewpoint', description: '观赏日出的最佳地点，清晨云海翻腾', lat: 31.1904, lng: 121.4337 },
      { name: '桃花坞农家乐', type: 'farmstay', description: '春天桃花盛开，提供住宿和采摘', lat: 31.2904, lng: 121.5337 },
      { name: '高速服务区加油站', type: 'gasstation', description: '大型服务区，有餐饮和休息区', lat: 31.1704, lng: 121.4137 },
      { name: '玻璃栈道拍照点', type: 'photospot', description: '悬崖边的玻璃栈道，惊险刺激', lat: 31.3104, lng: 121.5537 },
      { name: '星空观测台', type: 'viewpoint', description: '远离光污染，适合观星和天文摄影', lat: 31.1504, lng: 121.3937 },
      { name: '竹林深处农家乐', type: 'farmstay', description: '竹海环抱，特色竹笋宴', lat: 31.3304, lng: 121.5737 },
      { name: '古镇加油站', type: 'gasstation', description: '古镇入口旁的加油站，古色古香', lat: 31.1304, lng: 121.3737 },
      { name: '梯田日落拍照点', type: 'photospot', description: '层层梯田映夕阳，摄影爱好者必去', lat: 31.3504, lng: 121.5937 },
      { name: '瀑布观景台', type: 'viewpoint', description: '三级瀑布飞流直下，气势磅礴', lat: 31.1104, lng: 121.3537 },
      { name: '渔村农家乐', type: 'farmstay', description: '新鲜河鲜，渔船捕鱼体验', lat: 31.3704, lng: 121.6137 },
      { name: '山顶加油站', type: 'gasstation', description: '海拔最高的加油站，一览众山小', lat: 31.0904, lng: 121.3337 },
      { name: '薰衣草花田拍照点', type: 'photospot', description: '百亩薰衣草田，紫色浪漫', lat: 31.3904, lng: 121.6337 },
      { name: '峡谷观景台', type: 'viewpoint', description: '深切峡谷壮观景色，适合徒步', lat: 31.0704, lng: 121.3137 },
      { name: '果园农家乐', type: 'farmstay', description: '四季水果采摘，亲子游首选', lat: 31.4104, lng: 121.6537 },
      { name: '环城高速加油站', type: 'gasstation', description: '24小时营业，配套完善', lat: 31.0504, lng: 121.2937 },
      { name: '古镇石桥拍照点', type: 'photospot', description: '千年古镇石板桥，江南水乡风情', lat: 31.4304, lng: 121.6737 },
      { name: '海岸线观景台', type: 'viewpoint', description: '无敌海景，看潮起潮落', lat: 31.0304, lng: 121.2737 },
      { name: '茶园农家乐', type: 'farmstay', description: '高山云雾茶，采茶体验', lat: 31.4504, lng: 121.6937 },
      { name: '沙漠公路加油站', type: 'gasstation', description: '荒漠中的绿洲，补给必停', lat: 31.0104, lng: 121.2537 },
      { name: '枫叶大道拍照点', type: 'photospot', description: '秋季枫叶红遍，最美公路', lat: 31.4704, lng: 121.7137 },
      { name: '雪山观景台', type: 'viewpoint', description: '远眺雪山主峰，壮丽无比', lat: 30.9904, lng: 121.2337 },
      { name: '牧家乐', type: 'farmstay', description: '草原风情，烤全羊，骑马体验', lat: 31.4904, lng: 121.7337 },
      { name: '服务区加油站', type: 'gasstation', description: '大型综合服务区，餐饮购物一体', lat: 30.9704, lng: 121.2137 },
      { name: '油菜花田拍照点', type: 'photospot', description: '春天金色花海，美不胜收', lat: 31.5104, lng: 121.7537 },
      { name: '丹霞地貌观景台', type: 'viewpoint', description: '七彩丹霞，大自然的调色盘', lat: 30.9504, lng: 121.1937 },
      { name: '温泉度假村', type: 'farmstay', description: '天然温泉，泡汤放松好去处', lat: 31.5304, lng: 121.7737 },
      { name: '隧道口加油站', type: 'gasstation', description: '特长隧道入口前的加油站', lat: 30.9304, lng: 121.1737 },
      { name: '古镇灯笼拍照点', type: 'photospot', description: '夜晚万盏灯笼，如梦如幻', lat: 31.5504, lng: 121.7937 },
      { name: '天池观景台', type: 'viewpoint', description: '山顶湖泊，碧水如镜', lat: 30.9104, lng: 121.1537 },
      { name: '竹楼农家乐', type: 'farmstay', description: '傣族风情竹楼，特色美食', lat: 31.5704, lng: 121.8137 },
      { name: '草原加油站', type: 'gasstation', description: '草原公路旁的加油站', lat: 30.8904, lng: 121.1337 },
      { name: '樱花谷拍照点', type: 'photospot', description: '三月樱花盛开，浪漫至极', lat: 31.5904, lng: 121.8337 },
      { name: '黄河第一湾观景台', type: 'viewpoint', description: '大河九曲，气势恢宏', lat: 30.8704, lng: 121.1137 },
      { name: '窑洞农家乐', type: 'farmstay', description: '陕北窑洞体验，地道面食', lat: 31.6104, lng: 121.8537 },
      { name: '盘山公路加油站', type: 'gasstation', description: '山路十八弯中途补给站', lat: 30.8504, lng: 121.0937 },
      { name: '银杏大道拍照点', type: 'photospot', description: '秋天金黄银杏，满地落叶', lat: 31.6304, lng: 121.8737 },
      { name: '海底观景台', type: 'viewpoint', description: '海底世界观景长廊', lat: 30.8304, lng: 121.0737 },
      { name: '土楼农家乐', type: 'farmstay', description: '客家土楼住宿，民俗体验', lat: 31.6504, lng: 121.8937 },
      { name: '跨海大桥加油站', type: 'gasstation', description: '大桥两端的加油站', lat: 30.8104, lng: 121.0537 },
      { name: '荷花池拍照点', type: 'photospot', description: '夏日荷花盛开，清香四溢', lat: 31.6704, lng: 121.9137 },
      { name: '长城观景台', type: 'viewpoint', description: '万里长城最美段落', lat: 30.7904, lng: 121.0337 },
      { name: '吊脚楼农家乐', type: 'farmstay', description: '湘西吊脚楼，苗家风味', lat: 31.6904, lng: 121.9337 },
      { name: '戈壁加油站', type: 'gasstation', description: '戈壁滩上的生命补给站', lat: 30.7704, lng: 121.0137 },
      { name: '稻田画拍照点', type: 'photospot', description: '创意稻田艺术画，震撼', lat: 31.7104, lng: 121.9537 },
      { name: '溶洞观景台', type: 'viewpoint', description: '地下溶洞奇观，钟乳石林立', lat: 30.7504, lng: 120.9937 },
      { name: '蒙古包农家乐', type: 'farmstay', description: '大草原蒙古包，奶茶手抓肉', lat: 31.7304, lng: 121.9737 },
    ];

    mockPOIs.forEach((poi) => {
      const id = uuidv4();
      this.pois.set(id, { ...poi, id });
    });
  }

  getRoute(id: string): Route | undefined {
    return this.routes.get(id);
  }

  getAllRoutes(): Route[] {
    return Array.from(this.routes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  createRoute(data: Partial<Route>): Route {
    const id = uuidv4();
    const now = new Date().toISOString();
    const route: Route = {
      id,
      name: data.name || '新路线',
      waypoints: data.waypoints || [],
      createdAt: now,
      updatedAt: now,
    };
    this.routes.set(id, route);
    return route;
  }

  updateRoute(id: string, data: Partial<Route>): Route | undefined {
    const route = this.routes.get(id);
    if (!route) return undefined;
    const updated = {
      ...route,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.routes.set(id, updated);
    return updated;
  }

  deleteRoute(id: string): boolean {
    return this.routes.delete(id);
  }

  addWaypoint(routeId: string, waypoint: Omit<Waypoint, 'id'>): Route | undefined {
    const route = this.routes.get(routeId);
    if (!route) return undefined;
    const newWaypoint: Waypoint = {
      ...waypoint,
      id: uuidv4(),
    };
    route.waypoints.push(newWaypoint);
    route.waypoints.sort((a, b) => a.order - b.order);
    route.updatedAt = new Date().toISOString();
    return route;
  }

  removeWaypoint(routeId: string, waypointId: string): Route | undefined {
    const route = this.routes.get(routeId);
    if (!route) return undefined;
    route.waypoints = route.waypoints.filter((w) => w.id !== waypointId);
    route.waypoints.forEach((w, i) => (w.order = i));
    route.updatedAt = new Date().toISOString();
    return route;
  }

  reorderWaypoints(routeId: string, waypointIds: string[]): Route | undefined {
    const route = this.routes.get(routeId);
    if (!route) return undefined;
    const waypointMap = new Map(route.waypoints.map((w) => [w.id, w]));
    route.waypoints = waypointIds
      .map((id) => waypointMap.get(id))
      .filter((w): w is Waypoint => w !== undefined)
      .map((w, i) => ({ ...w, order: i }));
    route.updatedAt = new Date().toISOString();
    return route;
  }

  getPOI(id: string): POI | undefined {
    return this.pois.get(id);
  }

  getAllPOIs(): POI[] {
    return Array.from(this.pois.values());
  }

  getCheckin(id: string): Checkin | undefined {
    return this.checkins.get(id);
  }

  getCheckinsByRoute(routeId: string): Checkin[] {
    return Array.from(this.checkins.values())
      .filter((c) => c.routeId === routeId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  createCheckin(data: Omit<Checkin, 'id'>): Checkin {
    const id = uuidv4();
    const checkin: Checkin = { ...data, id };
    this.checkins.set(id, checkin);
    return checkin;
  }

  getReport(id: string): TripReport | undefined {
    return this.reports.get(id);
  }

  getReportByRoute(routeId: string): TripReport | undefined {
    return Array.from(this.reports.values()).find((r) => r.routeId === routeId);
  }

  createReport(data: Omit<TripReport, 'id' | 'createdAt'>): TripReport {
    const id = uuidv4();
    const report: TripReport = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.reports.set(id, report);
    return report;
  }

  updateReport(id: string, data: Partial<TripReport>): TripReport | undefined {
    const report = this.reports.get(id);
    if (!report) return undefined;
    const updated = { ...report, ...data, id };
    this.reports.set(id, updated);
    return updated;
  }
}

export const dataStore = new DataStore();
