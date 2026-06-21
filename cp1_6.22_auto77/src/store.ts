import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Project, TimeLog, Tag, ArchiveEntry } from '@/types'
import {
  getProjects,
  saveProjects,
  getTimeLogs,
  saveTimeLogs,
  getTags,
  saveTags,
  getArchives,
  saveArchives,
} from '@/utils/storage'

interface AppState {
  projects: Project[]
  timeLogs: TimeLog[]
  tags: Tag[]
  archives: ArchiveEntry[]
  archivePromptOpen: boolean

  loadData: () => void
  addProject: (name: string, color: string, dailyLimit: number) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addTimeLog: (
    projectId: string,
    date: string,
    subtaskName: string,
    duration: number,
    tagIds: string[]
  ) => void
  deleteTimeLog: (id: string) => void
  addTag: (name: string) => void
  deleteTag: (id: string) => void
  archiveData: (cutoffDate: string) => number
  setArchivePromptOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  timeLogs: [],
  tags: [],
  archives: [],
  archivePromptOpen: false,

  loadData: () => {
    const projects = getProjects()
    const timeLogs = getTimeLogs()
    const tags = getTags()
    const archives = getArchives()
    set({ projects, timeLogs, tags, archives })
  },

  addProject: (name, color, dailyLimit) => {
    const project: Project = {
      id: uuidv4(),
      name,
      color,
      dailyLimit,
      createdAt: new Date().toISOString(),
    }
    const projects = [...get().projects, project]
    saveProjects(projects)
    set({ projects })
  },

  updateProject: (id, updates) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    )
    saveProjects(projects)
    set({ projects })
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id)
    const timeLogs = get().timeLogs.filter((l) => l.projectId !== id)
    saveProjects(projects)
    saveTimeLogs(timeLogs)
    set({ projects, timeLogs })
  },

  addTimeLog: (projectId, date, subtaskName, duration, tagIds) => {
    const log: TimeLog = {
      id: uuidv4(),
      projectId,
      date,
      subtaskName,
      duration,
      tagIds,
      createdAt: new Date().toISOString(),
    }
    const timeLogs = [...get().timeLogs, log]
    saveTimeLogs(timeLogs)
    set({ timeLogs })
  },

  deleteTimeLog: (id) => {
    const timeLogs = get().timeLogs.filter((l) => l.id !== id)
    saveTimeLogs(timeLogs)
    set({ timeLogs })
  },

  addTag: (name) => {
    const tag: Tag = { id: uuidv4(), name }
    const tags = [...get().tags, tag]
    saveTags(tags)
    set({ tags })
  },

  deleteTag: (id) => {
    const tags = get().tags.filter((t) => t.id !== id)
    const timeLogs = get().timeLogs.map((l) => ({
      ...l,
      tagIds: l.tagIds.filter((tid) => tid !== id),
    }))
    saveTags(tags)
    saveTimeLogs(timeLogs)
    set({ tags, timeLogs })
  },

  archiveData: (cutoffDate) => {
    const logs = get().timeLogs
    const projects = get().projects
    const tags = get().tags

    const toArchive = logs.filter((l) => l.date < cutoffDate)
    const toKeep = logs.filter((l) => l.date >= cutoffDate)

    const existingArchives = get().archives
    const newArchives: ArchiveEntry[] = toArchive.map((log) => {
      const project = projects.find((p) => p.id === log.projectId)
      const tagNames = log.tagIds
        .map((tid) => tags.find((t) => t.id === tid)?.name)
        .filter(Boolean) as string[]
      return {
        projectName: project?.name ?? 'Unknown',
        date: log.date,
        subtaskName: log.subtaskName,
        duration: log.duration,
        tags: tagNames,
      }
    })

    const archives = [...existingArchives, ...newArchives]
    saveArchives(archives)
    saveTimeLogs(toKeep)
    set({ timeLogs: toKeep, archives })
    return toArchive.length
  },

  setArchivePromptOpen: (open) => set({ archivePromptOpen: open }),
}))
