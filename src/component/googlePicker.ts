// Google Picker API のロード・起動。
//
// メモ添付に使っているdrive.fileスコープは「このアプリが作成したファイル」にしか
// アクセスできないが、唯一の例外が「ユーザーがそのファイルを明示的に開いた
// （＝Pickerで選んだ）場合」。これにより、利用者がGoogleドライブへ直接追加した
// 既存ファイルも、アプリの外へ持ち出すことなく添付として選べるようになる。
//
// gapi/google.pickerの型は@types/gapi・@types/google.pickerが提供するグローバル
// アンビエント宣言をそのまま使う（このファイル・プロジェクト全体でimportは不要）。
//
// 起動するたびに毎回スクリプトを読み込むのは無駄なので、一度ロードしたら
// モジュールスコープの変数に結果（Promise）を持たせて使い回す。
let pickerApiPromise: Promise<void> | null = null;

const loadGapiScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof gapi !== "undefined") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Picker APIの読み込みに失敗しました。"));
    document.head.appendChild(script);
  });

const loadPickerApi = (): Promise<void> => {
  if (!pickerApiPromise) {
    pickerApiPromise = loadGapiScript().then(
      () =>
        new Promise<void>((resolve, reject) => {
          gapi.load("picker", {
            callback: () => resolve(),
            onerror: () => reject(new Error("Google Picker APIの読み込みに失敗しました。")),
          });
        })
    );
  }
  return pickerApiPromise;
};

export interface PickedDriveFile {
  id: string;
  name: string;
}

// ツミアゲが作成した添付フォルダをデフォルトタブにしつつ、「マイドライブ」全体を
// 見て選べるタブも並べる。これにより、アプリ内で作った添付とドライブに
// 直接置いた既存ファイルの両方を、同じ画面から選べるようにしている。
export const openGoogleDrivePicker = (
  accessToken: string,
  driveFolderId: string | null
): Promise<PickedDriveFile | null> =>
  loadPickerApi().then(
    () =>
      new Promise<PickedDriveFile | null>((resolve, reject) => {
        const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
        if (!apiKey) {
          reject(new Error("Google Picker用のAPIキーが設定されていません。"));
          return;
        }

        const views: google.picker.DocsView[] = [];
        if (driveFolderId) {
          const folderView = new google.picker.DocsView(google.picker.ViewId.DOCS);
          folderView.setParent(driveFolderId);
          folderView.setLabel("このアプリの添付フォルダ");
          views.push(folderView);
        }
        const myDriveView = new google.picker.DocsView(google.picker.ViewId.DOCS);
        myDriveView.setIncludeFolders(true);
        myDriveView.setLabel("マイドライブ全体から選ぶ");
        views.push(myDriveView);

        const builder = new google.picker.PickerBuilder()
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setLocale("ja")
          .setCallback((data: google.picker.ResponseObject) => {
            if (data.action === google.picker.Action.PICKED) {
              const doc = data.docs?.[0];
              resolve(doc ? { id: doc.id, name: doc.name ?? "" } : null);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve(null);
            }
          });
        views.forEach((view) => builder.addView(view));
        builder.build().setVisible(true);
      })
  );
