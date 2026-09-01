// Googleドライブ API v3 への薄いfetchラッパー（GitHub側のOctokitに相当）。
// このアプリの添付ファイル操作（アップロード・取得・削除）に必要な最小限だけを持つ。
// 既存ファイルの選択はGoogle Picker（googlePicker.ts）が別に担当する。
//
// 取得したファイルは呼び出し側でbase64文字列に変換して返す（getDriveFileBase64）。
// これは既存のプレビュー/デコード用ヘルパー（decodeBase64.tsx, RichFilePreview.tsx等）が
// すべて「GitHubのAPIが返すのと同じ、生のbase64文字列」を入力に取る前提で書かれているため、
// Drive側もその形に揃えることで、それらのファイルを一切変更せずに再利用できる。

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

const authHeaders = (accessToken: string): HeadersInit => ({
  Authorization: `Bearer ${accessToken}`,
});

const fileToBase64 = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const uploadDriveFile = async (
  accessToken: string,
  folderId: string,
  file: File
): Promise<{ id: string }> => {
  const boundary = `drive-upload-${Math.random().toString(16).slice(2)}`;
  const metadata = { name: file.name, parents: [folderId] };
  const base64Data = await fileToBase64(file);

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${file.type || "application/octet-stream"}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64Data}\r\n` +
    `--${boundary}--`;

  const response = await fetch(`${UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) throw new Error("Googleドライブへのアップロードに失敗しました。");
  const data = await response.json();
  return { id: data.id as string };
};

// Driveの`alt=media`は生バイトを返すため、既存ヘルパーとの互換のためbase64文字列に変換して返す
export const getDriveFileBase64 = async (accessToken: string, fileId: string): Promise<string> => {
  const response = await fetch(`${FILES_URL}/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error("Googleドライブのファイル取得に失敗しました。ファイルが削除された可能性があります。");
  const blob = await response.blob();
  return fileToBase64(blob);
};

export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  const response = await fetch(`${FILES_URL}/${fileId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Googleドライブのファイル削除に失敗しました。");
  }
};

export interface DriveFolderItem {
  id: string;
  name: string;
}

// フォルダ名の一覧取得のみを目的とした最小限の呼び出し。drive.metadata.readonly
// スコープの範囲内（ファイルの中身は読めない）で、任意のフォルダの直下のサブフォルダを
// 一覧できる。GoogleDriveFolderBrowser（スマホでの1タップ階層移動用）が使う
export const listDriveSubfolders = async (accessToken: string, parentId: string): Promise<DriveFolderItem[]> => {
  const escapedParentId = parentId.replace(/'/g, "\\'");
  const params = new URLSearchParams({
    q: `'${escapedParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    orderBy: "name",
    pageSize: "200",
  });
  const response = await fetch(`${FILES_URL}?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error("Googleドライブのフォルダ一覧の取得に失敗しました。");
  const data = await response.json();
  return (data.files ?? []) as DriveFolderItem[];
};
