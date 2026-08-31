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

// Google PickerはデフォルトでMUIのDialog（z-index: 1300）より低いz-indexで
// 描画されるため、メモ添付ダイアログの後ろに隠れてしまう。Picker自体には
// z-indexを指定するビルダーAPIが無いため、CSSで強制的に引き上げる
let pickerZIndexStyleInjected = false;
const ensurePickerZIndexStyle = (): void => {
  if (pickerZIndexStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .picker-dialog-bg { z-index: 1301 !important; }
    .picker-dialog { z-index: 1302 !important; }
  `;
  document.head.appendChild(style);
  pickerZIndexStyleInjected = true;
};

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
        // drive.fileスコープでPickerを使う場合、setAppId()が無いと「マイドライブ全体」
        // からの既存ファイル選択が機能しない（アプリが作成した／既にアクセス権のある
        // ファイルしか選べないままになる）。値はOAuthクライアントと同じCloud
        // プロジェクトの「プロジェクト番号」
        const projectNumber = import.meta.env.VITE_GOOGLE_PROJECT_NUMBER;
        if (!projectNumber) {
          reject(new Error("Google Cloudのプロジェクト番号が設定されていません。"));
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
        // setParent("root")が無いと、マイドライブの階層構造ではなく
        // ドライブ全体を横断した検索結果がフラットに表示されてしまう
        myDriveView.setParent("root");
        myDriveView.setIncludeFolders(true);
        myDriveView.setLabel("マイドライブ全体から選ぶ");
        views.push(myDriveView);

        // サイズを指定しないとPickerはデフォルトの大きめ固定サイズ（横1051×縦650）で
        // 開き、ウィンドウの表示領域がそれより小さいと上部のタブ行が画面外にはみ出して
        // 見えなくなる。実際の表示領域に収まるサイズに明示的に合わせる
        const pickerWidth = Math.min(1051, window.innerWidth - 32);
        const pickerHeight = Math.min(650, window.innerHeight - 32);

        const builder = new google.picker.PickerBuilder()
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setAppId(projectNumber)
          .setLocale("ja")
          .setSize(pickerWidth, pickerHeight)
          .setCallback((data: google.picker.ResponseObject) => {
            if (data.action === google.picker.Action.PICKED) {
              const doc = data.docs?.[0];
              resolve(doc ? { id: doc.id, name: doc.name ?? "" } : null);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve(null);
            }
          });
        views.forEach((view) => builder.addView(view));
        ensurePickerZIndexStyle();
        builder.build().setVisible(true);
      })
  );
