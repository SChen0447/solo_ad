import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, useAppStore } from '@/store';

const Login = () => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'pet_owner' | 'caregiver'>('pet_owner');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    try {
      const res = await apiFetch('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ name, password }),
      });
      setCurrentUser(res);
      navigate('/home');
    } catch (e: any) {
      setError(e.message || '登录失败');
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({ name, password, role }),
      });
      setSuccess('注册成功，请登录');
      setTab('login');
    } catch (e: any) {
      setError(e.message || '注册失败');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white rounded-lg shadow-md">
      <div className="flex border-b border-stone-200">
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors duration-200 ${tab === 'login' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-stone-500'}`}
          onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
        >
          登录
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors duration-200 ${tab === 'register' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-stone-500'}`}
          onClick={() => { setTab('register'); setError(''); setSuccess(''); }}
        >
          注册
        </button>
      </div>

      <div className="p-6">
        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
        {success && <div className="mb-4 text-green-500 text-sm">{success}</div>}

        {tab === 'login' ? (
          <div className="space-y-4">
            <input
              className="border border-stone-200 rounded px-3 py-2 w-full focus:outline-none focus:border-amber-400"
              placeholder="用户名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border border-stone-200 rounded px-3 py-2 w-full focus:outline-none focus:border-amber-400"
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="bg-amber-500 hover:bg-amber-600 text-white rounded px-4 py-2 btn-press transition-colors duration-200 w-full"
              onClick={handleLogin}
            >
              登录
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              className="border border-stone-200 rounded px-3 py-2 w-full focus:outline-none focus:border-amber-400"
              placeholder="用户名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border border-stone-200 rounded px-3 py-2 w-full focus:outline-none focus:border-amber-400"
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select
              className="border border-stone-200 rounded px-3 py-2 w-full focus:outline-none focus:border-amber-400"
              value={role}
              onChange={(e) => setRole(e.target.value as 'pet_owner' | 'caregiver')}
            >
              <option value="pet_owner">宠物主人</option>
              <option value="caregiver">看护者</option>
            </select>
            <button
              className="bg-amber-500 hover:bg-amber-600 text-white rounded px-4 py-2 btn-press transition-colors duration-200 w-full"
              onClick={handleRegister}
            >
              注册
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
