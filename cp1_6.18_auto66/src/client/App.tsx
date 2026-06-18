import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Publish } from './pages/Publish';
import { ProductDetail } from './pages/ProductDetail';
import { MyListings } from './pages/MyListings';
import { Orders } from './pages/Orders';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const { fetchCurrentUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token && !isAuthenticated) {
        await fetchCurrentUser();
      }
      setInitializing(false);
    };
    initAuth();
  }, [fetchCurrentUser, isAuthenticated]);

  if (initializing) {
    return <div className="loading-screen">加载中...</div>;
  }

  return (
    <>
      <Helmet>
        <title>虚拟商品二手交易平台</title>
        <meta name="description" content="安全、便捷的虚拟商品二手交易平台" />
      </Helmet>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route
            path="publish"
            element={
              <ProtectedRoute>
                <Publish />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-listings"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
