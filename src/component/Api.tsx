import axiosBase from "axios";

const axios = axiosBase.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  responseType: "json",
});

export const learningApi = async () => {
  try {
    // awaitでAPIからの応答を待つ
    const response = await axios.get("/learning");
    // 取得したデータを返す
    return response.data;
  } catch (error) {
    console.log("ERROR!! occurred in Backend.");
    console.log(error);
    // エラー発生時はnullや空のオブジェクトを返すなど、エラー処理を決めておくと良い
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

// 新規学習内容を登録するAPI
export const createLearningApi = async (data: any) => {
  try {
    const response = await axios.post("/learning_insert", data);
    return response.data;
  } catch (error) {
    console.error("ERROR!! occurred in createLearningApi.", error);
    throw error; // エラーを呼び出し元に伝える
  }
};

// 学習内容を更新するAPI
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
    console.error("ERROR!! occurred in deleteLearningApi.", error);
    throw error;
  }
};
