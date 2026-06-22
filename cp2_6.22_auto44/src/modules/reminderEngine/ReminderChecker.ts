import { dataStore } from '../../shared/dataStore'
import { eventBus } from '../../shared/eventBus'

class ReminderCheckerClass {
  private intervalId: number | null = null
  private readonly CHECK_INTERVAL = 10000

  start(): void {
    if (this.intervalId !== null) return
    this.checkDue()
    this.intervalId = window.setInterval(() => this.checkDue(), this.CHECK_INTERVAL)
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private checkDue(): void {
    const dueCapsules = dataStore.getDueCapsules()
    dueCapsules.forEach((capsule) => {
      eventBus.emit('capsule-due', capsule)
    })
  }
}

export const reminderChecker = new ReminderCheckerClass()
