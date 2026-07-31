// PPTXプレビュー（閲覧専用）。
// PPTXはZip+XMLの構造(OOXML)なので、jszipでスライドXMLと画像を取り出す。
// 各図形(テキストボックス・画像)のXML上の位置・サイズ(EMU単位)をスライド全体に
// 対するパーセントに変換し、元のスライドに近いレイアウトで再現する。
// フォントの見た目・図形の装飾・アニメーションなどは再現しない（軽量な代替）。

export type PptxElement =
  | { type: "text"; x: number; y: number; width: number; height: number; lines: string[]; isTitle: boolean }
  | { type: "image"; x: number; y: number; width: number; height: number; src: string };

export type PptxSlide = {
  slideNumber: number;
  // 後方互換用（タブ見出しなどでの簡易表示に利用）
  title: string | null;
  bodyLines: string[];
  // スライド上の位置関係を保った描画に使う
  elements: PptxElement[];
  slideWidth: number;
  slideHeight: number;
};

// スライドサイズが取得できない場合の既定値（標準的な16:9, 13.333×7.5インチ）
const DEFAULT_SLIDE_WIDTH = 12192000;
const DEFAULT_SLIDE_HEIGHT = 6858000;

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
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

// <a:off x=".." y=".."/><a:ext cx=".." cy=".."/> をEMUで読み取る（無ければnull）
function readXfrm(shape: Element): { x: number; y: number; cx: number; cy: number } | null {
  const xfrm = shape.getElementsByTagName("a:xfrm")[0];
  if (!xfrm) return null;
  const off = xfrm.getElementsByTagName("a:off")[0];
  const ext = xfrm.getElementsByTagName("a:ext")[0];
  if (!off || !ext) return null;
  const x = Number(off.getAttribute("x"));
  const y = Number(off.getAttribute("y"));
  const cx = Number(ext.getAttribute("cx"));
  const cy = Number(ext.getAttribute("cy"));
  if ([x, y, cx, cy].some((n) => Number.isNaN(n))) return null;
  return { x, y, cx, cy };
}

// ctrTitle（タイトルスライド用）も通常のtitleと同じ扱いにする
function normalizePhType(type: string | null): string | null {
  return type === "ctrTitle" ? "title" : type;
}

function getPh(shape: Element): { type: string | null; idx: string | null } {
  const ph = shape.getElementsByTagName("p:ph")[0];
  return {
    type: ph?.getAttribute("type") ?? null,
    idx: ph?.getAttribute("idx") ?? null,
  };
}

// スライド/レイアウト/マスターいずれのXMLからも、指定したプレースホルダーに
// 一致する図形の位置・サイズを探す。
// idxとtype両方を満たす図形を最優先し、次にidxのみ・typeのみの順で探す。
// idxは独自定義のテンプレートで役割の異なる図形同士が同じ番号を使うことも
// あるため、typeも分かっている場合はidxだけでの一致を採用しない。
function findXfrmForPh(
  doc: Document,
  type: string | null,
  idx: string | null
): { x: number; y: number; cx: number; cy: number } | null {
  const spTree = doc.getElementsByTagName("p:spTree")[0];
  if (!spTree) return null;
  const shapes = Array.from(spTree.getElementsByTagName("p:sp"));
  const normType = normalizePhType(type);

  const matchers: Array<(ph: { type: string | null; idx: string | null }) => boolean> = [];
  if (idx !== null && normType !== null) {
    matchers.push((ph) => ph.idx === idx && normalizePhType(ph.type) === normType);
  }
  if (idx !== null && normType === null) {
    matchers.push((ph) => ph.idx === idx);
  }
  if (normType !== null) {
    matchers.push((ph) => normalizePhType(ph.type) === normType);
  }

  for (const matches of matchers) {
    for (const shape of shapes) {
      if (matches(getPh(shape))) {
        const xfrm = readXfrm(shape);
        if (xfrm) return xfrm;
      }
    }
  }
  return null;
}

// プレースホルダーの位置がスライド自身のXMLに無い場合、PowerPointの仕様通り
// スライドレイアウト→スライドマスターの順に継承元を辿って探す
async function resolvePhXfrm(
  shape: Element,
  layoutDoc: Document | null,
  masterDoc: Document | null
): Promise<{ x: number; y: number; cx: number; cy: number } | null> {
  const own = readXfrm(shape);
  if (own) return own;

  const { type, idx } = getPh(shape);
  if (type === null && idx === null) return null;

  if (layoutDoc) {
    const fromLayout = findXfrmForPh(layoutDoc, type, idx);
    if (fromLayout) return fromLayout;
  }
  if (masterDoc) {
    const fromMaster = findXfrmForPh(masterDoc, type, idx);
    if (fromMaster) return fromMaster;
  }
  return null;
}

type EmuBox = { x: number; y: number; cx: number; cy: number };
type GroupTransform = { off: { x: number; y: number }; ext: { cx: number; cy: number }; chOff: { x: number; y: number }; chExt: { cx: number; cy: number } };

// <p:grpSpPr><a:xfrm><a:off/><a:ext/><a:chOff/><a:chExt/></a:xfrm></p:grpSpPr>
// グループ化された図形は、子図形のxfrmがグループ自身の子座標系(chOff/chExt)を
// 基準にした値になっているため、グループのoff/extとの比率でスライド座標に変換する
function readGroupTransform(groupEl: Element): GroupTransform | null {
  const grpSpPr = Array.from(groupEl.childNodes).find(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === "p:grpSpPr"
  );
  const xfrm = grpSpPr?.getElementsByTagName("a:xfrm")[0];
  if (!xfrm) return null;
  const off = xfrm.getElementsByTagName("a:off")[0];
  const ext = xfrm.getElementsByTagName("a:ext")[0];
  const chOff = xfrm.getElementsByTagName("a:chOff")[0];
  const chExt = xfrm.getElementsByTagName("a:chExt")[0];
  if (!off || !ext) return null;
  const num = (el: Element | undefined, attr: string, fallback: number) => {
    const v = Number(el?.getAttribute(attr));
    return Number.isNaN(v) ? fallback : v;
  };
  const extCx = num(ext, "cx", 1);
  const extCy = num(ext, "cy", 1);
  return {
    off: { x: num(off, "x", 0), y: num(off, "y", 0) },
    ext: { cx: extCx, cy: extCy },
    chOff: { x: num(chOff, "x", 0), y: num(chOff, "y", 0) },
    chExt: { cx: num(chExt, "cx", extCx), cy: num(chExt, "cy", extCy) },
  };
}

function applyGroupTransform(box: EmuBox, group: GroupTransform): EmuBox {
  const scaleX = group.chExt.cx !== 0 ? group.ext.cx / group.chExt.cx : 1;
  const scaleY = group.chExt.cy !== 0 ? group.ext.cy / group.chExt.cy : 1;
  return {
    x: group.off.x + (box.x - group.chOff.x) * scaleX,
    y: group.off.y + (box.y - group.chOff.y) * scaleY,
    cx: box.cx * scaleX,
    cy: box.cy * scaleY,
  };
}

// spTree（またはグループ）直下の図形を出現順に収集する。p:grpSpは中の図形を
// 再帰的に取り出し、グループの変換をかけてスライド座標系に揃える
async function collectShapes(
  container: Element,
  layoutDoc: Document | null,
  masterDoc: Document | null
): Promise<Array<{ shape: Element; box: EmuBox | null }>> {
  const children = Array.from(container.childNodes).filter(
    (n): n is Element => n.nodeType === 1
  );
  const results: Array<{ shape: Element; box: EmuBox | null }> = [];

  for (const child of children) {
    if (child.tagName === "p:sp" || child.tagName === "p:pic") {
      const box = await resolvePhXfrm(child, layoutDoc, masterDoc);
      results.push({ shape: child, box });
    } else if (child.tagName === "p:grpSp") {
      const groupTransform = readGroupTransform(child);
      const inner = await collectShapes(child, layoutDoc, masterDoc);
      for (const item of inner) {
        results.push({
          shape: item.shape,
          box: item.box && groupTransform ? applyGroupTransform(item.box, groupTransform) : item.box,
        });
      }
    }
  }

  return results;
}

export async function extractPptxText(
  base64Content: string
): Promise<PptxSlide[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(base64Content, { base64: true });
  const parser = new DOMParser();

  // スライドサイズ（presentation.xmlのp:sldSz）。16:9/4:3どちらでも正しい比率で表示するために使う
  let slideWidth = DEFAULT_SLIDE_WIDTH;
  let slideHeight = DEFAULT_SLIDE_HEIGHT;
  const presentationFile = zip.files["ppt/presentation.xml"];
  if (presentationFile) {
    const xml = await presentationFile.async("string");
    const doc = parser.parseFromString(xml, "application/xml");
    const sldSz = doc.getElementsByTagName("p:sldSz")[0];
    const w = Number(sldSz?.getAttribute("cx"));
    const h = Number(sldSz?.getAttribute("cy"));
    if (!Number.isNaN(w) && w > 0) slideWidth = w;
    if (!Number.isNaN(h) && h > 0) slideHeight = h;
  }

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  const slides: PptxSlide[] = [];
  // レイアウト/マスターは複数のスライドから共有されるため、読み込み結果をキャッシュする
  const layoutDocCache = new Map<string, Document | null>();
  const masterDocCache = new Map<string, Document | null>();

  const loadXmlDoc = async (path: string): Promise<Document | null> => {
    const file = zip.files[path];
    if (!file) return null;
    const xml = await file.async("string");
    return parser.parseFromString(xml, "application/xml");
  };

  for (const fileName of slideFiles) {
    const slideNumber = parseInt(fileName.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
    const xml = await zip.files[fileName].async("string");
    const doc = parser.parseFromString(xml, "application/xml");

    // 画像の関係(r:embed)→実ファイルパス、およびスライドレイアウトへの参照を、
    // このスライド専用の.relsから読む
    const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const relsMap = new Map<string, string>();
    let layoutPath: string | null = null;
    const relsFile = zip.files[relsPath];
    if (relsFile) {
      const relsXml = await relsFile.async("string");
      const relsDoc = parser.parseFromString(relsXml, "application/xml");
      Array.from(relsDoc.getElementsByTagName("Relationship")).forEach((rel) => {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        const type = rel.getAttribute("Type") ?? "";
        if (!target) return;
        // Targetは "../media/image1.png" のようなslides/からの相対パス
        const resolved = new URL(target, "https://x/ppt/slides/").pathname.replace(/^\//, "");
        if (id) relsMap.set(id, resolved);
        if (type.endsWith("/slideLayout")) layoutPath = resolved;
      });
    }

    // プレースホルダーの位置がスライド自身に無い場合に備え、継承元の
    // レイアウト/マスターのXMLも読み込んでおく（PowerPointの継承仕様通り）
    let layoutDoc: Document | null = null;
    let masterDoc: Document | null = null;
    if (layoutPath) {
      const lp: string = layoutPath;
      if (!layoutDocCache.has(lp)) {
        layoutDocCache.set(lp, await loadXmlDoc(lp));
      }
      layoutDoc = layoutDocCache.get(lp) ?? null;

      const layoutDir = lp.substring(0, lp.lastIndexOf("/"));
      const layoutFileName = lp.substring(lp.lastIndexOf("/") + 1);
      const layoutRelsPath = `${layoutDir}/_rels/${layoutFileName}.rels`;
      const layoutRelsFile = zip.files[layoutRelsPath];
      if (layoutRelsFile) {
        const layoutRelsXml = await layoutRelsFile.async("string");
        const layoutRelsDoc = parser.parseFromString(layoutRelsXml, "application/xml");
        const masterRel = Array.from(layoutRelsDoc.getElementsByTagName("Relationship")).find((rel) =>
          (rel.getAttribute("Type") ?? "").endsWith("/slideMaster")
        );
        const masterTarget = masterRel?.getAttribute("Target");
        if (masterTarget) {
          const masterPath = new URL(masterTarget, `https://x/${layoutDir}/`).pathname.replace(/^\//, "");
          if (!masterDocCache.has(masterPath)) {
            masterDocCache.set(masterPath, await loadXmlDoc(masterPath));
          }
          masterDoc = masterDocCache.get(masterPath) ?? null;
        }
      }
    }

    const elements: PptxElement[] = [];
    let title: string | null = null;
    const bodyLines: string[] = [];

    // スペースツリー内の図形をグループ化(p:grpSp)も辿って出現順に処理する
    // （p:sp=テキスト等の図形、p:pic=画像）
    const spTree = doc.getElementsByTagName("p:spTree")[0];
    const collectedShapes = spTree ? await collectShapes(spTree, layoutDoc, masterDoc) : [];

    for (const { shape, box: xfrm } of collectedShapes) {
      const x = xfrm ? (xfrm.x / slideWidth) * 100 : 0;
      const y = xfrm ? (xfrm.y / slideHeight) * 100 : 0;
      const width = xfrm ? (xfrm.cx / slideWidth) * 100 : 100;
      const height = xfrm ? (xfrm.cy / slideHeight) * 100 : 100;

      if (shape.tagName === "p:pic") {
        const blip = shape.getElementsByTagName("a:blip")[0];
        const embedId = blip?.getAttribute("r:embed");
        const mediaPath = embedId ? relsMap.get(embedId) : null;
        const mediaFile = mediaPath ? zip.files[mediaPath] : null;
        if (mediaFile) {
          const ext = mediaPath!.split(".").pop()?.toLowerCase() ?? "";
          const mime = IMAGE_EXT_TO_MIME[ext];
          if (mime) {
            const base64 = await mediaFile.async("base64");
            elements.push({ type: "image", x, y, width, height, src: `data:${mime};base64,${base64}` });
          }
        }
        continue;
      }

      // p:sp（テキストボックス等の図形）
      const ph = shape.getElementsByTagName("p:ph")[0];
      const phType = ph?.getAttribute("type") ?? "";
      const isTitle = phType === "title" || phType === "ctrTitle";
      const lines = extractShapeLines(shape);
      if (lines.length === 0) continue;

      elements.push({ type: "text", x, y, width, height, lines, isTitle });
      if (isTitle && title === null) {
        title = lines.join(" ");
      } else {
        bodyLines.push(...lines);
      }
    }

    slides.push({ slideNumber, title, bodyLines, elements, slideWidth, slideHeight });
  }

  return slides;
}
