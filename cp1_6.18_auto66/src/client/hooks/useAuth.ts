import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { isAuthenticated, user, token, loading, login, register, logout, fetchCurrentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser, user]);

  const requireAuth = () => {
    if (!isAuthenticated && !loading) {
      navigate('/login', { state: { from: location.pathname } });
      return false;
    }
    return true;
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    const from = (location.state as { from?: string })?.from || '/';
    navigate(from, { replace: true });
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    await register(username, email, password);
    const from = (location.state as { from?: string })?.from || '/';
    navigate(from, { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return {
    isAuthenticated,
    user,
    token,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    requireAuth
  };
};
