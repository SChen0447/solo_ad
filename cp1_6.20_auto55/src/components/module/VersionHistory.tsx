import React, { useEffect, useState } from 'react';
import type { Version } from '../../types';
import { versionApi, formatTime } from '../../api';

interface VersionHistoryProps {
  projectId: string;
  onRestore: (versionId: string) => void;
  showConfirmModal: boolean;
  setShowConfirmModal: (show: boolean) => void;
  pendingRestoreId: string | null;
  setPendingRestoreId: (id: string | null) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  projectId,
  onRestore,
  showConfirmModal,
  setShowConfirmModal,
  pendingRestoreId,
  setPendingRestoreId,
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await versionApi.getByProject(projectId);
      setVersions(data);
    } catch (err) {
      console.error('加载版本历史失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadVersions();
    }
  }, [projectId]);

  useEffect(() => {
    const interval = setInterval(loadVersions, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleClickRestore = (versionId: string) => {
    setPendingRestoreId(versionId);
    setShowConfirmModal(true);
  };

  const handleConfirmRestore = () => {
    if (pendingRestoreId) {
      onRestore(pendingRestoreId);
      setShowConfirmModal(false);
      setPendingRestoreId(null);
      loadVersions();
    }
  };

  const handleCancelRestore = () => {
    setShowConfirmModal(false);
    setPendingRestoreId(null);
  };

  return (
    <>
      <div className="property-group">
        <div className="property-group-title">版本历史</div>
        {loading && versions.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div>加载中...</div>
          </div>
        ) : versions.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-icon">📜</div>
            <div>暂无版本记录</div>
          </div>
        ) : (
          versions.map((version, index) => (
            <div
              key={version.id}
              className="version-item"
              onClick={() => handleClickRestore(version.id)}
            >
              <div className="version-item-time">
                {index === 0 ? '最新版本 - ' : ''}
                {formatTime(version.created_at)}
              </div>
              <div className="version-item-author">作者：{version.author}</div>
            </div>
          ))
        )}
      </div>

      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelRestore}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认回滚</div>
            <div className="modal-message">
              确定要回滚到此版本吗？当前未保存的更改将会丢失。
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={handleCancelRestore}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleConfirmRestore}>
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VersionHistory;
