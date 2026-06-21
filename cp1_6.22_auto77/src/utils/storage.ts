import type { Project, TimeLog, Tag, ArchiveEntry } from '@/types'

const KEYS = {
  projects: 'timetracker_projects',
  logs: 'timetracker_logs',
  tags: 'timetracker_tags',
  archives: 'timetracker_archives',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('localStorage write failed', e)
  }
}

export function getProjects(): Project[] {
  return read<Project[]>(KEYS.projects, [])
}

export function saveProjects(projects: Project[]): void {
  write(KEYS.projects, projects)
}

export function getTimeLogs(): TimeLog[] {
  return read<TimeLog[]>(KEYS.logs, [])
}

export function saveTimeLogs(logs: TimeLog[]): void {
  write(KEYS.logs, logs)
}

export function getTags(): Tag[] {
  return read<Tag[]>(KEYS.tags, [])
}

export function saveTags(tags: Tag[]): void {
  write(KEYS.tags, tags)
}

export function getArchives(): ArchiveEntry[] {
  return read<ArchiveEntry[]>(KEYS.archives, [])
}

export function saveArchives(archives: ArchiveEntry[]): void {
  write(KEYS.archives, archives)
}

export function hasOldLogs(thresholdDays: number = 7): boolean {
  const logs = getTimeLogs()
  if (logs.length === 0) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - thresholdDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return logs.some((log) => log.date < cutoffStr)
}

export function archiveOldData(cutoffDate: string): number {
  const logs = getTimeLogs()
  const projects = getProjects()
  const tags = getTags()

  const toArchive = logs.filter((log) => log.date < cutoffDate)
  const toKeep = logs.filter((log) => log.date >= cutoffDate)

  const archives = getArchives()
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

  saveArchives([...archives, ...newArchives])
  saveTimeLogs(toKeep)

  const usedProjectIds = new Set(toKeep.map((l) => l.projectId))
  const orphanProjects = projects.filter(
    (p) => !usedProjectIds.has(p.id) && toArchive.some((a) => a.projectId === p.id)
  )

  if (orphanProjects.length > 0 && toKeep.length === 0) {
    saveProjects(
      projects.filter((p) => !orphanProjects.some((op) => op.id === p.id))
    )
  }

  return toArchive.length
}

export function getDayTotalForProject(
  projectId: string,
  date: string,
  logs: TimeLog[]
): number {
  return logs
    .filter((l) => l.projectId === projectId && l.date === date)
    .reduce((sum, l) => sum + l.duration, 0)
}
