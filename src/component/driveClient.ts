// Googleドライブ API v3 への薄いfetchラッパー（GitHub側のOctokitに相当）。
// このアプリの添付ファイル操作（一覧・アップロード・取得・削除）に必要な最小限だけを持つ。
//
// 取得したファイルは呼び出し側でbase64文字列に変換して返す（getDriveFileBase64）。
// これは既存のプレビュー/デコード用ヘルパー（decodeBase64.tsx, RichFilePreview.tsx等）が
// すべて「GitHubのAPIが返すのと同じ、生のbase64文字列」を入力に取る前提で書かれているため、
// Drive側もその形に揃えることで、それらのファイルを一切変更せずに再利用できる。

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
}

const authHeaders = (accessToken: string): HeadersInit => ({
  Authorization: `Bearer ${accessToken}`,
});

// このアプリが作成したファイルはフォルダ直下にしか置かないため、単一階層の一覧のみで足りる
// （GitHub版のようなネストしたフォルダ探索は行わない）
export const listDriveFolder = async (accessToken: string, folderId: string): Promise<DriveItem[]> => {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType)");
  const response = await fetch(`${FILES_URL}?q=${query}&fields=${fields}&pageSize=1000`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error("Googleドライブのファイル一覧取得に失敗しました。");
  const data = await response.json();
  return (data.files ?? []) as DriveItem[];
};

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
