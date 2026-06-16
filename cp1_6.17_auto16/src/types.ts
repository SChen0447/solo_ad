export type ServiceStatus = 'healthy' | 'degraded' | 'error';
export type ServiceType = 'gateway' | 'auth' | 'data' | 'business' | 'cache' | 'message';
export type TimeRange = '5m' | '30m' | '1h' | '24h';

export interface RequestMetric {
  timestamp: number;
  count: number;
}

export interface LatencyDistribution {
  under50ms: number;
  between50And200ms: number;
  between200And500ms: number;
  over500ms: number;
}

export interface RequestLog {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  statusCode: number;
  latency: number;
  latencyBucket: keyof LatencyDistribution;
  clientIp: string;
}

export interface ServiceMetrics {
  requestVolume: RequestMetric[];
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  activeConnections: number;
  latencyDistribution: LatencyDistribution;
  recentRequests: RequestLog[];
}

export interface Service {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  description: string;
  port: number;
  replicas: number;
  metrics: ServiceMetrics;
  simulatedOff: boolean;
}

export interface FilterState {
  timeRange: TimeRange;
  serviceType: ServiceType | 'all';
  status: ServiceStatus | 'all';
}
