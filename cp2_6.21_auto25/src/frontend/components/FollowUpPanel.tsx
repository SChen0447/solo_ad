import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function FollowUpPanel() {
  const { followUps, applications, pets, reminders, addFollowUp, fetchReminders, fetchFollowUps } = useAppContext();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', rating: 3 });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 5000);
  };

  const approvedApps = applications.filter((a) => a.status === 'approved');

  const getPetName = (petId: string) => pets.find((p) => p.id === petId)?.name || '未知';

  const getFollowUpsForApp = (appId: string) => followUps.filter((f) => f.applicationId === appId);

  const isArchived = (appId: string) => {
    const fus = getFollowUpsForApp(appId);
    return fus.some((f) => f.isArchived);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    setSubmitting(true);
    try {
      await addFollowUp({
        applicationId: selectedAppId,
        description: form.description,
        rating: form.rating,
      });
      await fetchFollowUps();
      await fetchReminders();
      setForm({ description: '', rating: 3 });
      setSelectedAppId(null);
      const count = getFollowUpsForApp(selectedAppId).length;
      if (count + 1 >= 3) {
        showToast('已完成3次回访，领养记录已自动归档');
      } else {
        showToast('回访记录已保存');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333', margin: '0 0 20px 0' }}>
        回访管理
      </h2>

      {reminders.length > 0 && (
        <div
          style={{
            background: '#FFF8F0',
            border: '1px solid #F58F29',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🔔</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#E65100' }}>
              回访提醒
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              {reminders.map((r, i) => (
                <span key={r.applicationId}>
                  {i > 0 && '、'}
                  {r.petName}（{r.applicantName}）领养已{r.daysSinceAdoption}天
                </span>
              ))}
              {' '}— 需要进行回访
            </div>
          </div>
        </div>
      )}

      {approvedApps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          暂无已通过的领养申请
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {approvedApps.map((app) => {
            const appFollowUps = getFollowUpsForApp(app.id);
            const archived = isArchived(app.id);
            const petName = getPetName(app.petId);

            return (
              <div
                key={app.id}
                style={{
                  background: archived ? '#F5F5F5' : '#FFFFFF',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#333' }}>
                          {app.applicantName}
                        </span>
                        <span style={{ fontSize: '13px', color: '#999' }}>
                          领养 <span style={{ color: '#F58F29', fontWeight: 500 }}>{petName}</span>
                        </span>
                        {archived && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#E0E0E0',
                              color: '#999',
                            }}
                          >
                            已归档
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        回访次数：{appFollowUps.length}/3
                      </div>
                    </div>
                    {!archived && appFollowUps.length < 3 && (
                      <button
                        onClick={() => setSelectedAppId(selectedAppId === app.id ? null : app.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: '1px solid #F58F29',
                          background: '#FFFFFF',
                          color: '#F58F29',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#FFF8F0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                      >
                        填写回访
                      </button>
                    )}
                  </div>

                  {appFollowUps.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {appFollowUps.map((fu) => (
                        <div
                          key={fu.id}
                          style={{
                            background: archived ? '#EBEBEB' : '#FAFAFA',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#999', fontSize: '12px' }}>
                              {new Date(fu.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                            <span style={{ color: '#F58F29' }}>
                              {'★'.repeat(fu.rating)}{'☆'.repeat(5 - fu.rating)}
                            </span>
                          </div>
                          <div style={{ color: '#555' }}>{fu.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedAppId === app.id && !archived && (
                  <div
                    style={{
                      borderTop: '1px solid #E0E0E0',
                      padding: '16px 20px',
                      background: '#FAFAFA',
                    }}
                  >
                    <form onSubmit={handleSubmit}>
                      <div style={{ marginBottom: '12px' }}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#333',
                            marginBottom: '6px',
                          }}
                        >
                          回访内容
                        </label>
                        <textarea
                          required
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="描述宠物适应情况、生活状态等..."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #E0E0E0',
                            borderRadius: '12px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={(e) => (e.target.style.borderColor = '#F58F29')}
                          onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
                        />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#333',
                            marginBottom: '6px',
                          }}
                        >
                          评分：{form.rating} 星
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              onClick={() => setForm({ ...form, rating: star })}
                              style={{
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: star <= form.rating ? '#F58F29' : '#E0E0E0',
                                transition: 'color 0.15s',
                              }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAppId(null)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid #E0E0E0',
                            borderRadius: '12px',
                            background: '#FFFFFF',
                            color: '#666',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            borderRadius: '12px',
                            background: '#F58F29',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                          }}
                        >
                          {submitting ? '提交中...' : '提交回访'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast.visible && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#FFFFFF',
            border: '2px solid #F58F29',
            borderRadius: '12px',
            padding: '14px 20px',
            boxShadow: '0px 4px 16px rgba(0,0,0,0.12)',
            zIndex: 2000,
            animation: 'toastIn 0.3s ease-out',
            maxWidth: '320px',
          }}
        >
          <style>{`
            @keyframes toastIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <span style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
