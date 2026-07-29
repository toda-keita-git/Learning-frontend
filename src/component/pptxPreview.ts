// PPTXプレビュー（閲覧専用・テキストのみ抽出）。
// PPTXはZip+XMLの構造(OOXML)なので、jszipでスライドXMLを取り出し、テキストだけを一覧表示する。
// 画像やレイアウトそのものの再現はしない（軽量な代替として、スライドごとの文章を確認できるようにする）。

export type PptxSlide = {
  slideNumber: number;
  lines: string[];
};

export async function extractPptxText(
  base64Content: string
): Promise<PptxSlide[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(base64Content, { base64: true });

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  const parser = new DOMParser();
  const slides: PptxSlide[] = [];

  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async("string");
    const doc = parser.parseFromString(xml, "application/xml");
    const textNodes = Array.from(doc.getElementsByTagName("a:t"));
    const lines = textNodes
      .map((node) => node.textContent?.trim() ?? "")
      .filter((text) => text.length > 0);

    const slideNumber = parseInt(
      fileName.match(/slide(\d+)\.xml$/)?.[1] ?? "0",
      10
    );
    slides.push({ slideNumber, lines });
  }

  return slides;
}
