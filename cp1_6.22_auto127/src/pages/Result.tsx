import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Trophy, Coins, RotateCcw } from 'lucide-react';

export default function Result() {
  const navigate = useNavigate();
  const { battleResult, reset } = useGameStore();

  if (!battleResult) {
    navigate('/');
    return null;
  }

  const isVictory = battleResult.winner === battleResult.yourTeam;

  const handlePlayAgain = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
      <div className="relative">
        {isVictory && (
          <div className="absolute inset-0 -m-8 rounded-3xl animate-pulse" style={{ boxShadow: '0 0 60px rgba(59,130,246,0.4), 0 0 120px rgba(59,130,246,0.2)' }} />
        )}
        <div className="relative bg-[#1e293b] rounded-2xl p-8 w-[400px] text-center border border-slate-700/50">
          <div className={`mb-6 ${isVictory ? 'animate-bounce' : ''}`}>
            {isVictory ? (
              <Trophy className="w-20 h-20 mx-auto text-[#3b82f6]" />
            ) : (
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center">
                <span className="text-4xl">💀</span>
              </div>
            )}
          </div>

          <h1
            className={`text-3xl font-bold mb-2 ${isVictory ? 'text-[#3b82f6]' : 'text-[#f97316]'}`}
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {isVictory ? 'VICTORY' : 'DEFEAT'}
          </h1>

          <p className="text-slate-400 mb-6">
            {isVictory ? '你的舰队赢得了这场战斗！' : '你的舰队在这场战斗中落败...'}
          </p>

          <div className="bg-slate-800/60 rounded-xl p-4 mb-6 flex items-center justify-center gap-3">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              +{battleResult.rewards}
            </span>
            <span className="text-slate-400 text-sm">金币</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePlayAgain}
              className="flex-1 py-3 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-[#3b82f6] to-[#f97316] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              再来一局
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            战斗阵营: {battleResult.yourTeam === 'red' ? '红方' : '蓝方'}
          </div>
        </div>
      </div>
    </div>
  );
}
