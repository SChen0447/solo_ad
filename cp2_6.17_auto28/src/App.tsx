import React, { useState, useEffect, useCallback } from 'react';
import PackageList from './components/PackageList';
import PackageForm from './components/PackageForm';
import ClaimForm from './components/ClaimForm';
import PackageDetail from './components/PackageDetail';
import { api } from './services/api';
import type { Package, CreatePackageRequest, PaginationInfo } from './types';

type Page = 'home' | 'register' | 'claim' | 'detail';

interface ModalData {
  pickupCode: string;
  packageId: string;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [packages, setPackages] = useState<Package[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentQueryPage, setCurrentQueryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const fetchPackages = useCallback(async (page = 1) => {
    try {
      const response = await api.getPackages({ page, limit: 20 });
      setPackages(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages(currentQueryPage);
  }, [fetchPackages, currentQueryPage]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPackages(currentQueryPage);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPackages, currentQueryPage]);

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
      await fetchPackages(currentQueryPage);
    } catch (err) {
      showError(err instanceof Error ? err.message : '登记失败');
    }
  };

  const handleClaim = async (pickupCode: string) => {
    try {
      const response = await api.claimPackage({ pickupCode });
      if (response.success) {
        showSuccess('取件成功！');
        await fetchPackages(currentQueryPage);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '取件失败');
    }
  };

  const handlePackageClick = (pkg: Package) => {
    setSelectedPackage(pkg);
    setCurrentPage('detail');
  };

  const handleNotifySuccess = (updatedPkg: Package) => {
    setPackages(prev => prev.map(p => p.id === updatedPkg.id ? updatedPkg : p));
    setSelectedPackage(updatedPkg);
    showSuccess('通知发送成功！');
  };

  const closeModal = () => {
    setModal(null);
    setCurrentPage('home');
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    if (page === 'detail' && selectedPackage === null) {
      setCurrentPage('home');
    }
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
          {currentPage !== 'home' && currentPage !== 'detail' && (
            <button className="btn btn-secondary" onClick={() => navigateTo('home')}>
              返回首页
            </button>
          )}
          {currentPage === 'detail' && (
            <button className="btn btn-secondary" onClick={() => navigateTo('home')}>
              返回列表
            </button>
          )}
          <button
            className={`btn ${currentPage === 'register' ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => navigateTo(currentPage === 'register' ? 'home' : 'register')}
          >
            {currentPage === 'register' ? '取消登记' : '包裹登记'}
          </button>
          <button
            className={`btn ${currentPage === 'claim' ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => navigateTo(currentPage === 'claim' ? 'home' : 'claim')}
          >
            {currentPage === 'claim' ? '取消' : '取件'}
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
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination-container">
                <button
                  className="btn btn-secondary"
                  disabled={!pagination.hasPrev}
                  onClick={() => setCurrentQueryPage(p => p - 1)}
                >
                  上一页
                </button>
                <span className="pagination-info">
                  第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 个包裹
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={!pagination.hasNext}
                  onClick={() => setCurrentQueryPage(p => p + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        {currentPage === 'register' && (
          <PackageForm onSubmit={handleCreatePackage} onCancel={() => navigateTo('home')} />
        )}

        {currentPage === 'claim' && <ClaimForm onClaim={handleClaim} />}

        {currentPage === 'detail' && selectedPackage && (
          <PackageDetail
            pkg={selectedPackage}
            onNotifySuccess={handleNotifySuccess}
          />
        )}
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
