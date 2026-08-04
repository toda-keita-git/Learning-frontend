// ゲストモード（GitHubログイン不要のお試しモード）用のローカル保存。
// バックエンドには一切書き込まず、この端末のlocalStorageだけで完結させる。
// PlanTypes.tsと同じ形にしておくことで、PlanDashboard・各ダイアログ・
// カードコンポーネントを実アカウントと共通のまま再利用できるようにしている。
import type {
  Plan,
  Note,
  NoteTodoItem,
  NoteAttachment,
  CategoryOption,
  PlanInput,
  NoteInput,
} from "./PlanTypes";
import type { PlanDataSource, PlanDataBundle } from "./planDataSource";

// ゲストモードは体験版という位置づけのため件数に上限を設ける
export const GUEST_PLAN_LIMIT = 25;
export const GUEST_NOTE_LIMIT = 30;
export const GUEST_CATEGORY_LIMIT = 10;
export const GUEST_TAG_LIMIT = 20;

const PLANS_KEY = "guestPlans";
const NOTES_KEY = "guestNotes";
const CATEGORIES_KEY = "guestPlanCategories";
const TAGS_KEY = "guestPlanTags";
const SEEDED_KEY = "guestPlanCategoriesSeeded";

const DEFAULT_CATEGORIES = ["仕事", "学業", "プログラミング", "語学", "趣味", "健康・生活"];
const DEFAULT_TAGS = ["メモ", "復習", "重要", "あとで", "JavaScript", "React", "Git"];

let idCounter = 0;
const nextId = () => Date.now() * 1000 + idCounter++;

// localStorageが実際に読み書きできるかを確認する。
// iOS/AndroidのプライベートブラウジングやPCのシークレットウィンドウでは、
// window.localStorage自体は存在してもwrite時に例外が飛ぶ（あるいはブラウザに
// よってはwriteできてもすぐ消える）ことがあるため、値を実際に書き込んで確認する
export function isStorageAvailable(): boolean {
  try {
    const testKey = "__guest_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// 端末・ブラウザの種類を大まかに判定する（案内文の出し分け用途のみ）
export function detectPlatformHint(): "ios" | "android" | "other" {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function load<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, items: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    throw new Error("この端末に保存できませんでした。ストレージの空き容量をご確認ください。");
  }
}

function ensureDefaultCategoriesAndTags(): void {
  try {
    if (window.localStorage.getItem(SEEDED_KEY)) return;
    window.localStorage.setItem(SEEDED_KEY, "1");
    if (load<CategoryOption>(CATEGORIES_KEY).length === 0) {
      save(CATEGORIES_KEY, DEFAULT_CATEGORIES.map((name) => ({ id: nextId(), name })));
    }
    if (load<{ id: number; name: string }>(TAGS_KEY).length === 0) {
      save(TAGS_KEY, DEFAULT_TAGS.map((name) => ({ id: nextId(), name })));
    }
  } catch {
    // 初期化できなくても致命的ではない（空の状態から使い始めるだけ）
  }
}

// ---- 進捗集計（バックエンドのProgressServiceと同じ再帰ルール） ----

function effectiveProgress(note: Note): number | null {
  if (note.type === "learning") return note.mastery;
  if (note.type === "task") {
    if (note.todo_items.length > 0) {
      const checked = note.todo_items.filter((t) => t.checked).length;
      return Math.round((checked / note.todo_items.length) * 100);
    }
    return note.progress;
  }
  return null;
}

function average(values: (number | null)[]): number | null {
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) return null;
  return nonNull.reduce((a, b) => a + b, 0) / nonNull.length;
}

// 末端（葉）から根に向かって再帰的に計算し、各プランにprogressを詰め直す
function withProgress(plans: Plan[], notes: Note[]): Plan[] {
  const notesByPlan = new Map<number, number[]>();
  for (const note of notes) {
    const ep = effectiveProgress(note);
    if (ep === null) continue;
    for (const planId of note.links) {
      const list = notesByPlan.get(planId) ?? [];
      list.push(ep);
      notesByPlan.set(planId, list);
    }
  }
  const childrenByParent = new Map<number | null, Plan[]>();
  for (const plan of plans) {
    const list = childrenByParent.get(plan.parent_id) ?? [];
    list.push(plan);
    childrenByParent.set(plan.parent_id, list);
  }
  const cache = new Map<number, number | null>();
  const compute = (plan: Plan): number | null => {
    if (cache.has(plan.id)) return cache.get(plan.id)!;
    const values: (number | null)[] = [...(notesByPlan.get(plan.id) ?? [])];
    for (const child of childrenByParent.get(plan.id) ?? []) {
      values.push(compute(child));
    }
    const result = average(values);
    cache.set(plan.id, result);
    return result;
  };
  return plans.map((plan) => ({ ...plan, progress: compute(plan) }));
}

// ---- カテゴリー・タグ ----

export function listGuestCategories(): CategoryOption[] {
  ensureDefaultCategoriesAndTags();
  return load<CategoryOption>(CATEGORIES_KEY).sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function listGuestTags(): string[] {
  ensureDefaultCategoriesAndTags();
  return load<{ id: number; name: string }>(TAGS_KEY)
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b, "ja"));
}

function ensureGuestTagsRegistered(tagNames: string[]): string[] {
  const existing = load<{ id: number; name: string }>(TAGS_KEY);
  const existingNames = new Set(existing.map((t) => t.name));
  let current = existing;
  const accepted: string[] = [];
  for (const raw of tagNames) {
    const name = raw.trim().replace(/^#/, "");
    if (!name) continue;
    if (existingNames.has(name)) {
      if (!accepted.includes(name)) accepted.push(name);
      continue;
    }
    if (current.length >= GUEST_TAG_LIMIT) continue;
    current = [...current, { id: nextId(), name }];
    existingNames.add(name);
    accepted.push(name);
  }
  save(TAGS_KEY, current);
  return accepted;
}

// ---- データ本体 ----

function toPlan(id: number, sortOrder: number, data: PlanInput): Plan {
  return {
    id,
    parent_id: data.parent_id,
    title: data.title,
    description: data.description,
    status: data.status,
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
    user_id: 0,
    progress: null,
  };
}

function toNote(id: number, data: NoteInput, tags: string[]): Note {
  const todoItems: NoteTodoItem[] = data.todo_items.map((t, i) => ({
    id: nextId(),
    note_id: id,
    label: t.label,
    checked: t.checked,
    sort_order: i,
  }));
  const attachments: NoteAttachment[] = (data.attachments ?? []).map((a, i) => ({
    ...a,
    id: nextId(),
    note_id: id,
    sort_order: i,
  }));
  return {
    id,
    type: data.type,
    title: data.title,
    body: data.body,
    mastery: data.mastery,
    progress: data.progress,
    category_id: data.category_id,
    created_at: new Date().toISOString(),
    user_id: 0,
    todo_items: todoItems,
    tags,
    links: data.links ?? [],
    attachments,
    effective_progress: null, // fetchAll側で計算し直す
  };
}

export const guestPlanDataSource: PlanDataSource = {
  async fetchAll(): Promise<PlanDataBundle> {
    const rawPlans = load<Plan>(PLANS_KEY);
    const notes = load<Note>(NOTES_KEY).map((n) => ({ ...n, effective_progress: effectiveProgress(n) }));
    const plans = withProgress(rawPlans, notes).sort((a, b) => a.sort_order - b.sort_order);
    return {
      plans,
      notes: notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      categories: listGuestCategories(),
      tagOptions: listGuestTags(),
    };
  },

  async createPlan(data) {
    const plans = load<Plan>(PLANS_KEY);
    if (plans.length >= GUEST_PLAN_LIMIT) {
      throw new Error(`ゲストモードではプランは${GUEST_PLAN_LIMIT}件までです。GitHubでログインすると無制限に作成できます。`);
    }
    const nextSortOrder = Math.max(-1, ...plans.filter((p) => p.parent_id === data.parent_id).map((p) => p.sort_order)) + 1;
    save(PLANS_KEY, [...plans, toPlan(nextId(), nextSortOrder, data)]);
  },

  async updatePlan(id, data) {
    const plans = load<Plan>(PLANS_KEY);
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return;
    plans[index] = { ...plans[index], title: data.title, description: data.description, status: data.status };
    save(PLANS_KEY, plans);
  },

  async reparentPlan(id, parentId) {
    const plans = load<Plan>(PLANS_KEY);
    // 循環参照チェック（自分自身・自分の子孫を新しい親にはできない）
    if (parentId !== null) {
      if (parentId === id) throw new Error("移動先が不正です。");
      const parentById = new Map(plans.map((p) => [p.id, p.parent_id]));
      let cursor: number | null = parentId;
      while (cursor !== null) {
        if (cursor === id) throw new Error("移動先が不正です（循環になります）。");
        cursor = parentById.get(cursor) ?? null;
      }
    }
    const nextSortOrder = Math.max(-1, ...plans.filter((p) => p.parent_id === parentId).map((p) => p.sort_order)) + 1;
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return;
    plans[index] = { ...plans[index], parent_id: parentId, sort_order: nextSortOrder };
    save(PLANS_KEY, plans);
  },

  async reorderPlans(items) {
    const plans = load<Plan>(PLANS_KEY);
    const sortOrderById = new Map(items.map((i) => [i.id, i.sort_order]));
    save(
      PLANS_KEY,
      plans.map((p) => (sortOrderById.has(p.id) ? { ...p, sort_order: sortOrderById.get(p.id)! } : p))
    );
  },

  async deletePlan(id) {
    const plans = load<Plan>(PLANS_KEY);
    const target = plans.find((p) => p.id === id);
    if (!target) return;
    // 子プランは1段繰り上げる（バックエンドのPlanServiceと同じ方針）
    const promoted = plans.map((p) => (p.parent_id === id ? { ...p, parent_id: target.parent_id } : p));
    save(PLANS_KEY, promoted.filter((p) => p.id !== id));
  },

  async createNote(data) {
    const notes = load<Note>(NOTES_KEY);
    if (notes.length >= GUEST_NOTE_LIMIT) {
      throw new Error(`ゲストモードではメモは${GUEST_NOTE_LIMIT}件までです。GitHubでログインすると（フリープランで100件まで）保存できます。`);
    }
    const tags = ensureGuestTagsRegistered(data.tags);
    save(NOTES_KEY, [...notes, toNote(nextId(), data, tags)]);
  },

  async updateNote(id, data) {
    const notes = load<Note>(NOTES_KEY);
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    const tags = ensureGuestTagsRegistered(data.tags);
    const todoItems: NoteTodoItem[] = data.todo_items.map((t, i) => ({
      id: t.id ?? nextId(),
      note_id: id,
      label: t.label,
      checked: t.checked,
      sort_order: i,
    }));
    notes[index] = {
      ...notes[index],
      type: data.type,
      title: data.title,
      body: data.body,
      mastery: data.mastery,
      progress: data.progress,
      category_id: data.category_id,
      todo_items: todoItems,
      tags,
    };
    save(NOTES_KEY, notes);
  },

  async deleteNote(id) {
    save(NOTES_KEY, load<Note>(NOTES_KEY).filter((n) => n.id !== id));
  },

  async linkNote(id, planId) {
    const notes = load<Note>(NOTES_KEY);
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    if (!notes[index].links.includes(planId)) {
      notes[index] = { ...notes[index], links: [...notes[index].links, planId] };
      save(NOTES_KEY, notes);
    }
  },

  async unlinkNote(id, planId) {
    const notes = load<Note>(NOTES_KEY);
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    notes[index] = { ...notes[index], links: notes[index].links.filter((p) => p !== planId) };
    save(NOTES_KEY, notes);
  },

  async toggleNoteTodo(todoItemId, checked) {
    const notes = load<Note>(NOTES_KEY);
    save(
      NOTES_KEY,
      notes.map((n) => ({
        ...n,
        todo_items: n.todo_items.map((t) => (t.id === todoItemId ? { ...t, checked } : t)),
      }))
    );
  },

  async addNoteAttachment(noteId, attachment) {
    const notes = load<Note>(NOTES_KEY);
    const index = notes.findIndex((n) => n.id === noteId);
    if (index === -1) return;
    const newAttachment: NoteAttachment = { ...attachment, id: nextId(), note_id: noteId };
    notes[index] = { ...notes[index], attachments: [...notes[index].attachments, newAttachment] };
    save(NOTES_KEY, notes);
  },

  async deleteNoteAttachment(attachmentId) {
    const notes = load<Note>(NOTES_KEY);
    save(
      NOTES_KEY,
      notes.map((n) => ({ ...n, attachments: n.attachments.filter((a) => a.id !== attachmentId) }))
    );
  },
};

export function hasGuestData(): boolean {
  return load<Plan>(PLANS_KEY).length > 0 || load<Note>(NOTES_KEY).length > 0;
}

export function clearGuestPlanData(): void {
  try {
    window.localStorage.removeItem(PLANS_KEY);
    window.localStorage.removeItem(NOTES_KEY);
    window.localStorage.removeItem(CATEGORIES_KEY);
    window.localStorage.removeItem(TAGS_KEY);
    window.localStorage.removeItem(SEEDED_KEY);
  } catch {
    // 消せなくても致命的ではない
  }
}
