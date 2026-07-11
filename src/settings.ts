// 外出先のモバイル回線でも使いやすいよう、通信量を抑える「省データモード」の設定。
const DATA_SAVER_KEY = "dataSaverEnabled";

export const isDataSaverEnabled = (): boolean =>
  localStorage.getItem(DATA_SAVER_KEY) === "true";

export const setDataSaverEnabled = (v: boolean) => {
  localStorage.setItem(DATA_SAVER_KEY, v ? "true" : "false");
};

// Network Information API（Chrome/Androidなど一部ブラウザのみ対応）。
// 対応していない場合はfalseを返し、機能自体は使えるがヒントは出さない。
export const prefersSaveData = (): boolean => {
  const conn = (navigator as any).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || ["slow-2g", "2g", "3g"].includes(conn.effectiveType);
};
