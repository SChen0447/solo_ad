import { Project, Version } from '../types';

const STORAGE_KEY = 'cssnippet_projects';

export function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load projects from localStorage', e);
  }
  return [];
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage', e);
  }
}

export function loadProject(projectId: string): Project | null {
  const projects = loadProjects();
  return projects.find(p => p.id === projectId) || null;
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  saveProjects(projects);
}

export function deleteProject(projectId: string): void {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
}
