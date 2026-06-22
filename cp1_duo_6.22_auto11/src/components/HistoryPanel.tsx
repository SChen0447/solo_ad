import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/store';
import { getAllCards, deleteCard } from '@/utils/indexedDB';
import { CardRecord } from '@/types';

const HistoryPanel = () => {
  const loadHistory = useAppStore((s) => s.loadHistory);
  const loadFromHistory = useAppStore((s) => s.loadFromHistory);
  const history = useAppStore((s) => s.history);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getAllCards().then((records) => {
      loadHistory(records);
    });

    const handleCardExported = () => {
      getAllCards().then((records) => {
        loadHistory(records);
      });
    };

    window.addEventListener('card-exported', handleCardExported);
    return () => {
      window.removeEventListener('card-exported', handleCardExported);
    };
  }, [loadHistory]);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteCard(id);
    setConfirmDeleteId(null);
    const updated = await getAllCards();
    loadHistory(updated);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-cinema-muted text-sm">
        暂无历史记录
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {history.map((record: CardRecord) => (
        <div
          key={record.id}
          className="group relative rounded-lg border border-cinema-border bg-cinema-card overflow-hidden cursor-pointer hover:border-cinema-primary transition-colors duration-300"
          onClick={() => loadFromHistory(record)}
        >
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={record.thumbnailUrl || record.imageUrl}
              alt={record.subtitleText}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="px-2 py-1.5 text-xs text-cinema-muted truncate">
            {formatTime(record.createdAt)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className={`
              absolute top-1.5 right-1.5 rounded-full p-0.5 transition-colors duration-200
              ${
                confirmDeleteId === record.id
                  ? 'bg-red-600 text-white'
                  : 'bg-cinema-bg/70 text-cinema-muted opacity-0 group-hover:opacity-100 hover:bg-red-600/80 hover:text-white'
              }
            `}
            title={confirmDeleteId === record.id ? '再次点击确认删除' : '删除'}
          >
            <X size={14} />
          </button>
          {confirmDeleteId === record.id && (
            <span className="absolute top-1.5 right-7 text-[10px] text-red-400 whitespace-nowrap">
              确认?
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default HistoryPanel;
