import React from 'react';
import { TimelineEvent } from '@/types';
import { formatDateShort } from '@/utils/formatDate';
import { Package, Handshake, CheckCircle, Star, MessageCircle } from 'lucide-react';

const iconMap: Record<TimelineEvent['type'], React.ReactNode> = {
  publish: <Package size={14} color="white" />,
  apply: <MessageCircle size={14} color="white" />,
  approve: <Handshake size={14} color="white" />,
  complete: <CheckCircle size={14} color="white" />,
  confirm: <Star size={14} color="white" />,
};

interface TimelineProps {
  events: TimelineEvent[];
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="relative pl-8">
      <div
        className="absolute left-[7px] top-0 bottom-0"
        style={{ width: '2px', backgroundColor: '#e0e0e0' }}
      />
      {sortedEvents.map((event, index) => (
        <div key={index} className="relative mb-6 last:mb-0">
          <div
            className="absolute -left-8 flex items-center justify-center rounded-full"
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#3498db',
              top: '2px',
            }}
          >
            {iconMap[event.type]}
          </div>
          <div className="ml-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800 text-[14px]">{event.description}</span>
              <span className="text-[14px] text-gray-500">{formatDateShort(event.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
