<script setup lang="ts">
import { useTaskStore } from '@/data/taskStore'

const store = useTaskStore()
</script>

<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="fade">
        <div
          v-for="n in store.notifications"
          :key="n.id"
          class="notification-item"
          :class="n.type"
        >
          <div class="notif-icon">
            <svg v-if="n.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          </div>
          <span class="notif-text">{{ n.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
  pointer-events: none;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.notification-item.info {
  background: rgba(22, 33, 62, 0.95);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #e0e7ff;
}

.notification-item.warning {
  background: rgba(62, 22, 30, 0.95);
  border: 1px solid rgba(233, 69, 96, 0.35);
  color: #fecdd3;
}

.notif-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-item.warning .notif-icon {
  color: #e94560;
}

.notification-item.info .notif-icon {
  color: #818cf8;
}

.notif-text {
  flex: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 300ms ease, transform 300ms ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.fade-move {
  transition: transform 300ms ease;
}
</style>
