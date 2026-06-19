import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import TripBoard from './components/TripBoard';
import MapView from './components/MapView';
import { Map, Users, ChevronLeft, ChevronRight, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const TOAST_ICONS = {
  success: <CheckCircle2 size={18} className="text-green-600" />,
  error: <AlertCircle size={18} className="text-red-600" />,
  info: <Info size={18} className="text-navy" />,
};

function LoginScreen({ onJoin }: { onJoin: (username: string) => void }) {
  const [username, setUsername] = useState('');

  return (
    <div className="h-full flex items-center justify-center bg-cream p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✈️</div>
          <h1 className="font-display text-3xl text-navy mb-2">旅行计划协作器</h1>
          <p className="text-gray-500 text-sm">和朋友一起规划完美旅程</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">您的昵称</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入您的昵称"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-coral focus:outline-none transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && username.trim() && onJoin(username.trim())}
            />
          </div>
          <button
            onClick={() => username.trim() && onJoin(username.trim())}
            disabled={!username.trim()}
            className="w-full py-3 bg-coral text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-coral/20"
          >
            加入行程
          </button>
        </div>
        <div className="mt-6 p-3 bg-cream rounded-lg text-xs text-gray-600 text-center">
          默认行程 ID：trip-demo-001
        </div>
      </div>
    </div>
  );
}

function App() {
  const { trip, connected, toasts, connect, currentMember } = useAppStore();
  const [username, setUsername] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  useEffect(() => {
    if (username && !connected) {
      connect('trip-demo-001', username);
    }
  }, [username, connected, connect]);

  if (!username) {
    return <LoginScreen onJoin={setUsername} />;
  }

  return (
    <div className="h-full flex flex-col bg-cream">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-enter flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-100 min-w-64"
          >
            {TOAST_ICONS[t.type]}
            <span className="text-sm font-medium text-navy">{t.message}</span>
          </div>
        ))}
      </div>

      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✈️</span>
          <div>
            <h1 className="font-display text-xl text-navy leading-tight">
              {trip?.name || '加载中...'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {connected ? '已连接' : '连接中...'}
              {currentMember && <span>· 欢迎, {currentMember.username}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={16} />
          <span>{trip?.members.filter((m) => m.online).length || 0} 人在线</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0 ${
            leftCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          }`}
        >
          <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar h-full">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-navy">团队成员</h2>
              <button
                onClick={() => setLeftCollapsed(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              {trip?.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream/60 transition-colors"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coral to-orange-400 flex items-center justify-center text-white font-semibold text-sm">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        m.online ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy truncate flex items-center gap-1">
                      {m.username}
                      {m.isOwner && <span className="text-xs text-coral">👑</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {m.online ? '在线' : '离线'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentMember?.isOwner && (
              <InviteMember />
            )}
          </div>
        </aside>

        {leftCollapsed && (
          <button
            onClick={() => setLeftCollapsed(false)}
            className="bg-white border-r border-gray-200 px-1 hover:bg-cream transition-colors flex-shrink-0"
          >
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        )}

        <section className="flex-1 flex flex-col min-w-0 md:flex-row">
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 md:max-h-full">
            <TripBoard />
          </div>
          <div className="w-full md:w-96 h-80 md:h-auto md:flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-200 bg-white relative">
            <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 text-xs font-medium text-navy">
              <Map size={14} />
              行程地图
            </div>
            <MapView />
          </div>
        </section>
      </main>
    </div>
  );
}

function InviteMember() {
  const { trip, sendMessage, showToast } = useAppStore();
  const [name, setName] = useState('');

  const invite = () => {
    if (!trip || !name.trim()) return;
    if (trip.members.some((m) => m.username === name.trim())) {
      showToast('该成员已存在', 'error');
      return;
    }
    sendMessage({ type: 'INVITE_MEMBER', tripId: trip.id, username: name.trim() });
    showToast(`已邀请 ${name.trim()}`, 'success');
    setName('');
  };

  return (
    <div className="pt-4 border-t border-gray-100">
      <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        邀请成员
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入昵称"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && invite()}
        />
        <button
          onClick={invite}
          className="px-3 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy/90 transition-colors"
        >
          邀请
        </button>
      </div>
    </div>
  );
}

export default App;
