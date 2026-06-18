import type { TrackingEvent, ImpressionEvent, ClickEvent } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const RETRY_INTERVAL = 30000;
const MAX_RETRIES = 3;
const BATCH_SIZE = 20;

interface QueuedEvent {
  event: TrackingEvent;
  retries: number;
}

class Tracker {
  private queue: QueuedEvent[] = [];
  private sessionId: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isSending = false;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startRetryLoop();
  }

  private getOrCreateSessionId(): string {
    let sid = localStorage.getItem('popup_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('popup_session_id', sid);
    }
    return sid;
  }

  private startRetryLoop(): void {
    this.timer = setInterval(() => {
      this.flushQueue();
    }, RETRY_INTERVAL);
  }

  public trackImpression(ruleId: string): void {
    const event: ImpressionEvent = {
      id: uuidv4(),
      ruleId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type: 'impression'
    };
    this.enqueue(event);
  }

  public trackClick(ruleId: string): void {
    const event: ClickEvent = {
      id: uuidv4(),
      ruleId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type: 'click'
    };
    this.enqueue(event);
  }

  private enqueue(event: TrackingEvent): void {
    this.queue.push({ event, retries: 0 });
    this.flushQueue();
  }

  private async flushQueue(): Promise<void> {
    if (this.isSending || this.queue.length === 0) return;
    this.isSending = true;

    const batch = this.queue.splice(0, BATCH_SIZE);
    const events = batch.map((b) => b.event);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const remaining = batch.filter((b) => {
        b.retries++;
        return b.retries < MAX_RETRIES;
      });
      this.queue.unshift(...remaining);
    } finally {
      this.isSending = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.flushQueue(), 0);
      }
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const tracker = new Tracker();
export default Tracker;
