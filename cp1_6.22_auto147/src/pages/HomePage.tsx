import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Group, User } from '../types';
import GroupCard from '../components/GroupCard';

interface Props {
  currentUser: User | null;
  onUserUpdate: (u: User) => void;
}

export default function HomePage({ currentUser, onUserUpdate }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.fetchGroups();
        setGroups(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !goal.trim() || !currentUser) return;
    const newGroup = await api.createGroup({
      name: name.trim(),
      goal: goal.trim(),
      leaderId: currentUser.id,
    });
    const all = await api.fetchGroups();
    setGroups(all);
    setShowCreate(false);
    setName('');
    setGoal('');
    if (currentUser) {
      const updated = await api.getUser(currentUser.id);
      onUserUpdate(updated);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>学习小组</h1>
          <p className="page-sub">找到志同道合的伙伴，一起进步！</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + 创建小组
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>创建学习小组</h3>
            <div className="form-group">
              <label>小组名称</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：Python入门训练营"
              />
            </div>
            <div className="form-group">
              <label>学习目标</label>
              <input
                type="text"
                className="input"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="如：21天Python入门"
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate}>创建</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="loading">加载中...</div>}
      {!loading && (
        <div className="grid">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
