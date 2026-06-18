import { useState } from 'react';
import { usePromotionStore } from '../store';
import type { PublishResponse } from '../types';
import toast, { Toaster } from 'react-hot-toast';
import styles from '../styles/ConfigPanel.module.css';

export default function ConfigPanel() {
  const { selectedProducts, templateId, activityConfig, updateActivityConfig } =
    usePromotionStore();

  const [isPublishing, setIsPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePublish = async () => {
    if (selectedProducts.length === 0) {
      toast.error('请至少选择一个商品');
      return;
    }
    if (!activityConfig.activityName.trim()) {
      toast.error('请填写活动名称');
      return;
    }
    if (!activityConfig.startTime) {
      toast.error('请选择活动开始时间');
      return;
    }
    if (!activityConfig.endTime) {
      toast.error('请选择活动结束时间');
      return;
    }
    if (
      activityConfig.startTime &&
      activityConfig.endTime &&
      activityConfig.startTime > activityConfig.endTime
    ) {
      toast.error('结束时间不能早于开始时间');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: selectedProducts,
          templateId,
          activityConfig,
        }),
      });

      const data: PublishResponse = await response.json();

      if (data.success) {
        toast.success('活动发布成功！');
        setShareUrl(data.shareUrl);
      } else {
        toast.error('发布失败，请重试');
      }
    } catch (error) {
      toast.error('网络错误，请检查后端服务是否启动');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleCloseShareModal = () => {
    setShareUrl(null);
    setCopied(false);
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.section} style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
            活动配置
          </div>

          <div className={styles.field}>
            <label className={styles.label}>活动名称</label>
            <input
              type="text"
              className={styles.input}
              placeholder="请输入活动名称"
              value={activityConfig.activityName}
              onChange={(e) =>
                updateActivityConfig({ activityName: e.target.value })
              }
            />
          </div>

          <div className={styles.row} style={{ marginTop: '16px' }}>
            <div className={styles.field}>
              <label className={styles.label}>开始时间</label>
              <input
                type="date"
                className={styles.input}
                value={activityConfig.startTime}
                onChange={(e) =>
                  updateActivityConfig({ startTime: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>结束时间</label>
              <input
                type="date"
                className={styles.input}
                value={activityConfig.endTime}
                onChange={(e) =>
                  updateActivityConfig({ endTime: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.field} style={{ marginTop: '16px' }}>
            <label className={styles.label}>折扣标签颜色</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={activityConfig.discountColor}
                onChange={(e) =>
                  updateActivityConfig({ discountColor: e.target.value })
                }
              />
              <div
                className={styles.colorPreview}
                style={{ backgroundColor: activityConfig.discountColor }}
              >
                ¥{199}
              </div>
            </div>
          </div>

          <button
            className={styles.publishBtn}
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? '发布中...' : '发布活动'}
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className={styles.shareModal} onClick={handleCloseShareModal}>
          <div className={styles.shareCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareHeader}>
              <div className={styles.successIcon}>✓</div>
              <div>
                <div className={styles.shareTitle}>活动发布成功</div>
                <div className={styles.shareSubtitle}>
                  复制下方链接分享给您的用户
                </div>
              </div>
            </div>

            <div className={styles.shareLinkRow}>
              <input
                type="text"
                className={styles.shareInput}
                value={shareUrl}
                readOnly
              />
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? '已复制' : '复制链接'}
              </button>
            </div>

            <div className={styles.shareFooter}>
              <button
                className={styles.secondaryBtn}
                onClick={handleCloseShareModal}
              >
                继续编辑
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  window.open(shareUrl, '_blank');
                }}
              >
                打开链接
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-center" />
    </>
  );
}
