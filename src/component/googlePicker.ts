// Google Picker API のロード・起動。
//
// メモ添付に使っているdrive.fileスコープは「このアプリが作成したファイル」にしか
// アクセスできないが、唯一の例外が「ユーザーがそのファイルを明示的に開いた
// （＝Pickerで選んだ）場合」。これにより、利用者がGoogleドライブへ直接追加した
// 既存ファイルも、アプリの外へ持ち出すことなく添付として選べるようになる。
// この例外はGoogle純正のPicker UIを介した選択でのみ成立し、自前に組んだ一覧
// （GoogleDriveFolderBrowser）でファイルをタップしただけでは付与されない。
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

// Pickerを開くたびに必要なAPIキー・プロジェクト番号を読み取る共通処理。
// どちらもContext.tsxのGOOGLE_SCOPEと同様、Google Cloud Consoleの設定値を
// ビルド時の環境変数として渡している
const readPickerCredentials = (): { apiKey: string; projectNumber: string } => {
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  if (!apiKey) throw new Error("Google Picker用のAPIキーが設定されていません。");
  // drive.fileスコープでPickerを使う場合、setAppId()が無いと「マイドライブ全体」
  // からの既存ファイル選択が機能しない（アプリが作成した／既にアクセス権のある
  // ファイルしか選べないままになる）。値はOAuthクライアントと同じCloud
  // プロジェクトの「プロジェクト番号」
  const projectNumber = import.meta.env.VITE_GOOGLE_PROJECT_NUMBER;
  if (!projectNumber) throw new Error("Google Cloudのプロジェクト番号が設定されていません。");
  return { apiKey, projectNumber };
};

const buildAndShowPicker = (
  accessToken: string,
  views: google.picker.DocsView[],
  resolve: (file: PickedDriveFile | null) => void
): void => {
  const { apiKey, projectNumber } = readPickerCredentials();

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
};

// ツミアゲが作成した添付フォルダをデフォルトタブにしつつ、「マイドライブ」全体を
// 見て選べるタブも並べる。これにより、アプリ内で作った添付とドライブに
// 直接置いた既存ファイルの両方を、同じ画面から選べるようにしている。
//
// 「マイドライブ全体」タブはフォルダを何度もたどって奥へ進むほど、Picker自身の
// 「タップして選択→もう一度タップして開く」という2段階操作の煩わしさが増す
// （スマホでは特に「反応しない」ように感じられる）。浅い階層で目的のファイルが
// 見つかる場合はこちらで十分だが、深い階層を探す場合はGoogleDriveFolderBrowser
// （1タップで確実に階層移動できる自前の一覧）+ openGoogleDriveScopedPicker の
// 組み合わせを使う
export const openGoogleDrivePicker = (
  accessToken: string,
  driveFolderId: string | null
): Promise<PickedDriveFile | null> =>
  loadPickerApi().then(
    () =>
      new Promise<PickedDriveFile | null>((resolve, reject) => {
        try {
          const views: google.picker.DocsView[] = [];
          if (driveFolderId) {
            const folderView = new google.picker.DocsView(google.picker.ViewId.DOCS);
            folderView.setParent(driveFolderId);
            folderView.setLabel("このアプリの添付フォルダ");
            views.push(folderView);
          }
          // マイドライブのルートを起点に、フォルダをたどって選べるようにする。
          //
          // フォルダの中身を一覧する操作はdrive.fileスコープでは許可されないため、
          // これが機能するのはContext.tsxでdrive.metadata.readonlyを併せて要求して
          // いるからである（このスコープが無いと、フォルダは一覧に出るのにクリック
          // しても中に入れない「行き止まり」になる）。
          //
          // setSelectFolderEnabledは有効にしない。添付できるのはファイルだけで、
          // フォルダを選べてしまうと壊れた添付ができてしまうため
          // （GitHub側のセレクタでも同じ理由でフォルダは選択対象外にしている）。
          const myDriveView = new google.picker.DocsView(google.picker.ViewId.DOCS);
          myDriveView.setParent("root");
          myDriveView.setIncludeFolders(true);
          myDriveView.setLabel("マイドライブ全体から選ぶ");
          views.push(myDriveView);

          buildAndShowPicker(accessToken, views, resolve);
        } catch (err) {
          reject(err);
        }
      })
  );

// GoogleDriveFolderBrowserで1タップの独自ナビゲーションによりたどり着いた特定の
// フォルダ直下のファイルだけを、Picker純正の画面で選ばせる。フォルダ移動は
// 事前に済んでいるため、ここでのPickerはフォルダを含まない単一のフラットな
// 一覧になり、Picker内でさらに階層をたどる必要がない
export const openGoogleDriveScopedPicker = (
  accessToken: string,
  parentId: string,
  label: string
): Promise<PickedDriveFile | null> =>
  loadPickerApi().then(
    () =>
      new Promise<PickedDriveFile | null>((resolve, reject) => {
        try {
          const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
          view.setParent(parentId);
          view.setIncludeFolders(false);
          view.setLabel(label);
          buildAndShowPicker(accessToken, [view], resolve);
        } catch (err) {
          reject(err);
        }
      })
  );
