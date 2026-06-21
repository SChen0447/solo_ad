import { EventStore, CalendarEvent } from './store';

export class UIManager {
  private modalOverlay: HTMLElement;
  private modal: HTMLElement;
  private modalTitle: HTMLElement;
  private eventInput: HTMLInputElement;
  private saveBtn: HTMLElement;
  private cancelBtn: HTMLElement;
  private tooltip: HTMLElement;
  private monthIndicator: HTMLElement;
  private todayBtn: HTMLElement;

  private store: EventStore;
  private currentDate: string | null = null;
  private onSaveCallback: ((date: string) => void) | null = null;
  private onTodayClick: (() => void) | null = null;

  constructor(store: EventStore) {
    this.store = store;

    this.modalOverlay = document.getElementById('modalOverlay')!;
    this.modal = document.getElementById('modal')!;
    this.modalTitle = document.getElementById('modalTitle')!;
    this.eventInput = document.getElementById('eventInput') as HTMLInputElement;
    this.saveBtn = document.getElementById('saveBtn')!;
    this.cancelBtn = document.getElementById('cancelBtn')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.monthIndicator = document.getElementById('monthIndicator')!;
    this.todayBtn = document.getElementById('todayBtn')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.saveBtn.addEventListener('click', () => this.handleSave());
    this.cancelBtn.addEventListener('click', () => this.hideModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.hideModal();
      }
    });

    this.eventInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSave();
      } else if (e.key === 'Escape') {
        this.hideModal();
      }
    });

    this.todayBtn.addEventListener('click', () => {
      if (this.onTodayClick) {
        this.onTodayClick();
      }
    });
  }

  showModal(date: string): void {
    this.currentDate = date;
    const events = this.store.getEventsForDate(date);

    const dateObj = EventStore.parseDate(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.modalTitle.textContent = `Add Event - ${formattedDate}`;

    if (events.length > 0) {
      this.eventInput.value = events[0].description;
    } else {
      this.eventInput.value = '';
    }

    this.modalOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.modal.classList.add('show');
    });

    setTimeout(() => {
      this.eventInput.focus();
      this.eventInput.select();
    }, 300);
  }

  hideModal(): void {
    this.modal.classList.remove('show');
    setTimeout(() => {
      this.modalOverlay.classList.add('hidden');
      this.currentDate = null;
    }, 300);
  }

  private handleSave(): void {
    if (!this.currentDate) return;

    const description = this.eventInput.value.trim();
    if (!description) {
      const events = this.store.getEventsForDate(this.currentDate);
      if (events.length > 0) {
        this.store.deleteEvent(events[0].id);
      }
    } else {
      const events = this.store.getEventsForDate(this.currentDate);
      if (events.length > 0) {
        this.store.updateEvent(events[0].id, description);
      } else {
        this.store.addEvent(this.currentDate, description);
      }
    }

    if (this.onSaveCallback && this.currentDate) {
      this.onSaveCallback(this.currentDate);
    }

    this.hideModal();
  }

  setOnSave(callback: (date: string) => void): void {
    this.onSaveCallback = callback;
  }

  setOnTodayClick(callback: () => void): void {
    this.onTodayClick = callback;
  }

  updateTooltip(date: string, eventCount: number, x: number, y: number): void {
    const dateObj = EventStore.parseDate(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    this.tooltip.innerHTML = `
      <div class="tooltip-date">${formattedDate}</div>
      <div class="tooltip-count">${eventCount} event${eventCount !== 1 ? 's' : ''}</div>
    `;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y - 45}px`;
    this.tooltip.classList.remove('hidden');
  }

  hideTooltip(): void {
    this.tooltip.classList.add('hidden');
  }

  updateMonthIndicator(month: Date): void {
    const formatted = month.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
    this.monthIndicator.textContent = formatted.toUpperCase();
  }

  getEventsForDate(date: string): CalendarEvent[] {
    return this.store.getEventsForDate(date);
  }
}
