// PPTXプレビュー（閲覧専用・テキストのみ抽出）。
// PPTXはZip+XMLの構造(OOXML)なので、jszipでスライドXMLを取り出し、テキストだけを抽出する。
// タイトルのプレースホルダー(p:ph type="title"/"ctrTitle")を見分けて分離することで、
// スライドらしい見た目（タイトル＋本文）で表示できるようにする。
// 画像やレイアウトそのものの再現はしない（軽量な代替として、文章を確認できるようにする）。

export type PptxSlide = {
  slideNumber: number;
  title: string | null;
  bodyLines: string[];
};

function extractShapeLines(shape: Element): string[] {
  const paragraphs = Array.from(shape.getElementsByTagName("a:p"));
  return paragraphs
    .map((p) =>
      Array.from(p.getElementsByTagName("a:t"))
        .map((t) => t.textContent ?? "")
        .join("")
        .trim()
    )
    .filter((line) => line.length > 0);
}

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
    const shapes = Array.from(doc.getElementsByTagName("p:sp"));

    let title: string | null = null;
    const bodyLines: string[] = [];

    for (const shape of shapes) {
      const ph = shape.getElementsByTagName("p:ph")[0];
      const phType = ph?.getAttribute("type") ?? "";
      const isTitle = phType === "title" || phType === "ctrTitle";

      const shapeLines = extractShapeLines(shape);
      if (shapeLines.length === 0) continue;

      if (isTitle && title === null) {
        title = shapeLines.join(" ");
      } else {
        bodyLines.push(...shapeLines);
      }
    }

    const slideNumber = parseInt(
      fileName.match(/slide(\d+)\.xml$/)?.[1] ?? "0",
      10
    );
    slides.push({ slideNumber, title, bodyLines });
  }

  return slides;
}
