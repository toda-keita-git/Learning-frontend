// ゲストモード（GitHubログイン不要のお試しモード）用のローカル保存。
// バックエンドには一切書き込まず、この端末のlocalStorageだけで完結させる。
// LearningRecordと同じ形にしておくことで、LearningResultCards等の
// 表示コンポーネントをそのまま再利用できるようにしている。

export type GuestLearningRecord = {
  id: number;
  title: string;
  heading_text: string | null;
  explanatory_text: string;
  understanding_level: number | null;
  reference_url: string | null;
  created_at: string;
  category_name: string;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
  user_id: number;
};

export type GuestCategory = { id: number; name: string };
export type GuestTag = { id: number; name: string };

const DATA_KEY = "guestLearningData";
const CATEGORY_KEY = "guestCategories";
const TAG_KEY = "guestTags";

// ゲストモードは体験版という位置づけのため件数に上限を設ける。
// 0.5GB規模のDB容量的には何万件でも収まるが、そもそも「気軽に試す」
// 用途であり、上限を設けることでGitHub連携への自然な移行も促せる
export const GUEST_RECORD_LIMIT = 30;
// カテゴリー・タグも同様に、新規作成のみを上限でブロックする
// （フリープランの上限（カテゴリー20・タグ50）よりも少なめに設定）
export const GUEST_CATEGORY_LIMIT = 10;
export const GUEST_TAG_LIMIT = 20;

// 初めてゲストモードを使う端末に、最初から選べるカテゴリー・タグをいくつか
// 用意しておく（本登録時にバックエンドが行う初期セット作成と同じ狙い）
const DEFAULT_CATEGORIES = ["仕事", "学業", "プログラミング", "語学", "趣味", "健康・生活"];
const DEFAULT_TAGS = ["メモ", "復習", "重要", "あとで", "JavaScript", "React", "Git"];

// localStorageが実際に読み書きできるかを確認する。
// iOS/AndroidのプライベートブラウジングやPCのシークレットウィンドウでは、
// window.localStorage自体は存在してもwrite時に例外が飛ぶ（あるいはブラウザに
// よってはwriteできてもすぐ消える）ことがあるため、値を実際に書き込んで
// 確認する方式にしている
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

// 端末・ブラウザの種類を大まかに判定する（案内文の出し分け用途のみ。
// 動作の分岐には使わない）
export function detectPlatformHint(): "ios" | "android" | "other" {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function loadAll(): GuestLearningRecord[] {
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(records: GuestLearningRecord[]): boolean {
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function loadCategories(): GuestCategory[] {
  try {
    const raw = window.localStorage.getItem(CATEGORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCategories(categories: GuestCategory[]): boolean {
  try {
    window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
    return true;
  } catch {
    return false;
  }
}

function loadTags(): GuestTag[] {
  try {
    const raw = window.localStorage.getItem(TAG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTags(tags: GuestTag[]): boolean {
  try {
    window.localStorage.setItem(TAG_KEY, JSON.stringify(tags));
    return true;
  } catch {
    return false;
  }
}

// 初回だけ、最初から選べるカテゴリー・タグを用意する（本登録時にバックエンドが
// 行う初期セット作成と同じ狙い）。ユーザーが全部消した後に勝手に復活しないよう、
// 「初期化済みか」を別キーで管理する
const SEEDED_KEY = "guestCategoriesSeeded";
function ensureDefaultCategoriesAndTags(): void {
  try {
    if (window.localStorage.getItem(SEEDED_KEY)) return;
    window.localStorage.setItem(SEEDED_KEY, "1");
    if (loadCategories().length === 0) {
      saveCategories(DEFAULT_CATEGORIES.map((name, i) => ({ id: Date.now() + i, name })));
    }
    if (loadTags().length === 0) {
      saveTags(DEFAULT_TAGS.map((name, i) => ({ id: Date.now() + 1000 + i, name })));
    }
  } catch {
    // 初期化できなくても致命的ではない（空の状態から使い始めるだけ）
  }
}

export function listGuestCategories(): GuestCategory[] {
  ensureDefaultCategoriesAndTags();
  return loadCategories().sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export type CreateGuestCategoryResult =
  | { ok: true; category: GuestCategory }
  | { ok: false; reason: "limit" | "duplicate" | "storage_error" };

export function createGuestCategory(name: string): CreateGuestCategoryResult {
  const trimmed = name.trim();
  const categories = loadCategories();
  if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, reason: "duplicate" };
  }
  if (categories.length >= GUEST_CATEGORY_LIMIT) {
    return { ok: false, reason: "limit" };
  }
  const category: GuestCategory = { id: Date.now(), name: trimmed };
  categories.push(category);
  return saveCategories(categories) ? { ok: true, category } : { ok: false, reason: "storage_error" };
}

// カテゴリー名を変更する。既存の学習記録が持つcategory_nameも新しい名前に追従させる
// （実アプリはcategory_idで参照するため自動で追従するが、ゲストモードは
// バックエンドを持たずcategory_nameを直接保持しているため、ここで明示的に行う）
export function renameGuestCategory(id: number, name: string): boolean {
  const trimmed = name.trim();
  const categories = loadCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return false;
  const oldName = categories[index].name;
  categories[index] = { ...categories[index], name: trimmed };
  if (!saveCategories(categories)) return false;
  if (oldName !== trimmed) {
    const records = loadAll().map((r) =>
      r.category_name === oldName ? { ...r, category_name: trimmed } : r
    );
    saveAll(records);
  }
  return true;
}

// 使用中（そのカテゴリーの学習記録が1件以上ある）場合は削除できない
export function deleteGuestCategory(id: number): { ok: true } | { ok: false; usage: number } {
  const categories = loadCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) return { ok: true };
  const usage = loadAll().filter((r) => r.category_name === category.name).length;
  if (usage > 0) return { ok: false, usage };
  saveCategories(categories.filter((c) => c.id !== id));
  return { ok: true };
}

export function listGuestTags(): GuestTag[] {
  ensureDefaultCategoriesAndTags();
  return loadTags().sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export type CreateGuestTagResult =
  | { ok: true; tag: GuestTag }
  | { ok: false; reason: "limit" | "duplicate" | "storage_error" };

export function createGuestTag(name: string): CreateGuestTagResult {
  const trimmed = name.trim().replace(/^#/, "");
  const tags = loadTags();
  if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, reason: "duplicate" };
  }
  if (tags.length >= GUEST_TAG_LIMIT) {
    return { ok: false, reason: "limit" };
  }
  const tag: GuestTag = { id: Date.now(), name: trimmed };
  tags.push(tag);
  return saveTags(tags) ? { ok: true, tag } : { ok: false, reason: "storage_error" };
}

export function renameGuestTag(id: number, name: string): boolean {
  const trimmed = name.trim().replace(/^#/, "");
  const tags = loadTags();
  const index = tags.findIndex((t) => t.id === id);
  if (index === -1) return false;
  const oldName = tags[index].name;
  tags[index] = { ...tags[index], name: trimmed };
  if (!saveTags(tags)) return false;
  if (oldName !== trimmed) {
    const records = loadAll().map((r) =>
      r.tags.includes(oldName)
        ? { ...r, tags: Array.from(new Set(r.tags.map((t) => (t === oldName ? trimmed : t)))) }
        : r
    );
    saveAll(records);
  }
  return true;
}

// 使用中（そのタグが付いた学習記録が1件以上ある）場合は削除できない
export function deleteGuestTag(id: number): { ok: true } | { ok: false; usage: number } {
  const tags = loadTags();
  const tag = tags.find((t) => t.id === id);
  if (!tag) return { ok: true };
  const usage = loadAll().filter((r) => r.tags.includes(tag.name)).length;
  if (usage > 0) return { ok: false, usage };
  saveTags(tags.filter((t) => t.id !== id));
  return { ok: true };
}

// 学習記録の保存時、まだ登録されていないタグ名があれば上限内で自動登録する
// （実アプリのlearning_insert/updateが行う自動タグ作成と同じ挙動）。
// 上限を超える分は新規タグとして作らず、記録にも付けない（記録自体の保存は妨げない）
export function ensureGuestTagsRegistered(tagNames: string[]): string[] {
  const existing = loadTags();
  const existingNames = new Set(existing.map((t) => t.name));
  let current = existing;
  const accepted: string[] = [];
  for (const rawName of tagNames) {
    const name = rawName.trim().replace(/^#/, "");
    if (!name) continue;
    if (existingNames.has(name)) {
      if (!accepted.includes(name)) accepted.push(name);
      continue;
    }
    if (current.length >= GUEST_TAG_LIMIT) {
      continue; // 上限に達しているため、これ以上の新規タグは付けない
    }
    current = [...current, { id: Date.now() + current.length, name }];
    existingNames.add(name);
    accepted.push(name);
  }
  saveTags(current);
  return accepted;
}

export function listGuestRecords(): GuestLearningRecord[] {
  return loadAll().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export type CreateGuestRecordResult =
  | { ok: true; record: GuestLearningRecord }
  | { ok: false; reason: "limit" | "storage_error" };

// 新規作成。上限に達している場合はreason:"limit"、書き込みに失敗した場合は
// reason:"storage_error"を返す（呼び出し側でそれぞれ異なる案内を出す）
export function createGuestRecord(
  data: Omit<GuestLearningRecord, "id" | "user_id" | "github_path" | "commit_sha">
): CreateGuestRecordResult {
  const records = loadAll();
  if (records.length >= GUEST_RECORD_LIMIT) {
    return { ok: false, reason: "limit" };
  }
  const record: GuestLearningRecord = {
    ...data,
    id: Date.now(),
    user_id: 0,
    github_path: "",
    commit_sha: null,
  };
  records.push(record);
  return saveAll(records) ? { ok: true, record } : { ok: false, reason: "storage_error" };
}

export function updateGuestRecord(
  id: number,
  data: Partial<Omit<GuestLearningRecord, "id" | "user_id" | "github_path" | "commit_sha">>
): boolean {
  const records = loadAll();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return false;
  records[index] = { ...records[index], ...data };
  return saveAll(records);
}

export function deleteGuestRecord(id: number): boolean {
  const records = loadAll().filter((r) => r.id !== id);
  return saveAll(records);
}

// 実アカウントへのインポート完了後など、ゲストモードのローカルデータを
// まるごと消す（次回ゲストモードを使うときは初期セットから再スタートする）
export function clearGuestRecords(): void {
  try {
    window.localStorage.removeItem(DATA_KEY);
    window.localStorage.removeItem(CATEGORY_KEY);
    window.localStorage.removeItem(TAG_KEY);
    window.localStorage.removeItem(SEEDED_KEY);
  } catch {
    // 消せなくても致命的ではない
  }
}
