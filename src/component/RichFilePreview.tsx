import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Spreadsheet from "react-spreadsheet";
import { getFileType } from "./getFileType";
import { renderPdfPagesToImages } from "./pdfPreview";
import { extractPptxText, type PptxSlide } from "./pptxPreview";
import PptxSlideView from "./PptxSlideView";
import { extractDocxText } from "./docxPreview";
import { extractDocText } from "./docPreview";
import { listZipEntries, type ZipEntry } from "./zipPreview";

interface RichFilePreviewProps {
  path: string;
  // GitHubから取得した生のBase64（改行を含んでいてもよい）
  base64Content: string;
}

type SpreadsheetCell = { value: string | number | null; readOnly?: boolean };

// XLSXのシートをreact-spreadsheetの形式に変換する（全セル閲覧専用）
const sheetToSpreadsheetData = (worksheet: any, XLSX: any): SpreadsheetCell[][] => {
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  return data.map((row) =>
    row.map((cell) => {
      let cellValue: string | number | null = cell;
      if (cell !== null && typeof cell !== "undefined" && typeof cell !== "string" && typeof cell !== "number") {
        cellValue = String(cell);
      }
      return { value: cellValue, readOnly: true };
    })
  );
};

/**
 * Excel/PDF/PowerPoint/Word/ZIPを、それぞれ本来に近い見た目で表示する（閲覧専用）共通コンポーネント。
 * NewLearningDialogの添付ファイルプレビューと同じ変換ロジックを使い、
 * GitHubFileViewerDialog（ファイルツリーからの閲覧）でも同じ見た目で確認できるようにする。
 */
const RichFilePreview: React.FC<RichFilePreviewProps> = ({ path, base64Content }) => {
  const fileType = getFileType(path);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<SpreadsheetCell[][][]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pptxSlides, setPptxSlides] = useState<PptxSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [zipEntries, setZipEntries] = useState<ZipEntry[]>([]);
  const [docxText, setDocxText] = useState("");
  const [docText, setDocText] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const cleaned = base64Content.replace(/\r?\n/g, "");
        if (fileType === "excel") {
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(cleaned, { type: "base64" });
          if (cancelled) return;
          setSheetNames(workbook.SheetNames);
          setSheetData(
            workbook.SheetNames.map((name) => sheetToSpreadsheetData(workbook.Sheets[name], XLSX))
          );
        } else if (fileType === "pdf") {
          const pages = await renderPdfPagesToImages(cleaned);
          if (cancelled) return;
          setPdfPages(pages);
        } else if (fileType === "pptx") {
          const slides = await extractPptxText(cleaned);
          if (cancelled) return;
          setPptxSlides(slides);
        } else if (fileType === "docx") {
          const text = await extractDocxText(cleaned);
          if (cancelled) return;
          setDocxText(text);
        } else if (fileType === "doc") {
          const text = await extractDocText(cleaned);
          if (cancelled) return;
          setDocText(text);
        } else if (fileType === "zip-archive") {
          const entries = await listZipEntries(cleaned);
          if (cancelled) return;
          setZipEntries(entries);
        }
      } catch (e) {
        console.error("ファイルプレビューの生成に失敗:", e);
        if (!cancelled) setError("このファイルのプレビュー生成に失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, base64Content, fileType]);

  if (fileType === "binary") {
    return (
      <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">
          このファイル形式はここではプレビューできません。
        </Typography>
        <Typography variant="caption">
          ファイルはGitHub上にそのまま保存されています。内容を確認したい場合はGitHub上で開いてください。
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center", color: "error.main" }}>
        <Typography variant="body2">{error}</Typography>
      </Box>
    );
  }

  if (fileType === "excel") {
    return (
      <Box>
        <Tabs
          value={activeSheetIndex}
          onChange={(_e, v) => setActiveSheetIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {sheetNames.map((name) => (
            <Tab label={name} key={name} />
          ))}
        </Tabs>
        <Box sx={{ overflow: "auto", maxHeight: "60vh" }}>
          {sheetData[activeSheetIndex] && <Spreadsheet data={sheetData[activeSheetIndex]} />}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", p: 1 }}>
          ※ Excelは閲覧専用です（図・グラフは表示されません）
        </Typography>
      </Box>
    );
  }

  if (fileType === "pdf") {
    return (
      <Box sx={{ overflow: "auto", maxHeight: "70vh", p: 1, bgcolor: "#525659" }}>
        <Stack spacing={1} alignItems="center">
          {pdfPages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${i + 1}ページ目`}
              style={{ maxWidth: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  if (fileType === "pptx") {
    const slide = pptxSlides[activeSlideIndex];
    return (
      <Box>
        <Tabs
          value={activeSlideIndex}
          onChange={(_e, v) => setActiveSlideIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {pptxSlides.map((s, i) => (
            <Tab label={`${s.slideNumber}`} key={s.slideNumber} id={`slide-tab-${i}`} />
          ))}
        </Tabs>
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", alignItems: "center", bgcolor: "#e8e8e8" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            ※ 簡易プレビューです（フォント・装飾・アニメーションは再現されません）
          </Typography>
          {slide && <PptxSlideView slide={slide} />}
        </Box>
      </Box>
    );
  }

  if (fileType === "docx") {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          ※ Wordは閲覧専用です（文章のみ抽出して表示。元の書式・画像・表は再現されません）
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {docxText || "（テキストがありません）"}
        </Typography>
      </Box>
    );
  }

  if (fileType === "doc") {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          ※ Word（旧形式 .doc）は閲覧専用です（文章のみ抽出して表示。元の書式・画像・表は再現されません）
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {docText || "（テキストがありません）"}
        </Typography>
      </Box>
    );
  }

  if (fileType === "zip-archive") {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          ※ ZIP内のファイル一覧です（{zipEntries.length}件）。展開・編集はできません
        </Typography>
        <List dense>
          {zipEntries.map((entry) => (
            <ListItem key={entry.name} disableGutters>
              <ListItemText primary={entry.name} sx={{ opacity: entry.dir ? 0.6 : 1 }} />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  return null;
};

export default RichFilePreview;
