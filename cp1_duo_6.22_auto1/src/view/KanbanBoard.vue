<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useTaskStore, type Task, type TaskStatus, type TaskPriority } from '@/data/taskStore'

const store = useTaskStore()
const editingTaskId = ref<string | null>(null)
const showCreateModal = ref(false)

const draggingTaskId = ref<string | null>(null)
const justPlacedTaskId = ref<string | null>(null)
const columnHoverCount = ref<Record<string, number>>({ todo: 0, in_progress: 0, done: 0 })

const isColumnHovered = (status: TaskStatus) => columnHoverCount.value[status] > 0

const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as TaskPriority,
  estimatedHours: 4,
  assigneeId: store.members[0]?.id ?? 'm1',
})

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: '待办' },
  { key: 'in_progress', label: '进行中' },
  { key: 'done', label: '已完成' },
]

function getTasksByStatus(status: TaskStatus): Task[] {
  return store.tasks.filter(t => t.status === status)
}

function getMember(assigneeId: string) {
  return store.members.find(m => m.id === assigneeId)
}

function priorityStyle(p: TaskPriority) {
  return {
    low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '低' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '中' },
    high: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: '高' },
  }[p]
}

function onDragStart(e: DragEvent, taskId: string) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/task-id', taskId)
  }
  draggingTaskId.value = taskId
  nextTick(() => {
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = '0.8'
      el.style.transform = 'scale(0.95)'
    }
  })
}

function onDragEnd(e: DragEvent) {
  const el = e.currentTarget as HTMLElement
  if (el) {
    el.style.opacity = ''
    el.style.transform = ''
  }
  draggingTaskId.value = null
  columnHoverCount.value = { todo: 0, in_progress: 0, done: 0 }
}

function onDragEnter(e: DragEvent, status: TaskStatus) {
  e.preventDefault()
  columnHoverCount.value[status] = (columnHoverCount.value[status] ?? 0) + 1
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function onDragLeave(e: DragEvent, status: TaskStatus) {
  const count = columnHoverCount.value[status] ?? 0
  if (count > 0) {
    columnHoverCount.value[status] = count - 1
  }
}

function onDrop(e: DragEvent, status: TaskStatus) {
  e.preventDefault()
  columnHoverCount.value[status] = 0
  const taskId = e.dataTransfer?.getData('text/task-id')
  if (!taskId) return

  const success = store.moveTask(taskId, status)
  if (success) {
    justPlacedTaskId.value = taskId
    setTimeout(() => {
      justPlacedTaskId.value = null
    }, 200)
  } else {
    store.pushNotification('该成员同时进行中的任务已达上限（3个）', 'warning')
  }
}

function saveTask(taskId: string, patch: Partial<Task>) {
  store.updateTask(taskId, patch)
  editingTaskId.value = null
}

function deleteTask(taskId: string) {
  store.removeTask(taskId)
}

function handleCreateTask() {
  if (!newTask.value.title.trim()) return
  store.addTask({
    title: newTask.value.title,
    description: newTask.value.description,
    priority: newTask.value.priority,
    estimatedHours: newTask.value.estimatedHours,
    actualHours: 0,
    assigneeId: newTask.value.assigneeId,
    status: 'todo',
  })
  newTask.value = { title: '', description: '', priority: 'medium', estimatedHours: 4, assigneeId: store.members[0]?.id ?? 'm1' }
  showCreateModal.value = false
}
</script>

<template>
  <div class="kanban-wrapper">
    <div class="kanban-header">
      <h2 class="text-xl font-bold text-white tracking-wide">任务看板</h2>
      <button
        class="px-4 py-2 rounded-lg bg-[#e94560] text-white text-sm font-medium hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#e94560]/20"
        @click="showCreateModal = true"
      >
        + 新建任务
      </button>
    </div>

    <div class="kanban-columns">
      <div
        v-for="col in columns"
        :key="col.key"
        class="kanban-column"
        :class="{ 'drag-over': isColumnHovered(col.key) }"
        @dragenter="onDragEnter($event, col.key)"
        @dragover="onDragOver($event)"
        @dragleave="onDragLeave($event, col.key)"
        @drop="onDrop($event, col.key)"
      >
        <div v-if="isColumnHovered(col.key) && draggingTaskId" class="column-highlight"></div>

        <div class="column-header">
          <span class="column-title">{{ col.label }}</span>
          <span class="column-count">{{ getTasksByStatus(col.key).length }}</span>
        </div>

        <div class="column-body">
          <div
            v-for="task in getTasksByStatus(col.key)"
            :key="task.id"
            class="task-card"
            :class="{
              'is-dragging': draggingTaskId === task.id,
              'just-placed': justPlacedTaskId === task.id
            }"
            draggable="true"
            @dragstart="onDragStart($event, task.id)"
            @dragend="onDragEnd($event)"
          >
            <template v-if="editingTaskId === task.id">
              <div class="edit-form">
                <input
                  class="edit-input"
                  :value="task.title"
                  @input="saveTask(task.id, { title: ($event.target as HTMLInputElement).value })"
                  @blur="editingTaskId = null"
                  @keyup.enter="editingTaskId = null"
                  autofocus
                />
                <textarea
                  class="edit-textarea"
                  :value="task.description"
                  @input="saveTask(task.id, { description: ($event.target as HTMLTextAreaElement).value })"
                />
                <div class="edit-row">
                  <select :value="task.priority" @change="saveTask(task.id, { priority: ($event.target as HTMLSelectElement).value as TaskPriority })">
                    <option value="low">低优先级</option>
                    <option value="medium">中优先级</option>
                    <option value="high">高优先级</option>
                  </select>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    class="edit-input-small"
                    :value="task.estimatedHours"
                    @input="saveTask(task.id, { estimatedHours: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <select :value="task.assigneeId" @change="saveTask(task.id, { assigneeId: ($event.target as HTMLSelectElement).value })">
                    <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <button class="delete-btn" @click="deleteTask(task.id)">删除</button>
              </div>
            </template>
            <template v-else>
              <div class="card-top" @dblclick="editingTaskId = task.id">
                <span :class="['priority-tag', priorityStyle(task.priority).bg, priorityStyle(task.priority).text]">
                  {{ priorityStyle(task.priority).label }}
                </span>
                <span class="hours-badge">{{ task.estimatedHours }}h</span>
              </div>
              <h3 class="card-title">{{ task.title }}</h3>
              <p class="card-desc">{{ task.description }}</p>
              <div class="card-footer">
                <div class="avatar" :title="getMember(task.assigneeId)?.name">
                  {{ getMember(task.assigneeId)?.avatar ?? '??' }}
                </div>
                <span class="member-name">{{ getMember(task.assigneeId)?.name }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
        <div class="modal">
          <h3 class="modal-title">新建任务</h3>
          <label class="field-label">标题</label>
          <input v-model="newTask.title" class="edit-input" placeholder="任务标题" />
          <label class="field-label">描述</label>
          <textarea v-model="newTask.description" class="edit-textarea" placeholder="任务描述"></textarea>
          <div class="form-grid">
            <div>
              <label class="field-label">优先级</label>
              <select v-model="newTask.priority" class="edit-input">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div>
              <label class="field-label">预估工时</label>
              <input v-model.number="newTask.estimatedHours" type="number" min="0.5" step="0.5" class="edit-input" />
            </div>
            <div class="col-span-2">
              <label class="field-label">负责人</label>
              <select v-model="newTask.assigneeId" class="edit-input">
                <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showCreateModal = false">取消</button>
            <button class="btn-primary" @click="handleCreateTask">创建</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.kanban-wrapper {
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.kanban-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .kanban-columns {
    grid-template-columns: 1fr;
  }
}

.kanban-column {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
  min-height: 400px;
  transition: background-color 200ms ease, border-color 200ms ease;
  overflow: hidden;
}

.kanban-column.drag-over {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.5);
}

.column-highlight {
  position: absolute;
  inset: 0;
  background: rgba(99, 102, 241, 0.15);
  border: 2px dashed rgba(99, 102, 241, 0.6);
  border-radius: 12px;
  pointer-events: none;
  z-index: 1;
  animation: highlightPulse 1.2s ease-in-out infinite;
}

@keyframes highlightPulse {
  0%, 100% {
    background: rgba(99, 102, 241, 0.1);
  }
  50% {
    background: rgba(99, 102, 241, 0.22);
  }
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  z-index: 2;
}

.column-title {
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.column-count {
  background: rgba(233, 69, 96, 0.15);
  color: #e94560;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.column-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.task-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  cursor: grab;
  transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 2;
  will-change: transform, opacity;
}

.task-card:hover:not(.is-dragging):not(.just-placed) {
  transform: scale(1.02);
  box-shadow: 0 8px 30px rgba(233, 69, 96, 0.15);
  border-color: rgba(233, 69, 96, 0.25);
}

.task-card:active {
  cursor: grabbing;
}

.task-card.is-dragging {
  opacity: 0.8 !important;
  transform: scale(0.95) !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
}

.task-card.just-placed {
  animation: cardPopIn 150ms ease-out forwards;
}

@keyframes cardPopIn {
  0% {
    transform: scale(0.95);
    opacity: 0.9;
  }
  60% {
    transform: scale(1.01);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.priority-tag {
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.hours-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.card-title {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.4;
}

.card-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e94560, #8b5cf6);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-name {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-input,
.edit-textarea,
.edit-form select,
.form-grid select,
.modal input,
.modal select,
.modal textarea {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 200ms ease;
}

.edit-input:focus,
.edit-textarea:focus,
.edit-form select:focus {
  border-color: #e94560;
}

.edit-textarea {
  resize: vertical;
  min-height: 60px;
}

.edit-row {
  display: flex;
  gap: 8px;
}

.edit-row select {
  flex: 1;
}

.edit-input-small {
  width: 70px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
  color: #fff;
  font-size: 13px;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  align-self: flex-start;
  transition: background 200ms ease;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.35);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
  width: 460px;
  max-width: 92vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-title {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
}

.field-label {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-bottom: 6px;
  margin-top: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid .col-span-2 {
  grid-column: span 2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: background 200ms ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-primary {
  background: #e94560;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms ease;
}

.btn-primary:hover {
  background: #f06580;
}
</style>
