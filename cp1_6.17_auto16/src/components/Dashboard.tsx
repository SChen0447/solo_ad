import { ServiceCard } from './ServiceCard';
import type { Service, FilterState } from '../types';

interface DashboardProps {
  services: Service[];
  filters: FilterState;
  onServiceClick: (serviceId: string) => void;
  onToggleSimulation: (serviceId: string) => void;
}

export function Dashboard({ services, filters, onServiceClick, onToggleSimulation }: DashboardProps) {
  const visibleServices = services.filter((svc) => {
    const displayStatus = svc.simulatedOff ? 'error' : svc.status;
    const typeOk = filters.serviceType === 'all' || filters.serviceType === svc.type;
    const statusOk = filters.status === 'all' || filters.status === displayStatus;
    return typeOk && statusOk;
  });

  const healthyCount = services.filter((s) => !s.simulatedOff && s.status === 'healthy').length;
  const degradedCount = services.filter((s) => !s.simulatedOff && s.status === 'degraded').length;
  const errorCount = services.filter((s) => s.simulatedOff || s.status === 'error').length;
  const totalRequests = services.reduce((s, svc) => s + svc.metrics.requestVolume.reduce((a, r) => a + r.count, 0), 0);

  return (
    <div className="dashboard fade-in">
      <div className="stats-bar">
        <div className="stat-chip stat-green">
          <span className="stat-num">{healthyCount}</span>
          <span className="stat-label">正常</span>
        </div>
        <div className="stat-chip stat-yellow">
          <span className="stat-num">{degradedCount}</span>
          <span className="stat-label">降级</span>
        </div>
        <div className="stat-chip stat-red">
          <span className="stat-num">{errorCount}</span>
          <span className="stat-label">异常</span>
        </div>
        <div className="stat-chip stat-purple">
          <span className="stat-num">{totalRequests.toLocaleString()}</span>
          <span className="stat-label">5min总请求</span>
        </div>
      </div>

      {visibleServices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">当前筛选条件下没有匹配的服务</div>
        </div>
      ) : (
        <div className="card-grid">
          {visibleServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              filters={filters}
              onClick={onServiceClick}
              onToggleSimulation={onToggleSimulation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
