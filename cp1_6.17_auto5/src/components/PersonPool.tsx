import React, { useState } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { Person, RosterData } from '../types';
import { getPersonStats } from '../utils/validator';

interface PersonPoolProps {
  people: Person[];
  roster: RosterData;
}

const PersonPool: React.FC<PersonPoolProps> = ({ people, roster }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availablePeople = filteredPeople.filter(person => {
    const stats = getPersonStats(person.id, roster);
    return stats.days < person.maxDaysPerWeek;
  });

  const unavailablePeople = filteredPeople.filter(person => {
    const stats = getPersonStats(person.id, roster);
    return stats.days >= person.maxDaysPerWeek;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
      <h3 style={styles.title}>人员池</h3>
      <input
        type="text"
        placeholder="搜索人员..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={styles.searchInput}
      />
    </div>

      <div style={styles.section}>
      <div style={styles.sectionTitle}>可排班 ({availablePeople.length})</div>
      <Droppable droppableId="person-pool" isDropDisabled={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={styles.personList}
          >
            {availablePeople.map((person, index) => (
              <Draggable key={person.id} draggableId={`person-${person.id}`} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    ...styles.personCard,
                    ...provided.draggableProps.style,
                    opacity: snapshot.isDragging ? 0.8 : 1,
                    transform: snapshot.isDragging ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: snapshot.isDragging ? '0 8px 25px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  <div style={styles.personAvatar}>{person.name.charAt(0)}</div>
                  <div style={styles.personInfo}>
                    <div style={styles.personName}>{person.name}</div>
                    <div style={styles.personStats}>
                      {getPersonStats(person.id, roster).days}/{person.maxDaysPerWeek} 天
                      {person.maxNightDaysPerWeek > 0 && (
                        <span style={styles.nightStat}>
                          {' '}· {getPersonStats(person.id, roster).nightDays}/{person.maxNightDaysPerWeek} 夜
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {availablePeople.length === 0 && (
        <div style={styles.emptyText}>暂无可用人员</div>
      )}
    </div>

      {unavailablePeople.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>已排满 ({unavailablePeople.length})</div>
          <div style={styles.personList}>
            {unavailablePeople.map((person) => (
              <div
                key={person.id}
                style={{
                  ...styles.personCard,
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
              >
                <div style={styles.personAvatar}>{person.name.charAt(0)}</div>
                <div style={styles.personInfo}>
                  <div style={styles.personName}>{person.name}</div>
                  <div style={styles.personStats}>
                    {getPersonStats(person.id, roster).days}/{person.maxDaysPerWeek} 天
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '280px',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    height: 'fit-content',
    position: 'sticky' as const,
    top: '20px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a365d',
    margin: 0,
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#718096',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  personList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    minHeight: '50px',
  },
  personCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none' as const,
    cursor: 'grab',
  },
  personAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4299e1, #2b6cb0)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  personInfo: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#2d3748',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  personStats: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  nightStat: {
    color: '#9f7aea',
  },
  emptyText: {
    fontSize: '13px',
    color: '#a0aec0',
    textAlign: 'center' as const,
    padding: '12px',
  },
};

export default PersonPool;
