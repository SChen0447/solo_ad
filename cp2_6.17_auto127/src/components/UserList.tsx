import React, { useState } from 'react';
import { User } from '../types';

interface UserListProps {
  users: User[];
  currentUserId: string;
}

const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '-8px' }}>
      {users.map((user, index) => (
        <div
          key={user.id}
          style={{
            position: 'relative',
            marginLeft: index === 0 ? 0 : '-12px',
            zIndex: hoveredUserId === user.id ? 10 : users.length - index
          }}
          onMouseEnter={() => setHoveredUserId(user.id)}
          onMouseLeave={() => setHoveredUserId(null)}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: user.color,
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s',
              transform: hoveredUserId === user.id ? 'scale(1.2)' : 'scale(1)'
            }}
          >
            {user.nickname.charAt(0).toUpperCase()}
          </div>
          
          {hoveredUserId === user.id && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1f2937',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              {user.nickname}
              {user.id === currentUserId && ' (你)'}
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '6px solid transparent',
                borderTopColor: '#1f2937'
              }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UserList;
