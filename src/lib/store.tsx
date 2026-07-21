/**
 * Central application store.
 *
 * The single source of truth for every persisted UI concept: projects,
 * builders, assets, templates, snippets, validation, build queue, in-app
 * notifications, activity feed, settings, recents, favorites.
 *
 * Persistence goes through `StorageAdapter` (src/lib/storage-adapter.ts) so
 * Codex can swap localStorage for a native/SQLite/cloud implementation
 * without touching any component.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppNotification,
  AppSettings,
  AppState,
  ActivityEvent,
  Asset,
  Aspiration,
  BuildJob,
  Career,
  ID,
  NotificationTemplate,
  Project,
  ProjectBundle,
  Snippet,
  Template,
  Trait,
  ValidationIssue,
} from "./types";
import { localStorageAdapter, type StorageAdapter } from "./storage-adapter";

const STATE_KEY = "state";
const SCHEMA_VERSION: AppState["version"] = 2;

/* -------------------- Demo seed ---------------------------------------- */

function now(): number {
  return Date.now();
}

function uid(): ID {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const defaultSettings: AppSettings = {
  advancedMode: false,
  theme: "system",
  simsInstallPath: undefined,
  modsFolderPath: undefined,
  autoUpdate: true,
  autosaveIntervalSec: 30,
  confirmBeforeCompile: true,
  showHexIds: false,
  validateOnSave: true,
  crashReports: false,
};

export function makeDemoState(): AppState {
  const projectId = uid();
  const project: Project = {
    id: projectId,
    name: "Demo Project",
    author: "You",
    description: "Built-in demo project — kept as a reference. Duplicate it to make your own.",
    version: "0.1.0",
    status: "draft",
    changelog: [],
    isDemo: true,
    createdAt: now(),
    updatedAt: now(),
    careerIds: [],
    traitIds: [],
    aspirationIds: [],
    notificationIds: [],
    assetIds: [],
    tags: ["demo"],
    favorite: false,
  };
  return {
    version: SCHEMA_VERSION,
    projects: [project],
    activeProjectId: projectId,
    careers: [],
    traits: [],
    aspirations: [],
    notifications: [],
    assets: [],
    templates: [],
    snippets: [],
    validation: [],
    builds: [],
    appNotifications: [],
    activity: [],
    settings: defaultSettings,
    recent: [],
    favorites: [],
  };
}

/* -------------------- Store API ---------------------------------------- */

export interface StoreAPI {
  state: AppState;
  /** Adapter backing this store, for the "Reset Demo Data" action & debug. */
  adapter: StorageAdapter;
  /** Async ready flag — true once initial hydrate finished. */
  hydrated: boolean;

  // Projects
  createProject: (init?: Partial<Project>) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  duplicateProject: (id: ID) => Project | null;
  setActiveProject: (id: ID | undefined) => void;
  /** Change lifecycle status; auto-appends a changelog entry on milestones. */
  setProjectStatus: (id: ID, status: import("./types").ProjectStatus, notes?: string) => void;
  /** Change the version string (user-editable). Optionally attach notes. */
  setProjectVersion: (id: ID, version: string, notes?: string) => void;
  /** Append an arbitrary changelog entry to a project. */
  addChangelogEntry: (id: ID, entry: { version?: string; status?: import("./types").ProjectStatus; notes: string }) => void;


  // Careers
  createCareer: (init: Partial<Career> & { projectId: ID; name: string }) => Career;
  updateCareer: (id: ID, patch: Partial<Career>) => void;
  deleteCareer: (id: ID) => void;
  duplicateCareer: (id: ID) => Career | null;

  // Traits
  createTrait: (init: Partial<Trait> & { projectId: ID; name: string }) => Trait;
  updateTrait: (id: ID, patch: Partial<Trait>) => void;
  deleteTrait: (id: ID) => void;
  duplicateTrait: (id: ID) => Trait | null;

  // Aspirations
  createAspiration: (init: Partial<Aspiration> & { projectId: ID; name: string }) => Aspiration;
  updateAspiration: (id: ID, patch: Partial<Aspiration>) => void;
  deleteAspiration: (id: ID) => void;

  // Notifications templates
  createNotificationTemplate: (init: Partial<NotificationTemplate> & { projectId: ID; name: string }) => NotificationTemplate;
  updateNotificationTemplate: (id: ID, patch: Partial<NotificationTemplate>) => void;
  deleteNotificationTemplate: (id: ID) => void;

  // Assets
  addAsset: (init: Partial<Asset> & { name: string; kind: Asset["kind"]; mimeType: string; sizeBytes: number }) => Asset;
  updateAsset: (id: ID, patch: Partial<Asset>) => void;
  deleteAsset: (id: ID) => void;
  moveAsset: (id: ID, folder: string) => void;

  // Templates
  saveTemplate: (init: Partial<Template> & { name: string; kind: Template["kind"] }) => Template;
  updateTemplate: (id: ID, patch: Partial<Template>) => void;
  deleteTemplate: (id: ID) => void;

  // Snippets
  saveSnippet: (init: Partial<Snippet> & { name: string; body: string }) => Snippet;
  updateSnippet: (id: ID, patch: Partial<Snippet>) => void;
  deleteSnippet: (id: ID) => void;

  // Validation
  addValidationIssue: (issue: Omit<ValidationIssue, "id" | "createdAt" | "dismissed">) => ValidationIssue;
  dismissValidation: (id: ID) => void;
  clearValidation: (scope?: ValidationIssue["scope"]) => void;

  // Build queue
  enqueueBuild: (label: string, projectId: ID) => BuildJob;
  updateBuild: (id: ID, patch: Partial<BuildJob>) => void;
  cancelBuild: (id: ID) => void;
  retryBuild: (id: ID) => void;
  clearBuilds: () => void;

  // In-app notifications
  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => AppNotification;
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: ID) => void;
  clearNotifications: () => void;

  // Activity
  logActivity: (e: Omit<ActivityEvent, "id" | "createdAt">) => void;

  // Favorites & recents
  toggleFavorite: (id: ID) => void;
  markRecent: (id: ID) => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Bundle IO
  exportBundle: (projectId?: ID) => ProjectBundle;
  importBundle: (bundle: ProjectBundle) => Project;

  // Danger zone
  resetDemoData: () => Promise<void>;
}

const StoreContext = createContext<StoreAPI | null>(null);

/* -------------------- Provider ----------------------------------------- */

interface ProviderProps {
  children: React.ReactNode;
  adapter?: StorageAdapter;
}

export function StoreProvider({ children, adapter = localStorageAdapter }: ProviderProps) {
  const [state, setState] = useState<AppState>(() => makeDemoState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initial hydrate
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await adapter.read<AppState>(STATE_KEY);
      if (!alive) return;
      if (saved && saved.version === SCHEMA_VERSION) {
        setState(saved);
      } else if (saved) {
        // schema drift — start fresh but keep demo seed
        setState(makeDemoState());
      }
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, [adapter]);

  // Debounced persistence
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      void adapter.write(STATE_KEY, state);
    }, 250);
    return () => clearTimeout(t);
  }, [state, hydrated, adapter]);

  /* ------------- helpers ------------- */
  const mutate = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => fn(s));
  }, []);

  const log = useCallback((e: Omit<ActivityEvent, "id" | "createdAt">) => {
    mutate((s) => ({
      ...s,
      activity: [{ ...e, id: uid(), createdAt: now() }, ...s.activity].slice(0, 500),
    }));
  }, [mutate]);

  /* ------------- Projects ------------- */

  const createProject: StoreAPI["createProject"] = useCallback((init = {}) => {
    const p: Project = {
      id: uid(),
      name: init.name ?? "New Project",
      author: init.author ?? "You",
      description: init.description ?? "",
      version: init.version ?? "0.1.0",
      status: init.status ?? "draft",
      changelog: init.changelog ?? [],
      isDemo: false,
      createdAt: now(),
      updatedAt: now(),
      careerIds: [],
      traitIds: [],
      aspirationIds: [],
      notificationIds: [],
      assetIds: [],
      tags: init.tags ?? [],
      favorite: false,
    };
    mutate((s) => ({ ...s, projects: [p, ...s.projects], activeProjectId: p.id }));
    log({ kind: "create", entityType: "project", entityId: p.id, summary: `Created project "${p.name}"` });
    return p;
  }, [mutate, log]);

  const updateProject: StoreAPI["updateProject"] = useCallback((id, patch) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p),
    }));
    log({ kind: "update", entityType: "project", entityId: id, summary: `Updated project` });
  }, [mutate, log]);

  const deleteProject: StoreAPI["deleteProject"] = useCallback((id) => {
    // Guard the built-in demo project.
    const target = stateRef.current.projects.find((p) => p.id === id);
    if (target?.isDemo) {
      log({ kind: "update", entityType: "project", entityId: id, summary: `Blocked delete of demo project` });
      return;
    }
    mutate((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      careers: s.careers.filter((c) => c.projectId !== id),
      traits: s.traits.filter((t) => t.projectId !== id),
      aspirations: s.aspirations.filter((a) => a.projectId !== id),
      notifications: s.notifications.filter((n) => n.projectId !== id),
      assets: s.assets.filter((a) => a.projectId !== id),
      activeProjectId: s.activeProjectId === id ? s.projects[0]?.id : s.activeProjectId,
    }));
    log({ kind: "delete", entityType: "project", entityId: id, summary: `Deleted project` });
  }, [mutate, log]);

  const duplicateProject: StoreAPI["duplicateProject"] = useCallback((id) => {
    const src = stateRef.current.projects.find((p) => p.id === id);
    if (!src) return null;
    return createProject({
      name: `${src.name} (copy)`,
      author: src.author,
      description: src.description,
      tags: src.tags,
      version: src.version,
    });
  }, [createProject]);

  const setActiveProject: StoreAPI["setActiveProject"] = useCallback((id) => {
    mutate((s) => ({ ...s, activeProjectId: id }));
  }, [mutate]);

  /**
   * Change a project's lifecycle status. If moving into a terminal state
   * (complete / tested / released) and no changelog entry exists for the
   * current version, one is appended automatically.
   */
  const setProjectStatus = useCallback((id: ID, status: import("./types").ProjectStatus, notes?: string) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== id) return p;
        const isMilestone = status === "complete" || status === "tested" || status === "released";
        const already = p.changelog.some((c) => c.version === p.version && c.status === status);
        const nextChangelog = isMilestone && !already
          ? [{
              id: uid(),
              version: p.version,
              status,
              notes: notes ?? `Marked v${p.version} as ${status}.`,
              createdAt: now(),
              auto: !notes,
            }, ...p.changelog]
          : p.changelog;
        return { ...p, status, changelog: nextChangelog, updatedAt: now() };
      }),
    }));
    log({ kind: "update", entityType: "project", entityId: id, summary: `Set status to ${status}` });
  }, [mutate, log]);

  /**
   * Bump a project's version string. If `notes` is provided, a changelog
   * entry is added for the new version at "in-progress" status.
   */
  const setProjectVersion = useCallback((id: ID, version: string, notes?: string) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== id) return p;
        const entry = notes && notes.trim()
          ? [{ id: uid(), version, status: p.status, notes, createdAt: now() }, ...p.changelog]
          : p.changelog;
        return { ...p, version, changelog: entry, status: "in-progress" as const, updatedAt: now() };
      }),
    }));
    log({ kind: "update", entityType: "project", entityId: id, summary: `Bumped version to ${version}` });
  }, [mutate, log]);

  const addChangelogEntry = useCallback((id: ID, entry: { version?: string; status?: import("./types").ProjectStatus; notes: string }) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          changelog: [{
            id: uid(),
            version: entry.version ?? p.version,
            status: entry.status ?? p.status,
            notes: entry.notes,
            createdAt: now(),
          }, ...p.changelog],
          updatedAt: now(),
        };
      }),
    }));
  }, [mutate]);



  /* ------------- Careers ------------- */

  const createCareer: StoreAPI["createCareer"] = useCallback((init) => {
    const c: Career = {
      id: uid(),
      projectId: init.projectId,
      name: init.name,
      internalId: init.internalId ?? `career_${uid().slice(0, 8)}`,
      description: init.description ?? "",
      careerType: init.careerType ?? "standard",
      ageGates: init.ageGates ?? ["young-adult", "adult"],
      iconAssetId: init.iconAssetId,
      branches: init.branches ?? [],
      messageOverrides: init.messageOverrides ?? [],
      workFromHomeEvents: init.workFromHomeEvents ?? [],
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({
      ...s,
      careers: [c, ...s.careers],
      projects: s.projects.map((p) => p.id === init.projectId ? { ...p, careerIds: [c.id, ...p.careerIds], updatedAt: now() } : p),
    }));
    log({ kind: "create", entityType: "career", entityId: c.id, summary: `Created career "${c.name}"` });
    return c;
  }, [mutate, log]);

  const updateCareer: StoreAPI["updateCareer"] = useCallback((id, patch) => {
    mutate((s) => ({
      ...s,
      careers: s.careers.map((c) => c.id === id ? { ...c, ...patch, updatedAt: now() } : c),
    }));
  }, [mutate]);

  const deleteCareer: StoreAPI["deleteCareer"] = useCallback((id) => {
    mutate((s) => ({
      ...s,
      careers: s.careers.filter((c) => c.id !== id),
      projects: s.projects.map((p) => ({ ...p, careerIds: p.careerIds.filter((cid) => cid !== id) })),
    }));
    log({ kind: "delete", entityType: "career", entityId: id, summary: `Deleted career` });
  }, [mutate, log]);

  const duplicateCareer: StoreAPI["duplicateCareer"] = useCallback((id) => {
    const src = stateRef.current.careers.find((c) => c.id === id);
    if (!src) return null;
    return createCareer({ ...src, name: `${src.name} (copy)`, projectId: src.projectId });
  }, [createCareer]);

  /* ------------- Traits ------------- */

  const createTrait: StoreAPI["createTrait"] = useCallback((init) => {
    const t: Trait = {
      id: uid(),
      projectId: init.projectId,
      name: init.name,
      internalId: init.internalId ?? `trait_${uid().slice(0, 8)}`,
      description: init.description ?? "",
      category: init.category ?? "personality",
      ageGates: init.ageGates ?? ["young-adult", "adult"],
      iconAssetId: init.iconAssetId,
      buffs: init.buffs ?? [],
      socialInteractions: init.socialInteractions ?? [],
      buffReplacements: init.buffReplacements ?? [],
      commodityWeights: init.commodityWeights ?? [],
      blockedAges: init.blockedAges ?? [],
      blockedEmotions: init.blockedEmotions ?? [],
      voiceEffect: init.voiceEffect,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({
      ...s,
      traits: [t, ...s.traits],
      projects: s.projects.map((p) => p.id === init.projectId ? { ...p, traitIds: [t.id, ...p.traitIds], updatedAt: now() } : p),
    }));
    log({ kind: "create", entityType: "trait", entityId: t.id, summary: `Created trait "${t.name}"` });
    return t;
  }, [mutate, log]);

  const updateTrait: StoreAPI["updateTrait"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, traits: s.traits.map((t) => t.id === id ? { ...t, ...patch, updatedAt: now() } : t) }));
  }, [mutate]);

  const deleteTrait: StoreAPI["deleteTrait"] = useCallback((id) => {
    mutate((s) => ({
      ...s,
      traits: s.traits.filter((t) => t.id !== id),
      projects: s.projects.map((p) => ({ ...p, traitIds: p.traitIds.filter((tid) => tid !== id) })),
    }));
    log({ kind: "delete", entityType: "trait", entityId: id, summary: `Deleted trait` });
  }, [mutate, log]);

  const duplicateTrait: StoreAPI["duplicateTrait"] = useCallback((id) => {
    const src = stateRef.current.traits.find((t) => t.id === id);
    if (!src) return null;
    return createTrait({ ...src, name: `${src.name} (copy)`, projectId: src.projectId });
  }, [createTrait]);

  /* ------------- Aspirations ------------- */

  const createAspiration: StoreAPI["createAspiration"] = useCallback((init) => {
    const a: Aspiration = {
      id: uid(),
      projectId: init.projectId,
      name: init.name,
      internalId: init.internalId ?? `aspiration_${uid().slice(0, 8)}`,
      description: init.description ?? "",
      category: init.category ?? "Creative",
      iconAssetId: init.iconAssetId,
      milestones: init.milestones ?? [],
      rewardTraitId: init.rewardTraitId,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({
      ...s,
      aspirations: [a, ...s.aspirations],
      projects: s.projects.map((p) => p.id === init.projectId ? { ...p, aspirationIds: [a.id, ...p.aspirationIds], updatedAt: now() } : p),
    }));
    log({ kind: "create", entityType: "aspiration", entityId: a.id, summary: `Created aspiration "${a.name}"` });
    return a;
  }, [mutate, log]);

  const updateAspiration: StoreAPI["updateAspiration"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, aspirations: s.aspirations.map((a) => a.id === id ? { ...a, ...patch, updatedAt: now() } : a) }));
  }, [mutate]);

  const deleteAspiration: StoreAPI["deleteAspiration"] = useCallback((id) => {
    mutate((s) => ({
      ...s,
      aspirations: s.aspirations.filter((a) => a.id !== id),
      projects: s.projects.map((p) => ({ ...p, aspirationIds: p.aspirationIds.filter((aid) => aid !== id) })),
    }));
    log({ kind: "delete", entityType: "aspiration", entityId: id, summary: `Deleted aspiration` });
  }, [mutate, log]);

  /* ------------- Notification templates ------------- */

  const createNotificationTemplate: StoreAPI["createNotificationTemplate"] = useCallback((init) => {
    const n: NotificationTemplate = {
      id: uid(),
      projectId: init.projectId,
      name: init.name,
      visual: init.visual ?? "toast",
      title: init.title ?? init.name,
      body: init.body ?? "",
      iconAssetId: init.iconAssetId,
      actions: init.actions ?? [],
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({
      ...s,
      notifications: [n, ...s.notifications],
      projects: s.projects.map((p) => p.id === init.projectId ? { ...p, notificationIds: [n.id, ...p.notificationIds], updatedAt: now() } : p),
    }));
    return n;
  }, [mutate]);

  const updateNotificationTemplate: StoreAPI["updateNotificationTemplate"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, ...patch, updatedAt: now() } : n) }));
  }, [mutate]);

  const deleteNotificationTemplate: StoreAPI["deleteNotificationTemplate"] = useCallback((id) => {
    mutate((s) => ({
      ...s,
      notifications: s.notifications.filter((n) => n.id !== id),
      projects: s.projects.map((p) => ({ ...p, notificationIds: p.notificationIds.filter((nid) => nid !== id) })),
    }));
  }, [mutate]);

  /* ------------- Assets ------------- */

  const addAsset: StoreAPI["addAsset"] = useCallback((init) => {
    const a: Asset = {
      id: uid(),
      projectId: init.projectId,
      name: init.name,
      folder: init.folder ?? "/",
      kind: init.kind,
      dataUrl: init.dataUrl,
      filePath: init.filePath,
      mimeType: init.mimeType,
      sizeBytes: init.sizeBytes,
      width: init.width,
      height: init.height,
      tags: init.tags ?? [],
      favorite: init.favorite ?? false,
      source: init.source ?? "upload",
      createdAt: now(),
    };
    mutate((s) => ({
      ...s,
      assets: [a, ...s.assets],
      projects: init.projectId
        ? s.projects.map((p) => p.id === init.projectId ? { ...p, assetIds: [a.id, ...p.assetIds], updatedAt: now() } : p)
        : s.projects,
    }));
    return a;
  }, [mutate]);

  const updateAsset: StoreAPI["updateAsset"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, assets: s.assets.map((a) => a.id === id ? { ...a, ...patch } : a) }));
  }, [mutate]);

  const deleteAsset: StoreAPI["deleteAsset"] = useCallback((id) => {
    mutate((s) => ({
      ...s,
      assets: s.assets.filter((a) => a.id !== id),
      projects: s.projects.map((p) => ({ ...p, assetIds: p.assetIds.filter((aid) => aid !== id) })),
    }));
  }, [mutate]);

  const moveAsset: StoreAPI["moveAsset"] = useCallback((id, folder) => {
    mutate((s) => ({ ...s, assets: s.assets.map((a) => a.id === id ? { ...a, folder } : a) }));
  }, [mutate]);

  /* ------------- Templates ------------- */

  const saveTemplate: StoreAPI["saveTemplate"] = useCallback((init) => {
    const t: Template = {
      id: uid(),
      name: init.name,
      kind: init.kind,
      author: init.author ?? "You",
      summary: init.summary ?? "",
      official: false,
      custom: true,
      payload: init.payload ?? null,
      rating: 0,
      installs: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({ ...s, templates: [t, ...s.templates] }));
    return t;
  }, [mutate]);

  const updateTemplate: StoreAPI["updateTemplate"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, templates: s.templates.map((t) => t.id === id ? { ...t, ...patch, updatedAt: now() } : t) }));
  }, [mutate]);

  const deleteTemplate: StoreAPI["deleteTemplate"] = useCallback((id) => {
    mutate((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) }));
  }, [mutate]);

  /* ------------- Snippets ------------- */

  const saveSnippet: StoreAPI["saveSnippet"] = useCallback((init) => {
    const s: Snippet = {
      id: uid(),
      name: init.name,
      category: init.category ?? "General",
      language: init.language ?? "xml",
      body: init.body,
      tags: init.tags ?? [],
      favorite: init.favorite ?? false,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((prev) => ({ ...prev, snippets: [s, ...prev.snippets] }));
    return s;
  }, [mutate]);

  const updateSnippet: StoreAPI["updateSnippet"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, snippets: s.snippets.map((x) => x.id === id ? { ...x, ...patch, updatedAt: now() } : x) }));
  }, [mutate]);

  const deleteSnippet: StoreAPI["deleteSnippet"] = useCallback((id) => {
    mutate((s) => ({ ...s, snippets: s.snippets.filter((x) => x.id !== id) }));
  }, [mutate]);

  /* ------------- Validation ------------- */

  const addValidationIssue: StoreAPI["addValidationIssue"] = useCallback((issue) => {
    const v: ValidationIssue = { ...issue, id: uid(), createdAt: now(), dismissed: false };
    mutate((s) => ({ ...s, validation: [v, ...s.validation] }));
    return v;
  }, [mutate]);

  const dismissValidation: StoreAPI["dismissValidation"] = useCallback((id) => {
    mutate((s) => ({ ...s, validation: s.validation.map((v) => v.id === id ? { ...v, dismissed: true } : v) }));
  }, [mutate]);

  const clearValidation: StoreAPI["clearValidation"] = useCallback((scope) => {
    mutate((s) => ({ ...s, validation: scope ? s.validation.filter((v) => v.scope !== scope) : [] }));
  }, [mutate]);

  /* ------------- Builds ------------- */

  const enqueueBuild: StoreAPI["enqueueBuild"] = useCallback((label, projectId) => {
    const b: BuildJob = { id: uid(), projectId, label, status: "queued", progress: 0, log: [] };
    mutate((s) => ({ ...s, builds: [b, ...s.builds] }));
    return b;
  }, [mutate]);

  const updateBuild: StoreAPI["updateBuild"] = useCallback((id, patch) => {
    mutate((s) => ({ ...s, builds: s.builds.map((b) => b.id === id ? { ...b, ...patch } : b) }));
  }, [mutate]);

  const cancelBuild: StoreAPI["cancelBuild"] = useCallback((id) => {
    mutate((s) => ({ ...s, builds: s.builds.map((b) => b.id === id && (b.status === "queued" || b.status === "running") ? { ...b, status: "cancelled", finishedAt: now() } : b) }));
  }, [mutate]);

  const retryBuild: StoreAPI["retryBuild"] = useCallback((id) => {
    mutate((s) => ({ ...s, builds: s.builds.map((b) => b.id === id ? { ...b, status: "queued", progress: 0, error: undefined, log: [] } : b) }));
  }, [mutate]);

  const clearBuilds: StoreAPI["clearBuilds"] = useCallback(() => {
    mutate((s) => ({ ...s, builds: s.builds.filter((b) => b.status === "running") }));
  }, [mutate]);

  /* ------------- In-app notifications ------------- */

  const pushNotification: StoreAPI["pushNotification"] = useCallback((n) => {
    const full: AppNotification = { ...n, id: uid(), createdAt: now(), read: false };
    mutate((s) => ({ ...s, appNotifications: [full, ...s.appNotifications].slice(0, 200) }));
    return full;
  }, [mutate]);

  const markNotificationRead: StoreAPI["markNotificationRead"] = useCallback((id) => {
    mutate((s) => ({ ...s, appNotifications: s.appNotifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
  }, [mutate]);

  const markAllNotificationsRead: StoreAPI["markAllNotificationsRead"] = useCallback(() => {
    mutate((s) => ({ ...s, appNotifications: s.appNotifications.map((n) => ({ ...n, read: true })) }));
  }, [mutate]);

  const dismissNotification: StoreAPI["dismissNotification"] = useCallback((id) => {
    mutate((s) => ({ ...s, appNotifications: s.appNotifications.filter((n) => n.id !== id) }));
  }, [mutate]);

  const clearNotifications: StoreAPI["clearNotifications"] = useCallback(() => {
    mutate((s) => ({ ...s, appNotifications: [] }));
  }, [mutate]);

  /* ------------- Favorites / recents / settings ------------- */

  const toggleFavorite: StoreAPI["toggleFavorite"] = useCallback((id) => {
    mutate((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites] }));
  }, [mutate]);

  const markRecent: StoreAPI["markRecent"] = useCallback((id) => {
    mutate((s) => ({ ...s, recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 20) }));
  }, [mutate]);

  const updateSettings: StoreAPI["updateSettings"] = useCallback((patch) => {
    mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, [mutate]);

  /* ------------- Bundle IO ------------- */

  const exportBundle: StoreAPI["exportBundle"] = useCallback((projectId) => {
    const s = stateRef.current;
    const pid = projectId ?? s.activeProjectId;
    const project = s.projects.find((p) => p.id === pid) ?? s.projects[0];
    const scope = <T extends { projectId?: ID }>(rows: T[]) => rows.filter((r) => r.projectId === project.id);
    const bundle: ProjectBundle = {
      version: 2,
      exportedAt: now(),
      exportedFrom: "web",
      project,
      careers: scope(s.careers) as Career[],
      traits: scope(s.traits) as Trait[],
      aspirations: scope(s.aspirations) as Aspiration[],
      notifications: scope(s.notifications) as NotificationTemplate[],
      assets: scope(s.assets) as Asset[],
      templates: s.templates.filter((t) => t.custom),
      snippets: s.snippets,
    };
    log({ kind: "export", entityType: "project", entityId: project.id, summary: `Exported bundle for "${project.name}"` });
    return bundle;
  }, [log]);

  const importBundle: StoreAPI["importBundle"] = useCallback((bundle) => {
    const newProjectId = uid();
    const remap = new Map<ID, ID>();
    remap.set(bundle.project.id, newProjectId);
    const cloneRow = <T extends { id: ID; projectId?: ID }>(r: T): T => {
      const id = uid();
      remap.set(r.id, id);
      return { ...r, id, projectId: r.projectId ? newProjectId : undefined };
    };
    const importedProject: Project = {
      ...bundle.project,
      id: newProjectId,
      name: `${bundle.project.name} (imported)`,
      version: bundle.project.version ?? "0.1.0",
      status: bundle.project.status ?? "draft",
      changelog: bundle.project.changelog ?? [],
      isDemo: false,
      createdAt: now(),
      updatedAt: now(),
    };
    const importedCareers = bundle.careers.map(cloneRow);
    const importedTraits = bundle.traits.map(cloneRow);
    const importedAspirations = bundle.aspirations.map(cloneRow);
    const importedNotifications = bundle.notifications.map(cloneRow);
    const importedAssets = bundle.assets.map(cloneRow);
    importedProject.careerIds = importedCareers.map((c) => c.id);
    importedProject.traitIds = importedTraits.map((t) => t.id);
    importedProject.aspirationIds = importedAspirations.map((a) => a.id);
    importedProject.notificationIds = importedNotifications.map((n) => n.id);
    importedProject.assetIds = importedAssets.map((a) => a.id);

    mutate((s) => ({
      ...s,
      projects: [importedProject, ...s.projects],
      careers: [...importedCareers, ...s.careers],
      traits: [...importedTraits, ...s.traits],
      aspirations: [...importedAspirations, ...s.aspirations],
      notifications: [...importedNotifications, ...s.notifications],
      assets: [...importedAssets, ...s.assets],
      activeProjectId: newProjectId,
    }));
    log({ kind: "import", entityType: "project", entityId: newProjectId, summary: `Imported "${importedProject.name}"` });
    return importedProject;
  }, [mutate, log]);

  /* ------------- Reset ------------- */

  const resetDemoData: StoreAPI["resetDemoData"] = useCallback(async () => {
    await adapter.clear();
    setState(makeDemoState());
  }, [adapter]);

  const api = useMemo<StoreAPI>(() => ({
    state,
    adapter,
    hydrated,
    createProject, updateProject, deleteProject, duplicateProject, setActiveProject,
    setProjectStatus, setProjectVersion, addChangelogEntry,
    createCareer, updateCareer, deleteCareer, duplicateCareer,
    createTrait, updateTrait, deleteTrait, duplicateTrait,
    createAspiration, updateAspiration, deleteAspiration,
    createNotificationTemplate, updateNotificationTemplate, deleteNotificationTemplate,
    addAsset, updateAsset, deleteAsset, moveAsset,
    saveTemplate, updateTemplate, deleteTemplate,
    saveSnippet, updateSnippet, deleteSnippet,
    addValidationIssue, dismissValidation, clearValidation,
    enqueueBuild, updateBuild, cancelBuild, retryBuild, clearBuilds,
    pushNotification, markNotificationRead, markAllNotificationsRead, dismissNotification, clearNotifications,
    logActivity: log,
    toggleFavorite, markRecent,
    updateSettings,
    exportBundle, importBundle,
    resetDemoData,
  }), [
    state, adapter, hydrated,
    createProject, updateProject, deleteProject, duplicateProject, setActiveProject,
    setProjectStatus, setProjectVersion, addChangelogEntry,
    createCareer, updateCareer, deleteCareer, duplicateCareer,
    createTrait, updateTrait, deleteTrait, duplicateTrait,
    createAspiration, updateAspiration, deleteAspiration,
    createNotificationTemplate, updateNotificationTemplate, deleteNotificationTemplate,
    addAsset, updateAsset, deleteAsset, moveAsset,
    saveTemplate, updateTemplate, deleteTemplate,
    saveSnippet, updateSnippet, deleteSnippet,
    addValidationIssue, dismissValidation, clearValidation,
    enqueueBuild, updateBuild, cancelBuild, retryBuild, clearBuilds,
    pushNotification, markNotificationRead, markAllNotificationsRead, dismissNotification, clearNotifications,
    log,
    toggleFavorite, markRecent,
    updateSettings,
    exportBundle, importBundle,
    resetDemoData,
  ]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreAPI {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Convenience: current active project or the first one. */
export function useActiveProject(): Project | undefined {
  const { state } = useStore();
  return state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0];
}

/** Download a bundle as a .mcbundle.json file. */
export function downloadBundle(bundle: ProjectBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bundle.project.name.replace(/\s+/g, "_") || "project"}.mcbundle.json`;
  a.click();
  URL.revokeObjectURL(url);
}
