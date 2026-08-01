import React, { useState, useRef, useEffect,useContext } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Rating from "@mui/material/Rating";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { format } from "date-fns";
import GitHubFileSelector from "./GitHubFileSelector";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import AddLinkIcon from "@mui/icons-material/AddLink";
// Prism（全言語を同梱、数百kB）ではなく PrismAsyncLight
// （言語ごとに動的import、初回表示に必要な分だけ読み込む）を使う
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getFileType, getMimeType } from "./getFileType";
import CircularProgress from "@mui/material/CircularProgress";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloseIcon from "@mui/icons-material/Close";
// import FindInPageIcon from "@mui/icons-material/FindInPage";
import * as XLSX from "xlsx";
import Spreadsheet from "react-spreadsheet"; // ★ react-spreadsheet をインポート
import Tabs from "@mui/material/Tabs"; // ★ MUI Tabsをインポート
import Tab from "@mui/material/Tab"; // ★ MUI Tabをインポート
import GitHubFolderSelector from "./GitHubFolderSelector";
import { AuthContext } from "../Context";
import { renderPdfPagesToImages } from "./pdfPreview";
import { extractPptxText, type PptxSlide } from "./pptxPreview";
import PptxSlideView from "./PptxSlideView";
import { extractDocxText } from "./docxPreview";
import { extractDocText } from "./docPreview";
import MarkdownContent from "./MarkdownContent";
import MarkdownHelpDialog from "./MarkdownHelpDialog";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { hasCloze } from "./clozeUtils";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { listZipEntries, type ZipEntry } from "./zipPreview";
import { parseAttachments, serializeAttachments, type Attachment } from "./attachments";
import { parseReferenceUrls, serializeReferenceUrls } from "./referenceUrls";

// 添付リストに追加済みの1件分（アップロード待ちの内容もここに保持する）
type PendingAttachment = {
  path: string;
  localFile: File | null;
  isEditingFile: boolean;
  fileSha: string | null;
  fileContent: string;
  fileType: string;
};


// Base64エンコードを行うヘルパー関数
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });

// 最近使ったカテゴリー・タグをワンタップ候補として出すためのlocalStorage保存
const RECENT_CATEGORY_KEY = "recentCategoryIds";
const RECENT_TAG_KEY = "recentTagNames";
const RECENT_PICKS_LIMIT = 6;

function loadRecentPicks<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 使ったばかりのものが先頭に来るよう、既存の並びから除いてから先頭に積み直す
function pushRecentPicks<T>(key: string, values: T[]): void {
  if (values.length === 0) return;
  try {
    const current = loadRecentPicks<T>(key).filter((v) => !values.includes(v));
    const next = [...values, ...current].slice(0, RECENT_PICKS_LIMIT);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // 保存できなくても致命的ではないので無視する
  }
}

// "src/components/Foo.tsx" のようなフルパスを、フォルダ部分とファイル名部分に分割する
const splitPath = (path: string): { folder: string; file: string } => {
  const trimmed = (path || "").replace(/^\/+/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) return { folder: "", file: trimmed };
  return { folder: trimmed.slice(0, idx), file: trimmed.slice(idx + 1) };
};

// 親から受け取るPropsの型定義
interface NewLearningDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  allTags: { name: string }[];
  allCategories: { id: number; name: string }[];
  editingData?: any | null;
  // 共有(Web Share Target)などから、新規登録の初期値を差し込む用
  prefillData?: {
    title?: string;
    heading_text?: string;
    explanatory_text?: string;
    reference_url?: string;
  } | null;
  onFetchFile: (
    path: string
  ) => Promise<{ content: string; sha: string; base64Content: string } | null>;
  // GitHubリポジトリを持たないゲストモードなど、ファイル添付機能そのものを
  // 使えない場面で「ファイルを添付する」欄自体を非表示にする
  hideAttachments?: boolean;
  // カテゴリー管理機能を持たないゲストモードなど、カテゴリーを必須にできない
  // 場面ではfalseにする（デフォルトは必須）
  requireCategory?: boolean;
}

export default function NewLearningDialog({
  open,
  onClose,
  onSubmit,
  allTags = [],
  allCategories = [],
  editingData = null,
  prefillData = null,
  onFetchFile,
  hideAttachments = false,
  requireCategory = true,
}: NewLearningDialogProps) {
  // フォーム項目のためのState
  const [title, setTitle] = useState("");
  const [headingText, setHeadingText] = useState("");
  const [explanatoryText, setExplanatoryText] = useState("");
  const [showMemoPreview, setShowMemoPreview] = useState(false);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);
  // 穴埋め記法([[ ]])が復習時にどう隠れるかを、プレビュー内で確認するためのState
  const [clozeAllRevealed, setClozeAllRevealed] = useState(false);
  const [clozeResetKey, setClozeResetKey] = useState(0);
  const [understandingLevel, setUnderstandingLevel] = useState<number | null>(null);
  // 参考URLは複数登録できる。空欄も1件として保持し、常に最後に空欄が
  // 1つ残るようにして「＋」ボタンなしでも次のURLをすぐ入力できるようにする
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // 最近使ったカテゴリー・タグ（ワンタップ候補用）
  const [recentCategoryIds, setRecentCategoryIds] = useState<(number | string)[]>([]);
  const [recentTagNames, setRecentTagNames] = useState<string[]>([]);
  // 添付ファイルの保存先は「フォルダ」と「ファイル名」を別々のStateで持つ。
  // 1本の文字列(github_path)をパースして扱うと、片方だけ更新したつもりが
  // もう片方の内容を巻き込んで消してしまうバグの温床になるため。
  const [folderPath, setFolderPath] = useState(""); // 例: "src/components"（末尾スラッシュなし、リポジトリ直下なら""）
  const [fileName, setFileName] = useState(""); // 例: "Foo.tsx"
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 作業スロット（今まさに選択・作成中の1件）とは別に、複数添付できるよう
  // 「添付リスト」に確定済みの分を溜めておく。最終送信時に、リストに
  // 未追加のまま作業スロットに残っている分があれば自動でリストに含める
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  // 「新規ファイルを作成する」を選んだ状態か（アップロードでも既存選択でもない、
  // 空の状態からファイルを作る操作であることを示す）
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);
  // タイトル等の必須項目を空のまま登録しようとしたら警告を表示するためのフラグ
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  // 直前まで編集していた学習記録のid（新規作成に切り替わったときだけ
  // フォームをリセットするために使う。単なる開閉では下書きを保持する）
  const prevEditingIdRef = useRef<number | string | null>(null);

  // フォルダとファイル名を結合した完全パス（前後の余分なスラッシュは除去）。
  // ファイル名が空でフォルダだけ決まっている場合は末尾スラッシュ付きになる。
  const cleanFolderPath = folderPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const github_path = cleanFolderPath ? `${cleanFolderPath}/${fileName}` : fileName;
  const hasAttachment = !!(folderPath || fileName || localFile);

  // ファイルプレビュー用のState
  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]); // PDF各ページの画像（閲覧専用）
  const [pptxSlides, setPptxSlides] = useState<PptxSlide[]>([]); // PPTX各スライドのテキスト（閲覧専用）
  const [activeSlideIndex, setActiveSlideIndex] = useState(0); // 表示中のスライド番号
  const [zipEntries, setZipEntries] = useState<ZipEntry[]>([]); // ZIP内のファイル一覧（閲覧専用）

  // タッチ操作が主な端末（スマホ等）では、物理キーボードの「Enter」ではなく
  // ソフトキーボードの確定/改行ボタンでの操作になるため、案内文を出し分ける
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  // ← AuthContext から値を取得（これらは string | null の可能性がある想定）
  const auth = useContext(AuthContext);

  // --- 重要：AuthContext の値が null の可能性があるため、安全なフォールバック変数を作る ---
  const githubLoginSafe: string = (auth && auth.githubLogin) ?? "";
  const repoNameSafe: string = (auth && auth.repoName) ?? "";
  const tokenSafe: string = (auth.token) ?? "";
  // 上の tokenSafe は Context に 'token' ではなく 'accessToken' で入っている場合を念のためカバー


  // ★ スプレッドシートのセルを表す型
  type SpreadsheetCell = {
    value: string | number | null;
    readOnly?: boolean;
  };

  // ★ スプレッドシート用のデータState
  const [spreadsheetData, setSpreadsheetData] = useState<
    SpreadsheetCell[][] | null
  >(null);

  // ★ SheetJSの出力をreact-spreadsheetの形式に変換するヘルパー関数
  // Excelは図・グラフ・画像などを含むことがあり、xlsxライブラリでの
  // 書き出しではそれらが失われてしまう。編集・保存はできないよう、
  // 全セルをreadOnlyにして閲覧専用として表示する
  const convertSheetToSpreadsheetData = (
    worksheet: XLSX.WorkSheet
  ): SpreadsheetCell[][] => {
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });
    return data.map((row) =>
      row.map((cell) => {
        let cellValue: string | number | null = cell;
        // セルの値がstring, number, null/undefined以外（例: Dateオブジェクトなど）の場合、文字列に変換する
        if (
          cell !== null &&
          typeof cell !== "undefined" &&
          typeof cell !== "string" &&
          typeof cell !== "number"
        ) {
          cellValue = String(cell);
        }
        return { value: cellValue, readOnly: true };
      })
    );
  };

  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [_selectedFolderPath, setSelectedFolderPath] = useState("");

  const date = new Date();
  const created_at = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSX");

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null); // Excelブック全体
  const [activeSheetIndex, setActiveSheetIndex] = useState(0); // 表示するシートの番号

  // workbookか表示シートが変更されたら、表示用データを再計算する
  useEffect(() => {
    if (workbook) {
      try {
        const sheetName = workbook.SheetNames[activeSheetIndex];
        if (!sheetName) throw new Error("Invalid sheet index.");

        const worksheet = workbook.Sheets[sheetName];
        const data = convertSheetToSpreadsheetData(worksheet);
        setSpreadsheetData(data);
      } catch (e) {
        setPreviewError("シートの読み込みに失敗しました。");
        setSpreadsheetData(null);
      }
    }
  }, [workbook, activeSheetIndex]);

  useEffect(() => {
    if (!open) return;
    setRecentCategoryIds(loadRecentPicks<number | string>(RECENT_CATEGORY_KEY));
    setRecentTagNames(loadRecentPicks<string>(RECENT_TAG_KEY));

    if (editingData) {
      setTitle(editingData.title || "");
      setHeadingText(editingData.heading_text || "");
      setExplanatoryText(editingData.explanatory_text || "");
      setUnderstandingLevel(editingData.understanding_level ?? null);
      const urls = parseReferenceUrls(editingData.reference_url);
      setReferenceUrls(urls.length > 0 ? [...urls, ""] : [""]);
      setSelectedCategory(editingData.category_id || "");
      setSelectedTags(editingData.tags || []);
      // 既存の添付は「添付リスト」に読み込む（内容の再取得はせず、パスとshaだけ保持）。
      // 作業スロットは空のままにし、もう1件追加したい場合にすぐ使えるようにする
      const existingAttachments = parseAttachments(editingData.github_path, editingData.commit_sha);
      setAttachments(
        existingAttachments.map((a) => ({
          path: a.path,
          localFile: null,
          isEditingFile: false,
          fileSha: a.sha,
          fileContent: "",
          fileType: getFileType(a.path),
        }))
      );
      setFolderPath("");
      setFileName("");
      setLocalFile(null);
      setFileContent("");
      setFileSha(null);
      setIsEditingFile(false);
      setIsCreatingNewFile(false);
      setPreviewError(null);
      setAttemptedSubmit(false);
      prevEditingIdRef.current = editingData.id ?? null;
    } else if (prefillData) {
      // 共有などからの新規登録：一度リセットしてから初期値を差し込む
      resetFormFields();
      setTitle(prefillData.title || "");
      setHeadingText(prefillData.heading_text || "");
      setExplanatoryText(prefillData.explanatory_text || "");
      setReferenceUrls(prefillData.reference_url ? [prefillData.reference_url, ""] : [""]);
      prevEditingIdRef.current = null;
    } else if (prevEditingIdRef.current !== null) {
      // 直前まで別の記録を編集していた場合だけ、新規作成への切り替わりでリセットする。
      // 単に閉じて開き直しただけ（例: 誤ってキャンセル→もう一度「学んだことを記録する」）
      // では、入力途中の下書きをそのまま残す
      resetFormFields();
      prevEditingIdRef.current = null;
    }
  }, [editingData, prefillData, open]);

  // GitHub上のファイルのプレビュー処理
  const handlePreviewFile = async (path: string) => {
    const pathToFetch = typeof path === "string" ? path : github_path;
    if (!pathToFetch) {
      setPreviewError("ファイルパスを入力してください。");
      return;
    }
    setIsLoadingFile(true);
    setPreviewError(null);
    setFileContent("");
    setSpreadsheetData(null); // ★ リセット
    setWorkbook(null); // workbookもリセット
    setActiveSheetIndex(0);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
    setIsCreatingNewFile(false);

    const result = await onFetchFile(pathToFetch);

    if (result) {
      const fileType = getFileType(pathToFetch);
      if (fileType === "excel" && result.base64Content) {
        try {
          const wb = XLSX.read(result.base64Content, { type: "base64" });
          setWorkbook(wb);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("Excelファイルの解析に失敗しました。");
        }
      } else if (fileType === "pdf" && result.base64Content) {
        try {
          const pages = await renderPdfPagesToImages(result.base64Content);
          setPdfPages(pages);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("PDFファイルの解析に失敗しました。");
        }
      } else if (fileType === "pptx" && result.base64Content) {
        try {
          const slides = await extractPptxText(result.base64Content);
          setPptxSlides(slides);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("PowerPointファイルの解析に失敗しました。");
        }
      } else if (fileType === "docx" && result.base64Content) {
        try {
          const text = await extractDocxText(result.base64Content);
          setFileContent(text);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("Wordファイルの解析に失敗しました。");
        }
      } else if (fileType === "doc" && result.base64Content) {
        try {
          const text = await extractDocText(result.base64Content);
          setFileContent(text);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("Wordファイル（旧形式）の解析に失敗しました。");
        }
      } else if (fileType === "zip-archive" && result.base64Content) {
        try {
          const entries = await listZipEntries(result.base64Content);
          setZipEntries(entries);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("ZIPファイルの解析に失敗しました。");
        }
      } else {
        const mimeType = getMimeType(pathToFetch);

        if ((fileType === "image" || fileType === "video") && result.base64Content) {
          // GitHubから取得したBase64をそのまま画像/動画SRCにする
          setFileContent(`data:${mimeType};base64,${result.base64Content}`);
        } else {
          // 通常テキスト
          setFileContent(result.content);
        }
        setFileSha(result.sha);
      }
      setIsEditingFile(false);
    } else {
      setPreviewError("ファイルの取得に失敗しました。パスを確認してください。");
      setFileSha(null);
    }
    setIsLoadingFile(false);
  };

  // ローカルファイルのプレビュー処理
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setLocalFile(file);
    // ファイル名だけ更新し、既に選んでいる保存先フォルダはそのまま維持する
    setFileName(file.name);

    setIsLoadingFile(true);
    setPreviewError(null);
    setFileContent("");
    setSpreadsheetData(null);
    setFileSha(null);
    setWorkbook(null);
    setActiveSheetIndex(0);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
    setIsCreatingNewFile(false);

    const reader = new FileReader();
    const fileType = getFileType(file.name);

    reader.onload = async (event) => {
      try {
        const fileData = event.target?.result;
        if (!fileData) throw new Error("ファイルの読み込みに失敗しました。");

        if (fileType === "excel") {
          const wb = XLSX.read(fileData, { type: "array" });
          setWorkbook(wb);
        } else if (fileType === "image" || fileType === "video") {
          // ✅ 画像・動画ファイルの場合：data URL をそのまま src に使う
          setFileContent(fileData as string);
        } else if (fileType === "pdf") {
          const base64 = (fileData as string).split(",")[1];
          setPdfPages(await renderPdfPagesToImages(base64));
        } else if (fileType === "pptx") {
          const base64 = (fileData as string).split(",")[1];
          setPptxSlides(await extractPptxText(base64));
        } else if (fileType === "docx") {
          const base64 = (fileData as string).split(",")[1];
          setFileContent(await extractDocxText(base64));
        } else if (fileType === "doc") {
          const base64 = (fileData as string).split(",")[1];
          setFileContent(await extractDocText(base64));
        } else if (fileType === "zip-archive") {
          const base64 = (fileData as string).split(",")[1];
          setZipEntries(await listZipEntries(base64));
        } else if (fileType === "binary") {
          setPreviewError("このバイナリファイル形式はプレビューできません。");
        } else {
          // ✅ テキスト系
          setFileContent(fileData as string);
        }
      } catch (err) {
        setPreviewError("ファイルのプレビューに失敗しました。");
      } finally {
        setIsLoadingFile(false);
      }
    };

    reader.onerror = () => {
      setPreviewError("ファイルの読み込み中にエラーが発生しました。");
      setIsLoadingFile(false);
    };

    if (fileType === "excel") {
      reader.readAsArrayBuffer(file);
    } else if (
      fileType === "image" ||
      fileType === "video" ||
      fileType === "pdf" ||
      fileType === "pptx" ||
      fileType === "docx" ||
      fileType === "doc" ||
      fileType === "zip-archive"
    ) {
      // 画像・動画・PDF・PowerPoint・Word・ZIPはbase64 data URL形式で読み込み
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }
};


  const handleFileSelectFromGitHub = (path: string) => {
    // GitHub上の既存ファイルを選んだ場合は、そのファイルのフォルダ・ファイル名で両方とも上書きする
    const { folder, file } = splitPath(path);
    setFolderPath(folder);
    setFileName(file);
    setLocalFile(null);
    setIsSelectorOpen(false);
    handlePreviewFile(path);
  };

  // 「新規ファイルを作成する」：既存ファイルの取得もアップロードもせず、
  // 空の内容から直接タイプして新しいファイルを作る
  const handleCreateNewFileClick = () => {
    setLocalFile(null);
    setFileSha(null);
    setFileContent("");
    setPreviewError(null);
    setWorkbook(null);
    setActiveSheetIndex(0);
    setSpreadsheetData(null);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
    setIsCreatingNewFile(true);
    setIsEditingFile(true); // 最初からテキスト入力できる状態にする
  };

  // 作業スロットの内容を1件分のPendingAttachmentに変換する
  // （複数の場所から同じ変換ロジックを使うため関数化）。
  // ファイル名を入力しただけで、アップロード・既存選択・新規作成のいずれも
  // 行っていない場合はnullを返す（存在しないファイルへのパスだけを
  // 保存してしまう不具合を避けるため）
  const buildPendingAttachmentFromSlot = (): PendingAttachment | null => {
    if (!github_path.trim()) return null;
    const hasRealContent = !!localFile || isEditingFile || !!fileSha;
    if (!hasRealContent) return null;
    return {
      path: github_path,
      localFile,
      isEditingFile,
      fileSha,
      fileContent,
      fileType,
    };
  };

  // 作業スロットの内容を「添付リスト」に確定として追加し、次の1件を用意できるようにする
  const handleQueueAttachment = () => {
    const pending = buildPendingAttachmentFromSlot();
    if (!pending) return;
    setAttachments((prev) => [...prev, pending]);
    handleClearAttachment();
  };

  const handleRemoveQueuedAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // アップロード待ちの内容（editedFiles）と、最終的に保存するパス・sha一覧を組み立てる。
  // アップロードが必要なものはsha:nullのプレースホルダーとして積み、親コンポーネント側で
  // 実際のアップロード後に本物のcommit shaへ差し替える
  const buildAttachmentSubmission = (list: PendingAttachment[]) => {
    const editedFiles: Array<{
      path: string;
      content: string;
      sha: string | null;
      contentIsBase64: boolean;
    }> = [];
    const finalAttachments: Attachment[] = [];

    for (const att of list) {
      if (att.localFile) {
        // ローカルファイルのアップロード（内容の変換は送信直前にまとめて行う）
        editedFiles.push({
          path: att.path,
          content: "__PENDING_LOCAL_FILE__", // toBase64後に置き換える
          sha: null,
          contentIsBase64: true,
        });
        finalAttachments.push({ path: att.path, sha: null });
      } else if (att.isEditingFile && att.fileType !== "docx" && att.fileType !== "doc") {
        // 既存ファイルの編集、または新規ファイルの作成（どちらもテキスト内容をコミットする）
        editedFiles.push({
          path: att.path,
          content: att.fileContent,
          sha: att.fileSha,
          contentIsBase64: false,
        });
        finalAttachments.push({ path: att.path, sha: att.fileSha });
      } else {
        // 既存ファイルをそのまま参照するだけ（アップロード不要）
        finalAttachments.push({ path: att.path, sha: att.fileSha });
      }
    }

    return { editedFiles, finalAttachments };
  };

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (!title.trim() || (requireCategory && !selectedCategory)) return; // 未入力の必須項目があれば送信しない（下の警告表示に任せる）

    // 添付リストに追加し忘れたまま作業スロットに残っている分があれば、
    // 送信直前に自動でリストへ含める（1件だけ添付するときに毎回
    // 「リストに追加」を押させないための救済）
    const pendingSlot = buildPendingAttachmentFromSlot();
    const allAttachments = pendingSlot ? [...attachments, pendingSlot] : attachments;

    const { editedFiles: editedFilesRaw, finalAttachments } = buildAttachmentSubmission(allAttachments);

    // ローカルファイルのBase64変換をこのタイミングでまとめて行う
    const editedFiles = await Promise.all(
      editedFilesRaw.map(async (ef) => {
        if (ef.content !== "__PENDING_LOCAL_FILE__") return ef;
        const match = allAttachments.find((a) => a.path === ef.path && a.localFile);
        const content = match?.localFile ? await toBase64(match.localFile) : "";
        return { ...ef, content };
      })
    );

    const { github_path: finalGithubPath, commit_sha: finalCommitSha } =
      serializeAttachments(finalAttachments);

    const learningData = {
      title,
      heading_text: headingText,
      explanatory_text: explanatoryText,
      understanding_level: understandingLevel,
      reference_url: serializeReferenceUrls(referenceUrls),
      category_id: selectedCategory,
      tags: selectedTags,
      github_path: finalGithubPath,
      commit_sha: finalCommitSha,
    };

    const submissionData = {
      learningData: editingData
        ? { ...learningData, id: editingData.id }
        : { ...learningData, created_at: created_at },
      editedFiles, // ★ 複数件対応（0件のこともある）
    };

    try {
      await onSubmit(submissionData);
      if (selectedCategory) pushRecentPicks(RECENT_CATEGORY_KEY, [selectedCategory]);
      if (selectedTags.length > 0) pushRecentPicks(RECENT_TAG_KEY, selectedTags);
      resetFormFields();
      prevEditingIdRef.current = null;
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };

  // フォームの入力内容をすべて空にする（送信成功後の初期化や、共有からの
  // 新規登録の前処理に使う）
  const resetFormFields = () => {
    setWorkbook(null);
    setActiveSheetIndex(0);
    setSpreadsheetData(null);
    setTitle("");
    setHeadingText("");
    setExplanatoryText("");
    setUnderstandingLevel(null);
    setReferenceUrls([""]);
    setSelectedCategory("");
    setSelectedTags([]);
    setFolderPath("");
    setFileName("");
    setLocalFile(null);
    setFileContent("");
    setFileSha(null);
    setIsEditingFile(false);
    setIsCreatingNewFile(false);
    setPreviewError(null);
    setIsLoadingFile(false);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
    setAttachments([]);
    setAttemptedSubmit(false);
  };

  // キャンセル・背景クリックなどでダイアログを閉じる。
  // 入力途中の内容を誤って失わないよう、フォームはリセットしない
  // （新規作成中なら次回開いたときに続きから入力できる）
  const handleClose = () => {
    onClose();
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 添付ファイルの選択内容をすべてクリアする（作業スロットのみ。添付リストは残す）
  const handleClearAttachment = () => {
    setFolderPath("");
    setFileName("");
    setLocalFile(null);
    setFileContent("");
    setFileSha(null);
    setIsEditingFile(false);
    setIsCreatingNewFile(false);
    setPreviewError(null);
    setWorkbook(null);
    setActiveSheetIndex(0);
    setSpreadsheetData(null);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
  };

  // アップロード・既存選択・新規作成のいずれかを既に行っているか
  // （ファイル名欄を表示するかどうかの判定に使う）
  const hasStartedAttachment =
    isCreatingNewFile || fileName.trim().length > 0 || !!localFile || !!fileSha;

  const fileType = getFileType(github_path);
  // 画像・動画以外ではmediaSrcを使わないため、無駄なbase64変換（かつ日本語などの
  // 非Latin1文字を含むテキストファイルでbtoa()が例外を投げて画面が真っ白になる
  // 不具合の原因）を避けるよう、必要なときだけ計算する
  const mediaSrc =
    fileType === "image" || fileType === "video"
      ? fileContent.startsWith("data:")
        ? fileContent
        : fileContent.match(/^[A-Za-z0-9+/=]+$/)
        ? `data:${getMimeType(github_path)};base64,${fileContent}`
        : // 既にデコード済みのテキストを再エンコードする場合、btoa()は
          // Latin1範囲外の文字（日本語など）で例外を投げるため、UTF-8対応の
          // エンコード方法を使う
          `data:${getMimeType(github_path)};base64,${btoa(unescape(encodeURIComponent(fileContent)))}`
      : "";

  // 最近使ったカテゴリー・タグのワンタップ候補（すでに選択中のものは出さない）
  const recentCategoryChips = recentCategoryIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter((c): c is { id: number; name: string } => !!c && String(c.id) !== String(selectedCategory));
  const recentTagChips = recentTagNames.filter((t) => !selectedTags.includes(t));

  return (
    <>
      <Dialog
        open={open}
        onClose={() => handleClose()}
        fullWidth
        maxWidth="md"
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enterで送信（複数行の入力欄でも改行と競合しないように）
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MenuBookOutlinedIcon color="primary" />
          {editingData ? "学習内容の編集" : "学んだことを記録する"}
        </DialogTitle>
        <DialogContent dividers>
          {/* === 基本情報 === */}
          <Typography
            variant="subtitle2"
            sx={{ mt: 1, mb: 1, fontWeight: 700, color: "primary.main" }}
          >
            基本情報
          </Typography>

          {/* タイトル（必須） */}
          <TextField
            autoFocus
            margin="normal"
            label="タイトル"
            required
            type="text"
            fullWidth
            variant="outlined"
            placeholder="例: XLOOKUP関数の使い方"
            error={attemptedSubmit && !title.trim()}
            helperText={
              attemptedSubmit && !title.trim()
                ? "タイトルは必須です。入力してください"
                : "何について学んだかを短く書きます（必須）"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* 見出し内容（任意） */}
          <TextField
            margin="normal"
            label="見出し内容（任意）"
            type="text"
            fullWidth
            variant="outlined"
            placeholder="例: XLOOKUPはVLOOKUPの上位互換で、左方向の検索もできる"
            helperText="検索結果の一覧に表示される1行目です。未入力の場合は内容・メモの先頭が表示されます"
            value={headingText}
            onChange={(e) => setHeadingText(e.target.value)}
          />

          {/* 内容・メモ */}
          <Box sx={{ mt: 2, mb: explanatoryText || !showMemoPreview ? 0 : 1 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setShowMarkdownHelp(true)}
                title="書き方（Markdown記法）を見る"
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
              <Button
                size="small"
                onClick={() => {
                  setShowMemoPreview((v) => !v);
                  setClozeAllRevealed(false);
                  setClozeResetKey((k) => k + 1);
                }}
                sx={{ fontSize: "0.75rem" }}
              >
                {showMemoPreview ? "編集に戻る" : "プレビュー"}
              </Button>
            </Box>
            {showMemoPreview ? (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  minHeight: 100,
                }}
              >
                {explanatoryText ? (
                  <>
                    <MarkdownContent
                      key={clozeResetKey}
                      text={explanatoryText}
                      color="text.primary"
                      forceRevealed={clozeAllRevealed}
                      onAllRevealed={() => setClozeAllRevealed(true)}
                    />
                    {hasCloze(explanatoryText) && (
                      <>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", mt: 1, color: "text.secondary" }}
                        >
                          {clozeAllRevealed
                            ? "すべて表示しました。これが復習の最後に見える状態です"
                            : "[[ ]]で囲んだ箇所は伏字になります。タップすると1つずつ表示されます"}
                        </Typography>
                        {clozeAllRevealed && (
                          <Button
                            size="small"
                            startIcon={<VisibilityOffOutlinedIcon fontSize="small" />}
                            onClick={() => {
                              setClozeAllRevealed(false);
                              setClozeResetKey((k) => k + 1);
                            }}
                            sx={{ mt: 0.5, fontSize: "0.75rem" }}
                          >
                            もう一度隠した状態から確認
                          </Button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.disabled" }}>
                    まだ内容がありません
                  </Typography>
                )}
              </Box>
            ) : (
              <TextField
                label="内容・メモ"
                type="text"
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="学んだこと・ポイント・つまずいた点などを自由に書きます"
                helperText="[[ ]] で囲んだ部分は復習時にその箇所だけ隠されます。Markdown記法が使えます（書き方は上の ⓘ アイコンから確認できます）"
                value={explanatoryText}
                onChange={(e) => setExplanatoryText(e.target.value)}
              />
            )}
          </Box>

          {/* 参考URL（複数可・任意） */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              参考URL（任意・複数登録できます）
            </Typography>
            {referenceUrls.map((url, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                <TextField
                  type="url"
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="https://..."
                  helperText={
                    index === referenceUrls.length - 1 ? "参考にした記事やドキュメントのURL" : " "
                  }
                  value={url}
                  onChange={(e) => {
                    const next = [...referenceUrls];
                    next[index] = e.target.value;
                    setReferenceUrls(next);
                  }}
                />
                {referenceUrls.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      const next = referenceUrls.filter((_, i) => i !== index);
                      setReferenceUrls(next.length > 0 ? next : [""]);
                    }}
                    title="このURLを削除"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddLinkIcon fontSize="small" />}
              onClick={() => setReferenceUrls((prev) => [...prev, ""])}
            >
              参考URLを追加
            </Button>
          </Box>

          {/* === 分類 === */}
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 700, color: "primary.main" }}>
            分類
          </Typography>

          {/* カテゴリー（単一選択・検索可） */}
          <Autocomplete
            options={allCategories}
            getOptionLabel={(option: any) => option.name || ""}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            value={allCategories.find((c: any) => c.id === selectedCategory) || null}
            onChange={(_event, newValue: any) => {
              setSelectedCategory(newValue ? newValue.id : "");
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="カテゴリー"
                required={requireCategory}
                placeholder="入力して検索"
                error={requireCategory && attemptedSubmit && !selectedCategory}
                helperText={
                  requireCategory && attemptedSubmit && !selectedCategory
                    ? "カテゴリーは必須です。選択してください"
                    : requireCategory
                    ? "学習内容を分類するカテゴリを選びます（必須）。見つからない場合は「カテゴリー・タグの管理」から新規作成できます"
                    : "学習内容を分類するカテゴリを選びます。見つからない場合は「カテゴリー・タグの管理」から新規作成できます"
                }
              />
            )}
            sx={{ mt: 2 }}
          />
          {recentCategoryChips.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5, mt: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
                最近使った:
              </Typography>
              {recentCategoryChips.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedCategory(c.id as any)}
                />
              ))}
            </Box>
          )}

          {/* ハッシュタグ（複数選択・自由入力可） */}
          <Autocomplete
            multiple
            options={allTags.map((tag: any) => tag.name)}
            value={selectedTags}
            onChange={(_event, newValue) => {
              setSelectedTags(newValue);
            }}
            freeSolo // 選択肢にない新しいタグも入力可能にする
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="ハッシュタグ（任意）"
                placeholder={isTouchDevice ? "入力して確定（改行）ボタンで追加" : "入力してEnterで追加"}
                helperText="複数OK。一覧にない言葉も新しく追加できます"
              />
            )}
            sx={{ mt: 2 }}
          />
          {recentTagChips.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5, mt: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
                よく使う:
              </Typography>
              {recentTagChips.map((t) => (
                <Chip
                  key={t}
                  label={`#${t}`}
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedTags((prev) => [...prev, t])}
                />
              ))}
            </Box>
          )}

          {/* === 理解度 === */}
          <Box sx={{ mt: 3 }}>
            <Typography component="legend" sx={{ fontWeight: 600 }}>
              理解度（任意）
            </Typography>
            <Rating
              value={understandingLevel}
              onChange={(_event, newValue: any) => {
                setUnderstandingLevel(newValue);
              }}
            />
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              ★が多いほど「よく理解できた」。未設定のまま検索用のメモとしてだけ残すこともできます。
            </Typography>
          </Box>
          {/* === ファイル添付（ゲストモードなどGitHubリポジトリが無い場合は非表示） === */}
          {!hideAttachments && (
          <>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
              ファイルを添付する（任意・複数選択できます）
            </Typography>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1.5 }}>
              学んだコードやファイルをGitHubリポジトリに保存して紐づけられます。使わなくても登録できます。
            </Typography>

            {/* --- 添付リスト（確定済みの分） --- */}
            {attachments.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  mb: 1.5,
                  p: 1,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                {attachments.map((att, index) => (
                  <Chip
                    key={`${att.path}-${index}`}
                    icon={<InsertDriveFileOutlinedIcon />}
                    label={att.path}
                    onDelete={() => handleRemoveQueuedAttachment(index)}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            )}

            {/* --- 保存先フォルダ --- */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: 1,
                mb: 1.5,
              }}
            >
              <TextField
                label="保存先フォルダ"
                type="text"
                variant="outlined"
                size="small"
                sx={{ flex: "1 1 220px" }}
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value.replace(/^\/+/, "").replace(/\/+$/, ""))}
                placeholder="未入力ならリポジトリ直下"
                helperText="例: src/components"
              />
              <Button
                onClick={() => setIsFolderSelectorOpen(true)}
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                GitHubのフォルダから選ぶ
              </Button>
            </Box>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalFileSelect}
              style={{ display: "none" }}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleUploadButtonClick}
                startIcon={<UploadFileIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                {isTouchDevice ? "スマホからアップロード" : "PCからアップロード"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setIsSelectorOpen(true)}
                startIcon={<InsertDriveFileOutlinedIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                GitHubの既存ファイルを選ぶ
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCreateNewFileClick}
                startIcon={<NoteAddOutlinedIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                新規ファイルを作成
              </Button>
            </Box>

            {/* --- ファイル名（アップロード・既存選択で自動入力、新規作成では手入力。
                何も選んでいない間は表示しない） --- */}
            {hasStartedAttachment && (
              <TextField
                label="ファイル名"
                type="text"
                variant="outlined"
                size="small"
                fullWidth
                autoFocus={isCreatingNewFile}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="例: index.tsx"
                sx={{ mt: 1.5 }}
              />
            )}

            {(localFile || isEditingFile || fileSha) && github_path.trim() && (
              <Box sx={{ mt: 1, textAlign: "right" }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlaylistAddIcon fontSize="small" />}
                  onClick={handleQueueAttachment}
                >
                  この内容を添付リストに追加
                </Button>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              mt: 2,
              p: 1,
              position: "relative",
              border: "1px solid #ddd",
              borderRadius: 1,
              minHeight: 150,
              maxHeight: "50vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              bgcolor: "#fff",
            }}
          >
            {hasAttachment && (
              <IconButton
                size="small"
                onClick={handleClearAttachment}
                title="選択中のファイルを解除する"
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  zIndex: 1,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {isLoadingFile ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                }}
              >
                <CircularProgress />
              </Box>
            ) : previewError ? (
              <Box sx={{ p: 2 }}>
                <Typography color="error">{previewError}</Typography>
              </Box>
            ) : workbook ? (
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
                  <Tabs
                    value={activeSheetIndex}
                    onChange={(_event, newValue) => setActiveSheetIndex(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Excel sheets"
                  >
                    {workbook.SheetNames.map((sheetName, index) => (
                      <Tab label={sheetName} key={sheetName} id={`sheet-tab-${index}`} />
                    ))}
                  </Tabs>
                </Box>
                {spreadsheetData && (
                  <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
                    <Spreadsheet data={spreadsheetData} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", p: 1 }}
                    >
                      ※ Excelは閲覧専用です（図・グラフが失われるため編集・保存はできません）
                    </Typography>
                  </div>
                )}
              </>
            ) : pdfPages.length > 0 ? (
              // PDFは閲覧専用（ページごとに画像として表示）
              <Box sx={{ flexGrow: 1, overflow: "auto", p: 1, bgcolor: "#525659" }}>
                <Stack spacing={1} alignItems="center">
                  {pdfPages.map((pageSrc, index) => (
                    <img
                      key={index}
                      src={pageSrc}
                      alt={`${index + 1}ページ目`}
                      style={{ maxWidth: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                    />
                  ))}
                </Stack>
              </Box>
            ) : pptxSlides.length > 0 ? (
              // PowerPointは閲覧専用。1枚ずつスライドのような見た目で表示する
              // （テキストのみの再現で、実際のレイアウト・画像・デザインは反映されない）
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
                  <Tabs
                    value={activeSlideIndex}
                    onChange={(_event, newValue) => setActiveSlideIndex(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="PowerPoint slides"
                  >
                    {pptxSlides.map((slide, index) => (
                      <Tab
                        label={`${slide.slideNumber}`}
                        key={slide.slideNumber}
                        id={`slide-tab-${index}`}
                      />
                    ))}
                  </Tabs>
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    overflow: "auto",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    bgcolor: "#e8e8e8",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    ※ 簡易プレビューです（フォント・装飾・アニメーションは再現されません）
                  </Typography>
                  {pptxSlides[activeSlideIndex] && (
                    <PptxSlideView slide={pptxSlides[activeSlideIndex]} />
                  )}
                </Box>
              </>
            ) : zipEntries.length > 0 ? (
              // ZIPは閲覧専用（中身のファイル一覧のみ。展開・編集はできない）
              <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  ※ ZIP内のファイル一覧です（{zipEntries.length}件）。展開・編集はできません
                </Typography>
                <List dense>
                  {zipEntries.map((entry) => (
                    <ListItem key={entry.name} disableGutters>
                      <ListItemText
                        primary={entry.name}
                        sx={{ opacity: entry.dir ? 0.6 : 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : fileContent || isCreatingNewFile ? (
              // ★ JSX 直接条件分岐で返す
              fileType === "image" || fileType === "video" ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                }}
              >
                {fileType === "image" ? (
                  <img
                    src={mediaSrc}
                    alt={github_path}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "60vh",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                ) : (
                  <video
                    src={mediaSrc}
                    controls
                    style={{
                      maxWidth: "100%",
                      maxHeight: "60vh",
                      borderRadius: "8px",
                    }}
                  />
                )}
              </Box>
            ) : (
                <div
                  style={{
                    flexGrow: 1,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    {isEditingFile ? (
                      <TextField
                        autoFocus
                        multiline
                        fullWidth
                        minRows={8}
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                          },
                        }}
                      />
                    ) : (
                      <SyntaxHighlighter
                        language={fileType === "docx" || fileType === "doc" ? "plaintext" : fileType}
                        style={vscDarkPlus}
                        showLineNumbers
                        customStyle={{ margin: 0, height: "100%" }}
                      >
                        {fileContent}
                      </SyntaxHighlighter>
                    )}
                  </Box>
                  {fileType !== "binary" && fileType !== "docx" && fileType !== "doc" && (
                    <Box sx={{ mt: 1, textAlign: "right" }}>
                      <Button size="small" onClick={() => setIsEditingFile(!isEditingFile)}>
                        {isEditingFile ? "プレビューに戻る" : "編集"}
                      </Button>
                    </Box>
                  )}
                  {(fileType === "docx" || fileType === "doc") && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      ※ Wordは閲覧専用です（文章のみ抽出して表示。元の書式・画像・表は再現されません）
                    </Typography>
                  )}
                  {isCreatingNewFile && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      ※ 新しいファイルの内容を入力してください。「この内容を添付リストに追加」を押すと登録時にGitHubへ新規作成されます
                    </Typography>
                  )}
                </div>
              )
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                }}
              >
                <Typography color="textSecondary">
                  ファイル選択するとプレビュー表示されます。
                </Typography>
              </Box>
            )}
          </Box>
          </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {!isTouchDevice && (
            <Typography variant="caption" sx={{ color: "text.secondary", mr: "auto" }}>
              {navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"} + Enterでも登録できます
            </Typography>
          )}
          <Button onClick={() => handleClose()} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingData ? "変更を保存" : "この内容で登録"}
          </Button>
        </DialogActions>
      </Dialog>
      <GitHubFileSelector
        open={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onFileSelect={handleFileSelectFromGitHub}
      />
      <GitHubFolderSelector
        open={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelectFolder={(selectedFolder) => {
          // フォルダだけ更新し、既に入力済みのファイル名はそのまま維持する
          setFolderPath(selectedFolder);
          setIsFolderSelectorOpen(false);
        }}
        githubLogin={githubLoginSafe}
        repoName={repoNameSafe}
        accessToken={tokenSafe}
        setSelectedPath={setSelectedFolderPath}
      />
      <MarkdownHelpDialog open={showMarkdownHelp} onClose={() => setShowMarkdownHelp(false)} />
    </>
  );
}
