import React, { useState, useEffect, useCallback } from 'react';
import PackageList from './components/PackageList';
import PackageForm from './components/PackageForm';
import ClaimForm from './components/ClaimForm';
import { api } from './services/api';
import type { Package, CreatePackageRequest } from './types';

type Page = 'home' | 'register' | 'claim';

interface ModalData {
  pickupCode: string;
  packageId: string;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      const data = await api.getPackages();
      setPackages(data);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPackages();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPackages]);

  const showSuccess = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const showError = (message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 3000);
  };

  const handleCreatePackage = async (data: CreatePackageRequest) => {
    try {
      const response = await api.createPackage(data);
      setModal({
        pickupCode: response.pickupCode,
        packageId: response.id,
      });
      await fetchPackages();
    } catch (err) {
      showError(err instanceof Error ? err.message : '登记失败');
    }
  };

  const handleClaim = async (pickupCode: string) => {
    try {
      const response = await api.claimPackage({ pickupCode });
      if (response.success) {
        showSuccess('取件成功！');
        await fetchPackages();
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '取件失败');
    }
  };

  const handlePackageClick = (pkg: Package) => {
    console.log('Package clicked:', pkg);
  };

  const closeModal = () => {
    setModal(null);
    setCurrentPage('home');
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app-container">
      {successToast && <div className="success-toast">{successToast}</div>}
      {errorToast && (
        <div className="success-toast" style={{ background: '#f44336' }}>
          {errorToast}
        </div>
      )}

      <nav className="navbar">
        <div className="navbar-logo">智慧快递站</div>
        <div className="navbar-buttons">
          <button
            className={`btn ${currentPage === 'register' ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => navigateTo(currentPage === 'register' ? 'home' : 'register')}
          >
            {currentPage === 'register' ? '返回首页' : '包裹登记'}
          </button>
          <button
            className={`btn ${currentPage === 'claim' ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => navigateTo(currentPage === 'claim' ? 'home' : 'claim')}
          >
            {currentPage === 'claim' ? '返回首页' : '取件'}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'home' && (
          <>
            <ClaimForm onClaim={handleClaim} />
            {loading ? (
              <div className="empty-state">加载中...</div>
            ) : (
              <PackageList packages={packages} onPackageClick={handlePackageClick} />
            )}
          </>
        )}

        {currentPage === 'register' && (
          <PackageForm onSubmit={handleCreatePackage} onCancel={() => navigateTo('home')} />
        )}

        {currentPage === 'claim' && <ClaimForm onClaim={handleClaim} />}
      </main>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">包裹登记成功</h3>
            <div className="modal-pickup-code">{modal.pickupCode}</div>
            <div className="modal-package-id">包裹编号：{modal.packageId}</div>
            <button className="modal-btn" onClick={closeModal}>
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
