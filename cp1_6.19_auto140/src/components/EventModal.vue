<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { GameEvent } from '@/types/game';
import { useGameState } from '@/composables/useGameState';

const props = defineProps<{
  event: GameEvent;
  result: string | null;
}>();

const emit = defineEmits<{
  result: [message: string];
}>();

const { handlePirateEvent, handleDriftEvent } = useGameState();

const displayedText = ref('');
const isTyping = ref(true);
const showButtons = ref(false);

const eventIcon = computed(() => {
  return props.event.type === 'pirate' ? '☠️' : '📦';
});

function typeText(text: string): void {
  displayedText.value = '';
  isTyping.value = true;
  let index = 0;

  function type(): void {
    if (index < text.length) {
      displayedText.value += text[index];
      index++;
      setTimeout(type, 30);
    } else {
      isTyping.value = false;
      setTimeout(() => {
        showButtons.value = true;
      }, 300);
    }
  }

  type();
}

function handlePay(): void {
  const result = handlePirateEvent('pay');
  emit('result', result.message);
}

function handleFight(): void {
  const result = handlePirateEvent('fight');
  emit('result', result.message);
}

function handleCollect(): void {
  const result = handleDriftEvent();
  emit('result', result.message);
}

onMounted(() => {
  setTimeout(() => {
    typeText(props.event.description);
  }, 300);
});
</script>

<template>
  <div class="modal-overlay" @click.self="">
    <div class="modal-content">
      <div class="modal-icon">{{ eventIcon }}</div>
      <h2 class="modal-title pixel-font">{{ event.title }}</h2>

      <div v-if="!result" class="modal-body">
        <p class="event-description">
          <span v-if="isTyping" class="typewriter-text">{{ displayedText }}</span>
          <span v-else>{{ displayedText }}</span>
        </p>

        <div v-if="showButtons" class="modal-actions">
          <template v-if="event.type === 'pirate'">
            <button class="neon-btn btn-secondary" @click="handlePay">
              💰 支付赎金
            </button>
            <button class="neon-btn btn-danger" @click="handleFight">
              ⚔️ 战斗
            </button>
          </template>
          <template v-else>
            <button class="neon-btn" @click="handleCollect">
              ✋ 收集货物
            </button>
          </template>
        </div>
      </div>

      <div v-else class="modal-body result-body">
        <p class="result-text">{{ result }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: linear-gradient(135deg, rgba(26, 10, 46, 0.98) 0%, rgba(13, 27, 42, 0.98) 100%);
  border: 2px solid var(--color-glass-border);
  border-radius: 20px;
  padding: 40px;
  max-width: 520px;
  width: 90%;
  text-align: center;
  animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 60px rgba(0, 245, 212, 0.2), inset 0 0 30px rgba(0, 187, 249, 0.05);
}

.modal-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: float 2s ease-in-out infinite;
}

.modal-title {
  font-size: 18px;
  color: var(--color-neon-start);
  margin-bottom: 24px;
  letter-spacing: 2px;
}

.modal-body {
  min-height: 100px;
}

.event-description {
  font-size: 16px;
  line-height: 1.8;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
  min-height: 80px;
}

.typewriter-text {
  display: inline-block;
  overflow: hidden;
  white-space: pre-wrap;
  border-right: 3px solid var(--color-neon-start);
  animation: blink 0.75s step-end infinite;
}

.modal-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.neon-btn {
  padding: 14px 32px;
  font-size: 15px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, var(--color-neon-start) 0%, var(--color-neon-end) 100%);
  color: #0d1b2a;
  box-shadow: 0 0 15px rgba(0, 245, 212, 0.4);
}

.neon-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 25px rgba(0, 245, 212, 0.6), 0 0 50px rgba(0, 187, 249, 0.3);
}

.neon-btn:active {
  transform: scale(0.98);
}

.btn-secondary {
  background: linear-gradient(135deg, #ffd166 0%, #ff9f1c 100%);
  box-shadow: 0 0 15px rgba(255, 209, 102, 0.4);
}

.btn-secondary:hover {
  box-shadow: 0 0 25px rgba(255, 209, 102, 0.6);
}

.btn-danger {
  background: linear-gradient(135deg, #e63946 0%, #ff6b6b 100%);
  box-shadow: 0 0 15px rgba(230, 57, 70, 0.4);
}

.btn-danger:hover {
  box-shadow: 0 0 25px rgba(230, 57, 70, 0.6);
}

.result-body {
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-text {
  font-size: 18px;
  color: var(--color-neon-start);
  font-weight: 700;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes blink {
  0%, 100% {
    border-color: transparent;
  }
  50% {
    border-color: var(--color-neon-start);
  }
}
</style>
