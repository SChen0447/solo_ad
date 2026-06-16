import React, { useRef } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { format, parseISO } from 'date-fns';
import { FestivalEvent, Session, Stage } from '../types';
import { emit } from '../utils/eventBus';

interface StageSchedulerProps {
  event: FestivalEvent;
  sessions: Session[];
  stages: Stage[];
  onSessionClick: (session: Session) => void;
  onSessionMoveToStage: (sessionId: string, stageId: string) => void;
  searchQuery: string;
  lockedSessions: Map<string, string>;
  currentUser: string;
}

const formatTime = (session: Session): string => {
  const start = parseISO(session.startTime);
  const end = new Date(start.getTime() + session.duration * 60000);
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
};

interface SessionCardInnerProps {
  session: Session;
  isDragging: boolean;
  isLocked: boolean;
  isHighlighted: boolean;
  dragProvided: any;
  onSessionClick: (session: Session) => void;
  currentUser: string;
}

const SessionCardInner: React.FC<SessionCardInnerProps> = ({
  session,
  isDragging,
  isLocked,
  isHighlighted,
  dragProvided,
  onSessionClick,
  currentUser,
}) => {
  const prevDraggingRef = useRef(false);

  if (isDragging && !prevDraggingRef.current) {
    emit('session_dragging', { sessionId: session.id, username: currentUser });
  }
  if (!isDragging && prevDraggingRef.current) {
    emit('session_drag_end', { sessionId: session.id });
  }
  prevDraggingRef.current = isDragging;

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      {...dragProvided.dragHandleProps}
      className={`session-card${isHighlighted ? ' highlighted' : ''}${isLocked ? ' locked' : ''}`}
      style={{
        borderLeftColor: session.color,
        ...dragProvided.draggableProps.style,
      }}
      onClick={() => onSessionClick(session)}
    >
      <div className="band-name">{session.bandName}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {formatTime(session)}
      </div>
    </div>
  );
};

const StageScheduler: React.FC<StageSchedulerProps> = ({
  sessions,
  stages,
  onSessionClick,
  searchQuery,
  lockedSessions,
  currentUser,
}) => {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const getSessionsForStage = (stageId: string) =>
    sessions
      .filter((s) => s.stageId === stageId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="stage-scheduler">
      <div className="scheduler-header">
        <h3>舞台排期</h3>
      </div>
      <div className="scheduler-columns">
        {sortedStages.map((stage) => {
          const stageSessions = getSessionsForStage(stage.id);
          return (
            <div className="stage-column" key={stage.id}>
              <div className="stage-column-header">
                <div className="stage-name">{stage.name}</div>
                <div className="stage-avail">可用时段: 全天</div>
              </div>
              <Droppable droppableId={`stage-${stage.id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`stage-sessions-list${snapshot.isDraggingOver ? ' dragging-over' : ''}`}
                  >
                    {stageSessions.length === 0 ? (
                      <div className="stage-empty-slot">暂无演出安排</div>
                    ) : (
                      stageSessions.map((session, index) => (
                        <Draggable
                          key={session.id}
                          draggableId={`session-${session.id}`}
                          index={index}
                          isDragDisabled={lockedSessions.has(session.id)}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <SessionCardInner
                              session={session}
                              isDragging={dragSnapshot.isDragging}
                              isLocked={lockedSessions.has(session.id)}
                              isHighlighted={
                                searchQuery !== '' &&
                                session.bandName
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase())
                              }
                              dragProvided={dragProvided}
                              onSessionClick={onSessionClick}
                              currentUser={currentUser}
                            />
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(StageScheduler);
