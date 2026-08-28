import axios from "axios";

// APIエラーを、利用者に見せる日本語メッセージへ変換する。
// バックエンドが本文にメッセージを載せている場合はそれを優先し、
// 通信自体が届かなかった場合はオフラインの可能性を案内する
export const errorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    // response が無い＝サーバーまで届かなかった（オフライン・タイムアウトなど）
    if (!err.response) {
      return "オフライン、または通信が不安定なため実行できませんでした。オンラインに戻ってからもう一度お試しください。";
    }
    if (typeof err.response.data === "string" && err.response.data) {
      return err.response.data;
    }
    // Spring Bootのエラー応答（{ message: "..." } 形式）
    const data = err.response.data as { message?: unknown } | undefined;
    if (data && typeof data.message === "string" && data.message) {
      return data.message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};
