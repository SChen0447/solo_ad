import React, { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link
} from 'react-router-dom';
import type { Recipe, User } from './types';
import { authApi, recipeApi, shoppingListApi } from './api';
import RecipeCard from './components/RecipeCard';
import RecipeEditor from './components/RecipeEditor';
import ShoppingList from './components/ShoppingList';

const LoginPage: React.FC<{
  onLogin: (user: User, token: string) => void;
}> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await authApi.login(email, password);
      onLogin(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">🍳 智能食谱管家</h1>
        <p className="auth-subtitle">欢迎回来，请登录您的账户</p>

        {error && <div className="error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            邮箱
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="auth-link">
          还没有账户？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
};

const RegisterPage: React.FC<{
  onLogin: (user: User, token: string) => void;
}> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password) {
      setError('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await authApi.register(username, email, password);
      onLogin(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">🍳 智能食谱管家</h1>
        <p className="auth-subtitle">创建您的账户，开始管理食谱</p>

        {error && <div className="error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            用户名
            <input
              type="text"
              placeholder="您的昵称"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            邮箱
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              placeholder="至少6个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            确认密码
            <input
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="auth-link">
          已有账户？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  );
};

const Navbar: React.FC<{
  user: User | null;
  onLogout: () => void;
}> = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate('/')}>
        <span className="navbar-logo-icon">🍴</span>
        <span style={{ fontSize: '18px' }}>食谱管家</span>
      </div>

      <button className="hamburger" onClick={() => setShowDropdown(!showDropdown)}>
        ☰
      </button>

      <div className="navbar-user">
        <span className="username" style={{ color: 'white', fontSize: '14px' }}>
          {user.username}
        </span>
        <div
          className="avatar"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {user.avatar}
        </div>

        {showDropdown && (
          <div className="dropdown-menu">
            <button onClick={() => navigate('/')}>我的食谱</button>
            <button onClick={() => navigate('/editor/new')}>新建食谱</button>
            <button
              onClick={() => {
                onLogout();
                setShowDropdown(false);
              }}
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const RecipeLibrary: React.FC<{
  recipes: Recipe[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
  loading: boolean;
}> = ({ recipes, onEdit, onDelete, onCreateNew, loading }) => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">我的食谱库</h1>
        <button className="btn-primary" onClick={onCreateNew}>
          + 新建食谱
        </button>
      </div>

      {loading ? (
        <div className="loading">加载食谱中...</div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <p className="empty-state-text">还没有食谱，开始创建您的第一道菜谱吧！</p>
          <button className="btn-primary" onClick={onCreateNew}>
            + 创建第一个食谱
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        loadRecipes();
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setAuthLoading(false);
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const res = await recipeApi.getRecipes();
      setRecipes(res.data.recipes);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    loadRecipes();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setRecipes([]);
    navigate('/login');
  };

  const handleEditRecipe = (id: number) => {
    navigate(`/editor/${id}`);
  };

  const handleDeleteRecipe = async (id: number) => {
    try {
      await recipeApi.deleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const handleGenerateShoppingList = async (recipeIds: number[]) => {
    try {
      const res = await shoppingListApi.generate(recipeIds);
      navigate(`/shopping-list/${res.data.shopping_list.share_code}`);
    } catch (err: any) {
      alert(err.response?.data?.error || '生成购物清单失败');
    }
  };

  if (authLoading) {
    return <div className="loading">加载中...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <div className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <RecipeLibrary
                recipes={recipes}
                onEdit={handleEditRecipe}
                onDelete={handleDeleteRecipe}
                onCreateNew={() => navigate('/editor/new')}
                loading={loading}
              />
            }
          />
          <Route
            path="/editor/new"
            element={
              <RecipeEditor
                onGenerateShoppingList={handleGenerateShoppingList}
                allRecipes={recipes}
              />
            }
          />
          <Route
            path="/editor/:id"
            element={
              <RecipeEditor
                onGenerateShoppingList={handleGenerateShoppingList}
                allRecipes={recipes}
              />
            }
          />
          <Route
            path="/shopping-list/:shareCode"
            element={<ShoppingList currentUser={user} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
