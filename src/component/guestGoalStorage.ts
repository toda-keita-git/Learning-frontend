// ゲストモード（GitHubログイン不要のお試しモード）用のローカル保存。
// バックエンドには一切書き込まず、この端末のlocalStorageだけで完結させる。
// GoalTypes.tsと同じ形にしておくことで、GoalDashboard・各ダイアログ・
// カードコンポーネントを実アカウントと共通のまま再利用できるようにしている。
import type {
  Goal,
  ActionPlan,
  Note,
  NoteTodoItem,
  CategoryOption,
  GoalInput,
  ActionPlanInput,
  NoteInput,
} from "./GoalTypes";
import type { GoalDataSource, GoalDataBundle } from "./goalDataSource";

// ゲストモードは体験版という位置づけのため件数に上限を設ける
// （フリープラン: 目標は無制限・アクションプラン無制限・メモ100件 よりも少なめ）
export const GUEST_GOAL_LIMIT = 5;
export const GUEST_ACTION_PLAN_LIMIT = 20;
export const GUEST_NOTE_LIMIT = 30;
export const GUEST_CATEGORY_LIMIT = 10;
export const GUEST_TAG_LIMIT = 20;

const GOALS_KEY = "guestGoals";
const ACTION_PLANS_KEY = "guestActionPlans";
const NOTES_KEY = "guestNotes";
const CATEGORIES_KEY = "guestGoalCategories";
const TAGS_KEY = "guestGoalTags";
const SEEDED_KEY = "guestGoalCategoriesSeeded";

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

// 初回だけ、最初から選べるカテゴリー・タグを用意する
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

// ---- 進捗集計（バックエンドのProgressCalculatorと同じルール） ----

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

function withProgress(goals: Goal[], actionPlans: ActionPlan[], notes: Note[]): { goals: Goal[]; actionPlans: ActionPlan[] } {
  const plansWithProgress = actionPlans.map((plan) => ({
    ...plan,
    progress: average(notes.filter((n) => n.action_plan_id === plan.id).map(effectiveProgress)),
  }));
  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    progress: average(plansWithProgress.filter((p) => p.goal_id === goal.id).map((p) => p.progress)),
  }));
  return { goals: goalsWithProgress, actionPlans: plansWithProgress };
}

// ---- カテゴリー・タグ ----

export function listGuestCategories(): CategoryOption[] {
  ensureDefaultCategoriesAndTags();
  return load<CategoryOption>(CATEGORIES_KEY).sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function createGuestCategory(name: string): CategoryOption {
  const trimmed = name.trim();
  const categories = load<CategoryOption>(CATEGORIES_KEY);
  if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())!;
  }
  if (categories.length >= GUEST_CATEGORY_LIMIT) {
    throw new Error(`ゲストモードのカテゴリー上限（${GUEST_CATEGORY_LIMIT}件）に達しています。`);
  }
  const category: CategoryOption = { id: nextId(), name: trimmed };
  save(CATEGORIES_KEY, [...categories, category]);
  return category;
}

export function listGuestTags(): string[] {
  ensureDefaultCategoriesAndTags();
  return load<{ id: number; name: string }>(TAGS_KEY)
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b, "ja"));
}

// メモ保存時、まだ登録されていないタグ名があれば上限内で自動登録する
// （実アプリのnote_insert/updateが行う自動タグ作成と同じ挙動）
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
    if (current.length >= GUEST_TAG_LIMIT) continue; // 上限超過分はスキップ（メモ自体の保存は続行）
    current = [...current, { id: nextId(), name }];
    existingNames.add(name);
    accepted.push(name);
  }
  save(TAGS_KEY, current);
  return accepted;
}

// ---- データ本体 ----

function toGoal(id: number, data: GoalInput): Goal {
  return {
    id,
    title: data.title,
    description: data.description,
    status: data.status,
    created_at: new Date().toISOString(),
    user_id: 0,
    progress: null,
  };
}

function toActionPlan(id: number, priority: number, data: ActionPlanInput): ActionPlan {
  return {
    id,
    goal_id: data.goal_id,
    title: data.title,
    priority,
    status: data.status,
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
  return {
    id,
    action_plan_id: data.action_plan_id,
    type: data.type,
    title: data.title,
    body: data.body,
    mastery: data.mastery,
    progress: data.progress,
    category_id: data.category_id,
    github_path: data.github_path,
    commit_sha: data.commit_sha,
    repo_name: data.repo_name,
    created_at: new Date().toISOString(),
    user_id: 0,
    todo_items: todoItems,
    tags,
    effective_progress: null, // fetchAll側で計算し直す
  };
}

export const guestGoalDataSource: GoalDataSource = {
  async fetchAll(): Promise<GoalDataBundle> {
    const rawGoals = load<Goal>(GOALS_KEY);
    const rawPlans = load<ActionPlan>(ACTION_PLANS_KEY);
    const notes = load<Note>(NOTES_KEY).map((n) => ({ ...n, effective_progress: effectiveProgress(n) }));
    const { goals, actionPlans } = withProgress(rawGoals, rawPlans, notes);
    return {
      goals: goals.sort((a, b) => a.id - b.id),
      actionPlans: actionPlans.sort((a, b) => a.priority - b.priority),
      notes: notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      categories: listGuestCategories(),
      tagOptions: listGuestTags(),
    };
  },

  async createGoal(data) {
    const goals = load<Goal>(GOALS_KEY);
    if (goals.length >= GUEST_GOAL_LIMIT) {
      throw new Error(`ゲストモードでは目標は${GUEST_GOAL_LIMIT}件までです。GitHubでログインすると無制限に作成できます。`);
    }
    save(GOALS_KEY, [...goals, toGoal(nextId(), data)]);
  },

  async updateGoal(id, data) {
    const goals = load<Goal>(GOALS_KEY);
    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) return;
    goals[index] = { ...goals[index], title: data.title, description: data.description, status: data.status };
    save(GOALS_KEY, goals);
  },

  async deleteGoal(id) {
    save(GOALS_KEY, load<Goal>(GOALS_KEY).filter((g) => g.id !== id));
  },

  async createActionPlan(data) {
    const plans = load<ActionPlan>(ACTION_PLANS_KEY);
    if (plans.length >= GUEST_ACTION_PLAN_LIMIT) {
      throw new Error(`ゲストモードではアクションプランは${GUEST_ACTION_PLAN_LIMIT}件までです。GitHubでログインすると無制限に作成できます。`);
    }
    const nextPriority = Math.max(-1, ...plans.filter((p) => p.goal_id === data.goal_id).map((p) => p.priority)) + 1;
    save(ACTION_PLANS_KEY, [...plans, toActionPlan(nextId(), nextPriority, data)]);
  },

  async updateActionPlan(id, data) {
    const plans = load<ActionPlan>(ACTION_PLANS_KEY);
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return;
    plans[index] = { ...plans[index], title: data.title, status: data.status };
    save(ACTION_PLANS_KEY, plans);
  },

  async deleteActionPlan(id) {
    save(ACTION_PLANS_KEY, load<ActionPlan>(ACTION_PLANS_KEY).filter((p) => p.id !== id));
    // 紐づくメモは削除せず未紐付けに戻す（バックエンドのActionPlanServiceと同じ方針）
    const notes = load<Note>(NOTES_KEY).map((n) => (n.action_plan_id === id ? { ...n, action_plan_id: null } : n));
    save(NOTES_KEY, notes);
  },

  async reorderActionPlans(items) {
    const plans = load<ActionPlan>(ACTION_PLANS_KEY);
    const priorityById = new Map(items.map((i) => [i.id, i.priority]));
    save(
      ACTION_PLANS_KEY,
      plans.map((p) => (priorityById.has(p.id) ? { ...p, priority: priorityById.get(p.id)! } : p))
    );
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
      action_plan_id: data.action_plan_id,
      type: data.type,
      title: data.title,
      body: data.body,
      mastery: data.mastery,
      progress: data.progress,
      category_id: data.category_id,
      github_path: data.github_path,
      commit_sha: data.commit_sha,
      repo_name: data.repo_name,
      todo_items: todoItems,
      tags,
    };
    save(NOTES_KEY, notes);
  },

  async deleteNote(id) {
    save(NOTES_KEY, load<Note>(NOTES_KEY).filter((n) => n.id !== id));
  },

  async attachNote(id, actionPlanId) {
    const notes = load<Note>(NOTES_KEY);
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    notes[index] = { ...notes[index], action_plan_id: actionPlanId };
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
};

// 「GitHubでログインする」への案内前などに、この端末にゲストデータが
// 残っているかどうかを判定する
export function hasGuestData(): boolean {
  return load<Goal>(GOALS_KEY).length > 0 || load<Note>(NOTES_KEY).length > 0;
}

// ゲストモードのローカルデータをまるごと消す
export function clearGuestGoalData(): void {
  try {
    window.localStorage.removeItem(GOALS_KEY);
    window.localStorage.removeItem(ACTION_PLANS_KEY);
    window.localStorage.removeItem(NOTES_KEY);
    window.localStorage.removeItem(CATEGORIES_KEY);
    window.localStorage.removeItem(TAGS_KEY);
    window.localStorage.removeItem(SEEDED_KEY);
  } catch {
    // 消せなくても致命的ではない
  }
}
