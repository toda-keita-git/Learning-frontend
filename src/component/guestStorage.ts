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

const DATA_KEY = "guestLearningData";

// ゲストモードは体験版という位置づけのため件数に上限を設ける。
// 0.5GB規模のDB容量的には何万件でも収まるが、そもそも「気軽に試す」
// 用途であり、上限を設けることでGitHub連携への自然な移行も促せる
export const GUEST_RECORD_LIMIT = 30;

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

// 既存レコードから、そのときまでに使われたタグの一覧を作る
// （カテゴリー・タグ管理機能を持たないゲストモードでは、入力履歴だけを候補にする）
export function extractGuestTags(records: GuestLearningRecord[]): string[] {
  const set = new Set<string>();
  records.forEach((r) => r.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

export function clearGuestRecords(): void {
  try {
    window.localStorage.removeItem(DATA_KEY);
  } catch {
    // 消せなくても致命的ではない
  }
}
