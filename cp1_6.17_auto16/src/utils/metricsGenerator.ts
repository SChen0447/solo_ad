import { v4 as uuidv4 } from 'uuid';
import {
  Service,
  ServiceStatus,
  ServiceType,
  RequestMetric,
  LatencyDistribution,
  RequestLog,
  ServiceMetrics,
} from '../types';

const SERVICE_DEFS: Array<{ name: string; type: ServiceType; description: string; port: number }> = [
  { name: 'API Gateway', type: 'gateway', description: '统一入口网关，路由分发与鉴权', port: 8080 },
  { name: 'Auth Service', type: 'auth', description: '用户认证与权限管理服务', port: 8081 },
  { name: 'User Service', type: 'business', description: '用户信息与账户管理', port: 8082 },
  { name: 'Order Service', type: 'business', description: '订单创建、查询与状态流转', port: 8083 },
  { name: 'Data Service', type: 'data', description: '数据持久化与缓存同步', port: 8084 },
  { name: 'Message Queue', type: 'message', description: '异步消息处理与事件广播', port: 8085 },
];

const METHODS: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'> = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const PATHS: Record<ServiceType, string[]> = {
  gateway: ['/api/v1/gateway/route', '/api/v1/gateway/health', '/api/v1/gateway/metrics'],
  auth: ['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/refresh', '/api/v1/auth/verify'],
  data: ['/api/v1/data/query', '/api/v1/data/persist', '/api/v1/data/sync'],
  business: ['/api/v1/users', '/api/v1/orders', '/api/v1/products', '/api/v1/payments'],
  cache: ['/api/v1/cache/get', '/api/v1/cache/set', '/api/v1/cache/invalidate'],
  message: ['/api/v1/message/publish', '/api/v1/message/consume', '/api/v1/message/ack'],
};

const STATUS_WEIGHTS: [ServiceStatus, number][] = [
  ['healthy', 0.7],
  ['degraded', 0.2],
  ['error', 0.1],
];

function weightedPick<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, weight] of items) {
    if ((r -= weight) <= 0) return item;
  }
  return items[0][0];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function classifyLatency(latency: number): keyof LatencyDistribution {
  if (latency < 50) return 'under50ms';
  if (latency < 200) return 'between50And200ms';
  if (latency < 500) return 'between200And500ms';
  return 'over500ms';
}

function generateLatency(status: ServiceStatus): number {
  if (status === 'error') return randInt(500, 2000);
  if (status === 'degraded') return randInt(150, 800);
  return randInt(10, 250);
}

function generateStatusCode(status: ServiceStatus, latency: number): number {
  if (status === 'error' || latency > 800) {
    return weightedPick<number>([
      [500, 0.4],
      [502, 0.2],
      [503, 0.2],
      [408, 0.2],
    ]);
  }
  return weightedPick<number>([
    [200, 0.7],
    [201, 0.1],
    [204, 0.05],
    [304, 0.05],
    [400, 0.05],
    [404, 0.05],
  ]);
}

function generateInitialRequestVolume(points: number = 100): RequestMetric[] {
  const now = Date.now();
  const arr: RequestMetric[] = [];
  let base = randInt(50, 200);
  for (let i = points - 1; i >= 0; i--) {
    base += randInt(-10, 15);
    base = Math.max(10, Math.min(500, base));
    arr.push({ timestamp: now - i * 3000, count: base });
  }
  return arr;
}

function generateLatencyDistribution(status: ServiceStatus): LatencyDistribution {
  if (status === 'healthy') {
    return {
      under50ms: randInt(50, 75),
      between50And200ms: randInt(15, 30),
      between200And500ms: randInt(3, 10),
      over500ms: randInt(0, 3),
    };
  }
  if (status === 'degraded') {
    return {
      under50ms: randInt(20, 40),
      between50And200ms: randInt(25, 40),
      between200And500ms: randInt(15, 25),
      over500ms: randInt(5, 15),
    };
  }
  return {
    under50ms: randInt(5, 15),
    between50And200ms: randInt(10, 25),
    between200And500ms: randInt(20, 35),
    over500ms: randInt(30, 50),
  };
}

function generateRequestLog(serviceType: ServiceType, status: ServiceStatus): RequestLog {
  const latency = generateLatency(status);
  const paths = PATHS[serviceType];
  return {
    id: uuidv4(),
    timestamp: Date.now() - randInt(0, 60000),
    method: METHODS[randInt(0, METHODS.length - 1)],
    path: paths[randInt(0, paths.length - 1)],
    statusCode: generateStatusCode(status, latency),
    latency,
    latencyBucket: classifyLatency(latency),
    clientIp: `${randInt(10, 192)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
  };
}

function generateRecentRequests(type: ServiceType, status: ServiceStatus, n: number = 50): RequestLog[] {
  const logs: RequestLog[] = [];
  for (let i = 0; i < n; i++) {
    logs.push(generateRequestLog(type, status));
  }
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

function createInitialMetrics(type: ServiceType, status: ServiceStatus): ServiceMetrics {
  const latencyDist = generateLatencyDistribution(status);
  const total = latencyDist.under50ms + latencyDist.between50And200ms + latencyDist.between200And500ms + latencyDist.over500ms;
  const avgLatency =
    (latencyDist.under50ms * 25 + latencyDist.between50And200ms * 125 + latencyDist.between200And500ms * 350 + latencyDist.over500ms * 800) / total;
  return {
    requestVolume: generateInitialRequestVolume(),
    avgLatency: Math.round(avgLatency),
    p95Latency: Math.round(avgLatency * 2.5),
    p99Latency: Math.round(avgLatency * 4),
    errorRate: status === 'healthy' ? randFloat(0.1, 2) : status === 'degraded' ? randFloat(2, 8) : randFloat(10, 40),
    activeConnections: randInt(10, 500),
    latencyDistribution: latencyDist,
    recentRequests: generateRecentRequests(type, status),
  };
}

function randFloat(min: number, max: number): number {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

export function createInitialServices(): Service[] {
  return SERVICE_DEFS.map((def, idx) => {
    const status = weightedPick(STATUS_WEIGHTS);
    return {
      id: `svc-${idx}`,
      name: def.name,
      type: def.type,
      status,
      description: def.description,
      port: def.port,
      replicas: randInt(2, 6),
      metrics: createInitialMetrics(def.type, status),
      simulatedOff: false,
    };
  });
}

export function updateServicesMetrics(services: Service[]): Service[] {
  return services.map((svc) => {
    if (svc.simulatedOff) {
      return {
        ...svc,
        status: 'error',
        metrics: {
          ...svc.metrics,
          requestVolume: appendRequestMetric(svc.metrics.requestVolume, 0),
          errorRate: 100,
          activeConnections: 0,
        },
      };
    }

    const statusRoll = Math.random();
    let newStatus: ServiceStatus = svc.status;
    if (statusRoll < 0.05) {
      newStatus = weightedPick(STATUS_WEIGHTS);
    }

    const latencyDist = generateLatencyDistribution(newStatus);
    const total = latencyDist.under50ms + latencyDist.between50And200ms + latencyDist.between200And500ms + latencyDist.over500ms;
    const avgLatency =
      (latencyDist.under50ms * 25 + latencyDist.between50And200ms * 125 + latencyDist.between200And500ms * 350 + latencyDist.over500ms * 800) / total;

    const lastCount = svc.metrics.requestVolume[svc.metrics.requestVolume.length - 1]?.count ?? 100;
    const newCount = Math.max(10, lastCount + randInt(-15, 20));

    const newLogs: RequestLog[] = [];
    for (let i = 0; i < randInt(2, 5); i++) {
      newLogs.push(generateRequestLog(svc.type, newStatus));
    }
    const merged = [...newLogs, ...svc.metrics.recentRequests].sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);

    return {
      ...svc,
      status: newStatus,
      metrics: {
        requestVolume: appendRequestMetric(svc.metrics.requestVolume, newCount),
        avgLatency: Math.round(avgLatency),
        p95Latency: Math.round(avgLatency * 2.5),
        p99Latency: Math.round(avgLatency * 4),
        errorRate: newStatus === 'healthy' ? randFloat(0.1, 2) : newStatus === 'degraded' ? randFloat(2, 8) : randFloat(10, 40),
        activeConnections: Math.max(0, svc.metrics.activeConnections + randInt(-20, 30)),
        latencyDistribution: latencyDist,
        recentRequests: merged,
      },
    };
  });
}

function appendRequestMetric(arr: RequestMetric[], count: number): RequestMetric[] {
  const next = [...arr, { timestamp: Date.now(), count }];
  if (next.length > 150) next.shift();
  return next;
}

export function getLatencyBucketLabel(key: keyof LatencyDistribution): string {
  switch (key) {
    case 'under50ms':
      return '0-50ms';
    case 'between50And200ms':
      return '50-200ms';
    case 'between200And500ms':
      return '200-500ms';
    case 'over500ms':
      return '500ms+';
  }
}

export const LATENCY_BUCKET_COLORS: Record<keyof LatencyDistribution, string> = {
  under50ms: '#10b981',
  between50And200ms: '#3b82f6',
  between200And500ms: '#f59e0b',
  over500ms: '#ef4444',
};
