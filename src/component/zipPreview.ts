// ZIPアーカイブのプレビュー（閲覧専用・中身のファイル一覧のみ）。jszipは動的importする。

export type ZipEntry = {
  name: string;
  dir: boolean;
};

export async function listZipEntries(base64Content: string): Promise<ZipEntry[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(base64Content, { base64: true });

  const entries: ZipEntry[] = [];
  zip.forEach((_relativePath, file) => {
    entries.push({ name: file.name, dir: file.dir });
  });
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
