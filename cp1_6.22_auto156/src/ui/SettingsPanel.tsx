import { useEffect, useState } from 'react';
import { useGame, SaveSlot } from '../store/store';
import { getAllSaves, saveGame, loadGame } from '../engine/engine';

interface SettingsPanelProps {
  sceneTitle: string;
}

export function SettingsPanel({ sceneTitle }: SettingsPanelProps) {
  const { state, dispatch } = useGame();
  const [saves, setSaves] = useState<(SaveSlot | null)[]>([null, null, null, null, null]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state.isSettingsOpen) {
      loadSaves();
    }
  }, [state.isSettingsOpen]);

  const loadSaves = async () => {
    setIsLoading(true);
    try {
      const savesData = await getAllSaves();
      setSaves(savesData as (SaveSlot | null)[]);
    } catch (e) {
      console.error('Failed to load saves:', e);
    }
    setIsLoading(false);
  };

  const handleSave = async (slot: number) => {
    const saveData = {
      sceneId: state.currentSceneId,
      dialogueIndex: state.dialogueIndex,
      choiceHistory: state.choiceHistory,
      sceneTitle
    };

    const success = await saveGame(slot, saveData);
    if (success) {
      setMessage(`存档 ${slot + 1} 保存成功！`);
      loadSaves();
    } else {
      setMessage('存档失败！');
    }
    setTimeout(() => setMessage(null), 2000);
  };

  const handleLoad = async (slot: number) => {
    const saveData = saves[slot];
    if (!saveData) return;

    const loadedData = await loadGame(slot);
    if (loadedData) {
      dispatch({
        type: 'LOAD_SAVE',
        save: saveData
      });
      setMessage('读档成功！');
      setTimeout(() => {
        setMessage(null);
        dispatch({ type: 'TOGGLE_SETTINGS', open: false });
      }, 1000);
    } else {
      setMessage('读档失败！');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleClose = () => {
    dispatch({ type: 'TOGGLE_SETTINGS', open: false });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!state.isSettingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>游戏设置</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        {message && <div className="settings-message">{message}</div>}

        <div className="saves-section">
          <h3>存档槽位</h3>
          <div className="save-slots">
            {saves.map((save, index) => (
              <div key={index} className="save-slot">
                <div className="slot-number">槽位 {index + 1}</div>
                {save ? (
                  <div className="slot-info">
                    <div className="slot-title">{save.sceneTitle || '未知场景'}</div>
                    <div className="slot-date">{formatDate(save.createdAt)}</div>
                  </div>
                ) : (
                  <div className="slot-empty">空</div>
                )}
                <div className="slot-actions">
                  <button
                    className="slot-btn save-btn"
                    onClick={() => handleSave(index)}
                    disabled={isLoading}
                  >
                    保存
                  </button>
                  <button
                    className="slot-btn load-btn"
                    onClick={() => handleLoad(index)}
                    disabled={isLoading || !save}
                  >
                    读取
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-footer">
          <p>按 ESC 键关闭设置面板</p>
        </div>
      </div>
    </div>
  );
}
