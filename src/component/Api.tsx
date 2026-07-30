import axiosBase from "axios";
import { clearPersistedSession } from "./authStorage";

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

// 新規学習内容を登録するAPI（user_idはJWTから特定される）
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

// カテゴリーの名前を変更するAPI（管理者かどうかはJWTから判定される）
export const updateCategoryApi = async (id: number, name: string) => {
  try {
    const response = await axios.post(`/category_update/${id}`, { name });
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in updateCategoryApi.", error);
    throw error;
  }
};

// カテゴリーを削除するAPI（使用中の場合は409、管理者以外は403が返る）
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

// タグの名前を変更するAPI（管理者かどうかはJWTから判定される）
export const updateTagApi = async (id: number, name: string) => {
  try {
    const response = await axios.post(`/tag_update/${id}`, { name });
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in updateTagApi.", error);
    throw error;
  }
};

// タグを削除するAPI（使用中の場合は409、管理者以外は403が返る）
export const deleteTagApi = async (id: number) => {
  try {
    const response = await axios.post(`/tag_delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in deleteTagApi.", error);
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
