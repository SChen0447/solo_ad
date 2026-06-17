import React from 'react';
import type { Member } from '../hooks/useRoomData';

interface Props {
  members: Member[];
  selectedMemberId: string | null;
  onSelect: (id: string) => void;
}

const COLOR_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f97316',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#06b6d4',
  '#a855f7',
];

const getColorForCode = (code: string): string => {
  const num = parseInt(code, 10) || 0;
  return COLOR_PALETTE[num % COLOR_PALETTE.length];
};

const MemberList: React.FC<Props> = ({ members, selectedMemberId, onSelect }) => {
  return (
    <aside className="member-list">
      <div className="member-list__header">
        <span className="member-list__title">团队成员</span>
        <span className="member-list__count">{members.length}</span>
      </div>
      <div className="member-list__scroll">
        {members.map((member) => {
          const active = selectedMemberId === member.id;
          return (
            <div
              key={member.id}
              className={`member-item${active ? ' member-item--selected' : ''}`}
              onClick={() => onSelect(member.id)}
            >
              <div
                className="member-item__avatar"
                style={{ background: getColorForCode(member.code) }}
              >
                {member.name.slice(0, 1)}
              </div>
              <div className="member-item__body">
                <div className="member-item__name">{member.name}</div>
                <div className="member-item__code">#{member.code}</div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default MemberList;
