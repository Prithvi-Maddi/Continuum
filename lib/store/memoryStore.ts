import fs from 'fs';
import path from 'path';
import type { WorldState, Entity, CanonFact, TimelineEvent, Branch, CanonSource, Project } from '../types';
import { GOT_WORLD } from '../../seed/world';
import { nanoid } from '../utils';

const DATA_PATH = path.join(process.cwd(), 'data', 'worlds.json');

function loadFromDisk(): Map<string, WorldState> {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as Record<string, WorldState>;
      return new Map(Object.entries(raw));
    }
  } catch (err) {
    console.error('[memoryStore] Failed to load from disk, using seed data:', err);
  }
  return new Map([['proj_got_demo', { ...GOT_WORLD }]]);
}

function saveToDisk(worlds: Map<string, WorldState>): void {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(Object.fromEntries(worlds), null, 2));
  } catch (err) {
    console.error('[memoryStore] Failed to save to disk:', err);
  }
}

function emptyWorld(project: Project): WorldState {
  return { project, entities: [], facts: [], events: [], branches: [], sources: [] };
}

const _worlds = loadFromDisk();

export const memoryStore = {
  getWorld(projectId = 'proj_got_demo'): WorldState {
    return _worlds.get(projectId) ?? emptyWorld({ id: projectId, name: projectId, createdAt: new Date().toISOString() });
  },

  getProjectList(): Array<{ id: string; name: string }> {
    return Array.from(_worlds.values()).map(w => ({ id: w.project.id, name: w.project.name }));
  },

  createProject(name: string): Project {
    const project: Project = { id: `proj_${nanoid()}`, name, createdAt: new Date().toISOString() };
    _worlds.set(project.id, emptyWorld(project));
    saveToDisk(_worlds);
    return project;
  },

  renameProject(id: string, name: string): boolean {
    const w = _worlds.get(id);
    if (!w) return false;
    _worlds.set(id, { ...w, project: { ...w.project, name } });
    saveToDisk(_worlds);
    return true;
  },

  addEntity(projectId: string, e: Entity): void {
    const w = this.getWorld(projectId);
    _worlds.set(projectId, { ...w, entities: [...w.entities, e] });
    saveToDisk(_worlds);
  },

  updateEntity(projectId: string, e: Entity): void {
    const w = this.getWorld(projectId);
    _worlds.set(projectId, { ...w, entities: w.entities.map(x => x.id === e.id ? e : x) });
    saveToDisk(_worlds);
  },

  addFact(projectId: string, f: CanonFact): void {
    const w = this.getWorld(projectId);
    _worlds.set(projectId, { ...w, facts: [...w.facts, f] });
    saveToDisk(_worlds);
  },

  addEvent(projectId: string, evt: TimelineEvent): void {
    const w = this.getWorld(projectId);
    const events = [...w.events, evt].sort((a, b) => a.order - b.order);
    _worlds.set(projectId, { ...w, events });
    saveToDisk(_worlds);
  },

  addBranch(projectId: string, b: Branch): void {
    const w = this.getWorld(projectId);
    _worlds.set(projectId, { ...w, branches: [...w.branches, b] });
    saveToDisk(_worlds);
  },

  addSource(projectId: string, s: CanonSource): void {
    const w = this.getWorld(projectId);
    _worlds.set(projectId, { ...w, sources: [...w.sources, s] });
    saveToDisk(_worlds);
  },

  reset(projectId: string): void {
    if (projectId === 'proj_got_demo') {
      _worlds.set(projectId, { ...GOT_WORLD });
    } else {
      _worlds.delete(projectId);
    }
    saveToDisk(_worlds);
  },
};
