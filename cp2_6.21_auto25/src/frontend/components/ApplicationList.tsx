import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ApplicationList() {
  const { applications, pets, updateApplicationStatus } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [pulseId, setPulseId] = useState<string | null>(null);

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    setPulseId(id);
    await updateApplicationStatus(id, status);
    setTimeout(() => setPulseId(null), 200);
  };

  const getPetName = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    return pet?.name || '未知宠物';
  };

  const statusConfig = {
    pending: { label: '待审核', bg: '#FFF8E1', color: '#F9A825', border: '#F9A825' },
    approved: { label: '已通过', bg: '#E8F5E9', color: '#4CAF50', border: '#4CAF50' },
    rejected: { label: '已驳回', bg: '#FFEBEE', color: '#F44336', border: '#F44336' },
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333', margin: '0 0 20px 0' }}>
        领养申请管理
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: filter === f ? '2px solid #F58F29' : '1px solid #E0E0E0',
              background: filter === f ? '#FFF8F0' : '#FFFFFF',
              color: filter === f ? '#F58F29' : '#666',
              fontSize: '13px',
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {f === 'all' ? '全部' : f === 'pending' ? '待审核' : f === 'approved' ? '已通过' : '已驳回'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          暂无申请记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((app) => {
            const sc = statusConfig[app.status];
            return (
              <div
                key={app.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  animation: pulseId === app.id ? 'pulse 0.2s ease' : 'none',
                }}
              >
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                  }
                `}</style>

                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#FFF8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#F58F29',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {app.applicantName.charAt(0)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#333' }}>
                      {app.applicantName}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: sc.bg,
                        color: sc.color,
                        fontWeight: 500,
                      }}
                    >
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#999' }}>
                    申请领养 <span style={{ color: '#F58F29', fontWeight: 500 }}>{getPetName(app.petId)}</span>
                    {' · '}{app.housingType === 'house' ? '独栋' : '公寓'}
                    {' · '}每日{app.dailyCompanionHours}小时
                    {app.hasOtherPets ? ' · 有其他宠物' : ''}
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleStatusChange(app.id, 'approved')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid #4CAF50',
                        background: '#FFFFFF',
                        color: '#4CAF50',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E8F5E9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      通过
                    </button>
                    <button
                      onClick={() => handleStatusChange(app.id, 'rejected')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid #F44336',
                        background: '#FFFFFF',
                        color: '#F44336',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FFEBEE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      驳回
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
