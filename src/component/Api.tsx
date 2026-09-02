import axiosBase from "axios";
import { clearPersistedSession } from "./authStorage";
import type { Plan, PlanInput, Note, NoteInput, NoteAttachment } from "./PlanTypes";

// 開発時は vite.config.ts の server.proxy 経由で "/api" をバックエンドへ転送しているが、
// 本番のStatic Siteはサーバー側プロキシを持てないため、そのままだと
// "/api/..." へのリクエストがSPAのリライトルールに拾われてindex.htmlが返ってしまう。
// 本番ビルドでは VITE_API_BASE_URL（バックエンドの実URL）を直接使う。
const axios = axiosBase.create({
  baseURL: import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  responseType: "json",
});

// ログイン時にバックエンドが発行する本人確認用トークン(JWT)。
// setAppTokenで更新され、以降のすべてのAPIリクエストにAuthorizationヘッダーとして付与される。
// バックエンドはこのトークンを検証してuser_idを特定するため、
// リクエスト側で送るuser_idはもう信用されない（なりすまし対策）
let appToken: string | null = null;

export const setAppToken = (token: string | null) => {
  appToken = token;
};

axios.interceptors.request.use((config) => {
  if (appToken) {
    config.headers.Authorization = `Bearer ${appToken}`;
  }
  return config;
});

// トークンが無効・期限切れ(401)の場合、そのままだと各画面で分かりにくいエラーに
// なってしまうため、再ログインを促してリロードする。保存済みのログイン情報も
// 消しておかないと、リロード後に同じ無効なトークンを読み込んで401が再発してしまう
let sessionExpiredHandled = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      appToken = null;
      clearPersistedSession();
      alert("ログインの有効期限が切れました。もう一度ログインしてください。");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// user_idはJWTから特定される
export const learningApi = async () => {
  try {
    const response = await axios.get(`/learning`);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in Backend.", error);
    return null;
  }
};

export const LearningTagApi = async () => {
  try {
    // awaitでAPIからの応答を待つ
    const response = await axios.get("/learning_tag_list");
    // 取得したデータを返す
    return response.data;
  } catch (error) {
    console.log("ERROR!! occurred in Backend.");
    console.log(error);
    // エラー発生時はnullや空のオブジェクトを返すなど、エラー処理を決めておくと良い
    return null;
  }
};

export const TagsApi = async () => {
  try {
    // awaitでAPIからの応答を待つ
    const response = await axios.get("/tag_list");
    // 取得したデータを返す
    return response.data;
  } catch (error) {
    console.log("ERROR!! occurred in Backend.");
    console.log(error);
    // エラー発生時はnullや空のオブジェクトを返すなど、エラー処理を決めておくと良い
    return null;
  }
};

export const CategoriesApi = async () => {
  try {
    // awaitでAPIからの応答を待つ
    const response = await axios.get("/category_list");
    // 取得したデータを返す
    return response.data;
  } catch (error) {
    console.log("ERROR!! occurred in Backend.");
    console.log(error);
    // エラー発生時はnullや空のオブジェクトを返すなど、エラー処理を決めておくと良い
    return null;
  }
};

// 新規学習記録を登録するAPI（user_idはJWTから特定される）
export const createLearningApi = async (data: any) => {
  try {
    const response = await axios.post("/learning_insert", data);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in createLearningApi.", error);
    throw error;
  }
};

// 学習内容を更新するAPI（user_idはJWTから特定される）
export const updateLearningApi = async (id: any, data: any) => {
  try {
    const response = await axios.post(`/learning_update/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in updateLearningApi.", error);
    throw error;
  }
};

// 学習内容を削除するAPI
export const deleteLearningApi = async (id: any) => {
  try {
    const response = await axios.post(`/learning_delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in deleteLearningApi.", error);
    throw error;
  }
};

// カテゴリーを追加するAPI
export const createCategoryApi = async (categoryData: { name: string }) => {
  try {
    const response = await axios.post(`/category_insert`, categoryData);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in createCategoryApi.", error);
    throw error;
  }
};

// カテゴリーの名前を変更するAPI（本人が作成したものかどうかはJWTから判定される）
export const updateCategoryApi = async (id: number, name: string) => {
  try {
    const response = await axios.post(`/category_update/${id}`, { name });
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in updateCategoryApi.", error);
    throw error;
  }
};

// カテゴリーを削除するAPI（使用中の場合は409、本人が作成したもの以外は403が返る）
export const deleteCategoryApi = async (id: number) => {
  try {
    const response = await axios.post(`/category_delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in deleteCategoryApi.", error);
    throw error;
  }
};

// タグを追加するAPI
export const createTagApi = async (tagData: { name: string }) => {
  try {
    const response = await axios.post(`/tag_insert`, tagData);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in createTagApi.", error);
    throw error;
  }
};

// タグの名前を変更するAPI（本人が作成したものかどうかはJWTから判定される）
export const updateTagApi = async (id: number, name: string) => {
  try {
    const response = await axios.post(`/tag_update/${id}`, { name });
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in updateTagApi.", error);
    throw error;
  }
};

// タグを削除するAPI（使用中の場合は409、本人が作成したもの以外は403が返る）
export const deleteTagApi = async (id: number) => {
  try {
    const response = await axios.post(`/tag_delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in deleteTagApi.", error);
    throw error;
  }
};

// 学習記録の添付先として使うリポジトリを、本人の既存リポジトリに切り替えるAPI
export const selectRepoApi = async (repoName: string): Promise<string> => {
  try {
    const response = await axios.post(`/user_repo_select`, { repo_name: repoName });
    return response.data.repo_name as string;
  } catch (error) {
    console.error("ERROR!! occurred in selectRepoApi.", error);
    throw error;
  }
};

// Googleドライブの短命なアクセストークンを再取得するAPI。
// GitHubと違いGoogleのアクセストークンは約1時間で失効するため、Drive操作が
// 必要になるたびに呼ぶ想定（app_tokenでの本人確認が必須）
// --- アカウント連携（1つのアカウントにGitHubとGoogleの両方を持たせる） ---

export type AccountInfo = {
  user_id: number;
  email: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
  has_github: boolean;
  has_google: boolean;
  github_login: string | null;
  repo_name: string | null;
  drive_folder_id: string | null;
};

// ログイン中アカウントの情報（どちらのプロバイダーを連携済みか）を取得する
export const meApi = async (): Promise<AccountInfo> => {
  const response = await axios.get("/me");
  return response.data as AccountInfo;
};

// 目標・プラン・メモを全削除する（アカウント自体・GitHub/Google連携は残る）
export const deleteAccountDataApi = async (): Promise<void> => {
  await axios.post("/account_data_delete");
};

// サーバーが保持しているGitHubアクセストークンを取得する。
// Googleでログインして後からGitHubを連携した場合、ブラウザ側にGitHubのトークンが
// 無くリポジトリへの添付ができないため、これで受け取ってOctokitを組み立てる
export const githubTokenApi = async (): Promise<{
  access_token: string;
  github_login: string | null;
  repo_name: string | null;
}> => {
  const response = await axios.get("/github/token");
  return response.data;
};

// ログイン中のアカウントにGoogleアカウントを連携する（新規ユーザーは作られない）
export const linkGoogleApi = async (code: string) => {
  const response = await axios.post("/google/link", { code });
  return response.data;
};

// ログイン中のアカウントにGitHubアカウントを連携する（新規ユーザーは作られない）
export const linkGithubApi = async (code: string) => {
  const response = await axios.post("/github/link", { code });
  return response.data;
};

export const googleRefreshApi = async (): Promise<{ access_token: string; expires_in: number }> => {
  try {
    const response = await axios.post(`/google/refresh`);
    return response.data as { access_token: string; expires_in: number };
  } catch (error) {
    console.error("ERROR!! occurred in googleRefreshApi.", error);
    throw error;
  }
};

// Proプラン「通知を希望する」を登録するAPI（user_id・github_loginともJWTから特定される）
export const registerPlanInterestApi = async () => {
  const response = await axios.post("/plan_interest_register");
  return response.data;
};

// 既に「通知を希望する」を登録済みかを確認するAPI
export const checkPlanInterestApi = async (): Promise<boolean> => {
  const response = await axios.get(`/plan_interest_check`);
  return !!response.data?.requested;
};

// お問い合わせの送信（未ログインでも送れる公開API）
export const submitInquiryApi = async (data: {
  name?: string;
  email: string;
  message: string;
}) => {
  const response = await axios.post("/inquiry_submit", data);
  return response.data;
};

export interface Inquiry {
  id: number;
  name: string | null;
  email: string;
  message: string;
  status: "new" | "read" | "done";
  created_at: string;
}

// お問い合わせ一覧の取得（管理者のみ）
export const listInquiriesApi = async (): Promise<Inquiry[]> => {
  const response = await axios.get("/inquiry_list");
  return response.data;
};

// お問い合わせのステータス更新（管理者のみ）
export const updateInquiryStatusApi = async (id: number, status: string) => {
  const response = await axios.post(`/inquiry_status/${id}`, { status });
  return response.data;
};

// ------------------------------------------------------------------
// プラン / メモ（user_idはいずれもJWTから特定される）
// プランは目標/アクションプランを統合した再帰構造。parent_id=nullがルート（目標として表示）
// ------------------------------------------------------------------

export const plansApi = async (): Promise<Plan[]> => {
  const response = await axios.get("/plans");
  return response.data;
};

// 戻り値は新規作成したプランのid（ドラッグでメモから新規プランを作った直後、続けてlinkNoteApiを呼ぶために使う）
export const createPlanApi = async (data: PlanInput): Promise<number> => {
  const response = await axios.post<{ id: number }>("/plan_insert", data);
  return response.data.id;
};

export const updatePlanApi = async (id: number, data: PlanInput) => {
  const response = await axios.post(`/plan_update/${id}`, data);
  return response.data;
};

// 親を変更＝再配置。parent_id=nullでルート化（目標にする）、他プランのidを指定するとその子（アクションプラン）になる
export const reparentPlanApi = async (id: number, parentId: number | null) => {
  const response = await axios.post(`/plan_reparent/${id}`, { parent_id: parentId });
  return response.data;
};

// 同じ親を持つプラン同士の並べ替え確定後、まとめて送る
export const reorderPlansApi = async (items: { id: number; sort_order: number }[]) => {
  const response = await axios.post("/plan_reorder", items);
  return response.data;
};

export const deletePlanApi = async (id: number) => {
  const response = await axios.post(`/plan_delete/${id}`);
  return response.data;
};

export const notesApi = async (): Promise<Note[]> => {
  const response = await axios.get("/notes");
  return response.data;
};

export const createNoteApi = async (data: NoteInput) => {
  const response = await axios.post("/note_insert", data);
  return response.data;
};

export const updateNoteApi = async (id: number, data: NoteInput) => {
  const response = await axios.post(`/note_update/${id}`, data);
  return response.data;
};

export const deleteNoteApi = async (id: number) => {
  const response = await axios.post(`/note_delete/${id}`);
  return response.data;
};

// メモをプランへリンク／リンク解除（ドラッグ・タップどちらの操作からも呼ぶ）
export const linkNoteApi = async (id: number, planId: number) => {
  const response = await axios.post(`/note_link/${id}`, { plan_id: planId });
  return response.data;
};

export const unlinkNoteApi = async (id: number, planId: number) => {
  const response = await axios.post(`/note_unlink/${id}`, { plan_id: planId });
  return response.data;
};

// チェック用メモのtodo1件のチェック切替
export const toggleNoteTodoApi = async (todoItemId: number, checked: boolean) => {
  const response = await axios.post(`/note_todo_toggle/${todoItemId}`, { checked });
  return response.data;
};

// 画像／コードの添付を1件追加・削除
export const addNoteAttachmentApi = async (noteId: number, attachment: Omit<NoteAttachment, "id" | "note_id">) => {
  const response = await axios.post(`/note_attachment_insert/${noteId}`, attachment);
  return response.data;
};

export const deleteNoteAttachmentApi = async (attachmentId: number) => {
  const response = await axios.post(`/note_attachment_delete/${attachmentId}`);
  return response.data;
};

// ゲストモードで作成したプラン・メモをログイン中のアカウントへ取り込む。
// plans[].id / parent_id、notes[].links はこの端末だけで振られたローカルIDのままでよい
// （バックエンドがこれを手がかりに実IDへ張り直す）
export type GuestImportResult = {
  imported_plans: number;
  imported_notes: number;
  skipped_notes: number;
};

export const guestImportApi = async (plans: Plan[], notes: Note[]): Promise<GuestImportResult> => {
  const response = await axios.post("/guest_import", { plans, notes });
  return response.data as GuestImportResult;
};
